import type { Result } from "../types/result.js";
import type { TenantContext } from "../types/tenant-context.js";
import type {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "../errors.js";

export type StorageDriverError = DatabaseError | ValidationError;

export interface StorageObject {
  id: string;
  bucket: string;
  path: string;
  size: number;
  contentType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, unknown>;
  /** TTL em segundos para URL assinada */
  signedUrlTtl?: number;
  /** Se true, sobrescreve arquivo existente */
  upsert?: boolean;
}

/**
 * StorageDriver — contrato para armazenamento de arquivos binários.
 *
 * Implementação cloud: SupabaseStorageDriver
 * Implementação local (Camada 0): OPFSStorageDriver (Origin Private File System)
 *
 * Ref: Fundamentação 4.1 (Drive), 4.7 [INV], ADR-0014 #14
 */
export interface StorageDriver {
  withTenant(context: TenantContext): void;

  /** Upload de arquivo binário */
  upload(
    bucket: string,
    path: string,
    data: Uint8Array | ReadableStream,
    options?: UploadOptions,
  ): Promise<Result<StorageObject, StorageDriverError>>;

  /** Download de arquivo como stream */
  download(
    bucket: string,
    path: string,
  ): Promise<Result<ReadableStream, StorageDriverError | NotFoundError>>;

  /** URL pública (apenas para buckets públicos) */
  publicUrl(bucket: string, path: string): Result<string, StorageDriverError>;

  /** URL assinada temporária */
  signedUrl(
    bucket: string,
    path: string,
    ttlSeconds: number,
  ): Promise<Result<string, StorageDriverError>>;

  /** Remove arquivo */
  delete(
    bucket: string,
    path: string,
  ): Promise<Result<void, StorageDriverError | NotFoundError>>;

  ping(): Promise<Result<void, StorageDriverError>>;
}
