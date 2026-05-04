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

// MX73 preenche o registry completo e a logica de validate/fetchAvailableModels.
// Stub minimo aqui para o package compilar sozinho em MX72.
export const PROVIDER_PRESETS: Record<ProviderId, ProviderPreset> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    format: "openai",
    baseUrl: "https://api.openai.com/v1",
    models: [],
    requiresKey: true,
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    format: "anthropic",
    baseUrl: "https://api.anthropic.com",
    models: [],
    requiresKey: true,
  },
  google: {
    id: "google",
    label: "Google Gemini",
    format: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: [],
    requiresKey: true,
  },
  groq: {
    id: "groq",
    label: "Groq",
    format: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [],
    requiresKey: true,
  },
  mistral: {
    id: "mistral",
    label: "Mistral AI",
    format: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    models: [],
    requiresKey: true,
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    format: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [],
    requiresKey: true,
  },
  together: {
    id: "together",
    label: "Together AI",
    format: "openai",
    baseUrl: "https://api.together.xyz/v1",
    models: [],
    requiresKey: true,
  },
  lmstudio: {
    id: "lmstudio",
    label: "LM Studio (Local)",
    format: "openai",
    baseUrl: "http://localhost:1234/v1",
    models: [],
    requiresKey: false,
  },
  ollama: {
    id: "ollama",
    label: "Ollama (Local)",
    format: "openai",
    baseUrl: "http://localhost:11434/v1",
    models: [],
    requiresKey: false,
  },
  custom: {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    format: "openai",
    baseUrl: "",
    models: [],
    requiresKey: true,
  },
};

export function getPreset(id: ProviderId): ProviderPreset {
  return PROVIDER_PRESETS[id];
}

/**
 * Valida config tentando ping(). Retorna ok com models opcionais se sucesso,
 * ou error com mensagem clara. MX73 expande comportamento.
 */
export async function validateConfig(
  config: BYOKConfig,
): Promise<ValidateResult> {
  try {
    const driver = new BYOKLLMDriver(config);
    const result = await driver.ping();
    if (!result.ok) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Para LM Studio / Ollama: GET /models retorna modelos baixados localmente.
 * MX73 expande tratamento de erros e formato.
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
