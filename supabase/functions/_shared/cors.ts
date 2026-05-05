// Sprint 27 MX142: CORS centralizado por allowlist via env var.
// ALLOWED_ORIGINS=comma-separated lista absoluta. Em dev (sem env), libera
// localhost:* via fallback.

const DEFAULT_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

function parseAllowed(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS");
  if (raw === undefined || raw.trim() === "") return DEFAULT_DEV_ORIGINS;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = parseAllowed();
  const accept =
    origin !== null && allowed.includes(origin) ? origin : (allowed[0] ?? "*");
  return {
    "Access-Control-Allow-Origin": accept,
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  };
}

export function handlePreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  const origin = req.headers.get("origin");
  return new Response("ok", { headers: corsHeaders(origin) });
}
