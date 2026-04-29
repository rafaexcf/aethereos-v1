import type { EventEnvelope, EventBusDriver } from "@aethereos/drivers";

/**
 * BaseConsumer — classe base para consumers de eventos SCP.
 * Cada consumer registra os tipos de eventos que processa e tem lógica de handle.
 *
 * Ref: Fundamentação 8.10 [INV]
 */
export abstract class BaseConsumer {
  abstract readonly eventTypes: readonly string[];

  constructor(protected readonly bus: EventBusDriver) {}

  abstract handle(envelope: EventEnvelope): Promise<void>;

  async start(): Promise<void> {
    for (const eventType of this.eventTypes) {
      const result = await this.bus.subscribe(eventType, (envelope) =>
        this.handle(envelope),
      );
      if (!result.ok) {
        throw new Error(
          `Falha ao subscrever evento '${eventType}': ${result.error.message}`,
        );
      }
    }
  }
}
