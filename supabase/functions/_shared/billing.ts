// Super Sprint E — Billing helpers (Edge Functions Deno).
//
// Edge Functions rodam em Deno e NÃO podem importar @aethereos/kernel
// (Node-only). Este arquivo espelha as constantes de planos do kernel.
// Mantido em sync via comentário; teste integrado em MX242 verifica.

export type PlanCode = "free" | "pro" | "enterprise";
export type MetricCode = "active_users" | "storage_bytes" | "ai_queries";

export const PLAN_NAMES: Readonly<Record<PlanCode, string>> = {
  free: "Gratuito",
  pro: "Profissional",
  enterprise: "Enterprise",
};

export const PLAN_PRICES_CENTS: Readonly<Record<PlanCode, number>> = {
  free: 0,
  pro: 19_900,
  enterprise: 79_900,
};

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

export function formatBytes(bytes: number): string {
  const GB = 1024 * 1024 * 1024;
  const MB = 1024 * 1024;
  if (bytes >= GB)
    return `${(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 1)} GB`;
  if (bytes >= MB)
    return `${(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function pctOf(current: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

export function isPlanCode(value: unknown): value is PlanCode {
  return value === "free" || value === "pro" || value === "enterprise";
}
