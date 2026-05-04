// Edge Function: context-snapshot
// Sprint 19 MX100. Agrega o contexto de uma entidade (records + audit + embeddings)
// e emite SCP context.snapshot.ready.
//
// POST /functions/v1/context-snapshot
// Body: { entity_type: string, entity_id: uuid }
// Auth: Bearer JWT (authenticated) com active_company_id no payload.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ENTITY_TYPES = new Set([
  "person",
  "file",
  "channel",
  "agent",
  "company",
]);

interface RequestBody {
  entity_type: string;
  entity_id: string;
}

interface ContextRecord {
  record_type: string;
  version: number;
  data: Record<string, unknown>;
  updated_at: string;
}

interface AuditEntry {
  event_type: string;
  created_at: string;
  payload_preview: Record<string, unknown>;
}

interface SnapshotResponse {
  entity_type: string;
  entity_id: string;
  records: ContextRecord[];
  related_events: AuditEntry[];
  embedding_count: number;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split(".");
  if (parts.length !== 3) return {};
  try {
    const b64 = (parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return jsonResponse({ error: "method not allowed" }, 405);

  // 1. JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "missing authorization header" }, 401);
  }
  const jwt = authHeader.slice(7);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(jwt);

  if (authError !== null || user === null) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  // 2. company_id do JWT
  const jwtPayload = decodeJwtPayload(jwt);
  const companyId =
    typeof jwtPayload["active_company_id"] === "string"
      ? jwtPayload["active_company_id"]
      : null;

  if (companyId === null || !isUuid(companyId)) {
    return jsonResponse({ error: "no active_company_id in JWT" }, 400);
  }

  // 3. Body
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }

  const { entity_type, entity_id } = body;
  if (
    typeof entity_type !== "string" ||
    !ALLOWED_ENTITY_TYPES.has(entity_type)
  ) {
    return jsonResponse(
      {
        error: `entity_type invalido. Permitidos: ${[...ALLOWED_ENTITY_TYPES].join(", ")}`,
      },
      400,
    );
  }
  if (!isUuid(entity_id)) {
    return jsonResponse({ error: "entity_id deve ser UUID" }, 400);
  }

  // 4. Queries — service_role para bypass de RLS (controle ja feito pelo company_id no WHERE)
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: recordsRows, error: recordsErr } = await adminClient
    .schema("kernel")
    .from("context_records")
    .select("record_type, version, data, updated_at")
    .eq("company_id", companyId)
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id);

  if (recordsErr !== null) {
    console.error("[context-snapshot] records query error", recordsErr);
    return jsonResponse({ error: "falha ao buscar context_records" }, 500);
  }

  const { data: auditRows, error: auditErr } = await adminClient
    .schema("kernel")
    .from("audit_log")
    .select("action, created_at, payload")
    .eq("company_id", companyId)
    .eq("resource_id", entity_id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (auditErr !== null) {
    console.error("[context-snapshot] audit query error", auditErr);
    return jsonResponse({ error: "falha ao buscar audit_log" }, 500);
  }

  const { count: embeddingCount, error: embedErr } = await adminClient
    .schema("kernel")
    .from("embeddings")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("source_id", entity_id);

  if (embedErr !== null) {
    console.error("[context-snapshot] embeddings count error", embedErr);
    return jsonResponse({ error: "falha ao contar embeddings" }, 500);
  }

  // 5. Build response
  const records: ContextRecord[] = (recordsRows ?? []).map(
    (r: {
      record_type: string;
      version: number;
      data: Record<string, unknown>;
      updated_at: string;
    }) => ({
      record_type: r.record_type,
      version: r.version,
      data: r.data ?? {},
      updated_at: r.updated_at,
    }),
  );

  const related_events: AuditEntry[] = (auditRows ?? []).map(
    (a: {
      action: string;
      created_at: string;
      payload: Record<string, unknown>;
    }) => ({
      event_type: a.action,
      created_at: a.created_at,
      payload_preview: previewPayload(a.payload),
    }),
  );

  const response: SnapshotResponse = {
    entity_type,
    entity_id,
    records,
    related_events,
    embedding_count: embeddingCount ?? 0,
  };

  // 6. Emite SCP context.snapshot.ready (best-effort — nao falha se nao conseguir)
  try {
    const eventId = crypto.randomUUID();
    const occurredAt = new Date().toISOString();
    const envelope = {
      id: eventId,
      type: "context.snapshot.ready",
      version: "1",
      tenant_id: companyId,
      actor: { type: "human", user_id: user.id },
      correlation_id: eventId, // sem causation_id externa, usa o proprio id
      payload: {
        entity_type,
        entity_id,
        records_count: records.length,
        events_count: related_events.length,
        embedding_count: response.embedding_count,
      },
      occurred_at: occurredAt,
      schema_version: "1",
    };
    await adminClient.schema("kernel").from("scp_outbox").insert({
      company_id: companyId,
      event_type: "context.snapshot.ready",
      event_id: eventId,
      payload: envelope.payload,
      envelope,
      status: "pending",
    });
  } catch (e) {
    console.warn("[context-snapshot] failed to emit SCP", String(e));
    // nao bloqueia a resposta
  }

  return jsonResponse(response, 200);
});

function previewPayload(p: Record<string, unknown>): Record<string, unknown> {
  if (p === null || typeof p !== "object") return {};
  const out: Record<string, unknown> = {};
  let i = 0;
  for (const [k, v] of Object.entries(p)) {
    if (i++ >= 5) break; // limite top-level keys
    if (typeof v === "string" && v.length > 200) {
      out[k] = v.slice(0, 200) + "…";
    } else {
      out[k] = v;
    }
  }
  return out;
}
