/**
 * Driver Model Validation — Kernel agnostic de implementação.
 *
 * Prova empírica que o mesmo kernel opera sobre drivers locais (Camada 0)
 * e drivers cloud (Camada 1) sem qualquer `if (camada === ...)` no código do kernel.
 *
 * Refs: Fundamentação P1 [INV], CLAUDE.md §4 Driver Model [INV],
 *       docs/architecture/DRIVER_MODEL_VALIDATION.md
 */

import { describe, test, expect, vi, type Mock } from "vitest";
import { KernelPublisher } from "../src/scp/publisher.js";
import { auditLog } from "../src/audit/logger.js";
import type {
  DatabaseDriver,
  EventBusDriver,
  TenantContext,
  Result,
} from "@aethereos/drivers";
import { ok, err, DatabaseError } from "@aethereos/drivers";
import type { AuditLogDriver } from "../src/audit/logger.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTenantContext(): TenantContext {
  return {
    company_id: "00000000-0000-0000-0000-000000000001",
    actor: {
      type: "human",
      user_id: "00000000-0000-0000-0000-000000000099",
    },
  };
}

/**
 * Cria um mock mínimo de DatabaseDriver.
 * `label` documenta a "camada" simulada — o kernel não usa este valor.
 */
function makeMockDb(_label: "local" | "cloud"): DatabaseDriver & {
  _withTenant: Mock;
  _transaction: Mock;
} {
  const mockTx = {
    query: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => {
      return fn();
    }),
  };

  const _withTenant = vi
    .fn()
    .mockResolvedValue(ok(undefined) as Result<void, DatabaseError>);

  const _transaction = vi
    .fn()
    .mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
      const result = await fn(mockTx);
      return ok(result);
    });

  return {
    _withTenant,
    _transaction,
    withTenant: _withTenant,
    transaction: _transaction,
    query: vi.fn().mockResolvedValue(ok([])),
    queryOne: vi.fn().mockResolvedValue(err(new DatabaseError("not found"))),
    mutate: vi.fn().mockResolvedValue(ok(0)),
    ping: vi.fn().mockResolvedValue(ok(undefined)),
    disconnect: vi.fn().mockResolvedValue(ok(undefined)),
  } as unknown as DatabaseDriver & {
    _withTenant: Mock;
    _transaction: Mock;
  };
}

function makeMockBus(_label: "broadcast-channel" | "nats"): EventBusDriver {
  return {
    publish: vi.fn().mockResolvedValue(ok("msg-id")),
    subscribe: vi.fn(),
    unsubscribe: vi.fn().mockResolvedValue(ok(undefined)),
    ping: vi.fn().mockResolvedValue(ok(undefined)),
    disconnect: vi.fn().mockResolvedValue(ok(undefined)),
  } as unknown as EventBusDriver;
}

// ─── Contexto compartilhado ───────────────────────────────────────────────────

const VALID_EVENT_TYPE = "platform.tenant.created";
const VALID_PAYLOAD = {
  company_id: "00000000-0000-0000-0000-000000000001",
  plan: "starter" as const,
  name: "Driver Test Co",
  country: "BR",
  distribution: "aethereos",
};

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("Driver Model — kernel agnóstico de implementação", () => {
  describe("KernelPublisher: comportamento idêntico em Local e Cloud", () => {
    test("Camada 0 (local): publica evento via DatabaseDriver local-like", async () => {
      const localDb = makeMockDb("local");
      const localBus = makeMockBus("broadcast-channel");
      const publisher = new KernelPublisher(localDb, localBus);

      const result = await publisher.publish(
        makeTenantContext(),
        VALID_EVENT_TYPE,
        VALID_PAYLOAD,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw result.error;

      expect(result.value.correlation_id).toBeTruthy();
      expect(result.value.event_id).toBeTruthy();
      // Kernel chamou withTenant e transaction — sem branch por camada
      expect(localDb._withTenant).toHaveBeenCalledOnce();
      expect(localDb._transaction).toHaveBeenCalledOnce();
    });

    test("Camada 1 (cloud): publica evento via DatabaseDriver cloud-like", async () => {
      const cloudDb = makeMockDb("cloud");
      const natsbus = makeMockBus("nats");
      const publisher = new KernelPublisher(cloudDb, natsbus);

      const result = await publisher.publish(
        makeTenantContext(),
        VALID_EVENT_TYPE,
        VALID_PAYLOAD,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) throw result.error;

      expect(result.value.correlation_id).toBeTruthy();
      expect(result.value.event_id).toBeTruthy();
      // Chamadas idênticas à Camada 0 — kernel não distingue
      expect(cloudDb._withTenant).toHaveBeenCalledOnce();
      expect(cloudDb._transaction).toHaveBeenCalledOnce();
    });

    test("resultado structuralmente idêntico em ambas as camadas", async () => {
      const ctx = makeTenantContext();

      const localResult = await new KernelPublisher(
        makeMockDb("local"),
        makeMockBus("broadcast-channel"),
      ).publish(ctx, VALID_EVENT_TYPE, VALID_PAYLOAD);

      const cloudResult = await new KernelPublisher(
        makeMockDb("cloud"),
        makeMockBus("nats"),
      ).publish(ctx, VALID_EVENT_TYPE, VALID_PAYLOAD);

      // Ambas camadas retornam ok com os mesmos campos
      expect(localResult.ok).toBe(true);
      expect(cloudResult.ok).toBe(true);
      if (!localResult.ok || !cloudResult.ok) return;

      expect(Object.keys(localResult.value)).toEqual(
        Object.keys(cloudResult.value),
      );
    });

    test("rejeita evento sem schema registrado (invariante independente de camada)", async () => {
      const publisher = new KernelPublisher(
        makeMockDb("cloud"),
        makeMockBus("nats"),
      );

      const result = await publisher.publish(
        makeTenantContext(),
        "unregistered.event.type",
        {},
      );

      expect(result.ok).toBe(false);
    });

    test("propaga erro de withTenant sem tentar a transação", async () => {
      const brokenDb = makeMockDb("cloud");
      brokenDb._withTenant.mockResolvedValueOnce(
        err(new DatabaseError("tenant context failed")),
      );

      const publisher = new KernelPublisher(brokenDb, makeMockBus("nats"));
      const result = await publisher.publish(
        makeTenantContext(),
        VALID_EVENT_TYPE,
        VALID_PAYLOAD,
      );

      expect(result.ok).toBe(false);
      expect(brokenDb._transaction).not.toHaveBeenCalled();
    });
  });

  describe("auditLog: comportamento idêntico em Local e Cloud", () => {
    function makeMockAuditDriver(): AuditLogDriver & { _append: Mock } {
      const _append = vi.fn().mockResolvedValue(undefined);
      return { _append, append: _append };
    }

    test("Camada 0: auditLog chama driver.append com entry correta", async () => {
      const localAuditDriver = makeMockAuditDriver();
      const ctx = makeTenantContext();

      await auditLog(localAuditDriver, ctx, "user.login", {
        type: "session",
        id: "sess-001",
      });

      expect(localAuditDriver._append).toHaveBeenCalledOnce();
      const [entry] = localAuditDriver._append.mock.calls[0] as [
        { tenant_id: string; action: string; resource_type: string },
      ];
      expect(entry.tenant_id).toBe(ctx.company_id);
      expect(entry.action).toBe("user.login");
      expect(entry.resource_type).toBe("session");
    });

    test("Camada 1: auditLog chama driver.append com entry identicamente estruturada", async () => {
      const cloudAuditDriver = makeMockAuditDriver();
      const ctx = makeTenantContext();

      await auditLog(cloudAuditDriver, ctx, "user.login", {
        type: "session",
        id: "sess-001",
      });

      expect(cloudAuditDriver._append).toHaveBeenCalledOnce();
      const [entry] = cloudAuditDriver._append.mock.calls[0] as [
        { tenant_id: string; action: string; resource_type: string },
      ];
      expect(entry.tenant_id).toBe(ctx.company_id);
      expect(entry.action).toBe("user.login");
      expect(entry.resource_type).toBe("session");
    });

    test("auditLog propaga erro do driver (fail-loud — sem silenciar)", async () => {
      const faultyDriver: AuditLogDriver = {
        append: vi.fn().mockRejectedValue(new Error("DB unavailable")),
      };

      await expect(
        auditLog(faultyDriver, makeTenantContext(), "test.action", {
          type: "resource",
          id: "res-1",
        }),
      ).rejects.toThrow("DB unavailable");
    });
  });
});
