import type { Result } from "../types/result.js";
import type { TenantContext } from "../types/tenant-context.js";
import type { DatabaseError, NotFoundError, ConflictError } from "../errors.js";

/**
 * DatabaseDriver — contrato para acesso a banco de dados relacional.
 *
 * Garantias:
 * - Toda query executa no contexto do tenant via RLS (withTenant obrigatório antes de queries)
 * - withTenant() é fail-closed: sem contexto, queries retornam zero rows (Fundamentação 10.1 [INV])
 * - Transações atômicas via transaction() garantem consistência entre domínio e outbox
 *
 * Implementações concretas: SupabaseDatabaseDriver (packages/drivers-supabase)
 * LocalDatabaseDriver a implementar para Camada 0 (SQLite WASM / IndexedDB)
 *
 * Ref: Fundamentação 4.7 [INV], ADR-0014 #5
 */
export interface DatabaseDriver {
  /**
   * Define o contexto de tenant para a sessão atual.
   * Deve ser chamado antes de qualquer query. Propaga via SET LOCAL em PostgreSQL.
   */
  withTenant(context: TenantContext): Promise<Result<void, DatabaseError>>;

  /**
   * Executa uma função dentro de uma transação atômica.
   * Garante atomicidade entre dados de domínio e insert no outbox (padrão Outbox).
   */
  transaction<T>(
    fn: (tx: TransactionContext) => Promise<T>,
  ): Promise<Result<T, DatabaseError>>;

  /**
   * Executa query tipada via ORM (Drizzle nas implementações cloud).
   * O shape de retorno é definido pelo schema do ORM — sem `any`.
   */
  query<TRow>(
    queryFn: (db: unknown) => Promise<TRow[]>,
  ): Promise<Result<TRow[], DatabaseError>>;

  /**
   * Executa query que retorna exatamente um resultado ou NotFoundError.
   */
  queryOne<TRow>(
    queryFn: (db: unknown) => Promise<TRow | undefined>,
  ): Promise<Result<TRow, DatabaseError | NotFoundError>>;

  /**
   * Executa insert/update/delete e retorna linhas afetadas.
   */
  execute<TRow = void>(
    queryFn: (db: unknown) => Promise<TRow>,
  ): Promise<Result<TRow, DatabaseError | ConflictError>>;

  /** Health check — usado pelo Modo Degenerado (Fundamentação P14) */
  ping(): Promise<Result<void, DatabaseError>>;
}

export interface TransactionContext {
  query<TRow>(queryFn: (db: unknown) => Promise<TRow[]>): Promise<TRow[]>;
  execute<TRow = void>(queryFn: (db: unknown) => Promise<TRow>): Promise<TRow>;
}
