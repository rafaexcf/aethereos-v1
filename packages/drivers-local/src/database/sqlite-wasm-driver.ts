import type { DatabaseDriver, TransactionContext } from "@aethereos/drivers";
import type { TenantContext, Result } from "@aethereos/drivers";
import { ok, err } from "@aethereos/drivers";
import { DatabaseError, NotFoundError } from "@aethereos/drivers";

// ── sql.js-compatible interface (no runtime import of sql.js) ─────────────────

type SqlValue = string | number | bigint | null | Uint8Array;
type SqlParam = SqlValue;

interface QueryExecResult {
  columns: string[];
  values: SqlValue[][];
}

/**
 * RawSqliteDB — interface matching sql.js Database API.
 * Callers inject an actual sql.js Database instance; tests inject a mock.
 */
export interface RawSqliteDB {
  run(sql: string, params?: SqlParam[]): this;
  exec(sql: string, params?: SqlParam[]): QueryExecResult[];
  export(): Uint8Array;
  close(): void;
}

/**
 * LocalSqliteDB — typed wrapper exposed to domain queryFns.
 * db.companyId gives the current tenant context.
 */
export interface LocalSqliteDB {
  readonly companyId: string | null;
  run(sql: string, params?: SqlParam[]): void;
  all<T = Record<string, SqlValue>>(sql: string, params?: SqlParam[]): T[];
}

function rowsFromResult<T>(result: QueryExecResult): T[] {
  return result.values.map((row) => {
    const obj: Record<string, SqlValue> = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i] ?? null;
    });
    return obj as T;
  });
}

/**
 * LocalDatabaseDriver — DatabaseDriver over a sql.js Database instance.
 * Tenant isolation via in-class companyId state (Camada 0 is single-tenant).
 * The sql.js Database is injected by the boot sequence (M13) which handles OPFS persistence.
 */
export class LocalDatabaseDriver implements DatabaseDriver {
  private companyId: string | null = null;
  private inTransaction = false;

  constructor(private readonly raw: RawSqliteDB) {}

  async withTenant(
    context: TenantContext,
  ): Promise<Result<void, DatabaseError>> {
    this.companyId = context.company_id;
    return ok(undefined);
  }

  private makeLocalDb(): LocalSqliteDB {
    const raw = this.raw;
    const companyId = this.companyId;
    return {
      get companyId() {
        return companyId;
      },
      run(sql: string, params?: SqlParam[]) {
        raw.run(sql, params);
      },
      all<T = Record<string, SqlValue>>(sql: string, params?: SqlParam[]): T[] {
        const results = raw.exec(sql, params);
        if (results.length === 0) return [];
        return rowsFromResult<T>(results[0] as QueryExecResult);
      },
    };
  }

  async transaction<T>(
    fn: (tx: TransactionContext) => Promise<T>,
  ): Promise<Result<T, DatabaseError>> {
    if (this.inTransaction) {
      return err(new DatabaseError("nested transactions not supported"));
    }
    this.inTransaction = true;
    this.raw.run("BEGIN");
    try {
      const localDb = this.makeLocalDb();
      const tx: TransactionContext = {
        query: async <TRow>(queryFn: (db: unknown) => Promise<TRow[]>) => {
          return queryFn(localDb);
        },
        execute: async <TRow = void>(
          queryFn: (db: unknown) => Promise<TRow>,
        ) => {
          return queryFn(localDb);
        },
      };
      const result = await fn(tx);
      this.raw.run("COMMIT");
      this.inTransaction = false;
      return ok(result);
    } catch (e) {
      this.raw.run("ROLLBACK");
      this.inTransaction = false;
      return err(new DatabaseError(`transaction failed: ${String(e)}`));
    }
  }

  async query<TRow>(
    queryFn: (db: unknown) => Promise<TRow[]>,
  ): Promise<Result<TRow[], DatabaseError>> {
    try {
      const rows = await queryFn(this.makeLocalDb());
      return ok(rows);
    } catch (e) {
      return err(new DatabaseError(`query failed: ${String(e)}`));
    }
  }

  async queryOne<TRow>(
    queryFn: (db: unknown) => Promise<TRow | undefined>,
  ): Promise<Result<TRow, DatabaseError | NotFoundError>> {
    try {
      const row = await queryFn(this.makeLocalDb());
      if (row === undefined) return err(new NotFoundError("row not found"));
      return ok(row);
    } catch (e) {
      return err(new DatabaseError(`queryOne failed: ${String(e)}`));
    }
  }

  async execute<TRow = void>(
    queryFn: (db: unknown) => Promise<TRow>,
  ): Promise<Result<TRow, DatabaseError>> {
    try {
      const result = await queryFn(this.makeLocalDb());
      return ok(result);
    } catch (e) {
      return err(new DatabaseError(`execute failed: ${String(e)}`));
    }
  }

  async ping(): Promise<Result<void, DatabaseError>> {
    try {
      this.raw.exec("SELECT 1");
      return ok(undefined);
    } catch (e) {
      return err(new DatabaseError(`ping failed: ${String(e)}`));
    }
  }

  /**
   * Serializes the database to Uint8Array for OPFS persistence.
   * Called by the boot sequence after writes.
   */
  export(): Uint8Array {
    return this.raw.export();
  }
}
