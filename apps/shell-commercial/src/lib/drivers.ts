import {
  SupabaseBrowserAuthDriver,
  SupabaseBrowserDataDriver,
} from "@aethereos/drivers-supabase/browser";
import { LiteLLMDriver } from "@aethereos/drivers-litellm";
import type { LLMDriver, ObservabilityDriver } from "@aethereos/drivers";
import {
  withDegradedLLM,
  withDegradedObservability,
  DegradedObservabilityDriver,
} from "@aethereos/kernel";

export interface CloudDrivers {
  auth: SupabaseBrowserAuthDriver;
  data: SupabaseBrowserDataDriver;
  llm: LLMDriver;
  obs: ObservabilityDriver;
}

export function buildDrivers(): CloudDrivers {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const litellmUrl =
    import.meta.env["VITE_LITELLM_URL"] ?? "http://localhost:4000";
  const litellmKey = import.meta.env["VITE_LITELLM_KEY"] ?? "sk-dev";

  const primaryLLM = new LiteLLMDriver({
    baseUrl: litellmUrl,
    masterKey: litellmKey,
    defaultModel: "claude-3-5-sonnet",
    timeoutMs: 30_000,
  });

  return {
    auth: new SupabaseBrowserAuthDriver({ supabaseUrl, supabaseAnonKey }),
    data: new SupabaseBrowserDataDriver({ supabaseUrl, supabaseAnonKey }),
    llm: withDegradedLLM(primaryLLM),
    obs: withDegradedObservability(new DegradedObservabilityDriver()),
  };
}
