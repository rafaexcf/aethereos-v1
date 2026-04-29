import type { Result } from "../types/result.js";
import type { TenantContext } from "../types/tenant-context.js";
import type { NetworkError } from "../errors.js";

export type ObservabilityDriverError = NetworkError;

export interface SpanOptions {
  attributes?: Record<string, string | number | boolean>;
  parentSpanId?: string;
}

export interface Span {
  readonly spanId: string;
  setAttribute(key: string, value: string | number | boolean): void;
  setStatus(status: "ok" | "error", message?: string): void;
  end(): void;
}

export interface MetricOptions {
  labels?: Record<string, string>;
}

/**
 * ObservabilityDriver — contrato para traces, métricas e logs estruturados.
 *
 * Implementação: OpenTelemetry SDK → Grafana stack (Tempo, Loki, Prometheus).
 * Logs via pino (OpenTelemetry-compatible).
 *
 * NUNCA usar console.log em código de produção (CLAUDE.md seção 5, bloqueio de CI).
 *
 * SCP exige tracing end-to-end com correlation_id propagado por toda a cadeia:
 * shell → outbox → JetStream → Context Engine → app consumidor
 *
 * Ref: Fundamentação 5.1, ADR-0014 #10, SLO_TARGETS.md
 */
export interface ObservabilityDriver {
  withTenant(context: TenantContext): void;

  /** Inicia span para tracing distribuído */
  startSpan(name: string, options?: SpanOptions): Span;

  /** Incrementa counter */
  incrementCounter(name: string, value?: number, options?: MetricOptions): void;

  /** Registra histogram (latências, tamanhos) */
  recordHistogram(name: string, value: number, options?: MetricOptions): void;

  /** Log estruturado — alternativa ao console.log */
  log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    attributes?: Record<string, unknown>,
  ): void;

  ping(): Promise<Result<void, ObservabilityDriverError>>;
}
