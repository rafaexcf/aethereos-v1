// Sprint 31 / MX171 — Health endpoint (Gate 5).
//
// Endpoint público (R9: NÃO requer autenticação). Permite que monitores
// externos (BetterUptime, UptimeRobot etc.) façam ping a cada 5 min.
//
// GET https://<project>.supabase.co/functions/v1/health
//
// Response (200):
// {
//   "status": "ok",
//   "timestamp": "2026-05-05T12:34:56.789Z",
//   "version": "1.0.0",
//   "db": "connected",
//   "uptime_seconds": 12345
// }
//
// Em caso de erro de banco: status=degraded, db=error, http 200 mesmo assim
// (o monitor recebe 200 + payload com status, e podemos alertar via parsing
// JSON ao invés de HTTP code — evita falso positivo durante deploy de DB).

import { createClient } from "npm:@supabase/supabase-js@2";

const STARTED_AT = Date.now();
const VERSION = "1.0.0";

const ALLOW_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: ALLOW_HEADERS });
  }
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ status: "error", message: "method not allowed" }),
      { status: 405, headers: ALLOW_HEADERS },
    );
  }

  const timestamp = new Date().toISOString();
  const uptimeSeconds = Math.floor((Date.now() - STARTED_AT) / 1000);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  let db: "connected" | "error" = "error";
  let dbError: string | undefined;

  if (
    typeof supabaseUrl === "string" &&
    supabaseUrl !== "" &&
    typeof serviceKey === "string" &&
    serviceKey !== ""
  ) {
    try {
      const client = createClient(supabaseUrl, serviceKey);
      // SELECT 1 via tabela disponível ao service_role.
      // kernel.scp_outbox tem grant para service_role e existe desde o dia 1.
      const { error } = await client
        .schema("kernel")
        .from("scp_outbox")
        .select("id", { head: true, count: "exact" })
        .limit(1);
      if (error === null) {
        db = "connected";
      } else {
        dbError = error.message;
      }
    } catch (e) {
      dbError = e instanceof Error ? e.message : String(e);
    }
  } else {
    dbError = "service role key não configurada";
  }

  // Super Sprint B / MX212 — NATS status reportado pelo health endpoint.
  // 'not_configured' = NATS_URL não setado no Edge Function env (esperado
  // em produção atual — Vercel + Supabase Cloud sem NATS server).
  // 'connected' / 'disconnected' apenas se um NATS_URL estiver presente
  // e tivermos validado a conexão (não fazemos ping aqui no endpoint;
  // status NATS real vem do worker, que faz reconnect próprio).
  const natsUrl = Deno.env.get("NATS_URL");
  const nats: "not_configured" | "configured" =
    typeof natsUrl === "string" && natsUrl !== ""
      ? "configured"
      : "not_configured";

  const status: "ok" | "degraded" = db === "connected" ? "ok" : "degraded";
  const body: Record<string, unknown> = {
    status,
    timestamp,
    version: VERSION,
    db,
    nats,
    uptime_seconds: uptimeSeconds,
  };
  if (dbError !== undefined) {
    body["db_error"] = dbError;
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: ALLOW_HEADERS,
  });
});
