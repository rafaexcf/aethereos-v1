// Edge Function: force-logout (Sprint 30 MX165)
// Encerra todas as sessões ativas de um user dentro da company do caller.
// Owner/admin only. Marca kernel.login_history.is_active=false + logout_at=now().
//
// Decisão R12 (MVP): Supabase Auth admin.signOut(jwt) requer JWT do target,
// que não temos. admin.updateUserById(user_id, { ban_duration }) revoga tokens
// mas afeta TODAS as companies do user (cross-tenant). Optamos por flag de
// inativação no kernel.login_history — shell consulta no boot/poll e
// desconecta se a entrada foi inativada. Trade-off: efeito não é instantâneo
// (depende do polling do shell), mas é tenant-isolated e reversível.
//
// Body: { user_id: string, all_other_for_self?: boolean }
//   - all_other_for_self=true  → encerra todas as sessões do CALLER exceto a
//     atual (caller=user_id implícito, qualquer membership ativo).
//   - all_other_for_self=false → encerra todas as sessões do user_id alvo
//     (requer caller owner/admin).
//
// Ref: SPRINT_30_PROMPT.md — segurança enterprise

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

interface ForceLogoutBody {
  user_id?: string;
  all_other_for_self?: boolean;
  current_session_id?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const pf = handlePreflight(req);
  if (pf !== null) return pf;

  const cors = corsHeaders(req.headers.get("origin"));
  const json = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // 1. Auth caller via JWT.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Missing or invalid Authorization header" });
  }
  const jwt = authHeader.slice(7);

  const userClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(jwt);
  if (authError !== null || user === null) {
    return json(401, { error: "Unauthorized" });
  }

  // 2. Rate limit: 10 force-logouts/hora por caller.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rl = await checkRateLimit(admin, user.id, "force-logout", 10, 3600);
  if (!rl.allowed) {
    return rateLimitResponse(rl, cors);
  }

  // 3. Body parse.
  let body: ForceLogoutBody;
  try {
    body = (await req.json()) as ForceLogoutBody;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const targetUserId = body.user_id?.trim() ?? "";
  const allOtherForSelf = body.all_other_for_self === true;
  const currentSessionId = body.current_session_id?.trim() ?? "";

  if (
    targetUserId === "" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      targetUserId,
    )
  ) {
    return json(400, { error: "user_id inválido (uuid esperado)" });
  }

  // 4. Resolve company_id ativo do caller (membership owner/admin).
  const { data: callerMembership, error: callerErr } = await admin
    .schema("kernel")
    .from("tenant_memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (callerErr !== null || callerMembership === null) {
    return json(403, { error: "Sem membership ativa" });
  }

  const callerRole = (callerMembership as { role: string }).role;
  const companyId = (callerMembership as { company_id: string }).company_id;
  const isPrivileged = callerRole === "owner" || callerRole === "admin";

  // 5. Self-mass-logout: caller pode encerrar suas próprias sessões sem ser
  //    owner/admin, mas só se target=self.
  const isSelfTarget = targetUserId === user.id;
  if (!isSelfTarget && !isPrivileged) {
    return json(403, {
      error: "Apenas owner ou admin podem encerrar sessões de outros",
    });
  }

  // 6. Verifica que target tem membership ativa nesta company (impede caller
  //    privilegiado de target user fora do tenant).
  if (!isSelfTarget) {
    const { data: targetMembership } = await admin
      .schema("kernel")
      .from("tenant_memberships")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("user_id", targetUserId)
      .eq("status", "active")
      .maybeSingle();
    if (targetMembership === null) {
      return json(404, { error: "User não pertence a esta empresa" });
    }
  }

  // 7. UPDATE em kernel.login_history.
  let query = admin
    .schema("kernel")
    .from("login_history")
    .update({
      is_active: false,
      logout_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("user_id", targetUserId)
    .eq("is_active", true);

  // Se all_other_for_self=true e current_session_id válido, preserva a sessão
  // atual do caller (não desloga a si mesmo enquanto faz mass-logout).
  if (allOtherForSelf && isSelfTarget && currentSessionId !== "") {
    query = query.neq("id", currentSessionId);
  }

  const { data: updated, error: updErr } = await query.select("id");

  if (updErr !== null) {
    return json(500, { error: `Force-logout falhou: ${updErr.message}` });
  }

  const endedCount = Array.isArray(updated) ? updated.length : 0;

  // 8. SCP event platform.session.terminated (best-effort).
  await admin
    .schema("kernel")
    .from("scp_outbox")
    .insert({
      company_id: companyId,
      event_type: "platform.session.terminated",
      payload: {
        target_user_id: targetUserId,
        ended_count: endedCount,
        terminated_by: user.id,
        all_other_for_self: allOtherForSelf,
      },
      envelope: {
        actor: { type: "human", user_id: user.id },
        timestamp: new Date().toISOString(),
      },
      status: "pending",
    });

  return json(200, {
    success: true,
    ended_count: endedCount,
  });
});
