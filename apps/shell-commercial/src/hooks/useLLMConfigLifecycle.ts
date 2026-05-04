import { useEffect } from "react";
import { BYOKLLMDriver, type BYOKConfig } from "@aethereos/drivers-byok";
import { withDegradedLLM } from "@aethereos/kernel";
import { useDrivers } from "../lib/drivers-context";
import { buildLiteLLMFallback } from "../lib/drivers";
import { useUserPreference } from "./useUserPreference";

interface LLMConfigPref {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface ProviderFormatMap {
  [providerId: string]: BYOKConfig["format"];
}

const FORMAT_BY_PROVIDER: ProviderFormatMap = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  groq: "openai",
  mistral: "openai",
  openrouter: "openai",
  together: "openai",
  lmstudio: "openai",
  ollama: "openai",
  custom: "openai",
};

const DEFAULT_LLM_CONFIG: LLMConfigPref = {
  provider: "openai",
  baseUrl: "",
  apiKey: "",
  model: "",
};

/**
 * Sprint 15 MX75 — orquestra prioridade BYOK > LiteLLM > Degraded.
 *
 * Le user_preferences.llm_config; se preenchido (baseUrl + model + chave
 * quando exigida), constroi BYOKLLMDriver wrappado com withDegradedLLM e
 * faz swap no drivers.llm (LLMDriverSwap). Se nao configurado, mantem
 * LiteLLM fallback. Reativo: muda em tempo real quando user salva nova
 * config na pagina de IA das Configuracoes.
 *
 * Mounted em OSDesktop ao lado de useNotificationsLifecycle / etc.
 */
export function useLLMConfigLifecycle(): void {
  const drivers = useDrivers();
  const llmConfigPref = useUserPreference<LLMConfigPref>(
    "llm_config",
    DEFAULT_LLM_CONFIG,
  );

  const cfg = llmConfigPref.value;

  useEffect(() => {
    if (drivers === null) return;

    const isConfigured = cfg.baseUrl.length > 0 && cfg.model.length > 0;
    const isLocal =
      cfg.baseUrl.includes("localhost") || cfg.baseUrl.includes("127.0.0.1");
    const hasKeyOrIsLocal = cfg.apiKey.length > 0 || isLocal;

    if (isConfigured && hasKeyOrIsLocal) {
      const format = FORMAT_BY_PROVIDER[cfg.provider] ?? "openai";
      const byokConfig: BYOKConfig = {
        format,
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model,
        timeoutMs: 30_000,
      };
      const byok = new BYOKLLMDriver(byokConfig);
      drivers.llm.setBacking(withDegradedLLM(byok));
    } else {
      // Reverte ao fallback LiteLLM se user limpou a config
      drivers.llm.setBacking(buildLiteLLMFallback());
    }
  }, [drivers, cfg.provider, cfg.baseUrl, cfg.apiKey, cfg.model]);
}
