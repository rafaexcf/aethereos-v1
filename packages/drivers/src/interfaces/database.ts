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
 * ## Dois ramos de implementação (ADR-0020)
 *
 * **Ramo Server (Node.js / Deno Edge Functions):**
 * - `SupabaseDatabaseDriver` em `packages/drivers-supabase/src/database/`
 * - transaction() real com atomicidade PostgreSQL
 * - withTenant() via SET LOCAL — RLS enforçado na sessão
 * - Pode escrever em kernel.scp_outbox diretamente (service_role)
 *
 * **Ramo Browser (Vite SPA — Camadas 0 e 1):**
 * - `SupabaseBrowserDataDriver` em `packages/drivers-supabase/src/data/`
 * - transaction() NÃO disponível — operações atômicas exigem Edge Function
 * - withTenant() armazena contexto local; RLS enforçado via JWT do usuário
 * - NÃO pode escrever em kernel.scp_outbox (RLS bloqueia authenticated users)
 * - Suporta Realtime via subscribeToTable()
 *
 * Emissão SCP do browser: via Edge Function `scp-publish` que executa domínio+outbox atomicamente.
 *
 * Ref: Fundamentação 4.7 [INV], ADR-0014 #5, ADR-0020
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
