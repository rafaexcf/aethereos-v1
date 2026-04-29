import type { Result } from "../types/result.js";
import type { EventEnvelope } from "../types/platform-event.js";
import type {
  NetworkError,
  TimeoutError,
  UnavailableError,
} from "../errors.js";

export type EventBusError = NetworkError | TimeoutError | UnavailableError;

export type EventHandler = (envelope: EventEnvelope) => Promise<void>;

export interface SubscribeOptions {
  /** Consumer durável — sobrevive a restart do worker */
  durable?: boolean;
  /** Prefetch máximo (controle de pressão) */
  maxInFlight?: number;
  /** Subject/stream específico (default: derivado de eventType) */
  subject?: string;
}

/**
 * EventBusDriver — contrato para publicação e consumo de eventos SCP.
 *
 * Garantias:
 * - publish() é idempotente via correlation_id (Fundamentação 8.10.5 [INV])
 * - Subjects particionados por tenant_id para ordering por entidade
 * - DLQ (Dead Letter Queue) para poison events
 * - Ack/nack explícitos — sem auto-ack
 *
 * Implementação concreta: NatsEventBusDriver (packages/drivers-nats)
 * Implementação local (Camada 0): BroadcastChannelEventBusDriver
 *
 * Ref: Fundamentação 8.10 [INV], ADR-0014 #2
 */
export interface EventBusDriver {
  /**
   * Publica um envelope de evento no subject correto.
   * Subject derivado de: tenant_id + event_type.
   * Retorna o message-id atribuído pelo broker.
   */
  publish(envelope: EventEnvelope): Promise<Result<string, EventBusError>>;

  /**
   * Registra handler para um tipo de evento.
   * Consumer é durável por padrão (sobrevive a restart).
   */
  subscribe(
    eventType: string,
    handler: EventHandler,
    options?: SubscribeOptions,
  ): Promise<Result<Subscription, EventBusError>>;

  /** Health check */
  ping(): Promise<Result<void, EventBusError>>;
}

export interface Subscription {
  readonly id: string;
  unsubscribe(): Promise<void>;
}
