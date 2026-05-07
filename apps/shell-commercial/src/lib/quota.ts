/**
 * HOTFIX — Browser-side QuotaEnforcer adapter.
 *
 * QuotaEnforcer (de @aethereos/kernel/billing) é driver-agnostic.
 * Aqui montamos uma instância usando o data driver do shell para
 * permitir bloqueio de IA queries e file uploads no cliente —
 * complemento ao enforcement em invite-member (server-side, MX239).
 */

import {
  QuotaEnforcer,
  type MetricCode,
  type PlanCode,
  type QuotaDataSource,
} from "@aethereos/kernel";
import type { SupabaseBrowserDataDriver } from "@aethereos/drivers-supabase/browser";

interface SubscriptionRow {
  plan_code: PlanCode;
  current_period_start: string;
}

export function createBrowserQuotaEnforcer(
  data: SupabaseBrowserDataDriver,
  companyId: string,
): QuotaEnforcer {
  let cachedSubscription: { plan: PlanCode; periodStart: string } | null = null;

  async function loadSubscription(): Promise<{
    plan: PlanCode;
    periodStart: string;
  } | null> {
    if (cachedSubscription !== null) return cachedSubscription;
    const { data: row } = await data
      .from("subscriptions")
      .select("plan_code, current_period_start")
      .eq("company_id", companyId)
      .maybeSingle();
    if (row === null) return null;
    const sub = row as SubscriptionRow;
    cachedSubscription = {
      plan: sub.plan_code,
      periodStart: sub.current_period_start,
    };
    return cachedSubscription;
  }

  const dataSource: QuotaDataSource = {
    async getPlanCode(_: string): Promise<PlanCode | null> {
      const sub = await loadSubscription();
      return sub?.plan ?? null;
    },
    async getMetricLimit(
      plan: PlanCode,
      metric: MetricCode,
    ): Promise<number | null> {
      const { data: row } = await data
        .from("plan_limits")
        .select("max_value")
        .eq("plan_code", plan)
        .eq("metric_code", metric)
        .maybeSingle();
      if (row === null) return null;
      return Number((row as { max_value: number }).max_value);
    },
    async countActiveUsers(_: string): Promise<number> {
      const { count } = await data
        .from("tenant_memberships")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active");
      return count ?? 0;
    },
    async sumStorageBytes(_: string): Promise<number> {
      const { data: rows } = await data
        .from("files")
        .select("size_bytes")
        .eq("company_id", companyId)
        .eq("kind", "file")
        .is("deleted_at", null);
      return ((rows ?? []) as Array<{ size_bytes: number | null }>).reduce(
        (acc, row) => acc + (row.size_bytes ?? 0),
        0,
      );
    },
    async countAIQueriesSincePeriodStart(_: string): Promise<number> {
      const sub = await loadSubscription();
      if (sub === null) return 0;
      const { data: convs } = await data
        .from("copilot_conversations")
        .select("id")
        .eq("company_id", companyId);
      const ids = ((convs ?? []) as Array<{ id: string }>).map((c) => c.id);
      if (ids.length === 0) return 0;
      const { count } = await data
        .from("copilot_messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", ids)
        .eq("role", "user")
        .gte("created_at", sub.periodStart);
      return count ?? 0;
    },
  };

  return new QuotaEnforcer(dataSource);
}
