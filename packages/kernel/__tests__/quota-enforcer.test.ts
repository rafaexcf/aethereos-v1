import { describe, it, expect, vi } from "vitest";
import { QuotaEnforcer } from "../src/billing/QuotaEnforcer.js";
import type {
  PlanCode,
  MetricCode,
  QuotaDataSource,
} from "../src/billing/index.js";

const COMPANY = "11111111-2222-3333-4444-555555555555";

const FREE_LIMITS: Record<MetricCode, number> = {
  active_users: 3,
  storage_bytes: 524_288_000,
  ai_queries: 100,
};
const PRO_LIMITS: Record<MetricCode, number> = {
  active_users: 20,
  storage_bytes: 10_737_418_240,
  ai_queries: 5_000,
};

function makeDS(opts: {
  plan: PlanCode;
  activeUsers?: number;
  storage?: number;
  aiQueries?: number;
  limits?: Record<MetricCode, number>;
}): QuotaDataSource {
  const limits =
    opts.limits ?? (opts.plan === "pro" ? PRO_LIMITS : FREE_LIMITS);
  return {
    async getPlanCode(_company: string): Promise<PlanCode | null> {
      return opts.plan;
    },
    async getMetricLimit(
      _plan: PlanCode,
      metric: MetricCode,
    ): Promise<number | null> {
      return limits[metric] ?? null;
    },
    async countActiveUsers(_company: string): Promise<number> {
      return opts.activeUsers ?? 0;
    },
    async sumStorageBytes(_company: string): Promise<number> {
      return opts.storage ?? 0;
    },
    async countAIQueriesSincePeriodStart(_company: string): Promise<number> {
      return opts.aiQueries ?? 0;
    },
  };
}

describe("QuotaEnforcer — checkUserInvite", () => {
  it("Free plan blocks 4th user (limit 3)", async () => {
    const enforcer = new QuotaEnforcer(
      makeDS({ plan: "free", activeUsers: 3 }),
    );
    const result = await enforcer.checkUserInvite(COMPANY);
    expect(result.allowed).toBe(false);
    expect(result.metric).toBe("active_users");
    expect(result.current).toBe(4);
    expect(result.limit).toBe(3);
    expect(result.reason).toContain("Limite de usuários");
  });

  it("Free plan allows 3rd user (current 2 + 1)", async () => {
    const enforcer = new QuotaEnforcer(
      makeDS({ plan: "free", activeUsers: 2 }),
    );
    const result = await enforcer.checkUserInvite(COMPANY);
    expect(result.allowed).toBe(true);
  });

  it("Pro plan allows up to 20 users", async () => {
    const enforcer = new QuotaEnforcer(
      makeDS({ plan: "pro", activeUsers: 19 }),
    );
    const result = await enforcer.checkUserInvite(COMPANY);
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(20);
    expect(result.limit).toBe(20);
  });

  it("Pro plan blocks 21st user", async () => {
    const enforcer = new QuotaEnforcer(
      makeDS({ plan: "pro", activeUsers: 20 }),
    );
    const result = await enforcer.checkUserInvite(COMPANY);
    expect(result.allowed).toBe(false);
  });

  it("returns deny when subscription is missing (defesa)", async () => {
    const ds: QuotaDataSource = {
      async getPlanCode() {
        return null;
      },
      async getMetricLimit() {
        return null;
      },
      async countActiveUsers() {
        return 0;
      },
      async sumStorageBytes() {
        return 0;
      },
      async countAIQueriesSincePeriodStart() {
        return 0;
      },
    };
    const enforcer = new QuotaEnforcer(ds);
    const result = await enforcer.checkUserInvite(COMPANY);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Subscription não encontrada");
  });
});

describe("QuotaEnforcer — checkAIQuery", () => {
  it("Free plan blocks 101st query (limit 100)", async () => {
    const enforcer = new QuotaEnforcer(
      makeDS({ plan: "free", aiQueries: 100 }),
    );
    const result = await enforcer.checkAIQuery(COMPANY);
    expect(result.allowed).toBe(false);
    expect(result.metric).toBe("ai_queries");
  });

  it("Free plan allows 100th query (current 99 + 1)", async () => {
    const enforcer = new QuotaEnforcer(makeDS({ plan: "free", aiQueries: 99 }));
    const result = await enforcer.checkAIQuery(COMPANY);
    expect(result.allowed).toBe(true);
  });
});

describe("QuotaEnforcer — checkFileUpload", () => {
  it("blocks upload that would exceed storage limit", async () => {
    const enforcer = new QuotaEnforcer(
      makeDS({ plan: "free", storage: 524_288_000 - 1000 }),
    );
    const result = await enforcer.checkFileUpload(COMPANY, 5000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("armazenamento");
  });

  it("allows upload that fits", async () => {
    const enforcer = new QuotaEnforcer(makeDS({ plan: "free", storage: 0 }));
    const result = await enforcer.checkFileUpload(COMPANY, 1024);
    expect(result.allowed).toBe(true);
  });

  it("rejects negative size", async () => {
    const enforcer = new QuotaEnforcer(makeDS({ plan: "free" }));
    await expect(enforcer.checkFileUpload(COMPANY, -1)).rejects.toThrow();
  });
});

describe("QuotaEnforcer — caching", () => {
  it("caches user invite result for TTL", async () => {
    const ds = makeDS({ plan: "free", activeUsers: 1 });
    const spy = vi.spyOn(ds, "countActiveUsers");
    const enforcer = new QuotaEnforcer(ds, { cacheTtlMs: 60_000 });
    await enforcer.checkUserInvite(COMPANY);
    await enforcer.checkUserInvite(COMPANY);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("invalidate(companyId) clears all metrics for that company", async () => {
    const ds = makeDS({ plan: "free", activeUsers: 1 });
    const spy = vi.spyOn(ds, "countActiveUsers");
    const enforcer = new QuotaEnforcer(ds, { cacheTtlMs: 60_000 });
    await enforcer.checkUserInvite(COMPANY);
    enforcer.invalidate(COMPANY);
    await enforcer.checkUserInvite(COMPANY);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("storage check skips cache (volátil)", async () => {
    const ds = makeDS({ plan: "free" });
    const spy = vi.spyOn(ds, "sumStorageBytes");
    const enforcer = new QuotaEnforcer(ds);
    await enforcer.checkFileUpload(COMPANY, 100);
    await enforcer.checkFileUpload(COMPANY, 100);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
