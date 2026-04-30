import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  VectorDriver,
  VectorRecord,
  VectorSearchResult,
  VectorSearchOptions,
  TenantContext,
  Result,
} from "@aethereos/drivers";
import { ok, err, DatabaseError } from "@aethereos/drivers";
import type { NotFoundError } from "@aethereos/drivers";

export interface SupabaseBrowserVectorConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

interface SearchRpcRow {
  id: string;
  source_type: string;
  source_id: string;
  chunk_index: number;
  chunk_text: string;
  metadata: Record<string, unknown>;
  score: number;
}

/** Browser-side VectorDriver — search-only, RLS enforced via kernel.search_embeddings RPC */
export class SupabaseBrowserVectorDriver implements VectorDriver {
  readonly #client: SupabaseClient;
  #tenantCtx: TenantContext | null = null;

  constructor(config: SupabaseBrowserVectorConfig) {
    this.#client = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  withTenant(ctx: TenantContext): void {
    this.#tenantCtx = ctx;
  }

  async upsert(
    _collection: string,
    _record: VectorRecord,
  ): Promise<Result<void, DatabaseError>> {
    return err(
      new DatabaseError(
        "SupabaseBrowserVectorDriver.upsert() is not supported — use server-side SupabasePgvectorDriver or the embed-text Edge Function",
      ),
    );
  }

  async search(
    _collection: string,
    query: number[],
    options?: VectorSearchOptions,
  ): Promise<Result<VectorSearchResult[], DatabaseError>> {
    const companyId = this.#tenantCtx?.company_id ?? null;
    if (companyId === null) {
      return err(
        new DatabaseError("withTenant() must be called before search()"),
      );
    }
    try {
      const topK = options?.topK ?? 10;
      const { data, error } = await this.#client.rpc("search_embeddings", {
        p_company_id: companyId,
        p_query_vector: `[${query.join(",")}]`,
        p_top_k: topK,
      });

      if (error !== null) {
        return err(new DatabaseError(error.message));
      }

      const rows = (data as SearchRpcRow[]) ?? [];
      return ok(
        rows.map((r) => ({
          id: r.id,
          score: r.score,
          metadata: {
            ...r.metadata,
            source_type: r.source_type,
            source_id: r.source_id,
            chunk_index: r.chunk_index,
          },
          ...(options?.includeContent ? { content: r.chunk_text } : {}),
        })),
      );
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }

  async delete(
    _collection: string,
    _id: string,
  ): Promise<Result<void, DatabaseError | NotFoundError>> {
    return err(
      new DatabaseError(
        "SupabaseBrowserVectorDriver.delete() is not supported — use server-side driver",
      ),
    );
  }

  async ping(): Promise<Result<void, DatabaseError>> {
    const { error } = await this.#client
      .schema("kernel")
      .from("embeddings")
      .select("id", { count: "exact", head: true })
      .limit(1);
    if (error !== null) return err(new DatabaseError(error.message));
    return ok(undefined);
  }
}
