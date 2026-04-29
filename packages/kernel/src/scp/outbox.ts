import type { EventEnvelope } from "@aethereos/drivers";

/**
 * OutboxEntry — representação de um evento no Outbox PostgreSQL.
 * Padrão Outbox garante atomicidade entre transação de domínio e publicação de evento.
 * Ref: Fundamentação 8.10 [INV], ADR-0014 seção 5 (convergências Outbox pattern)
 */
export interface OutboxEntry {
  readonly id: string;
  readonly event_type: string;
  readonly envelope: EventEnvelope;
  readonly tenant_id: string;
  readonly created_at: string; // ISO 8601
  readonly processed_at?: string;
  readonly attempts: number;
  readonly last_error?: string;
}

/**
 * OutboxStatus — estado de um entry no outbox
 */
export type OutboxStatus =
  | "pending"
  | "processing"
  | "processed"
  | "dead_letter";

/**
 * OutboxWriter — interface para escrita no outbox (usada dentro de transactions).
 * Implementação concreta em packages/drivers-supabase via DatabaseDriver.transaction().
 *
 * Invariante: insert no outbox e dados de domínio DEVEM estar na mesma transação.
 * Se a transação falhar, nenhum evento é publicado. Se commit, evento é garantido.
 */
export interface OutboxWriter {
  /**
   * Insere um envelope no outbox dentro de uma transação ativa.
   * Retorna o id do OutboxEntry criado.
   */
  insertEnvelope(envelope: EventEnvelope): Promise<string>;
}
