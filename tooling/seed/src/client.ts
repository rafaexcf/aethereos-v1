import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "";
// Sprint 24 MX134: aceita ambos os nomes. SUPABASE_SERVICE_ROLE_KEY tem
// PRECEDENCIA (usado em staging deploy contra cloud). SUPABASE_SERVICE_KEY
// eh o legacy do banco local — fica como fallback. Importante: senao a
// chave local-demo de .env.local sobrescreve a cloud key passada explicita.
const SUPABASE_SERVICE_KEY =
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
  process.env["SUPABASE_SERVICE_KEY"] ??
  "";
const ALLOW_CLOUD_SEED = process.env["ALLOW_CLOUD_SEED"] === "true";

function assertLocalOnly(): void {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL não definida. Configure .env.local.");
  }
  // Recusa rodar se URL aponta para Supabase cloud (não localhost) — exceto
  // se ALLOW_CLOUD_SEED=true (opt-in explicito p/ staging deploy, MX134).
  if (
    !ALLOW_CLOUD_SEED &&
    !SUPABASE_URL.includes("localhost") &&
    !SUPABASE_URL.includes("127.0.0.1")
  ) {
    throw new Error(
      `[seed] RECUSADO: SUPABASE_URL='${SUPABASE_URL}' não é localhost.\n` +
        "Seed só roda contra banco local de desenvolvimento.\n" +
        "Para rodar contra cloud (staging deploy), set ALLOW_CLOUD_SEED=true.",
    );
  }
  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.includes("replace-me")) {
    throw new Error(
      "SUPABASE_SERVICE_KEY (ou SUPABASE_SERVICE_ROLE_KEY) não configurada. " +
        "Obtenha via: supabase status (local) ou supabase projects api-keys (cloud)",
    );
  }
}

assertLocalOnly();

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "kernel" },
});

// Helper para ignorar erros de conflito (seed idempotente)
export function ignoreConflict(error: { code?: string } | null): boolean {
  return error?.code === "23505"; // unique_violation
}

export { SUPABASE_URL };
