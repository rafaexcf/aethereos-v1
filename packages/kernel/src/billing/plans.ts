/**
 * Super Sprint E / MX233 — Planos e métricas de billing.
 *
 * Catálogo cravado em código (R12 — limites globais por plano).
 * Mesmos valores são seedados em kernel.plan_limits para queries
 * SQL diretas (Edge Functions em Deno não importam @aethereos/kernel).
 *
 * R17: valores em centavos (amount_cents). Nunca float.
 */

export type PlanCode = "free" | "pro" | "enterprise";

export type MetricCode = "active_users" | "storage_bytes" | "ai_queries";

export const PLAN_CODES: readonly PlanCode[] = ["free", "pro", "enterprise"];

export const METRIC_CODES: readonly MetricCode[] = [
  "active_users",
  "storage_bytes",
  "ai_queries",
];

export interface PlanLimit {
  metric: MetricCode;
  /** Limite duro do plano (max no contrato). */
  maxValue: number;
  /** Custo por unidade adicional acima do limite, em centavos. 0 = sem overage. */
  overageAmountCents: number;
}

export interface Plan {
  code: PlanCode;
  name: string;
  /** Preço base mensal em centavos (BRL). */
  amountCents: number;
  currency: "BRL";
  interval: "monthly";
  /** Resumo curto exibido no UI. */
  tagline: string;
  /** Limites por métrica. */
  limits: readonly PlanLimit[];
  /** Features extras a destacar no comparador (não usado para enforcement). */
  highlights: readonly string[];
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const PLANS: Readonly<Record<PlanCode, Plan>> = {
  free: {
    code: "free",
    name: "Gratuito",
    amountCents: 0,
    currency: "BRL",
    interval: "monthly",
    tagline: "Para experimentar e validar fluxos básicos.",
    limits: [
      { metric: "active_users", maxValue: 3, overageAmountCents: 0 },
      { metric: "storage_bytes", maxValue: 500 * MB, overageAmountCents: 0 },
      { metric: "ai_queries", maxValue: 100, overageAmountCents: 0 },
    ],
    highlights: ["3 colaboradores", "500 MB", "100 consultas IA / mês"],
  },
  pro: {
    code: "pro",
    name: "Profissional",
    amountCents: 19_900,
    currency: "BRL",
    interval: "monthly",
    tagline: "Para times pequenos e médios em produção.",
    limits: [
      { metric: "active_users", maxValue: 20, overageAmountCents: 1_990 },
      { metric: "storage_bytes", maxValue: 10 * GB, overageAmountCents: 990 },
      { metric: "ai_queries", maxValue: 5_000, overageAmountCents: 5 },
    ],
    highlights: [
      "20 colaboradores (R$19,90/extra)",
      "10 GB (R$9,90/GB extra)",
      "5.000 consultas IA (R$0,05/extra)",
      "Suporte por e-mail",
    ],
  },
  enterprise: {
    code: "enterprise",
    name: "Enterprise",
    amountCents: 79_900,
    currency: "BRL",
    interval: "monthly",
    tagline: "Para organizações com escala e requisitos avançados.",
    limits: [
      { metric: "active_users", maxValue: 200, overageAmountCents: 1_490 },
      {
        metric: "storage_bytes",
        maxValue: 100 * GB,
        overageAmountCents: 490,
      },
      { metric: "ai_queries", maxValue: 50_000, overageAmountCents: 3 },
    ],
    highlights: [
      "200 colaboradores (R$14,90/extra)",
      "100 GB (R$4,90/GB extra)",
      "50.000 consultas IA (R$0,03/extra)",
      "SLA + suporte dedicado",
    ],
  },
};

export function getPlan(code: PlanCode): Plan {
  return PLANS[code];
}

export function getLimit(code: PlanCode, metric: MetricCode): PlanLimit {
  const plan = PLANS[code];
  const limit = plan.limits.find((l) => l.metric === metric);
  if (limit === undefined) {
    throw new Error(`Plan ${code} missing limit for metric ${metric}`);
  }
  return limit;
}

export function isPlanCode(value: string): value is PlanCode {
  return (PLAN_CODES as readonly string[]).includes(value);
}

export function isMetricCode(value: string): value is MetricCode {
  return (METRIC_CODES as readonly string[]).includes(value);
}

export function formatBytes(bytes: number): string {
  if (bytes >= GB)
    return `${(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 1)} GB`;
  if (bytes >= MB)
    return `${(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function formatBRL(amountCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}
