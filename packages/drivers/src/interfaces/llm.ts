import type { Result } from "../types/result.js";
import type { TenantContext } from "../types/tenant-context.js";
import type {
  RateLimitError,
  TimeoutError,
  NetworkError,
  ValidationError,
} from "../errors.js";

export type LLMDriverError =
  | RateLimitError
  | TimeoutError
  | NetworkError
  | ValidationError;

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface LLMCompletionResult {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost_usd?: number;
}

export interface LLMEmbeddingResult {
  embedding: number[];
  model: string;
  usage: { total_tokens: number };
}

/**
 * LLMDriver — contrato para chamadas a modelos de linguagem.
 *
 * Implementação: via LiteLLM gateway (ADR-0014 #6 [DEC]).
 * NUNCA chamar openai/anthropic SDK diretamente sem passar pelo gateway
 * (CLAUDE.md seção 5, bloqueio de CI).
 *
 * LiteLLM centraliza: rate limiting, custo por tenant, fallback automático,
 * roteamento adaptativo. Langfuse self-hosted para traces e custo por tenant.
 *
 * P15: toda feature com LLM declara custo, latência, fallback, kill switch,
 * quota e métricas de qualidade antes do merge.
 *
 * Ref: Fundamentação P15 [INV], ADR-0014 #6, LLM_OPEX_GUIDELINES.md
 */
export interface LLMDriver {
  /** Contexto de tenant para billing e observabilidade por tenant */
  withTenant(context: TenantContext): void;

  /** Completion (não-streaming) */
  complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): Promise<Result<LLMCompletionResult, LLMDriverError>>;

  /** Gera embedding vetorial para conteúdo */
  embed(
    content: string,
    model?: string,
  ): Promise<Result<LLMEmbeddingResult, LLMDriverError>>;

  ping(): Promise<Result<void, LLMDriverError>>;
}
