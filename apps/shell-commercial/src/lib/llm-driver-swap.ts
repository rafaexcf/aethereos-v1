import type {
  LLMDriver,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMEmbeddingResult,
  Result,
  TenantContext,
} from "@aethereos/drivers";

type LLMDriverError =
  Awaited<ReturnType<LLMDriver["complete"]>> extends Result<unknown, infer E>
    ? E
    : never;

/**
 * Wrapper que delega todas as chamadas LLM para um backing driver mutavel.
 * Permite swap em runtime (ex: usuario salva nova BYOK config) sem precisar
 * recarregar pagina ou re-injetar driver via Context.
 *
 * Sprint 15 MX75 — drivers.llm e instancia desta classe; useLLMConfigLifecycle
 * faz setBacking quando llm_config pref muda.
 */
export class LLMDriverSwap implements LLMDriver {
  #backing: LLMDriver;
  #tenantContext: TenantContext | null = null;

  constructor(initial: LLMDriver) {
    this.#backing = initial;
  }

  setBacking(driver: LLMDriver): void {
    this.#backing = driver;
    if (this.#tenantContext !== null) {
      driver.withTenant(this.#tenantContext);
    }
  }

  withTenant(context: TenantContext): void {
    this.#tenantContext = context;
    this.#backing.withTenant(context);
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions,
  ): Promise<Result<LLMCompletionResult, LLMDriverError>> {
    return this.#backing.complete(messages, options);
  }

  async embed(
    content: string,
    model?: string,
  ): Promise<Result<LLMEmbeddingResult, LLMDriverError>> {
    return this.#backing.embed(content, model);
  }

  async ping(): Promise<Result<void, LLMDriverError>> {
    return this.#backing.ping();
  }
}
