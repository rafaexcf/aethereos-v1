import type { Result } from "../types/result.js";
import type { TenantContext } from "../types/tenant-context.js";
import type { DatabaseError, NotFoundError } from "../errors.js";

export type VectorDriverError = DatabaseError;

export interface VectorRecord {
  id: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  content?: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
  content?: string;
}

export interface VectorSearchOptions {
  topK?: number;
  filter?: Record<string, unknown>;
  includeContent?: boolean;
}

/**
 * VectorDriver — contrato para armazenamento e busca vetorial.
 *
 * Implementação F1-2: pgvector via SupabasePgvectorDriver
 * Implementação F3+: Qdrant via QdrantDriver (quando tenant tem >5M vetores)
 * Swap sem refactor de negócio graças a esta interface.
 *
 * Ref: ADR-0014 #17, Fundamentação 4.7 [INV]
 */
export interface VectorDriver {
  /** Define contexto de tenant (isolamento por company_id) */
  withTenant(context: TenantContext): void;

  /** Insere ou atualiza um vetor */
  upsert(
    collection: string,
    record: VectorRecord,
  ): Promise<Result<void, VectorDriverError>>;

  /** Busca por similaridade semântica */
  search(
    collection: string,
    query: number[],
    options?: VectorSearchOptions,
  ): Promise<Result<VectorSearchResult[], VectorDriverError>>;

  /** Remove um vetor por id */
  delete(
    collection: string,
    id: string,
  ): Promise<Result<void, VectorDriverError | NotFoundError>>;

  ping(): Promise<Result<void, VectorDriverError>>;
}
