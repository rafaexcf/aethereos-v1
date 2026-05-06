/**
 * Super Sprint B / MX211 — NATS consumer groups para SCP_EVENTS.
 *
 * Cada consumer group (criado via tools/nats-setup.mjs) processa todos
 * os eventos do stream independentemente do outros. Falha num grupo
 * NÃO afeta os demais (R9). Cada um é idempotente (R8) — reprocessar
 * mesmo evento não duplica dados (UNIQUE constraints + ON CONFLICT).
 */

import type { Sql } from "postgres";
import type { EventEnvelope, Subscription } from "@aethereos/drivers";
import type { NatsEventBusDriver } from "@aethereos/drivers-nats";
import { jlog, type InlineConsumer } from "./consumer.js";

interface ConsumerWiring {
  /** Nome do consumer group (durable name no NATS — criado via setup script). */
  groupName: string;
  /** Inline consumer reaproveitado: matches() filtra por event_type, handle() faz o trabalho. */
  consumer: InlineConsumer;
}

/**
 * Subscribe os 4 consumer groups às mensagens do stream SCP_EVENTS.
 *
 * Para cada grupo:
 *   - Pega TODOS os eventos do stream (filter_subject=scp.>).
 *   - Filtra localmente via consumer.matches(event_type) — o consumer
 *     ainda decide se processa (mantém compat com lógica do Sprint 18).
 *   - Chama consumer.handle(envelope, sql).
 *   - Ack em sucesso. Nak em erro (NATS redelivers até max_deliver=5,
 *     configurado no setup script).
 */
export async function startNatsConsumers(
  nats: NatsEventBusDriver,
  sql: Sql,
  consumers: InlineConsumer[],
): Promise<Subscription[]> {
  // Mapeia consumer group → InlineConsumer. Nomes batem com tools/nats-setup.mjs.
  const wirings: ConsumerWiring[] = [
    {
      groupName: "audit-consumer",
      consumer: pickByName(consumers, "AuditConsumer"),
    },
    {
      groupName: "notification-consumer",
      consumer: pickByName(consumers, "NotificationConsumer"),
    },
    {
      groupName: "enrichment-consumer",
      consumer: pickByName(consumers, "EnrichmentConsumer"),
    },
    {
      groupName: "embedding-consumer",
      consumer: pickByName(consumers, "EmbeddingConsumer"),
    },
  ];

  const subscriptions: Subscription[] = [];

  for (const wiring of wirings) {
    const handler = async (envelope: EventEnvelope): Promise<void> => {
      // Filtra: nem todo consumer processa todo event_type. Se não casa,
      // ack silencioso (sucesso vazio).
      if (!wiring.consumer.matches(envelope.type)) return;
      const startedAt = performance.now();
      try {
        await wiring.consumer.handle(envelope, sql);
        const ms = Math.round(performance.now() - startedAt);
        jlog("info", "nats consumer processed", {
          group: wiring.groupName,
          consumer: wiring.consumer.name,
          event_id: envelope.id,
          event_type: envelope.type,
          processing_time_ms: ms,
        });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        jlog("warn", "nats consumer error — will redeliver", {
          group: wiring.groupName,
          consumer: wiring.consumer.name,
          event_id: envelope.id,
          event_type: envelope.type,
          error: errMsg,
        });
        // Re-throw para que o subscribeGroup faça nak.
        throw e;
      }
    };

    const result = await nats.subscribeGroup(wiring.groupName, handler);
    if (result.ok) {
      subscriptions.push(result.value);
      jlog("info", "nats consumer group subscribed", {
        group: wiring.groupName,
        consumer: wiring.consumer.name,
      });
    } else {
      jlog("error", "nats consumer group subscribe failed", {
        group: wiring.groupName,
        error: String(result.error.message),
      });
    }
  }

  return subscriptions;
}

function pickByName(consumers: InlineConsumer[], name: string): InlineConsumer {
  const found = consumers.find((c) => c.name === name);
  if (found === undefined) {
    throw new Error(`InlineConsumer not found: ${name}`);
  }
  return found;
}
