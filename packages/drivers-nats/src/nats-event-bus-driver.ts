import {
  connect,
  type NatsConnection,
  type JetStreamClient,
  type JetStreamManager,
  StringCodec,
  RetentionPolicy,
  StorageType,
  AckPolicy,
  DeliverPolicy,
  headers as natsHeaders,
} from "nats";
import type {
  EventBusDriver,
  EventHandler,
  SubscribeOptions,
  Subscription,
  EventEnvelope,
  Result,
} from "@aethereos/drivers";
import { ok, err, NetworkError, UnavailableError } from "@aethereos/drivers";

export interface NatsEventBusConfig {
  servers: string | string[];
  streamName?: string;
  streamSubjectPrefix?: string;
}

const sc = StringCodec();

export class NatsEventBusDriver implements EventBusDriver {
  readonly #config: NatsEventBusConfig;
  #nc: NatsConnection | null = null;
  #js: JetStreamClient | null = null;
  #jsm: JetStreamManager | null = null;

  readonly #streamName: string;
  readonly #subjectPrefix: string;

  constructor(config: NatsEventBusConfig) {
    this.#config = config;
    // Super Sprint B / MX209: defaults alinhados com tools/nats-setup.mjs
    // (stream SCP_EVENTS, subject prefix `scp`). Ainda configurável se outros
    // contextos quiserem stream separado.
    this.#streamName = config.streamName ?? "SCP_EVENTS";
    this.#subjectPrefix = config.streamSubjectPrefix ?? "scp";
  }

  async connect(): Promise<Result<void, NetworkError>> {
    try {
      this.#nc = await connect({ servers: this.#config.servers });
      this.#js = this.#nc.jetstream();
      this.#jsm = await this.#nc.jetstreamManager();
      await this.#ensureStream();
      return ok(undefined);
    } catch (e) {
      return err(new NetworkError(`NATS connect failed: ${String(e)}`));
    }
  }

  async #ensureStream(): Promise<void> {
    const jsm = this.#jsm;
    if (jsm === null) return;
    try {
      await jsm.streams.info(this.#streamName);
    } catch {
      await jsm.streams.add({
        name: this.#streamName,
        subjects: [`${this.#subjectPrefix}.>`],
        retention: RetentionPolicy.Limits,
        storage: StorageType.File,
        max_age: 7 * 24 * 60 * 60 * 1e9, // 7 days in nanoseconds
        num_replicas: 1,
        duplicate_window: 60 * 1e9, // 60s dedup window
      });
    }
  }

  #subject(envelope: EventEnvelope): string {
    return `${this.#subjectPrefix}.${envelope.tenant_id}.${envelope.type}`;
  }

  async publish(
    envelope: EventEnvelope,
  ): Promise<Result<string, NetworkError | UnavailableError>> {
    const js = this.#js;
    if (js === null) {
      return err(
        new UnavailableError("NATS not connected. Call connect() first."),
      );
    }
    try {
      const subject = this.#subject(envelope);
      const payload = sc.encode(JSON.stringify(envelope));

      // Dedup via envelope.id (correlation_id já está no envelope)
      const h = natsHeaders();
      h.set("Nats-Msg-Id", envelope.id);
      if (envelope.correlation_id !== undefined) {
        h.set("X-Correlation-Id", envelope.correlation_id);
      }

      const pubAck = await js.publish(subject, payload, { headers: h });
      return ok(`${pubAck.stream}:${pubAck.seq}`);
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  async subscribe(
    eventType: string,
    handler: EventHandler,
    options?: SubscribeOptions,
  ): Promise<Result<Subscription, NetworkError | UnavailableError>> {
    const js = this.#js;
    const jsm = this.#jsm;
    if (js === null || jsm === null) {
      return err(
        new UnavailableError("NATS not connected. Call connect() first."),
      );
    }

    const subject = options?.subject ?? `${this.#subjectPrefix}.*.${eventType}`;
    const durable = options?.durable !== false; // default true
    const consumerName = `${eventType.replace(/\./g, "_")}_consumer`;
    const maxInFlight = options?.maxInFlight ?? 50;

    try {
      // Ensure consumer exists
      try {
        await jsm.consumers.info(this.#streamName, consumerName);
      } catch {
        const consumerConfig = durable
          ? {
              durable_name: consumerName,
              filter_subject: subject,
              ack_policy: AckPolicy.Explicit,
              deliver_policy: DeliverPolicy.All,
              max_ack_pending: maxInFlight,
            }
          : {
              filter_subject: subject,
              ack_policy: AckPolicy.Explicit,
              deliver_policy: DeliverPolicy.All,
              max_ack_pending: maxInFlight,
            };
        await jsm.consumers.add(this.#streamName, consumerConfig);
      }

      const consumer = await js.consumers.get(this.#streamName, consumerName);
      const msgs = await consumer.consume({ max_messages: maxInFlight });
      const subId = `${eventType}:${Date.now()}`;

      void (async () => {
        for await (const msg of msgs) {
          try {
            const envelope = JSON.parse(sc.decode(msg.data)) as EventEnvelope;
            await handler(envelope);
            msg.ack();
          } catch {
            msg.nak();
          }
        }
      })();

      return ok({
        id: subId,
        unsubscribe: async () => {
          msgs.stop();
        },
      });
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  /**
   * Super Sprint B / MX209 — Consumer group subscription.
   *
   * Subscribe a um durable consumer pré-criado (via tools/nats-setup.mjs),
   * recebendo TODOS os eventos do stream que casam com o filter_subject
   * configurado naquele consumer. Diferente de subscribe(), não cria
   * consumer baseado em event_type — usa o consumer group existente.
   *
   * Útil para fan-out paralelo: 4 grupos (audit, embedding, notification,
   * enrichment) processam o mesmo stream de eventos independentemente.
   */
  async subscribeGroup(
    consumerName: string,
    handler: EventHandler,
  ): Promise<Result<Subscription, NetworkError | UnavailableError>> {
    const js = this.#js;
    if (js === null) {
      return err(
        new UnavailableError("NATS not connected. Call connect() first."),
      );
    }

    try {
      const consumer = await js.consumers.get(this.#streamName, consumerName);
      const msgs = await consumer.consume();
      const subId = `group:${consumerName}:${Date.now()}`;

      void (async () => {
        for await (const msg of msgs) {
          try {
            const envelope = JSON.parse(sc.decode(msg.data)) as EventEnvelope;
            await handler(envelope);
            msg.ack();
          } catch {
            msg.nak();
          }
        }
      })();

      return ok({
        id: subId,
        unsubscribe: async () => {
          msgs.stop();
        },
      });
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  async ping(): Promise<Result<void, NetworkError | UnavailableError>> {
    const nc = this.#nc;
    if (nc === null) {
      return err(new UnavailableError("NATS not connected"));
    }
    try {
      await nc.flush();
      return ok(undefined);
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  async close(): Promise<void> {
    if (this.#nc !== null) {
      await this.#nc.drain();
      this.#nc = null;
      this.#js = null;
      this.#jsm = null;
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
