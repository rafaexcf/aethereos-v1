/**
 * Super Sprint E / MX238 — useBilling hook.
 *
 * Hooks compartilhados pelas tabs de Plano & Assinatura. Cada hook
 * encapsula uma chamada às Edge Functions billing-* e expõe estado
 * (loading, error, data, refresh).
 */

import { useCallback, useEffect, useState } from "react";
import { useDrivers } from "../../../lib/drivers-context";
import type { PlanCode } from "@aethereos/kernel";

export interface UsageBreakdown {
  current: number;
  limit: number;
  percent: number;
}

export interface UsageReport {
  plan: { code: PlanCode; name: string };
  period: { start: string; end: string };
  usage: {
    active_users: UsageBreakdown;
    storage_bytes: UsageBreakdown & {
      current_formatted: string;
      limit_formatted: string;
    };
    ai_queries: UsageBreakdown;
  };
  can_upgrade: boolean;
  alerts: string[];
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface BillingSync {
  plan: { code: PlanCode; name: string };
  subscription: SubscriptionInfo;
  limits: Record<string, { max: number; overage_cents: number }>;
}

export interface InvoiceRow {
  id: string;
  amount_cents: number;
  currency: string;
  status: "draft" | "pending" | "paid" | "failed" | "voided";
  invoice_number: string | null;
  invoice_url: string | null;
  pdf_url: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

async function authedJson<T>(
  drivers: ReturnType<typeof useDrivers>,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as
    | string
    | undefined;
  if (supabaseUrl === undefined || supabaseUrl === "") {
    throw new Error("VITE_SUPABASE_URL não configurada");
  }
  if (drivers === null) throw new Error("Drivers ainda não inicializados");
  const client = drivers.data.getClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  const token = session?.access_token;
  if (token === undefined)
    throw new Error("Sessão expirada — faça login novamente");
  const res = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return body;
}

export function useUsageReport(): FetchState<UsageReport> {
  const drivers = useDrivers();
  const [data, setData] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await authedJson<UsageReport>(drivers, "billing-usage-report", {
        method: "GET",
      });
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [drivers]);

  useEffect(() => {
    if (drivers === null) return;
    void refresh();
  }, [drivers, refresh]);

  return { data, loading, error, refresh };
}

export function useBillingSync(): FetchState<BillingSync> {
  const drivers = useDrivers();
  const [data, setData] = useState<BillingSync | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await authedJson<BillingSync>(drivers, "billing-sync", {
        method: "GET",
      });
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [drivers]);

  useEffect(() => {
    if (drivers === null) return;
    void refresh();
  }, [drivers, refresh]);

  return { data, loading, error, refresh };
}

export async function changePlan(
  drivers: ReturnType<typeof useDrivers>,
  planCode: PlanCode,
): Promise<{
  ok: boolean;
  plan_code: PlanCode;
  plan_name: string;
  previous_plan: PlanCode;
  simulated: boolean;
  message: string;
}> {
  return authedJson(drivers, "create-checkout", {
    method: "POST",
    body: JSON.stringify({ plan_code: planCode }),
  });
}
