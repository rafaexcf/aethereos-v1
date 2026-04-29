import { describe, it, expect, beforeEach } from "vitest";
import { LocalDatabaseDriver } from "../src/database/sqlite-wasm-driver.js";
import type {
  RawSqliteDB,
  LocalSqliteDB,
} from "../src/database/sqlite-wasm-driver.js";
import { isOk, isErr } from "@aethereos/drivers";
import type { TenantContext } from "@aethereos/drivers";

// ── In-memory mock of sql.js Database ───────────────────────────────────────

type SqlValue = string | number | bigint | null | Uint8Array;
type SqlParam = SqlValue;

class MockSqliteDB implements RawSqliteDB {
  run(sql: string, _params?: SqlParam[]): this {
    const t = sql.trim().toUpperCase();
    if (t === "BEGIN" || t === "COMMIT" || t === "ROLLBACK") return this;
    return this;
  }

  exec(
    sql: string,
    _params?: SqlParam[],
  ): { columns: string[]; values: SqlValue[][] }[] {
    if (sql.trim() === "SELECT 1") return [{ columns: ["1"], values: [[1]] }];
    return [];
  }

  export(): Uint8Array {
    return new Uint8Array(0);
  }

  close(): void {
    // no-op
  }
}

const tenantCtx: TenantContext = {
  company_id: "00000000-0000-0000-0000-000000000001",
  actor: { type: "human", user_id: "00000000-0000-0000-0000-000000000002" },
};

describe("LocalDatabaseDriver", () => {
  let driver: LocalDatabaseDriver;

  beforeEach(async () => {
    driver = new LocalDatabaseDriver(new MockSqliteDB());
    await driver.withTenant(tenantCtx);
  });

  it("withTenant returns ok", async () => {
    expect(isOk(await driver.withTenant(tenantCtx))).toBe(true);
  });

  it("ping returns ok when SELECT 1 succeeds", async () => {
    expect(isOk(await driver.ping())).toBe(true);
  });

  it("query exposes LocalSqliteDB with correct companyId", async () => {
    let observedId: string | null = null;
    await driver.query(async (db: unknown) => {
      observedId = (db as LocalSqliteDB).companyId;
      return [];
    });
    expect(observedId).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("query returns ok with rows from queryFn", async () => {
    const r = await driver.query(async (_db) => [{ id: 1, name: "test" }]);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toEqual([{ id: 1, name: "test" }]);
  });

  it("queryOne returns ok when row found", async () => {
    const r = await driver.queryOne(async (_db) => ({ id: 42 }));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toEqual({ id: 42 });
  });

  it("queryOne returns NotFoundError when undefined", async () => {
    const r = await driver.queryOne<{ id: number }>(async (_db) => undefined);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.message).toContain("not found");
  });

  it("execute returns ok with result", async () => {
    const r = await driver.execute(async (_db) => "done");
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe("done");
  });

  it("transaction commits and returns result", async () => {
    const r = await driver.transaction(async (tx) => {
      const rows = await tx.query(async (_db) => [{ x: 1 }]);
      return rows.length;
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(1);
  });

  it("transaction rolls back on error", async () => {
    const r = await driver.transaction(async (_tx) => {
      throw new Error("boom");
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.message).toContain("transaction failed");
  });

  it("export returns Uint8Array", () => {
    expect(driver.export()).toBeInstanceOf(Uint8Array);
  });
});
