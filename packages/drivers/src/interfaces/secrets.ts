import type { Result } from "../types/result.js";
import type { AuthError, NotFoundError, NetworkError } from "../errors.js";

export type SecretsDriverError = AuthError | NotFoundError | NetworkError;

/**
 * SecretsDriver — contrato para acesso a segredos em repositório seguro.
 *
 * Implementação Fase 1: variáveis de ambiente (simples, sem vault)
 * Implementação Fase 2+: HashiCorp Vault ou Supabase Vault
 *
 * Ref: SECURITY_GUIDELINES.md seção JIT access, Fundamentação 4.7 [INV]
 */
export interface SecretsDriver {
  /** Recupera segredo por chave */
  get(key: string): Promise<Result<string, SecretsDriverError>>;

  /** Recupera múltiplos segredos atomicamente */
  getMany(
    keys: string[],
  ): Promise<Result<Record<string, string>, SecretsDriverError>>;

  /** Armazena segredo (requer capability administrativa) */
  set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<Result<void, SecretsDriverError>>;

  /** Remove segredo */
  delete(
    key: string,
  ): Promise<Result<void, SecretsDriverError | NotFoundError>>;

  ping(): Promise<Result<void, SecretsDriverError>>;
}
