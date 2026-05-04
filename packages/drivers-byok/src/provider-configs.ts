import type { BYOKConfig, BYOKFormat } from "./byok-llm-driver.js";
import { BYOKLLMDriver } from "./byok-llm-driver.js";

/**
 * IDs canonicos de providers suportados. Cada um tem um preset que pre-preenche
 * baseUrl + format + modelos sugeridos.
 */
export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "mistral"
  | "openrouter"
  | "together"
  | "lmstudio"
  | "ollama"
  | "custom";

export interface ProviderPreset {
  id: ProviderId;
  label: string;
  format: BYOKFormat;
  baseUrl: string;
  models: string[];
  requiresKey: boolean;
  docsUrl?: string;
  hint?: string;
}

export interface ValidateResult {
  ok: boolean;
  models?: string[];
  error?: string;
}

/**
 * Registry de presets — pre-preenche baseUrl + format + modelos sugeridos
 * + docsUrl + hint UX. Models sao sugestoes (a UI permite custom override).
 * Para LM Studio / Ollama, fetchAvailableModels() detecta os locais.
 */
export const PROVIDER_PRESETS: Record<ProviderId, ProviderPreset> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    format: "openai",
    baseUrl: "https://api.openai.com/v1",
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
      "o1",
      "o1-mini",
    ],
    requiresKey: true,
    docsUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    format: "anthropic",
    baseUrl: "https://api.anthropic.com",
    models: [
      "claude-sonnet-4-20250514",
      "claude-3-5-sonnet-20241022",
      "claude-3-haiku-20240307",
    ],
    requiresKey: true,
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  google: {
    id: "google",
    label: "Google Gemini",
    format: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    requiresKey: true,
    docsUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    id: "groq",
    label: "Groq",
    format: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
    ],
    requiresKey: true,
    docsUrl: "https://console.groq.com/keys",
  },
  mistral: {
    id: "mistral",
    label: "Mistral AI",
    format: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    models: [
      "mistral-large-latest",
      "mistral-small-latest",
      "open-mistral-nemo",
    ],
    requiresKey: true,
    docsUrl: "https://console.mistral.ai/api-keys",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    format: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "meta-llama/llama-3.1-70b-instruct",
    ],
    requiresKey: true,
    docsUrl: "https://openrouter.ai/keys",
  },
  together: {
    id: "together",
    label: "Together AI",
    format: "openai",
    baseUrl: "https://api.together.xyz/v1",
    models: [
      "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
    ],
    requiresKey: true,
    docsUrl: "https://api.together.xyz/settings/api-keys",
  },
  lmstudio: {
    id: "lmstudio",
    label: "LM Studio (Local)",
    format: "openai",
    baseUrl: "http://localhost:1234/v1",
    models: [],
    requiresKey: false,
    docsUrl: "https://lmstudio.ai",
    hint: "Inicie o LM Studio e ative o servidor local na porta 1234. Modelos detectados via Detectar modelos.",
  },
  ollama: {
    id: "ollama",
    label: "Ollama (Local)",
    format: "openai",
    baseUrl: "http://localhost:11434/v1",
    models: [],
    requiresKey: false,
    docsUrl: "https://ollama.com",
    hint: "Instale e inicie o Ollama. Baixe modelos com: ollama pull llama3.1.",
  },
  custom: {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    format: "openai",
    baseUrl: "",
    models: [],
    requiresKey: true,
    hint: "Qualquer endpoint que aceite formato OpenAI /v1/chat/completions.",
  },
};

export function getPreset(id: ProviderId): ProviderPreset {
  return PROVIDER_PRESETS[id];
}

/**
 * Valida BYOKConfig com um round-trip real: faz ping() (se aplicavel) +
 * complete() com mensagem minima para confirmar que a chave funciona +
 * o modelo existe + a rede chega no endpoint.
 *
 * Retorna {ok:true} com models opcionais (para LM Studio/Ollama, lista
 * detectada localmente). Em erro, retorna mensagem amigavel.
 */
export async function validateConfig(
  config: BYOKConfig,
): Promise<ValidateResult> {
  try {
    const driver = new BYOKLLMDriver(config);

    // Para locais (LM Studio/Ollama), tentamos descobrir modelos antes do
    // complete() — assim a UI ja mostra opcoes mesmo se o complete falhar
    // por modelo invalido.
    let models: string[] | undefined;
    if (
      config.baseUrl.includes("localhost") ||
      config.baseUrl.includes("127.0.0.1")
    ) {
      const detected = await fetchAvailableModels(config.baseUrl);
      if (detected.length > 0) models = detected;
    }

    // Ping primeiro — barato, falha rapido se rede/auth quebrada.
    const ping = await driver.ping();
    if (!ping.ok) {
      return {
        ok: false,
        error: friendlyError(ping.error.message, config),
        ...(models !== undefined ? { models } : {}),
      };
    }

    // Complete real com mensagem minima — confirma chave + modelo + endpoint.
    const completion = await driver.complete(
      [{ role: "user", content: "ping" }],
      { maxTokens: 5 },
    );
    if (!completion.ok) {
      return {
        ok: false,
        error: friendlyError(completion.error.message, config),
        ...(models !== undefined ? { models } : {}),
      };
    }

    return models !== undefined ? { ok: true, models } : { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * GET /models — funciona para qualquer endpoint OpenAI-compatible
 * (LM Studio, Ollama, OpenAI, OpenRouter etc retornam {data:[{id,...}]}).
 * Usado primariamente para LM Studio/Ollama (descobrir o que o user
 * tem baixado localmente). Para cloud, melhor usar PROVIDER_PRESETS.models.
 */
export async function fetchAvailableModels(baseUrl: string): Promise<string[]> {
  const b = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  try {
    const response = await fetch(`${b}/models`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { data?: Array<{ id: string }> };
    return (data.data ?? []).map((m) => m.id);
  } catch {
    return [];
  }
}

function friendlyError(raw: string, config: BYOKConfig): string {
  if (raw.includes("401") || raw.includes("Unauthorized")) {
    return (
      "Chave de API invalida ou expirada. Verifique em " +
      (PROVIDER_PRESETS[detectProvider(config)]?.docsUrl ?? config.baseUrl)
    );
  }
  if (raw.includes("403")) {
    return (
      "Acesso negado. Verifique se a chave tem permissao para o modelo " +
      config.model
    );
  }
  if (raw.includes("404")) {
    return "Modelo " + config.model + " nao encontrado neste endpoint.";
  }
  if (raw.includes("429")) {
    return "Limite de uso (rate limit) excedido. Aguarde alguns segundos e tente novamente.";
  }
  if (
    raw.includes("ENOTFOUND") ||
    raw.includes("ECONNREFUSED") ||
    raw.includes("Failed to fetch")
  ) {
    if (
      config.baseUrl.includes("localhost") ||
      config.baseUrl.includes("127.0.0.1")
    ) {
      return (
        "Servidor local nao respondeu em " +
        config.baseUrl +
        ". Verifique se LM Studio/Ollama esta rodando."
      );
    }
    return "Nao foi possivel conectar a " + config.baseUrl;
  }
  return raw;
}

function detectProvider(config: BYOKConfig): ProviderId {
  for (const [id, preset] of Object.entries(PROVIDER_PRESETS)) {
    if (preset.baseUrl === config.baseUrl) return id as ProviderId;
  }
  return "custom";
}
