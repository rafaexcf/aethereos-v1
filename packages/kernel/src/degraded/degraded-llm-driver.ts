import type {
  LLMDriver,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMEmbeddingResult,
  TenantContext,
} from "@aethereos/drivers";
import { ok } from "@aethereos/drivers";

const DEGRADED_COMPLETION: LLMCompletionResult = {
  content: "",
  model: "degraded",
  usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  cost_usd: 0,
};

const DEGRADED_EMBEDDING: LLMEmbeddingResult = {
  embedding: [],
  model: "degraded",
  usage: { total_tokens: 0 },
};

/**
 * DegradedLLMDriver — fallback conservativo quando LiteLLM está indisponível (P14).
 * Retorna respostas vazias sem propagar erro para o caller.
 * O caller deve checar `result.value.model === "degraded"` para saber do estado.
 */
export class DegradedLLMDriver implements LLMDriver {
  withTenant(_context: TenantContext): void {}

  async complete(_messages: LLMMessage[], _options?: LLMCompletionOptions) {
    return ok(DEGRADED_COMPLETION);
  }

  async embed(_content: string, _model?: string) {
    return ok(DEGRADED_EMBEDDING);
  }

  async ping() {
    return ok(undefined);
  }
}
