import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  StorageDriver,
  StorageObject,
  UploadOptions,
  TenantContext,
  Result,
} from "@aethereos/drivers";
import { ok, err, DatabaseError, NotFoundError } from "@aethereos/drivers";
import type { ValidationError } from "@aethereos/drivers";

export interface SupabaseStorageConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
}

type StorageDriverError = DatabaseError | ValidationError;

export class SupabaseStorageDriver implements StorageDriver {
  readonly #client: SupabaseClient;
  #tenantCtx: TenantContext | null = null;

  constructor(config: SupabaseStorageConfig) {
    this.#client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }

  withTenant(ctx: TenantContext): void {
    this.#tenantCtx = ctx;
  }

  #prefixPath(path: string): string {
    const companyId = this.#tenantCtx?.company_id;
    if (companyId === undefined) return path;
    return `${companyId}/${path}`;
  }

  async upload(
    bucket: string,
    path: string,
    data: Uint8Array | ReadableStream,
    options?: UploadOptions,
  ): Promise<Result<StorageObject, StorageDriverError>> {
    try {
      const prefixedPath = this.#prefixPath(path);
      // Supabase Storage accepts Blob/ArrayBuffer; convert Uint8Array directly.
      // ReadableStream is passed as-is (Supabase JS v2 accepts it via fetch).
      const uploadData = data instanceof Uint8Array ? new Blob([data]) : data;
      const uploadOptions: Record<string, unknown> = {
        upsert: options?.upsert ?? false,
      };
      if (options?.contentType !== undefined) {
        uploadOptions["contentType"] = options.contentType;
      }
      if (options?.metadata !== undefined) {
        uploadOptions["metadata"] = options.metadata;
      }
      const { data: obj, error } = await this.#client.storage
        .from(bucket)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upload(prefixedPath, uploadData as any, uploadOptions);
      if (error !== null) {
        return err(new DatabaseError(error.message));
      }
      return ok({
        id: obj.id ?? prefixedPath,
        bucket,
        path: prefixedPath,
        size: 0,
        contentType: options?.contentType ?? "application/octet-stream",
        metadata: options?.metadata ?? {},
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }

  async download(
    bucket: string,
    path: string,
  ): Promise<Result<ReadableStream, StorageDriverError | NotFoundError>> {
    try {
      const prefixedPath = this.#prefixPath(path);
      const { data, error } = await this.#client.storage
        .from(bucket)
        .download(prefixedPath);
      if (error !== null) {
        if (
          error.message.includes("not found") ||
          error.message.includes("404")
        ) {
          return err(new NotFoundError(`Object not found: ${prefixedPath}`));
        }
        return err(new DatabaseError(error.message));
      }
      return ok(data.stream());
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }

  publicUrl(bucket: string, path: string): Result<string, StorageDriverError> {
    const prefixedPath = this.#prefixPath(path);
    const { data } = this.#client.storage
      .from(bucket)
      .getPublicUrl(prefixedPath);
    return ok(data.publicUrl);
  }

  async signedUrl(
    bucket: string,
    path: string,
    ttlSeconds: number,
  ): Promise<Result<string, StorageDriverError>> {
    try {
      const prefixedPath = this.#prefixPath(path);
      const { data, error } = await this.#client.storage
        .from(bucket)
        .createSignedUrl(prefixedPath, ttlSeconds);
      if (error !== null) {
        return err(new DatabaseError(error.message));
      }
      return ok(data.signedUrl);
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }

  async delete(
    bucket: string,
    path: string,
  ): Promise<Result<void, StorageDriverError | NotFoundError>> {
    try {
      const prefixedPath = this.#prefixPath(path);
      const { error } = await this.#client.storage
        .from(bucket)
        .remove([prefixedPath]);
      if (error !== null) {
        return err(new DatabaseError(error.message));
      }
      return ok(undefined);
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }

  async ping(): Promise<Result<void, StorageDriverError>> {
    try {
      await this.#client.storage.listBuckets();
      return ok(undefined);
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }
}
