import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import { jlog, type InlineConsumer } from "./consumer.js";

/**
 * Sprint 31 / MX170 — SCP Replay (Gate 3).
 *
 * Reprocessa eventos já gravados em kernel.scp_outbox passando-os por
 * todos os consumers inline novamente. Os consumers são idempotentes
 * (R10 do Sprint 31): audit usa ON CONFLICT (event_id) DO NOTHING,
 * notification verifica (user_id, source_app, source_id), embedding
 * faz UPSERT por (company_id, source_id, chunk_index), enrichment
 * UPSERT por (company_id, entity_type, entity_id, record_type).
 *
 * Após replay, atualiza replay_count e last_replayed_at no scp_outbox.
 * O status original (`published` / `failed`) é preservado.
 */

interface ReplayRow {
  id: number;
  company_id: string;
  event_type: string;
  event_id: string;
  payload: Record<string, unknown>;
  envelope: EventEnvelope | null;
}

export interface ReplayResult {
  /** Quantos eventos foram reprocessados com sucesso (sem erros de consumer). */
  reprocessed: number;
  /** Quantos eventos tiveram pelo menos um erro de consumer. */
  errors: number;
  /** Total de eventos lidos do outbox. */
  total: number;
  /** Detalhes por evento (ordem de leitura). */
  items: Array<{
    event_id: string;
    event_type: string;
    consumers: string[];
    consumer_errors: string[];
  }>;
}

/**
 * Reprocessa um evento específico por event_id.
 *
 * @throws Error com mensagem clara se o event_id não existir no outbox.
 */
export async function replayEvent(
  sql: Sql,
  consumers: InlineConsumer[],
  eventId: string,
): Promise<ReplayResult> {
  const rows = await sql<ReplayRow[]>`
    SELECT id, company_id, event_type, event_id, payload, envelope
      FROM kernel.scp_outbox
     WHERE event_id = ${eventId}
     LIMIT 1
  `;

  if (rows.length === 0) {
    throw new Error(
      `replay: event_id ${eventId} não encontrado em kernel.scp_outbox`,
    );
  }

  return runReplay(sql, consumers, rows);
}

/**
 * Reprocessa um intervalo de eventos por created_at.
 *
 * @param from Data inicial inclusiva (ISO string ou Date).
 * @param to   Data final inclusiva (ISO string ou Date).
 */
export async function replayRange(
  sql: Sql,
  consumers: InlineConsumer[],
  from: string | Date,
  to: string | Date,
): Promise<ReplayResult> {
  const fromIso = typeof from === "string" ? from : from.toISOString();
  const toIso = typeof to === "string" ? to : to.toISOString();

  const rows = await sql<ReplayRow[]>`
    SELECT id, company_id, event_type, event_id, payload, envelope
      FROM kernel.scp_outbox
     WHERE created_at >= ${fromIso}
       AND created_at <= ${toIso}
     ORDER BY created_at ASC
  `;

  return runReplay(sql, consumers, rows);
}

async function runReplay(
  sql: Sql,
  consumers: InlineConsumer[],
  rows: ReplayRow[],
): Promise<ReplayResult> {
  const result: ReplayResult = {
    reprocessed: 0,
    errors: 0,
    total: rows.length,
    items: [],
  };

  for (const row of rows) {
    const envelope = row.envelope ?? buildFallbackEnvelope(row);
    const matched = consumers.filter((c) => c.matches(row.event_type));
    const consumerErrors: string[] = [];

    for (const consumer of matched) {
      try {
        await consumer.handle(envelope, sql);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        consumerErrors.push(`${consumer.name}: ${msg}`);
        jlog("warn", "replay consumer error", {
          consumer: consumer.name,
          event_id: row.event_id,
          event_type: row.event_type,
          error: msg,
        });
      }
    }

    if (consumerErrors.length === 0) {
      result.reprocessed++;
    } else {
      result.errors++;
    }

    result.items.push({
      event_id: row.event_id,
      event_type: row.event_type,
      consumers: matched.map((c) => c.name),
      consumer_errors: consumerErrors,
    });

    await sql`
      UPDATE kernel.scp_outbox
         SET replay_count     = replay_count + 1,
             last_replayed_at = NOW()
       WHERE id = ${row.id}
    `;

    jlog("info", "replay event processed", {
      event_id: row.event_id,
      event_type: row.event_type,
      consumers: matched.map((c) => c.name),
      consumer_errors: consumerErrors,
    });
  }

  return result;
}

function buildFallbackEnvelope(row: ReplayRow): EventEnvelope {
  // Mesma lógica de buildFallbackEnvelope em main.ts — duplicada aqui
  // para evitar import circular do main.ts.
  return {
    id: row.event_id,
    type: row.event_type,
    tenant_id: row.company_id,
    actor: { type: "system", service_name: "scp-publish", version: "1.0" },
    payload: row.payload ?? {},
    occurred_at: new Date().toISOString(),
  } as EventEnvelope;
}
