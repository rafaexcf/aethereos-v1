// Super Sprint E / MX239 — Quota helpers para Edge Functions Deno.
//
// Espelha QuotaEnforcer do @aethereos/kernel mas usa Supabase client
// direto (Edge Functions não importam pacote Node).
//
// R10: aplicar a TODOS (incluindo owner/admin). Sem bypass.
// R14: cache não é prático em Edge Functions stateless — cada chamada
// faz uma query. Para cargas altas: cachear via Edge Function global ou
// extension de KV no futuro.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { MetricCode, PlanCode } from "./billing.ts";

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  metric: MetricCode;
  current: number;
  limit: number;
  percent: number;
}

function pctOf(current: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

async function getPlanAndLimit(
  admin: SupabaseClient,
  companyId: string,
  metric: MetricCode,
): Promise<{ plan: PlanCode | null; limit: number | null }> {
  const { data: subRaw } = await admin
    .schema("kernel")
    .from("subscriptions")
    .select("plan_code")
    .eq("company_id", companyId)
    .maybeSingle();
  const plan = (subRaw as { plan_code?: PlanCode } | null)?.plan_code ?? null;
  if (plan === null) return { plan: null, limit: null };

  const { data: limRaw } = await admin
    .schema("kernel")
    .from("plan_limits")
    .select("max_value")
    .eq("plan_code", plan)
    .eq("metric_code", metric)
    .maybeSingle();
  const limit =
    limRaw === null
      ? null
      : Number((limRaw as { max_value: number }).max_value);
  return { plan, limit };
}

export async function checkUserInviteQuota(
  admin: SupabaseClient,
  companyId: string,
): Promise<QuotaCheckResult> {
  const { plan, limit } = await getPlanAndLimit(
    admin,
    companyId,
    "active_users",
  );
  if (plan === null) {
    return {
      allowed: false,
      reason: "Subscription não encontrada para esta empresa",
      metric: "active_users",
      current: 0,
      limit: 0,
      percent: 0,
    };
  }
  if (limit === null) {
    return {
      allowed: true,
      metric: "active_users",
      current: 0,
      limit: Number.POSITIVE_INFINITY,
      percent: 0,
    };
  }
  const { count } = await admin
    .schema("kernel")
    .from("tenant_memberships")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active");
  const projected = (count ?? 0) + 1;
  const allowed = projected <= limit;
  return {
    allowed,
    metric: "active_users",
    current: projected,
    limit,
    percent: pctOf(projected, limit),
    ...(allowed
      ? {}
      : {
          reason: `Limite de usuários atingido (${limit}). Faça upgrade para continuar.`,
        }),
  };
}
