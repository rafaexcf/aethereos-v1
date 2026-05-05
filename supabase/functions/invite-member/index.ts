// Edge Function: invite-member (Sprint 27 MX144)
// Convida colaborador por email para a company ativa do chamador.
// Owner/admin authorized only. Cria user via Supabase Auth invite,
// insere tenant_memberships com status='pending', emite SCP event.
//
// Ref: SPRINT_27_PROMPT.md — invite flow
//      SECURITY_GUIDELINES.md — RLS + service_role isolation

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";

interface InviteBody {
  email?: string;
  role?: string;
  full_name?: string;
}

const VALID_ROLES = new Set(["admin", "manager", "member", "viewer"]);

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

  // 1. Auth do chamador via JWT.
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

  // 2. Body parse.
  let body: InviteBody;
  try {
    body = (await req.json()) as InviteBody;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const role = body.role?.trim() ?? "member";
  const fullName = body.full_name?.trim() ?? "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "Email inválido" });
  }
  if (!VALID_ROLES.has(role)) {
    return json(400, {
      error: "Role inválido — owner não pode ser atribuído por convite",
    });
  }

  // 3. Service-role client pra escritas privilegiadas.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. Resolve company_id do chamador (active membership owner/admin).
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
  if (callerRole !== "owner" && callerRole !== "admin") {
    return json(403, { error: "Apenas owner ou admin podem convidar" });
  }
  const companyId = (callerMembership as { company_id: string }).company_id;

  // 5. Verifica que email não é membro existente da company.
  const { data: existing } = await admin
    .schema("kernel")
    .from("tenant_memberships")
    .select("id, status, profiles:user_id(id)")
    .eq("company_id", companyId);

  // Lookup por email passa pelo auth.users (tabela protegida — usar admin API).
  const { data: existingUser } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  // Note: listUsers não filtra por email diretamente — usamos lookup mais
  // simples via email no membership. Para MVP, basta confiar no flow
  // inviteUserByEmail que retorna user existente com mesmo email.

  // 6. Convite via Supabase Auth (cria user OR retorna existente).
  const { data: inviteData, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        invited_by: user.id,
        company_id: companyId,
        full_name: fullName,
      },
    });

  if (inviteErr !== null && !inviteErr.message.includes("already")) {
    return json(500, { error: `Convite falhou: ${inviteErr.message}` });
  }

  let invitedUserId: string | null = inviteData?.user?.id ?? null;

  // Se já existe (rejeitado pelo invite), busca user por email pra continuar.
  if (invitedUserId === null) {
    const { data: lookup } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const found = lookup?.users.find((u) => u.email?.toLowerCase() === email);
    if (found !== undefined) invitedUserId = found.id;
  }

  if (invitedUserId === null) {
    return json(500, { error: "Não foi possível resolver user_id do convite" });
  }

  // 7. Verifica que esse user ainda não é membro desta company.
  const memberships = (existing ?? []) as Array<{ id: string; status: string }>;
  void memberships; // referenciado pra evitar warning; lookup real abaixo
  const { data: dup } = await admin
    .schema("kernel")
    .from("tenant_memberships")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("user_id", invitedUserId)
    .maybeSingle();

  if (dup !== null) {
    const status = (dup as { status: string }).status;
    if (status === "active") {
      return json(409, { error: "Email já é membro ativo desta empresa" });
    }
    if (status === "pending") {
      return json(200, {
        success: true,
        membership_id: (dup as { id: string }).id,
        message: "Convite reenviado",
      });
    }
    // suspended / removed → re-ativar
    const { error: updErr } = await admin
      .schema("kernel")
      .from("tenant_memberships")
      .update({ status: "pending", role })
      .eq("id", (dup as { id: string }).id);
    if (updErr !== null) {
      return json(500, { error: `Reativação falhou: ${updErr.message}` });
    }
    return json(200, {
      success: true,
      membership_id: (dup as { id: string }).id,
      message: "Acesso reativado",
    });
  }

  // 8. Insere membership pendente.
  const { data: inserted, error: insErr } = await admin
    .schema("kernel")
    .from("tenant_memberships")
    .insert({
      user_id: invitedUserId,
      company_id: companyId,
      role,
      status: "pending",
    })
    .select("id")
    .single();

  if (insErr !== null) {
    return json(500, { error: `Insert membership falhou: ${insErr.message}` });
  }

  // 9. Insere/upsert profile básico (best-effort).
  if (fullName !== "") {
    await admin
      .schema("kernel")
      .from("profiles")
      .upsert(
        { id: invitedUserId, full_name: fullName },
        { onConflict: "id", ignoreDuplicates: true },
      );
  }

  // 10. SCP event platform.user.invited (best-effort).
  await admin
    .schema("kernel")
    .from("scp_outbox")
    .insert({
      company_id: companyId,
      event_type: "platform.user.invited",
      payload: {
        invited_user_id: invitedUserId,
        email,
        role,
        invited_by: user.id,
      },
      envelope: {
        actor: { type: "human", user_id: user.id },
        timestamp: new Date().toISOString(),
      },
      status: "pending",
    });

  return json(200, {
    success: true,
    membership_id: (inserted as { id: string }).id,
    invited_user_id: invitedUserId,
  });
});
