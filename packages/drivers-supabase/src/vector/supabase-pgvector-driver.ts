import postgres from "postgres";
import type {
  VectorDriver,
  VectorRecord,
  VectorSearchResult,
  VectorSearchOptions,
  TenantContext,
  Result,
} from "@aethereos/drivers";
import { ok, err, DatabaseError, NotFoundError } from "@aethereos/drivers";

export interface SupabasePgvectorConfig {
  connectionString: string;
}

interface VectorRow {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
  content: string | null;
}

export class SupabasePgvectorDriver implements VectorDriver {
  readonly #sql: postgres.Sql;
  #tenantCtx: TenantContext | null = null;

  constructor(config: SupabasePgvectorConfig) {
    this.#sql = postgres(config.connectionString, {
      max: 5,
      prepare: false,
    });
  }

  withTenant(ctx: TenantContext): void {
    this.#tenantCtx = ctx;
  }

  #companyId(): string | null {
    return this.#tenantCtx?.company_id ?? null;
  }

  #tableName(collection: string): string {
    return `vector.${collection.replace(/[^a-z0-9_]/g, "_")}`;
  }

  async upsert(
    collection: string,
    record: VectorRecord,
  ): Promise<Result<void, DatabaseError>> {
    const companyId = this.#companyId();
    if (companyId === null) {
      return err(
        new DatabaseError("withTenant() must be called before upsert()"),
      );
    }
    try {
      const table = this.#tableName(collection);
      await this.#sql.unsafe(
        `
        insert into ${table} (id, company_id, embedding, metadata, content)
        values ($1::uuid, $2::uuid, $3::vector, $4::jsonb, $5)
        on conflict (id) do update set
          embedding = excluded.embedding,
          metadata  = excluded.metadata,
          content   = excluded.content
      `,
        [
          record.id,
          companyId,
          JSON.stringify(record.embedding),
          JSON.stringify(record.metadata),
          record.content ?? null,
        ],
      );
      return ok(undefined);
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }

  async search(
    collection: string,
    query: number[],
    options?: VectorSearchOptions,
  ): Promise<Result<VectorSearchResult[], DatabaseError>> {
    const companyId = this.#companyId();
    if (companyId === null) {
      return err(
        new DatabaseError("withTenant() must be called before search()"),
      );
    }
    try {
      const topK = options?.topK ?? 10;
      const table = this.#tableName(collection);
      const rows = await this.#sql.unsafe<VectorRow[]>(
        `
        select
          id::text,
          1 - (embedding <=> $1::vector) as score,
          metadata,
          content
        from ${table}
        where company_id = $2::uuid
        order by embedding <=> $1::vector
        limit $3
      `,
        [JSON.stringify(query), companyId, topK],
      );

      return ok(
        rows.map((r) => ({
          id: r.id,
          score: r.score,
          metadata: r.metadata,
          ...(options?.includeContent && r.content !== null
            ? { content: r.content }
            : {}),
        })),
      );
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }

  async delete(
    collection: string,
    id: string,
  ): Promise<Result<void, DatabaseError | NotFoundError>> {
    const companyId = this.#companyId();
    if (companyId === null) {
      return err(
        new DatabaseError("withTenant() must be called before delete()"),
      );
    }
    try {
      const table = this.#tableName(collection);
      const result = await this.#sql.unsafe(
        `
        delete from ${table}
        where id = $1::uuid
          and company_id = $2::uuid
      `,
        [id, companyId],
      );
      if (result.count === 0) {
        return err(new NotFoundError(`Vector not found: ${id}`));
      }
      return ok(undefined);
    } catch (e) {
      return err(new DatabaseError(String(e)));
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
