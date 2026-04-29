import type {
  LLMDriver,
  LLMMessage,
  LLMCompletionOptions,
  ObservabilityDriver,
  TenantContext,
} from "@aethereos/drivers";

export interface InstrumentedChatOptions extends LLMCompletionOptions {
  spanName?: string;
  correlationId?: string;
}

type LLMCompleteResult = Awaited<ReturnType<LLMDriver["complete"]>>;

/**
 * instrumentedChat — wrapper obrigatório para toda chamada LLM (P15, ADR-0014 #6).
 *
 * Toda feature LLM usa este helper, nunca chama LLMDriver.complete() diretamente.
 * Registra span de observabilidade, custo, latência e correlation_id.
 */
export async function instrumentedChat(
  llm: LLMDriver,
  obs: ObservabilityDriver,
  messages: LLMMessage[],
  options?: InstrumentedChatOptions,
  tenantContext?: TenantContext,
): Promise<LLMCompleteResult> {
  if (tenantContext !== undefined) {
    llm.withTenant(tenantContext);
    obs.withTenant(tenantContext);
  }

  const spanName = options?.spanName ?? "llm.complete";
  const span = obs.startSpan(spanName, {
    attributes: {
      "llm.model": options?.model ?? "default",
      "llm.max_tokens": options?.maxTokens ?? 1024,
      ...(options?.correlationId !== undefined
        ? { correlation_id: options.correlationId }
        : {}),
    },
  });

  const startMs = Date.now();
  const result = await llm.complete(messages, options);
  const latencyMs = Date.now() - startMs;

  if (result.ok) {
    span.setAttribute("llm.prompt_tokens", result.value.usage.prompt_tokens);
    span.setAttribute(
      "llm.completion_tokens",
      result.value.usage.completion_tokens,
    );
    span.setAttribute("llm.total_tokens", result.value.usage.total_tokens);
    span.setAttribute("llm.cost_usd", result.value.cost_usd ?? 0);
    span.setAttribute("llm.latency_ms", latencyMs);
    span.setStatus("ok");
    obs.recordHistogram("llm.latency_ms", latencyMs, {
      labels: { model: result.value.model },
    });
    obs.recordHistogram("llm.cost_usd", result.value.cost_usd ?? 0, {
      labels: { model: result.value.model },
    });
    obs.incrementCounter("llm.requests.success", 1, {
      labels: { model: result.value.model },
    });
  } else {
    span.setAttribute("llm.latency_ms", latencyMs);
    span.setStatus("error", result.error.message);
    obs.incrementCounter("llm.requests.error", 1, {
      labels: { error: result.error.name },
    });
  }

  span.end();
  return result;
}
