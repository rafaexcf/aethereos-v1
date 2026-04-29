import type { Result } from "../types/result.js";
import type { NetworkError, NotFoundError } from "../errors.js";

export type CacheDriverError = NetworkError;

/**
 * CacheDriver — contrato para cache chave-valor com TTL.
 *
 * Implementação cloud: Redis (Upstash ou self-hosted) via RedisDriver
 * Implementação local (Camada 0): IndexedDB-based ou Map em memória
 *
 * Ref: Fundamentação 4.7 [INV], ADR-0014 item sobre Upstash Redis
 */
export interface CacheDriver {
  get<T = unknown>(key: string): Promise<Result<T | null, CacheDriverError>>;

  set<T = unknown>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<Result<void, CacheDriverError>>;

  delete(key: string): Promise<Result<void, CacheDriverError | NotFoundError>>;

  /** Invalida por prefixo (útil para invalidação de tenant completo) */
  deleteByPrefix(prefix: string): Promise<Result<number, CacheDriverError>>;

  ping(): Promise<Result<void, CacheDriverError>>;
}
