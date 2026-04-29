import type {
  EventBusDriver,
  EventHandler,
  SubscribeOptions,
  Subscription,
} from "@aethereos/drivers";
import type { EventEnvelope, Result } from "@aethereos/drivers";
import { ok, err } from "@aethereos/drivers";
import type { NetworkError, TimeoutError } from "@aethereos/drivers";
import { UnavailableError } from "@aethereos/drivers";

type EventBusError = NetworkError | TimeoutError | UnavailableError;

const CHANNEL_NAME = "ae-scp";

interface RegisteredHandler {
  id: string;
  eventType: string;
  handler: EventHandler;
}

/**
 * BroadcastChannelEventBusDriver — SCP event bus for Camada 0.
 * publish() calls local handlers + broadcasts to other tabs via BroadcastChannel.
 * subscribe() registers handlers called for both local and cross-tab messages.
 */
export class BroadcastChannelEventBusDriver implements EventBusDriver {
  private channel: BroadcastChannel | null = null;
  private handlers: RegisteredHandler[] = [];

  constructor() {
    this.initChannel();
  }

  private initChannel(): void {
    if (typeof BroadcastChannel === "undefined") return;
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event: MessageEvent<EventEnvelope>) => {
      void this.dispatchToHandlers(event.data);
    };
  }

  private async dispatchToHandlers(envelope: EventEnvelope): Promise<void> {
    const matching = this.handlers.filter((h) => h.eventType === envelope.type);
    await Promise.allSettled(matching.map((h) => h.handler(envelope)));
  }

  async publish(
    envelope: EventEnvelope,
  ): Promise<Result<string, EventBusError>> {
    if (!this.channel) {
      return err(new UnavailableError("BroadcastChannel not available"));
    }
    await this.dispatchToHandlers(envelope);
    this.channel.postMessage(envelope);
    return ok(envelope.id);
  }

  async subscribe(
    eventType: string,
    handler: EventHandler,
    _options?: SubscribeOptions,
  ): Promise<Result<Subscription, EventBusError>> {
    const id = crypto.randomUUID();
    this.handlers.push({ id, eventType, handler });

    const sub: Subscription = {
      id,
      unsubscribe: async () => {
        this.handlers = this.handlers.filter((h) => h.id !== id);
      },
    };

    return ok(sub);
  }

  async ping(): Promise<Result<void, EventBusError>> {
    if (!this.channel && typeof BroadcastChannel !== "undefined") {
      this.initChannel();
    }
    if (this.channel) return ok(undefined);
    return err(new UnavailableError("BroadcastChannel not available"));
  }

  close(): void {
    this.channel?.close();
    this.channel = null;
    this.handlers = [];
  }
}
