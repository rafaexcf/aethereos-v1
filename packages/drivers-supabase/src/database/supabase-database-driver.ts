import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql as drizzleSql } from "drizzle-orm";
import * as schema from "../schema/index.js";
import type {
  DatabaseDriver,
  TransactionContext,
  TenantContext,
  Result,
} from "@aethereos/drivers";
import {
  ok,
  err,
  DatabaseError,
  NotFoundError,
  ConflictError,
} from "@aethereos/drivers";

type DrizzleSchema = typeof schema;
export type DrizzleDb = PostgresJsDatabase<DrizzleSchema>;

export interface SupabaseDatabaseConfig {
  connectionString: string;
  max?: number;
}

export class SupabaseDatabaseDriver implements DatabaseDriver {
  readonly #sql: postgres.Sql;
  readonly #db: DrizzleDb;
  #tenantCtx: TenantContext | null = null;

  constructor(config: SupabaseDatabaseConfig) {
    this.#sql = postgres(config.connectionString, {
      max: config.max ?? 10,
      prepare: false,
    });
    this.#db = drizzle(this.#sql, { schema });
  }

  /** Expose raw Drizzle db for consumers that need Drizzle-typed queries */
  get db(): DrizzleDb {
    return this.#db;
  }

  async withTenant(ctx: TenantContext): Promise<Result<void, DatabaseError>> {
    this.#tenantCtx = ctx;
    return ok(undefined);
  }

  #setTenantSql(companyId: string) {
    return drizzleSql`select kernel.set_tenant_context(${companyId}::uuid)`;
  }

  async transaction<T>(
    fn: (tx: TransactionContext) => Promise<T>,
  ): Promise<Result<T, DatabaseError>> {
    const companyId = this.#tenantCtx?.company_id;
    try {
      const result = await this.#db.transaction(async (drizzleTx) => {
        if (companyId !== undefined) {
          await drizzleTx.execute(this.#setTenantSql(companyId));
        }
        const ctx: TransactionContext = {
          query: <TRow>(queryFn: (db: unknown) => Promise<TRow[]>) =>
            queryFn(drizzleTx),
          execute: <TRow = void>(queryFn: (db: unknown) => Promise<TRow>) =>
            queryFn(drizzleTx),
        };
        return fn(ctx);
      });
      return ok(result);
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }

  async query<TRow>(
    queryFn: (db: unknown) => Promise<TRow[]>,
  ): Promise<Result<TRow[], DatabaseError>> {
    const companyId = this.#tenantCtx?.company_id;
    try {
      if (companyId !== undefined) {
        const rows = await this.#db.transaction(async (tx) => {
          await tx.execute(this.#setTenantSql(companyId));
          return queryFn(tx);
        });
        return ok(rows);
      }
      const rows = await queryFn(this.#db);
      return ok(rows);
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }

  async queryOne<TRow>(
    queryFn: (db: unknown) => Promise<TRow | undefined>,
  ): Promise<Result<TRow, DatabaseError | NotFoundError>> {
    const companyId = this.#tenantCtx?.company_id;
    try {
      let row: TRow | undefined;
      if (companyId !== undefined) {
        row = await this.#db.transaction(async (tx) => {
          await tx.execute(this.#setTenantSql(companyId));
          return queryFn(tx);
        });
      } else {
        row = await queryFn(this.#db);
      }
      if (row === undefined) {
        return err(new NotFoundError("Row not found"));
      }
      return ok(row);
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }

  async execute<TRow = void>(
    queryFn: (db: unknown) => Promise<TRow>,
  ): Promise<Result<TRow, DatabaseError | ConflictError>> {
    const companyId = this.#tenantCtx?.company_id;
    try {
      let result: TRow;
      if (companyId !== undefined) {
        result = await this.#db.transaction(async (tx) => {
          await tx.execute(this.#setTenantSql(companyId));
          return queryFn(tx);
        });
      } else {
        result = await queryFn(this.#db);
      }
      return ok(result);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return err(new ConflictError(`Constraint violation: ${msg}`));
      }
      return err(new DatabaseError(msg));
    }
  }

  async ping(): Promise<Result<void, DatabaseError>> {
    try {
      await this.#sql`select 1`;
      return ok(undefined);
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#sql.end();
  }
}
