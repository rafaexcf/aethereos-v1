// Edge Function: billing-sync (Super Sprint E / MX235)
//
// Modo Alternativa B (sem Lago): retorna plan + usage + limits direto
// do banco. Não há sync com motor externo. Quando Lago for adotado,
// esta função ganhará um caminho que consulta a API do Lago e
// reconcilia kernel.subscriptions.
//
// GET /billing-sync (auth obrigatório)
// Response: { plan, usage, limits }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";
import { isPlanCode, PLAN_NAMES, type PlanCode } from "../_shared/billing.ts";

interface Subscription {
  id: string;
  plan_code: PlanCode;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface PlanLimitRow {
  plan_code: string;
  metric_code: string;
  max_value: number;
  overage_amount_cents: number;
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
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membership === null) {
    return json(403, { error: "Sem membership ativa" });
  }
  const companyId = (membership as { company_id: string }).company_id;

  // Garante subscription Free se faltar (defesa contra company sem trigger).
  await admin
    .schema("kernel")
    .from("subscriptions")
    .upsert(
      { company_id: companyId, plan_code: "free", status: "active" },
      { onConflict: "company_id", ignoreDuplicates: true },
    );

  const { data: subRaw } = await admin
    .schema("kernel")
    .from("subscriptions")
    .select(
      "id, plan_code, status, current_period_start, current_period_end, cancel_at_period_end",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (subRaw === null || !isPlanCode((subRaw as Subscription).plan_code)) {
    return json(500, { error: "Subscription inválida" });
  }
  const sub = subRaw as Subscription;

  const { data: limitsRaw } = await admin
    .schema("kernel")
    .from("plan_limits")
    .select("plan_code, metric_code, max_value, overage_amount_cents")
    .eq("plan_code", sub.plan_code);
  const limits = (limitsRaw ?? []) as PlanLimitRow[];

  return json(200, {
    plan: { code: sub.plan_code, name: PLAN_NAMES[sub.plan_code] },
    subscription: {
      id: sub.id,
      status: sub.status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
    },
    limits: limits.reduce<
      Record<string, { max: number; overage_cents: number }>
    >((acc, l) => {
      acc[l.metric_code] = {
        max: Number(l.max_value),
        overage_cents: l.overage_amount_cents,
      };
      return acc;
    }, {}),
  });
});
