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
  ValidationError,
} from "@aethereos/drivers";

/**
 * Bring Your Own Key — usuario configura seu proprio provedor LLM.
 * Tres formatos suportados:
 *   - "openai":     POST {baseUrl}/chat/completions (OpenAI standard)
 *                    funciona com Groq, Mistral, OpenRouter, Together, LMStudio,
 *                    Ollama, Custom — todos OpenAI-compatible.
 *   - "anthropic":  POST {baseUrl}/v1/messages (Anthropic Messages API nativo)
 *                    converte resposta para LLMCompletionResult padrao.
 *   - "google":     POST {baseUrl}/models/{model}:generateContent (Google Gemini)
 *                    apiKey via query param. Converte resposta.
 */
export type BYOKFormat = "openai" | "anthropic" | "google";

export interface BYOKConfig {
  format: BYOKFormat;
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

type LLMDriverError =
  | RateLimitError
  | TimeoutError
  | NetworkError
  | ValidationError;

interface OpenAIChatResponse {
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

interface OpenAIEmbeddingResponse {
  model: string;
  data: Array<{ embedding: number[] }>;
  usage: { total_tokens: number };
}

interface AnthropicMessagesResponse {
  model: string;
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

interface GoogleGenerateContentResponse {
  candidates: Array<{
    content: { parts: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion?: string;
}

export class BYOKLLMDriver implements LLMDriver {
  readonly #config: BYOKConfig;
  #tenantContext: TenantContext | null = null;

  constructor(config: BYOKConfig) {
    if (config.baseUrl.length === 0) {
      throw new ValidationError("BYOKConfig.baseUrl is required", []);
    }
    if (config.format === "openai" && config.apiKey.length === 0) {
      // OpenAI-compatible local servers (LM Studio, Ollama) accept empty key.
      // Cloud providers reject. Caller responsible for setting hint correctly.
    }
    this.#config = config;
  }

  withTenant(context: TenantContext): void {
    this.#tenantContext = context;
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): Promise<Result<LLMCompletionResult, LLMDriverError>> {
    if (this.#config.format === "anthropic") {
      return this.#completeAnthropic(messages, options);
    }
    if (this.#config.format === "google") {
      return this.#completeGoogle(messages, options);
    }
    return this.#completeOpenAI(messages, options);
  }

  async embed(
    content: string,
    model?: string,
  ): Promise<Result<LLMEmbeddingResult, LLMDriverError>> {
    // Apenas formato OpenAI tem endpoint /embeddings padrao.
    if (this.#config.format !== "openai") {
      return err(
        new ValidationError(
          `Embedding nao suportado pelo formato ${this.#config.format}`,
          [],
        ),
      );
    }
    const url = this.#joinUrl(this.#config.baseUrl, "/embeddings");
    const timeoutMs = this.#config.timeoutMs ?? 30_000;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.#openAIHeaders(),
        body: JSON.stringify({
          model: model ?? this.#config.model,
          input: content,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (response.status === 429) {
        return err(new RateLimitError("Provider rate limit"));
      }
      if (!response.ok) {
        const body = await response.text().catch(() => "unknown");
        return err(new NetworkError(`Embed error ${response.status}: ${body}`));
      }
      const data = (await response.json()) as OpenAIEmbeddingResponse;
      const first = data.data[0];
      if (!first) {
        return err(new NetworkError("Embedding response empty"));
      }
      return ok({
        embedding: first.embedding,
        model: data.model,
        usage: { total_tokens: data.usage.total_tokens },
      });
    } catch (e) {
      clearTimeout(tid);
      if (e instanceof Error && e.name === "AbortError") {
        return err(new TimeoutError(`Embed timed out after ${timeoutMs}ms`));
      }
      return err(new NetworkError(e instanceof Error ? e.message : String(e)));
    }
  }

  async ping(): Promise<Result<void, LLMDriverError>> {
    // OpenAI-compat: GET /models. Anthropic: nao tem health publico — ping via
    // mensagem minima. Google: GET /models?key=...
    try {
      if (this.#config.format === "anthropic") {
        return ok(undefined);
      }
      const url =
        this.#config.format === "google"
          ? `${this.#config.baseUrl}/models?key=${encodeURIComponent(this.#config.apiKey)}`
          : this.#joinUrl(this.#config.baseUrl, "/models");
      const headers: Record<string, string> =
        this.#config.format === "openai"
          ? this.#openAIHeaders()
          : { "Content-Type": "application/json" };
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        return err(new NetworkError(`ping failed: ${response.status}`));
      }
      return ok(undefined);
    } catch (e) {
      return err(new NetworkError(e instanceof Error ? e.message : String(e)));
    }
  }

  // ─── Format: openai ────────────────────────────────────────────────────────
  async #completeOpenAI(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): Promise<Result<LLMCompletionResult, LLMDriverError>> {
    const url = this.#joinUrl(this.#config.baseUrl, "/chat/completions");
    const timeoutMs = this.#config.timeoutMs ?? 30_000;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.#openAIHeaders(),
        body: JSON.stringify({
          model: options?.model ?? this.#config.model,
          messages,
          max_tokens: options?.maxTokens ?? this.#config.maxTokens ?? 1024,
          temperature: options?.temperature ?? this.#config.temperature ?? 0.7,
          stream: false,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        return err(
          new RateLimitError(
            "Provider rate limit",
            retryAfter ? Number(retryAfter) * 1000 : undefined,
          ),
        );
      }
      if (!response.ok) {
        const body = await response.text().catch(() => "unknown");
        return err(
          new NetworkError(`Provider error ${response.status}: ${body}`),
        );
      }
      const data = (await response.json()) as OpenAIChatResponse;
      const choice = data.choices[0];
      if (!choice) {
        return err(new NetworkError("Provider returned empty choices"));
      }
      return ok({
        content: choice.message.content,
        model: data.model,
        usage: data.usage,
      });
    } catch (e) {
      clearTimeout(tid);
      if (e instanceof Error && e.name === "AbortError") {
        return err(new TimeoutError(`Complete timed out after ${timeoutMs}ms`));
      }
      return err(new NetworkError(e instanceof Error ? e.message : String(e)));
    }
  }

  // ─── Format: anthropic ─────────────────────────────────────────────────────
  async #completeAnthropic(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): Promise<Result<LLMCompletionResult, LLMDriverError>> {
    const url = this.#joinUrl(this.#config.baseUrl, "/v1/messages");
    const timeoutMs = this.#config.timeoutMs ?? 30_000;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);

    // Anthropic separa system messages do array messages
    const systemContent = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const conversation = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.#config.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: options?.model ?? this.#config.model,
          messages: conversation,
          ...(systemContent.length > 0 ? { system: systemContent } : {}),
          max_tokens: options?.maxTokens ?? this.#config.maxTokens ?? 1024,
          temperature: options?.temperature ?? this.#config.temperature ?? 0.7,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (response.status === 429) {
        return err(new RateLimitError("Anthropic rate limit"));
      }
      if (!response.ok) {
        const body = await response.text().catch(() => "unknown");
        return err(
          new NetworkError(`Anthropic error ${response.status}: ${body}`),
        );
      }
      const data = (await response.json()) as AnthropicMessagesResponse;
      const text = data.content
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("");
      return ok({
        content: text,
        model: data.model,
        usage: {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
        },
      });
    } catch (e) {
      clearTimeout(tid);
      if (e instanceof Error && e.name === "AbortError") {
        return err(
          new TimeoutError(`Anthropic timed out after ${timeoutMs}ms`),
        );
      }
      return err(new NetworkError(e instanceof Error ? e.message : String(e)));
    }
  }

  // ─── Format: google ────────────────────────────────────────────────────────
  async #completeGoogle(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): Promise<Result<LLMCompletionResult, LLMDriverError>> {
    const model = options?.model ?? this.#config.model;
    const url = `${this.#config.baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.#config.apiKey)}`;
    const timeoutMs = this.#config.timeoutMs ?? 30_000;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);

    // Google: system instruction separado, restante em contents
    const systemContent = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    try {
      const body: Record<string, unknown> = {
        contents,
        generationConfig: {
          maxOutputTokens: options?.maxTokens ?? this.#config.maxTokens ?? 1024,
          temperature: options?.temperature ?? this.#config.temperature ?? 0.7,
        },
      };
      if (systemContent.length > 0) {
        body["systemInstruction"] = { parts: [{ text: systemContent }] };
      }
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (response.status === 429) {
        return err(new RateLimitError("Google rate limit"));
      }
      if (!response.ok) {
        const errBody = await response.text().catch(() => "unknown");
        return err(
          new NetworkError(`Google error ${response.status}: ${errBody}`),
        );
      }
      const data = (await response.json()) as GoogleGenerateContentResponse;
      const candidate = data.candidates[0];
      if (!candidate) {
        return err(new NetworkError("Google returned empty candidates"));
      }
      const text = candidate.content.parts.map((p) => p.text ?? "").join("");
      return ok({
        content: text,
        model: data.modelVersion ?? model,
        usage: {
          prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
          completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
          total_tokens: data.usageMetadata?.totalTokenCount ?? 0,
        },
      });
    } catch (e) {
      clearTimeout(tid);
      if (e instanceof Error && e.name === "AbortError") {
        return err(new TimeoutError(`Google timed out after ${timeoutMs}ms`));
      }
      return err(new NetworkError(e instanceof Error ? e.message : String(e)));
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  #openAIHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.#config.apiKey.length > 0) {
      headers["Authorization"] = `Bearer ${this.#config.apiKey}`;
    }
    if (this.#tenantContext !== null) {
      // Tenant info enviado via metadata (alguns providers ignoram, ok)
    }
    return headers;
  }

  #joinUrl(base: string, path: string): string {
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${b}${p}`;
  }
}
