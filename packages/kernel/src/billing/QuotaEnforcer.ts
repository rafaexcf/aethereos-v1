/**
 * Super Sprint E / MX239 — QuotaEnforcer.
 *
 * Verifica se uma operação respeita o limite do plano da company.
 * Driver-agnostic: recebe um `QuotaDataSource` mínimo. R10: quotas
 * se aplicam a TODOS (incluindo owner/admin) — sem bypass.
 *
 * R14: cache 5min por (companyId, metric_code).
 *
 * Pontos de uso:
 *   - invite-member: checkUserInvite()
 *   - copilot ANTES da chamada LLM: checkAIQuery()
 *   - file upload: checkFileUpload(companyId, sizeBytes)
 */

import type { MetricCode, PlanCode } from "./plans.js";

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  metric: MetricCode;
  current: number;
  limit: number;
  /** 0..100, arredondado. */
  percent: number;
}

export interface QuotaDataSource {
  /** Plano ativo da company. Null se não houver subscription (defesa). */
  getPlanCode(companyId: string): Promise<PlanCode | null>;
  /** Limite global por (plan, metric). Null se a tabela não tem o par. */
  getMetricLimit(plan: PlanCode, metric: MetricCode): Promise<number | null>;
  /** Uso corrente de cada métrica para a company. */
  countActiveUsers(companyId: string): Promise<number>;
  sumStorageBytes(companyId: string): Promise<number>;
  /** Conta queries IA do period_start atual (current_period_start da subscription). */
  countAIQueriesSincePeriodStart(companyId: string): Promise<number>;
}

interface CacheEntry {
  result: QuotaCheckResult;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;

function pctOf(current: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

export interface QuotaEnforcerOptions {
  cacheTtlMs?: number;
}

export class QuotaEnforcer {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttl: number;

  constructor(
    private readonly dataSource: QuotaDataSource,
    options: QuotaEnforcerOptions = {},
  ) {
    this.ttl = options.cacheTtlMs ?? DEFAULT_TTL_MS;
  }

  async checkUserInvite(companyId: string): Promise<QuotaCheckResult> {
    return this.check(companyId, "active_users", async () => {
      const current = await this.dataSource.countActiveUsers(companyId);
      // Convidar MAIS UM exige current+1 <= limit (limite é inclusivo).
      return current + 1;
    });
  }

  async checkAIQuery(companyId: string): Promise<QuotaCheckResult> {
    return this.check(companyId, "ai_queries", async () => {
      const current =
        await this.dataSource.countAIQueriesSincePeriodStart(companyId);
      return current + 1;
    });
  }

  async checkFileUpload(
    companyId: string,
    fileSizeBytes: number,
  ): Promise<QuotaCheckResult> {
    if (fileSizeBytes < 0) {
      throw new Error("fileSizeBytes deve ser >= 0");
    }
    return this.check(
      companyId,
      "storage_bytes",
      async () => {
        const current = await this.dataSource.sumStorageBytes(companyId);
        return current + fileSizeBytes;
      },
      // size é volátil — não cachear o storage check.
      { skipCache: true },
    );
  }

  invalidate(companyId: string, metric?: MetricCode): void {
    if (metric === undefined) {
      for (const key of [...this.cache.keys()]) {
        if (key.startsWith(`${companyId}::`)) this.cache.delete(key);
      }
      return;
    }
    this.cache.delete(this.key(companyId, metric));
  }

  // ─── private ─────────────────────────────────────────────────────────────

  private async check(
    companyId: string,
    metric: MetricCode,
    nextValueFn: () => Promise<number>,
    opts: { skipCache?: boolean } = {},
  ): Promise<QuotaCheckResult> {
    const cacheKey = this.key(companyId, metric);
    if (opts.skipCache !== true) {
      const hit = this.cache.get(cacheKey);
      if (hit !== undefined && hit.expiresAt > Date.now()) return hit.result;
    }

    const plan = await this.dataSource.getPlanCode(companyId);
    if (plan === null) {
      const result: QuotaCheckResult = {
        allowed: false,
        reason: "Subscription não encontrada para esta empresa",
        metric,
        current: 0,
        limit: 0,
        percent: 0,
      };
      return result;
    }

    const limit = await this.dataSource.getMetricLimit(plan, metric);
    if (limit === null) {
      // Sem entry em plan_limits = não enforce.
      return {
        allowed: true,
        metric,
        current: 0,
        limit: Number.POSITIVE_INFINITY,
        percent: 0,
      };
    }

    const projectedAfter = await nextValueFn();
    const allowed = projectedAfter <= limit;
    const result: QuotaCheckResult = {
      allowed,
      metric,
      current: projectedAfter,
      limit,
      percent: pctOf(projectedAfter, limit),
      ...(allowed
        ? {}
        : {
            reason: reasonFor(metric, projectedAfter, limit),
          }),
    };

    if (opts.skipCache !== true) {
      this.cache.set(cacheKey, { result, expiresAt: Date.now() + this.ttl });
    }
    return result;
  }

  private key(companyId: string, metric: MetricCode): string {
    return `${companyId}::${metric}`;
  }
}

function reasonFor(
  metric: MetricCode,
  projected: number,
  limit: number,
): string {
  switch (metric) {
    case "active_users":
      return `Limite de usuários atingido (${limit}). Faça upgrade para continuar.`;
    case "ai_queries":
      return `Limite de consultas IA atingido este mês (${limit}). Faça upgrade para continuar.`;
    case "storage_bytes":
      return `Limite de armazenamento atingido (${formatBytesShort(limit)}). Total seria ${formatBytesShort(projected)}. Faça upgrade.`;
  }
}

function formatBytesShort(b: number): string {
  const GB = 1024 * 1024 * 1024;
  const MB = 1024 * 1024;
  if (b >= GB) return `${(b / GB).toFixed(b % GB === 0 ? 0 : 1)} GB`;
  if (b >= MB) return `${(b / MB).toFixed(b % MB === 0 ? 0 : 1)} MB`;
  return `${b} B`;
}
