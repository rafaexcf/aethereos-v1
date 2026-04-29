import { randomUUID } from "node:crypto";
import { trace, isSpanContextValid } from "@opentelemetry/api";

/**
 * Returns the active OTel trace_id as correlation ID, or a new UUID if no span is active.
 * This ties every outbound event to the incoming HTTP request trace automatically.
 */
export function getCurrentCorrelationId(): string {
  const span = trace.getActiveSpan();
  if (span !== undefined) {
    const ctx = span.spanContext();
    if (isSpanContextValid(ctx)) {
      return ctx.traceId;
    }
  }
  return randomUUID();
}
