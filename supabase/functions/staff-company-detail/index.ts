// Edge Function: staff-company-detail
// REQUIRES service_role — nunca expor ao browser diretamente.
// Retorna detalhes de uma company específica para staff Aethereos.
// Verifica is_staff=true antes de qualquer query.
// Envia notificação ao owner da company ao acessar (transparência obrigatória).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
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

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}

Deno.serve(async (req: Request): Promise<Response> => {
  const pf = handlePreflight(req);
  if (pf !== null) return pf;

  const origin = req.headers.get("origin");

  if (req.method !== "GET") {
    return jsonResponse({ error: "method not allowed" }, 405, origin);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "missing authorization header" }, 401, origin);
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
    return jsonResponse({ error: "unauthorized" }, 401, origin);
  }

  const payload = decodeJwtPayload(jwt);
  if (payload["is_staff"] !== true) {
    return jsonResponse(
      { error: "forbidden: requires staff role" },
      403,
      origin,
    );
  }

  const staffUserId = user.id;

  const url = new URL(req.url);
  const companyId = url.searchParams.get("company_id");
  if (!isUuid(companyId)) {
    return jsonResponse(
      { error: "company_id obrigatório e deve ser um UUID válido" },
      400,
      origin,
    );
  }

  // REQUIRES service_role — bypassa RLS para acessar qualquer company
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Query: company + memberships + evento stats (últimos 7 dias)
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [companyResult, memberCountResult, eventCountResult, recentAccessLog] =
    await Promise.all([
      adminClient
        .schema("kernel")
        .from("companies")
        .select("id, slug, name, plan, status, created_at, updated_at")
        .eq("id", companyId)
        .single(),

      adminClient
        .schema("kernel")
        .from("tenant_memberships")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId),

      adminClient
        .schema("kernel")
        .from("scp_outbox")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", sevenDaysAgo),

      adminClient
        .schema("kernel")
        .from("staff_access_log")
        .select("id, staff_user_id, action, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  if (companyResult.error !== null) {
    if (companyResult.error.code === "PGRST116") {
      return jsonResponse({ error: "company não encontrada" }, 404, origin);
    }
    console.error("[staff-company-detail] company query error", {
      staff_user_id: staffUserId,
      company_id: companyId,
      error: companyResult.error.message,
    });
    return jsonResponse({ error: "falha ao buscar company" }, 500, origin);
  }

  // Buscar owner para notificação
  const { data: ownerMembership } = await adminClient
    .schema("kernel")
    .from("tenant_memberships")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("role", "owner")
    .limit(1)
    .single();

  // Audit: registra acesso específico à company
  await adminClient.schema("kernel").from("staff_access_log").insert({
    staff_user_id: staffUserId,
    company_id: companyId,
    action: "company.viewed",
  });

  // Notificação ao owner (transparência obrigatória — CLAUDE.md §8)
  if (ownerMembership !== null) {
    await adminClient
      .schema("kernel")
      .from("notifications")
      .insert({
        user_id: ownerMembership.user_id,
        company_id: companyId,
        type: "staff_access",
        title: "Acesso Staff à sua empresa",
        body: "Um membro da equipe Aethereos acessou os dados da sua empresa.",
        metadata: { staff_user_id: staffUserId, action: "company.viewed" },
      });
  }

  return jsonResponse(
    {
      company: companyResult.data,
      metrics: {
        member_count: memberCountResult.count ?? 0,
        events_last_7d: eventCountResult.count ?? 0,
      },
      recent_access_log: recentAccessLog.data ?? [],
    },
    200,
    origin,
  );
});
