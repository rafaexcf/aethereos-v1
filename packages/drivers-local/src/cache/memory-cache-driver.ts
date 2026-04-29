import type { CacheDriver } from "@aethereos/drivers";
import type { Result } from "@aethereos/drivers";
import { ok, err } from "@aethereos/drivers";
import type { NetworkError } from "@aethereos/drivers";
import { NotFoundError } from "@aethereos/drivers";

// CacheDriverError = NetworkError (defined in @aethereos/drivers/interfaces/cache but not re-exported)
type CacheDriverError = NetworkError;

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

export class MemoryCacheDriver implements CacheDriver {
  private store = new Map<string, CacheEntry<unknown>>();

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  async get<T = unknown>(
    key: string,
  ): Promise<Result<T | null, CacheDriverError>> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return ok(null);
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return ok(null);
    }
    return ok(entry.value);
  }

  async set<T = unknown>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<Result<void, CacheDriverError>> {
    const expiresAt =
      ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return ok(undefined);
  }

  async delete(
    key: string,
  ): Promise<Result<void, CacheDriverError | NotFoundError>> {
    if (!this.store.has(key)) {
      return err(new NotFoundError(`key not found: ${key}`));
    }
    this.store.delete(key);
    return ok(undefined);
  }

  async deleteByPrefix(
    prefix: string,
  ): Promise<Result<number, CacheDriverError>> {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return ok(count);
  }

  async ping(): Promise<Result<void, CacheDriverError>> {
    return ok(undefined);
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}
