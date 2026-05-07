// Edge Function: billing-usage-report (Super Sprint E / MX237)
//
// GET /billing-usage-report
// Retorna { plan, period, usage, can_upgrade, alerts } com métricas reais:
//   - active_users: count tenant_memberships status='active'
//   - storage_bytes: SUM kernel.files.size_bytes onde kind='file' e deleted_at IS NULL
//   - ai_queries: count copilot_messages role='user' no período corrente
//
// Owner e admin podem chamar (R11 — admin vê consumo, mas não muda plano).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";
import {
  formatBytes,
  isPlanCode,
  pctOf,
  PLAN_NAMES,
  type PlanCode,
  type UsageReport,
} from "../_shared/billing.ts";

interface PlanLimitRow {
  metric_code: string;
  max_value: number;
}

const ALERT_THRESHOLD = 80;

Deno.serve(async (req: Request): Promise<Response> => {
  const pf = handlePreflight(req);
  if (pf !== null) return pf;

  const cors = corsHeaders(req.headers.get("origin"));
  const json = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method !== "GET") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Missing Authorization" });
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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: membership } = await admin
    .schema("kernel")
    .from("tenant_memberships")
    .select("company_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membership === null) {
    return json(403, { error: "Sem membership ativa" });
  }
  const { company_id: companyId, role } = membership as {
    company_id: string;
    role: string;
  };

  if (role !== "owner" && role !== "admin") {
    return json(403, { error: "Apenas owner ou admin pode ver consumo" });
  }

  // Subscription + limits
  const { data: subRaw } = await admin
    .schema("kernel")
    .from("subscriptions")
    .select("plan_code, current_period_start, current_period_end")
    .eq("company_id", companyId)
    .maybeSingle();

  if (subRaw === null)
    return json(404, { error: "Subscription não encontrada" });

  const sub = subRaw as {
    plan_code: string;
    current_period_start: string;
    current_period_end: string;
  };
  if (!isPlanCode(sub.plan_code)) {
    return json(500, { error: "plan_code inválido na subscription" });
  }
  const planCode: PlanCode = sub.plan_code;

  const { data: limitsRaw } = await admin
    .schema("kernel")
    .from("plan_limits")
    .select("metric_code, max_value")
    .eq("plan_code", planCode);
  const limits: Record<string, number> = {};
  for (const l of (limitsRaw ?? []) as PlanLimitRow[]) {
    limits[l.metric_code] = Number(l.max_value);
  }

  // active_users: COUNT tenant_memberships status='active' por company.
  const { count: activeUsers } = await admin
    .schema("kernel")
    .from("tenant_memberships")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active");

  // storage_bytes: SUM size_bytes em kernel.files company (kind=file, ativo).
  const { data: filesAgg } = await admin
    .schema("kernel")
    .from("files")
    .select("size_bytes")
    .eq("company_id", companyId)
    .eq("kind", "file")
    .is("deleted_at", null);
  const storageBytes = (filesAgg ?? []).reduce(
    (acc: number, row: { size_bytes: number | null }) => {
      return acc + (row.size_bytes ?? 0);
    },
    0,
  );

  // ai_queries: copilot_messages role='user' criados após current_period_start.
  // Como copilot_messages não tem company_id direto, fazemos JOIN via conversations.
  const { data: convsRaw } = await admin
    .schema("kernel")
    .from("copilot_conversations")
    .select("id")
    .eq("company_id", companyId);
  const convIds = (convsRaw ?? []).map((c: { id: string }) => c.id);
  let aiQueries = 0;
  if (convIds.length > 0) {
    const { count } = await admin
      .schema("kernel")
      .from("copilot_messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .eq("role", "user")
      .gte("created_at", sub.current_period_start);
    aiQueries = count ?? 0;
  }

  const usersCurrent = activeUsers ?? 0;
  const usersLimit = limits["active_users"] ?? 0;
  const storageLimit = limits["storage_bytes"] ?? 0;
  const aiLimit = limits["ai_queries"] ?? 0;

  const usersPct = pctOf(usersCurrent, usersLimit);
  const storagePct = pctOf(storageBytes, storageLimit);
  const aiPct = pctOf(aiQueries, aiLimit);

  const alerts: string[] = [];
  if (usersPct >= ALERT_THRESHOLD)
    alerts.push(`Você está usando ${usersPct}% do limite de usuários`);
  if (storagePct >= ALERT_THRESHOLD)
    alerts.push(`Você está usando ${storagePct}% do limite de armazenamento`);
  if (aiPct >= ALERT_THRESHOLD)
    alerts.push(`Você está usando ${aiPct}% do limite de consultas IA`);

  const report: UsageReport = {
    plan: { code: planCode, name: PLAN_NAMES[planCode] },
    period: { start: sub.current_period_start, end: sub.current_period_end },
    usage: {
      active_users: {
        current: usersCurrent,
        limit: usersLimit,
        percent: usersPct,
      },
      storage_bytes: {
        current: storageBytes,
        limit: storageLimit,
        percent: storagePct,
        current_formatted: formatBytes(storageBytes),
        limit_formatted: formatBytes(storageLimit),
      },
      ai_queries: { current: aiQueries, limit: aiLimit, percent: aiPct },
    },
    can_upgrade: planCode !== "enterprise",
    alerts,
  };

  return json(200, report);
});
