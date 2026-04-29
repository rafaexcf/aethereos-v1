import type {
  StorageDriver,
  StorageObject,
  UploadOptions,
} from "@aethereos/drivers";
import type { TenantContext, Result } from "@aethereos/drivers";
import { ok, err } from "@aethereos/drivers";
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
} from "@aethereos/drivers";

type StorageDriverError = DatabaseError | ValidationError;

function toArrayBuffer(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(
    u.byteOffset,
    u.byteOffset + u.byteLength,
  ) as ArrayBuffer;
}

/**
 * OPFSStorageDriver — file storage via Origin Private File System.
 * Layout: <root>/<companyId>/<bucket>/<path>
 * Falls back to in-memory buffer when OPFS is unavailable (tests, older browsers).
 */
export class OPFSStorageDriver implements StorageDriver {
  private companyId: string | null = null;
  private readonly opfsAvailable: boolean;
  private memoryStore = new Map<
    string,
    { data: Uint8Array; contentType: string; metadata: Record<string, unknown> }
  >();

  constructor() {
    this.opfsAvailable =
      typeof navigator !== "undefined" &&
      "storage" in navigator &&
      typeof (navigator.storage as { getDirectory?: unknown }).getDirectory ===
        "function";
  }

  withTenant(context: TenantContext): void {
    this.companyId = context.company_id;
  }

  private requireTenant(): string {
    if (!this.companyId)
      throw new DatabaseError("withTenant() must be called first");
    return this.companyId;
  }

  private storageKey(bucket: string, path: string): string {
    return `${this.requireTenant()}/${bucket}/${path}`;
  }

  private async getCompanyDir(): Promise<FileSystemDirectoryHandle> {
    const root = await navigator.storage.getDirectory();
    const cid = this.requireTenant();
    return root.getDirectoryHandle(cid, { create: true });
  }

  private async getBucketDir(
    bucket: string,
  ): Promise<FileSystemDirectoryHandle> {
    const companyDir = await this.getCompanyDir();
    return companyDir.getDirectoryHandle(bucket, { create: true });
  }

  private parsePath(path: string): { dirs: string[]; filename: string } {
    const parts = path.split("/").filter(Boolean);
    return { dirs: parts.slice(0, -1), filename: parts.at(-1) ?? path };
  }

  async upload(
    bucket: string,
    path: string,
    data: Uint8Array | ReadableStream,
    options?: UploadOptions,
  ): Promise<Result<StorageObject, StorageDriverError>> {
    try {
      this.requireTenant();
    } catch {
      return err(
        new DatabaseError("withTenant() must be called before upload"),
      );
    }

    let bytes: Uint8Array;
    if (data instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = data.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value as Uint8Array);
      }
      const total = chunks.reduce((n, c) => n + c.byteLength, 0);
      bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
    } else {
      bytes = data;
    }

    const contentType = options?.contentType ?? "application/octet-stream";
    const metadata = options?.metadata ?? {};

    if (this.opfsAvailable) {
      try {
        const bucketDir = await this.getBucketDir(bucket);
        const { dirs, filename } = this.parsePath(path);
        let dir = bucketDir;
        for (const d of dirs)
          dir = await dir.getDirectoryHandle(d, { create: true });
        const fh = await dir.getFileHandle(filename, { create: true });
        const writable = await fh.createWritable();
        await writable.write(toArrayBuffer(bytes));
        await writable.close();
      } catch (e) {
        return err(new DatabaseError(`OPFS write failed: ${String(e)}`));
      }
    } else {
      this.memoryStore.set(this.storageKey(bucket, path), {
        data: bytes,
        contentType,
        metadata,
      });
    }

    return ok({
      id: crypto.randomUUID(),
      bucket,
      path,
      size: bytes.byteLength,
      contentType,
      metadata,
      createdAt: new Date().toISOString(),
    });
  }

  async download(
    bucket: string,
    path: string,
  ): Promise<Result<ReadableStream, StorageDriverError | NotFoundError>> {
    try {
      this.requireTenant();
    } catch {
      return err(
        new DatabaseError("withTenant() must be called before download"),
      );
    }

    if (this.opfsAvailable) {
      try {
        const bucketDir = await this.getBucketDir(bucket);
        const { dirs, filename } = this.parsePath(path);
        let dir = bucketDir;
        for (const d of dirs) dir = await dir.getDirectoryHandle(d);
        const fh = await dir.getFileHandle(filename);
        const file = await fh.getFile();
        return ok(file.stream());
      } catch {
        return err(new NotFoundError(`file not found: ${bucket}/${path}`));
      }
    }

    const entry = this.memoryStore.get(this.storageKey(bucket, path));
    if (!entry)
      return err(new NotFoundError(`file not found: ${bucket}/${path}`));
    const bytes = entry.data;
    return ok(
      new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
    );
  }

  publicUrl(
    _bucket: string,
    _path: string,
  ): Result<string, StorageDriverError> {
    return err(
      new ValidationError("OPFS has no public URL — use signedUrl()", []),
    );
  }

  async signedUrl(
    _bucket: string,
    _path: string,
    _ttlSeconds: number,
  ): Promise<Result<string, StorageDriverError>> {
    return err(
      new ValidationError(
        "signed URLs not supported in Camada 0 local storage",
        [],
      ),
    );
  }

  async delete(
    bucket: string,
    path: string,
  ): Promise<Result<void, StorageDriverError | NotFoundError>> {
    try {
      this.requireTenant();
    } catch {
      return err(
        new DatabaseError("withTenant() must be called before delete"),
      );
    }

    if (this.opfsAvailable) {
      try {
        const bucketDir = await this.getBucketDir(bucket);
        const { dirs, filename } = this.parsePath(path);
        let dir = bucketDir;
        for (const d of dirs) dir = await dir.getDirectoryHandle(d);
        await dir.removeEntry(filename);
      } catch {
        return err(new NotFoundError(`file not found: ${bucket}/${path}`));
      }
    } else {
      const key = this.storageKey(bucket, path);
      if (!this.memoryStore.has(key)) {
        return err(new NotFoundError(`file not found: ${bucket}/${path}`));
      }
      this.memoryStore.delete(key);
    }

    return ok(undefined);
  }

  async ping(): Promise<Result<void, StorageDriverError>> {
    return ok(undefined);
  }
}
