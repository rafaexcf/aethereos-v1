import type {
  ObservabilityDriver,
  Span,
  SpanOptions,
  MetricOptions,
  Result,
  TenantContext,
} from "@aethereos/drivers";
import { ok, err, NetworkError } from "@aethereos/drivers";

export interface LangfuseConfig {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  flushAt?: number;
  flushIntervalMs?: number;
}

interface BatchEntry {
  id: string;
  type: string;
  timestamp: string;
  body: Record<string, unknown>;
}

interface LangfuseSpan extends Span {
  readonly traceId: string;
}

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export class LangfuseObservabilityDriver implements ObservabilityDriver {
  readonly #config: LangfuseConfig;
  #tenantContext: TenantContext | null = null;
  #buffer: BatchEntry[] = [];
  #flushTimer: ReturnType<typeof setTimeout> | null = null;

  readonly #flushAt: number;
  readonly #flushIntervalMs: number;

  constructor(config: LangfuseConfig) {
    this.#config = config;
    this.#flushAt = config.flushAt ?? 15;
    this.#flushIntervalMs = config.flushIntervalMs ?? 10_000;
  }

  withTenant(context: TenantContext): void {
    this.#tenantContext = context;
  }

  startSpan(name: string, options?: SpanOptions): LangfuseSpan {
    const traceId = uuid();
    const spanId = uuid();
    const startTime = now();
    const attributes: Record<string, string | number | boolean> = {
      ...options?.attributes,
    };

    const traceBody: Record<string, unknown> = {
      id: traceId,
      name,
      userId: this.#tenantContext?.company_id,
      metadata: { company_id: this.#tenantContext?.company_id },
    };

    this.#enqueue({
      id: uuid(),
      type: "trace-create",
      timestamp: startTime,
      body: traceBody,
    });

    this.#enqueue({
      id: uuid(),
      type: "span-create",
      timestamp: startTime,
      body: {
        id: spanId,
        traceId,
        name,
        startTime,
        metadata: options?.attributes,
        ...(options?.parentSpanId !== undefined
          ? { parentObservationId: options.parentSpanId }
          : {}),
      },
    });

    let ended = false;

    const enqueue = (entry: BatchEntry) => {
      this.#enqueue(entry);
    };

    return {
      spanId,
      traceId,
      setAttribute(key: string, value: string | number | boolean): void {
        attributes[key] = value;
      },
      setStatus(status: "ok" | "error", message?: string): void {
        attributes["status"] = status;
        if (message !== undefined) attributes["status_message"] = message;
      },
      end(): void {
        if (ended) return;
        ended = true;
        const endTime = now();
        enqueue({
          id: uuid(),
          type: "span-update",
          timestamp: endTime,
          body: {
            id: spanId,
            traceId,
            endTime,
            metadata: attributes,
            statusMessage: attributes["status_message"] as string | undefined,
            level: attributes["status"] === "error" ? "ERROR" : "DEFAULT",
          },
        });
      },
    };
  }

  incrementCounter(
    name: string,
    value: number = 1,
    options?: MetricOptions,
  ): void {
    this.#enqueue({
      id: uuid(),
      type: "score-create",
      timestamp: now(),
      body: {
        traceId: uuid(),
        name,
        value,
        dataType: "NUMERIC",
        comment: `counter increment${options?.labels ? ` labels=${JSON.stringify(options.labels)}` : ""}`,
      },
    });
  }

  recordHistogram(name: string, value: number, options?: MetricOptions): void {
    this.#enqueue({
      id: uuid(),
      type: "score-create",
      timestamp: now(),
      body: {
        traceId: uuid(),
        name,
        value,
        dataType: "NUMERIC",
        comment: `histogram${options?.labels ? ` labels=${JSON.stringify(options.labels)}` : ""}`,
      },
    });
  }

  log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    attributes?: Record<string, unknown>,
  ): void {
    const entry: Record<string, unknown> = {
      traceId: uuid(),
      name: `log.${level}`,
      startTime: now(),
      level: level.toUpperCase(),
      input: message,
      metadata: { ...attributes, company_id: this.#tenantContext?.company_id },
    };
    this.#enqueue({
      id: uuid(),
      type: "event-create",
      timestamp: now(),
      body: entry,
    });
  }

  async traceLLM(opts: {
    traceId?: string;
    name: string;
    model: string;
    input: unknown;
    output: unknown;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    cost_usd?: number;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const traceId = opts.traceId ?? uuid();
    const genId = uuid();
    const startTime = now();

    this.#enqueue({
      id: uuid(),
      type: "trace-create",
      timestamp: startTime,
      body: {
        id: traceId,
        name: opts.name,
        userId: this.#tenantContext?.company_id,
        metadata: {
          company_id: this.#tenantContext?.company_id,
          correlation_id: opts.correlationId,
          ...opts.metadata,
        },
      },
    });

    this.#enqueue({
      id: uuid(),
      type: "generation-create",
      timestamp: startTime,
      body: {
        id: genId,
        traceId,
        name: opts.name,
        startTime,
        endTime: now(),
        model: opts.model,
        input: opts.input,
        output: opts.output,
        ...(opts.usage !== undefined
          ? {
              usage: {
                input: opts.usage.prompt_tokens,
                output: opts.usage.completion_tokens,
                total: opts.usage.total_tokens,
              },
            }
          : {}),
        ...(opts.cost_usd !== undefined
          ? { calculatedTotalCost: opts.cost_usd }
          : {}),
      },
    });
  }

  async ping(): Promise<Result<void, NetworkError>> {
    try {
      const response = await fetch(
        `${this.#config.baseUrl}/api/public/health`,
        {
          headers: this.#authHeader(),
          signal: AbortSignal.timeout(5_000),
        },
      );
      if (!response.ok) {
        return err(
          new NetworkError(`Langfuse health check failed: ${response.status}`),
        );
      }
      return ok(undefined);
    } catch (e) {
      return err(new NetworkError(e instanceof Error ? e.message : String(e)));
    }
  }

  async flush(): Promise<void> {
    if (this.#buffer.length === 0) return;
    const batch = this.#buffer.splice(0, this.#buffer.length);
    if (this.#flushTimer !== null) {
      clearTimeout(this.#flushTimer);
      this.#flushTimer = null;
    }
    await this.#sendBatch(batch);
  }

  #enqueue(entry: BatchEntry): void {
    this.#buffer.push(entry);
    if (this.#buffer.length >= this.#flushAt) {
      void this.flush();
    } else if (this.#flushTimer === null) {
      this.#flushTimer = setTimeout(() => {
        void this.flush();
      }, this.#flushIntervalMs);
    }
  }

  async #sendBatch(batch: BatchEntry[]): Promise<void> {
    try {
      await fetch(`${this.#config.baseUrl}/api/public/ingestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.#authHeader() },
        body: JSON.stringify({ batch }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Buffered telemetry loss is acceptable — never block the hot path
    }
  }

  #authHeader(): Record<string, string> {
    const creds = `${this.#config.publicKey}:${this.#config.secretKey}`;
    const encoded = Buffer.from(creds).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }
}
