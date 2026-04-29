import type {
  ObservabilityDriver,
  Span,
  SpanOptions,
  MetricOptions,
  TenantContext,
} from "@aethereos/drivers";
import { ok } from "@aethereos/drivers";

const NOOP_SPAN: Span = {
  spanId: "degraded",
  setAttribute: () => undefined,
  setStatus: () => undefined,
  end: () => undefined,
};

/**
 * DegradedObservabilityDriver — no-op fallback quando Langfuse/OTel está indisponível (P14).
 * Todas as operações são silenciosas. Nunca lança exceção.
 */
export class DegradedObservabilityDriver implements ObservabilityDriver {
  withTenant(_context: TenantContext): void {}

  startSpan(_name: string, _options?: SpanOptions): Span {
    return NOOP_SPAN;
  }

  incrementCounter(
    _name: string,
    _value?: number,
    _options?: MetricOptions,
  ): void {}

  recordHistogram(
    _name: string,
    _value: number,
    _options?: MetricOptions,
  ): void {}

  log(
    _level: "debug" | "info" | "warn" | "error",
    _message: string,
    _attributes?: Record<string, unknown>,
  ): void {}

  async ping() {
    return ok(undefined);
  }
}
