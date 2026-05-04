import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import { jlog, type InlineConsumer } from "../consumer.js";

const SUPPORTED_EVENTS = new Set([
  "platform.person.created",
  "platform.file.uploaded",
  "platform.chat.channel_created",
  "agent.copilot.action_executed",
]);

interface PersonPayload {
  person_id?: string;
  full_name?: string;
  email?: string;
  created_by?: string;
  company_id?: string;
}
interface FilePayload {
  file_id?: string;
  name?: string;
  mime_type?: string;
  size_bytes?: number;
  uploaded_by?: string;
  company_id?: string;
}
interface ChannelPayload {
  channel_id?: string;
  name?: string;
  kind?: string;
  created_by?: string;
  company_id?: string;
}
interface AgentActionPayload {
  proposal_id?: string;
  intent_type?: string;
  executed_by?: string;
  resource_id?: string;
  company_id?: string;
}

/**
 * Sprint 19 MX98 — EnrichmentConsumer.
 *
 * Camada 2 SCP: consome eventos brutos do scp_outbox e gera derived
 * context records em kernel.context_records. UPSERT por (company_id,
 * entity_type, entity_id, record_type) — idempotente em replay.
 *
 * Mapeamento:
 *   platform.person.created      => entity=person summary + company_stats(total_people)
 *   platform.file.uploaded       => entity=file summary + company_stats(total_files)
 *   platform.chat.channel_created => entity=channel summary
 *   agent.copilot.action_executed => entity=agent activity_count
 *
 * R13 do spec: context records sao derivados, nao source of truth.
 * Recalculaveis a qualquer momento via replay do outbox.
 */
export class EnrichmentConsumer implements InlineConsumer {
  readonly name = "EnrichmentConsumer";

  matches(eventType: string): boolean {
    return SUPPORTED_EVENTS.has(eventType);
  }

  async handle(envelope: EventEnvelope, sql: Sql): Promise<void> {
    const companyId = envelope.tenant_id;
    const eventId = envelope.id;

    try {
      switch (envelope.type) {
        case "platform.person.created":
          await this.#enrichPerson(sql, envelope.payload as PersonPayload, {
            companyId,
            eventId,
          });
          break;
        case "platform.file.uploaded":
          await this.#enrichFile(sql, envelope.payload as FilePayload, {
            companyId,
            eventId,
          });
          break;
        case "platform.chat.channel_created":
          await this.#enrichChannel(sql, envelope.payload as ChannelPayload, {
            companyId,
            eventId,
          });
          break;
        case "agent.copilot.action_executed":
          await this.#enrichAgentAction(
            sql,
            envelope.payload as AgentActionPayload,
            { companyId, eventId },
          );
          break;
      }
    } catch (e) {
      jlog("warn", "enrichment failed", {
        event_type: envelope.type,
        event_id: eventId,
        error: e instanceof Error ? e.message : String(e),
      });
      // R12: nao re-throw — enrichment nao bloqueia pipeline
    }
  }

  async #enrichPerson(
    sql: Sql,
    p: PersonPayload,
    ctx: { companyId: string; eventId: string },
  ): Promise<void> {
    const personId = p.person_id;
    if (personId === undefined || personId === "") return;

    const personData = {
      full_name: p.full_name ?? null,
      email: p.email ?? null,
      created_by: p.created_by ?? null,
      created_at: new Date().toISOString(),
    };
    await upsertRecord(sql, {
      companyId: ctx.companyId,
      entityType: "person",
      entityId: personId,
      recordType: "summary",
      data: personData,
      sourceEventId: ctx.eventId,
    });

    // company_stats: total_people
    const [countRow] = await sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total
      FROM kernel.people
      WHERE company_id = ${ctx.companyId}
    `;
    if (countRow !== undefined) {
      await upsertRecord(sql, {
        companyId: ctx.companyId,
        entityType: "company",
        entityId: ctx.companyId,
        recordType: "company_stats",
        data: { total_people: countRow.total },
        sourceEventId: ctx.eventId,
      });
    }
  }

  async #enrichFile(
    sql: Sql,
    p: FilePayload,
    ctx: { companyId: string; eventId: string },
  ): Promise<void> {
    const fileId = p.file_id;
    if (fileId === undefined || fileId === "") return;

    await upsertRecord(sql, {
      companyId: ctx.companyId,
      entityType: "file",
      entityId: fileId,
      recordType: "summary",
      data: {
        name: p.name ?? null,
        mime_type: p.mime_type ?? null,
        size_bytes: p.size_bytes ?? null,
        uploaded_by: p.uploaded_by ?? null,
      },
      sourceEventId: ctx.eventId,
    });

    const [countRow] = await sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total
      FROM kernel.files
      WHERE company_id = ${ctx.companyId}
    `;
    if (countRow !== undefined) {
      await upsertRecord(sql, {
        companyId: ctx.companyId,
        entityType: "company",
        entityId: ctx.companyId,
        recordType: "company_stats_files",
        data: { total_files: countRow.total },
        sourceEventId: ctx.eventId,
      });
    }
  }

  async #enrichChannel(
    sql: Sql,
    p: ChannelPayload,
    ctx: { companyId: string; eventId: string },
  ): Promise<void> {
    const channelId = p.channel_id;
    if (channelId === undefined || channelId === "") return;

    await upsertRecord(sql, {
      companyId: ctx.companyId,
      entityType: "channel",
      entityId: channelId,
      recordType: "summary",
      data: {
        name: p.name ?? null,
        kind: p.kind ?? null,
        created_by: p.created_by ?? null,
      },
      sourceEventId: ctx.eventId,
    });
  }

  async #enrichAgentAction(
    sql: Sql,
    p: AgentActionPayload,
    ctx: { companyId: string; eventId: string },
  ): Promise<void> {
    // executed_by eh o user supervisor (R10) — usamos como agent_id surrogate
    // ate termos kernel.agents populado de verdade.
    const agentId = p.executed_by;
    if (agentId === undefined || agentId === "") return;

    // Busca o registro atual pra incrementar (em vez de overwrite)
    const [existing] = await sql<{ data: { total_actions?: number } }[]>`
      SELECT data FROM kernel.context_records
      WHERE company_id = ${ctx.companyId}
        AND entity_type = 'agent'
        AND entity_id = ${agentId}
        AND record_type = 'activity_count'
      LIMIT 1
    `;
    const prev = existing?.data?.total_actions ?? 0;

    await upsertRecord(sql, {
      companyId: ctx.companyId,
      entityType: "agent",
      entityId: agentId,
      recordType: "activity_count",
      data: {
        total_actions: prev + 1,
        last_action_at: new Date().toISOString(),
        last_intent_type: p.intent_type ?? null,
      },
      sourceEventId: ctx.eventId,
    });
  }
}

interface UpsertArgs {
  companyId: string;
  entityType: string;
  entityId: string;
  recordType: string;
  data: Record<string, unknown>;
  sourceEventId: string;
}

async function upsertRecord(sql: Sql, args: UpsertArgs): Promise<void> {
  await sql`
    INSERT INTO kernel.context_records
      (company_id, entity_type, entity_id, record_type, data, source_event_id)
    VALUES
      (${args.companyId}, ${args.entityType}, ${args.entityId},
       ${args.recordType}, ${JSON.stringify(args.data)}::jsonb,
       ${args.sourceEventId})
    ON CONFLICT (company_id, entity_type, entity_id, record_type) DO UPDATE SET
      data = EXCLUDED.data,
      version = kernel.context_records.version + 1,
      source_event_id = EXCLUDED.source_event_id,
      updated_at = NOW()
  `;
}
