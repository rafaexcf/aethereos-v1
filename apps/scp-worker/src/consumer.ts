import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";

/**
 * Sprint 18 MX91/MX92/MX93/MX94: contrato lightweight de consumer inline.
 *
 * Diferente do BaseConsumer (kernel/scp/consumer.ts) que depende de
 * EventBusDriver (NATS), este modelo eh para o poller standalone:
 * o poller le scp_outbox e chama cada consumer.handle direto, sem pub/sub.
 *
 * Razao (R13 do spec): NATS opcional — modo inline e fallback valido.
 */
export interface InlineConsumer {
  /** Nome humano para logs */
  readonly name: string;
  /** Matcher: true se este consumer processa esse event_type */
  matches(eventType: string): boolean;
  /**
   * Processa o evento. Idempotente (caller pode re-disparar em retry).
   * Nunca throws — erros sao logados e o caller decide retry policy.
   */
  handle(envelope: EventEnvelope, sql: Sql): Promise<void>;
}

/**
 * Helper pra logar de forma estruturada (compativel com pino/OTel).
 */
export function jlog(
  level: "info" | "warn" | "error" | "fatal",
  msg: string,
  fields: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({ level, msg, ...fields });
  if (level === "error" || level === "fatal") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}
