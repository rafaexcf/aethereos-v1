// Sprint 30 MX167: Edge Function export-company-data
// Exporta TODOS os dados da empresa em JSON conforme LGPD Art. 18 (portabilidade).
//
// R11: somente owner pode exportar (não admin).
// R15: arquivo NÃO contém senhas, tokens, storage_path nem qualquer secret.
// Rate-limit: 3 exports/hora por user.
// Tamanho máximo: 50MB — acima disso retorna 413.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const EXPORT_VERSION = "1.0.0";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const CHAT_MESSAGES_LIMIT = 1000;
const AUDIT_LOG_DAYS = 90;

interface MembershipRow {
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  invited_by: string | null;
  last_login_at: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    position: string | null;
    department: string | null;
  } | null;
}

interface ProfileEmail {
  id: string;
  email: string | null;
}

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

function safeSlug(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "empresa";
}

Deno.serve(async (req: Request): Promise<Response> => {
  const pf = handlePreflight(req);
  if (pf !== null) return pf;

  const origin = req.headers.get("origin");

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "method not allowed" }, 405, origin);
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader === null || !authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "missing authorization header" }, 401, origin);
  }
  const jwt = authHeader.slice(7);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // 1. Auth via anon client + getUser(jwt).
  const userClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser(jwt);
  if (authErr !== null || user === null) {
    return jsonResponse({ error: "unauthorized" }, 401, origin);
  }

  // 2. Service-role client pra leitura privilegiada (bypassa RLS).
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3. Rate limit: 3 por hora por user.
  const rl = await checkRateLimit(
    admin,
    user.id,
    "export-company-data",
    3,
    3600,
  );
  if (!rl.allowed) {
    return rateLimitResponse(rl, corsHeaders(origin));
  }

  // 4. Resolve company_id + role do caller (R11: owner only).
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
    return jsonResponse({ error: "Sem membership ativa" }, 403, origin);
  }

  const callerRole = (callerMembership as { role: string }).role;
  if (callerRole !== "owner") {
    return jsonResponse(
      { error: "Apenas o owner da empresa pode exportar dados (LGPD Art. 18)" },
      403,
      origin,
    );
  }
  const companyId = (callerMembership as { company_id: string }).company_id;

  // 5. Coleta paralela das 10 entidades.
  const auditCutoff = new Date(
    Date.now() - AUDIT_LOG_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    companyResult,
    membershipsResult,
    peopleResult,
    filesResult,
    tasksResult,
    boardsResult,
    notesResult,
    chatChannelsResult,
    auditLogResult,
    modulesResult,
  ] = await Promise.all([
    admin
      .schema("kernel")
      .from("companies")
      .select("id, slug, name, plan, status, created_at, updated_at")
      .eq("id", companyId)
      .single(),

    admin
      .schema("kernel")
      .from("tenant_memberships")
      .select(
        "user_id, role, status, created_at, invited_by, last_login_at, profiles:user_id (id, full_name, position, department)",
      )
      .eq("company_id", companyId),

    admin
      .schema("kernel")
      .from("people")
      .select("*")
      .eq("company_id", companyId),

    admin
      .schema("kernel")
      .from("files")
      .select(
        "id, parent_id, kind, name, mime_type, size_bytes, created_by, created_at, updated_at",
      )
      .eq("company_id", companyId),

    admin
      .schema("kernel")
      .from("tasks")
      .select("*")
      .eq("company_id", companyId),

    admin
      .schema("kernel")
      .from("kanban_boards")
      .select(
        "id, name, created_by, created_at, updated_at, columns:kanban_columns(id, name, color, sort_order, created_at, cards:kanban_cards(id, title, description, color, assigned_to, due_date, sort_order, created_by, created_at, updated_at))",
      )
      .eq("company_id", companyId),

    admin
      .schema("kernel")
      .from("notes")
      .select("*")
      .eq("company_id", companyId),

    admin
      .schema("kernel")
      .from("chat_channels")
      .select("id, name, kind, created_by, created_at")
      .eq("company_id", companyId),

    admin
      .schema("kernel")
      .from("audit_log")
      .select(
        "id, actor_id, actor_type, action, resource_type, resource_id, payload, created_at",
      )
      .eq("company_id", companyId)
      .gte("created_at", auditCutoff)
      .order("created_at", { ascending: false }),

    admin
      .schema("kernel")
      .from("company_modules")
      .select("id, module, status, activated_at, created_at")
      .eq("company_id", companyId),
  ]);

  if (companyResult.error !== null || companyResult.data === null) {
    console.error("[export-company-data] company query error", {
      user_id: user.id,
      company_id: companyId,
      error: companyResult.error?.message,
    });
    return jsonResponse(
      { error: "Falha ao carregar dados da empresa" },
      500,
      origin,
    );
  }

  const company = companyResult.data as {
    id: string;
    slug: string;
    name: string;
    plan: string;
    status: string;
    created_at: string;
    updated_at: string;
  };

  // 6. Mensagens de chat: últimas N por company (via JOIN nos canais).
  const channelIds = (
    (chatChannelsResult.data ?? []) as Array<{
      id: string;
    }>
  ).map((c) => c.id);
  let chatMessages: unknown[] = [];
  if (channelIds.length > 0) {
    const { data: msgs } = await admin
      .schema("kernel")
      .from("chat_messages")
      .select("id, channel_id, sender_user_id, body, metadata, created_at")
      .in("channel_id", channelIds)
      .order("created_at", { ascending: false })
      .limit(CHAT_MESSAGES_LIMIT);
    chatMessages = msgs ?? [];
  }

  // 7. Members + emails via auth.admin (não dá pra ler auth.users via RLS).
  const memberships = (membershipsResult.data ?? []) as MembershipRow[];
  const userIds = memberships.map((m) => m.user_id);
  const emailMap = new Map<string, string | null>();

  if (userIds.length > 0) {
    // listUsers paginado; em MVP buscamos perPage alto (até 1000).
    const { data: listed } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const users = (listed?.users ?? []) as ProfileEmail[];
    for (const u of users) {
      emailMap.set(u.id, u.email ?? null);
    }
  }

  // R15: NÃO inclui encrypted_password, raw_app_meta_data, identity tokens, etc.
  // Apenas full_name + email pra portabilidade.
  const members = memberships.map((m) => ({
    user_id: m.user_id,
    full_name: m.profiles?.full_name ?? null,
    email: emailMap.get(m.user_id) ?? null,
    position: m.profiles?.position ?? null,
    department: m.profiles?.department ?? null,
    role: m.role,
    status: m.status,
    invited_by: m.invited_by,
    last_login_at: m.last_login_at,
    created_at: m.created_at,
  }));

  // 8. Monta JSON final.
  const exportPayload = {
    exported_at: new Date().toISOString(),
    company_id: companyId,
    version: EXPORT_VERSION,
    data: {
      companies: company,
      members,
      people: peopleResult.data ?? [],
      files: filesResult.data ?? [],
      tasks: tasksResult.data ?? [],
      kanban: boardsResult.data ?? [],
      notes: notesResult.data ?? [],
      chat: {
        channels: chatChannelsResult.data ?? [],
        messages: chatMessages,
      },
      audit_log: auditLogResult.data ?? [],
      modules: modulesResult.data ?? [],
    },
  };

  const body = JSON.stringify(exportPayload);
  const byteSize = new TextEncoder().encode(body).length;

  if (byteSize > MAX_BYTES) {
    return jsonResponse(
      {
        error:
          "Exportação excedeu o limite de 50MB. Entre em contato com o suporte para uma exportação assistida.",
        size_bytes: byteSize,
        max_bytes: MAX_BYTES,
      },
      413,
      origin,
    );
  }

  // 9. Audit: registra exportação.
  await admin
    .schema("kernel")
    .from("audit_log")
    .insert({
      company_id: companyId,
      actor_id: user.id,
      actor_type: "human",
      action: "company.data_exported",
      resource_type: "company",
      resource_id: companyId,
      payload: { size_bytes: byteSize, version: EXPORT_VERSION },
    });

  const slug = safeSlug(company.slug);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `aethereos-export-${slug}-${date}.json`;

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(byteSize),
    },
  });
});
