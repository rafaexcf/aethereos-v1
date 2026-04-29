import type {
  LLMDriver,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMEmbeddingResult,
  Result,
  TenantContext,
} from "@aethereos/drivers";
import {
  ok,
  err,
  NetworkError,
  RateLimitError,
  TimeoutError,
} from "@aethereos/drivers";

type LLMDriverError = RateLimitError | TimeoutError | NetworkError;

export interface LiteLLMConfig {
  baseUrl: string;
  masterKey: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  timeoutMs?: number;
}

export interface LLMCostResult {
  cost_usd: number;
  prompt_tokens: number;
  completion_tokens: number;
}

const MODEL_PRICES: Record<
  string,
  { input_per_m: number; output_per_m: number }
> = {
  "claude-3-5-sonnet": { input_per_m: 3.0, output_per_m: 15.0 },
  "claude-3-5-sonnet-20241022": { input_per_m: 3.0, output_per_m: 15.0 },
  "claude-3-haiku": { input_per_m: 0.25, output_per_m: 1.25 },
  "gpt-4o-mini": { input_per_m: 0.15, output_per_m: 0.6 },
  "gpt-4o": { input_per_m: 2.5, output_per_m: 10.0 },
  "text-embedding-3-small": { input_per_m: 0.02, output_per_m: 0.0 },
  "text-embedding-3-large": { input_per_m: 0.13, output_per_m: 0.0 },
};

interface LiteLLMChatResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface LiteLLMEmbeddingResponse {
  model: string;
  data: Array<{ embedding: number[]; index: number }>;
  usage: { total_tokens: number; prompt_tokens: number };
}

export class LiteLLMDriver implements LLMDriver {
  readonly #config: LiteLLMConfig;
  #tenantContext: TenantContext | null = null;

  constructor(config: LiteLLMConfig) {
    this.#config = config;
  }

  withTenant(context: TenantContext): void {
    this.#tenantContext = context;
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): Promise<Result<LLMCompletionResult, LLMDriverError>> {
    const model =
      options?.model ?? this.#config.defaultModel ?? "claude-3-5-sonnet";
    const timeoutMs = this.#config.timeoutMs ?? 30_000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(`${this.#config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.#headers(),
        body: JSON.stringify({
          model,
          messages,
          max_tokens: options?.maxTokens ?? 1024,
          temperature: options?.temperature ?? 0.7,
          stream: false,
          user: this.#tenantContext?.company_id,
          metadata: this.#tenantMetadata(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        return err(
          new RateLimitError(
            "LiteLLM rate limit exceeded",
            retryAfter ? Number(retryAfter) * 1000 : undefined,
          ),
        );
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "unknown error");
        return err(
          new NetworkError(`LiteLLM error ${response.status}: ${body}`),
        );
      }

      const data = (await response.json()) as LiteLLMChatResponse;
      const choice = data.choices[0];
      if (!choice) {
        return err(new NetworkError("LiteLLM returned empty choices"));
      }

      const cost_usd = this.getCost({
        model: data.model,
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
      });

      return ok({
        content: choice.message.content,
        model: data.model,
        usage: {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
        },
        cost_usd,
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === "AbortError") {
        return err(
          new TimeoutError(`LiteLLM complete timed out after ${timeoutMs}ms`),
        );
      }
      return err(new NetworkError(e instanceof Error ? e.message : String(e)));
    }
  }

  async embed(
    content: string,
    model?: string,
  ): Promise<Result<LLMEmbeddingResult, LLMDriverError>> {
    const embeddingModel =
      model ?? this.#config.defaultEmbeddingModel ?? "text-embedding-3-small";
    const timeoutMs = this.#config.timeoutMs ?? 30_000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(`${this.#config.baseUrl}/embeddings`, {
        method: "POST",
        headers: this.#headers(),
        body: JSON.stringify({
          model: embeddingModel,
          input: content,
          user: this.#tenantContext?.company_id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        return err(new RateLimitError("LiteLLM rate limit exceeded"));
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "unknown error");
        return err(
          new NetworkError(`LiteLLM embed error ${response.status}: ${body}`),
        );
      }

      const data = (await response.json()) as LiteLLMEmbeddingResponse;
      const first = data.data[0];
      if (!first) {
        return err(new NetworkError("LiteLLM returned empty embedding data"));
      }

      return ok({
        embedding: first.embedding,
        model: data.model,
        usage: { total_tokens: data.usage.total_tokens },
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === "AbortError") {
        return err(
          new TimeoutError(`LiteLLM embed timed out after ${timeoutMs}ms`),
        );
      }
      return err(new NetworkError(e instanceof Error ? e.message : String(e)));
    }
  }

  async ping(): Promise<Result<void, LLMDriverError>> {
    try {
      const response = await fetch(
        `${this.#config.baseUrl}/health/liveliness`,
        {
          headers: this.#headers(),
          signal: AbortSignal.timeout(5_000),
        },
      );
      if (!response.ok) {
        return err(
          new NetworkError(`LiteLLM health check failed: ${response.status}`),
        );
      }
      return ok(undefined);
    } catch (e) {
      return err(new NetworkError(e instanceof Error ? e.message : String(e)));
    }
  }

  getCost(usage: {
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
  }): number {
    const normalizedModel = this.#normalizeModelName(usage.model);
    const prices = MODEL_PRICES[normalizedModel] ?? MODEL_PRICES["gpt-4o-mini"];
    if (!prices) return 0;
    return (
      (usage.prompt_tokens / 1_000_000) * prices.input_per_m +
      (usage.completion_tokens / 1_000_000) * prices.output_per_m
    );
  }

  #headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.#config.masterKey}`,
    };
  }

  #tenantMetadata(): Record<string, string> | undefined {
    if (!this.#tenantContext) return undefined;
    const actor = this.#tenantContext.actor;
    const userId =
      actor.type === "human"
        ? actor.user_id
        : actor.type === "agent"
          ? actor.supervising_user_id
          : undefined;
    return {
      company_id: this.#tenantContext.company_id,
      ...(userId !== undefined ? { user_id: userId } : {}),
    };
  }

  #normalizeModelName(model: string): string {
    const lower = model.toLowerCase();
    for (const key of Object.keys(MODEL_PRICES)) {
      if (lower.includes(key.toLowerCase())) return key;
    }
    return model;
  }
}
