import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "";
const SUPABASE_SERVICE_KEY = process.env["SUPABASE_SERVICE_KEY"] ?? "";

function assertLocalOnly(): void {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL não definida. Configure .env.local.");
  }
  // Recusa rodar se URL aponta para Supabase cloud (não localhost)
  if (
    !SUPABASE_URL.includes("localhost") &&
    !SUPABASE_URL.includes("127.0.0.1")
  ) {
    throw new Error(
      `[seed] RECUSADO: SUPABASE_URL='${SUPABASE_URL}' não é localhost.\n` +
        "Seed só roda contra banco local de desenvolvimento.",
    );
  }
  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.includes("replace-me")) {
    throw new Error(
      "SUPABASE_SERVICE_KEY não configurada. Obtenha via: supabase status",
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
