import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import { jlog, type InlineConsumer } from "../consumer.js";

/**
 * Sprint 18 MX92 — AuditConsumer.
 *
 * Captura TODOS os eventos do scp_outbox e gera um registro append-only
 * em kernel.audit_log para fins de compliance, replay e debug.
 *
 * Schema kernel.audit_log:
 *   id, company_id, actor_id, actor_type ('human'|'agent'|'system'),
 *   action, resource_type, resource_id, payload, ip_address, created_at
 *
 * Mapeamento envelope → audit_log:
 *   action       = envelope.type (event_type)
 *   actor_id     = envelope.actor.user_id | agent_id | service_name(uuid)
 *   actor_type   = envelope.actor.type
 *   payload      = envelope.payload
 *   resource_*   = derivado de payload se reconhecivel (file_id, person_id, etc)
 *
 * Idempotencia (Sprint 31 / MX170): kernel.audit_log.event_id é UNIQUE.
 * Re-disparar o mesmo envelope (replay) faz INSERT ... ON CONFLICT DO
 * NOTHING e nao duplica linhas. O auditor consulta replay_count em
 * kernel.scp_outbox para distinguir replays.
 */
export class AuditConsumer implements InlineConsumer {
  readonly name = "AuditConsumer";

  matches(_eventType: string): boolean {
    // Wildcard — captura todos os eventos
    return true;
  }

  async handle(envelope: EventEnvelope, sql: Sql): Promise<void> {
    const actor = envelope.actor;
    let actorId: string;
    let actorType: "human" | "agent" | "system";

    if (actor.type === "human") {
      actorType = "human";
      actorId = actor.user_id;
    } else if (actor.type === "agent") {
      actorType = "agent";
      actorId = actor.agent_id;
    } else {
      // system actor — nao tem UUID, usa namespace fixo (UUID v5 estavel
      // por service_name simulado via hash compatible). Por simplicidade,
      // usa um UUID determinístico null-equivalent: 00000000...0001 +
      // service_name no payload.
      actorType = "system";
      actorId = "00000000-0000-0000-0000-000000000000";
    }

    const payload = (envelope.payload ?? {}) as Record<string, unknown>;
    const { resourceType, resourceId } = extractResource(
      envelope.type,
      payload,
    );
    const companyId = envelope.tenant_id;

    try {
      await sql`
        INSERT INTO kernel.audit_log
          (company_id, actor_id, actor_type, action, resource_type, resource_id, payload, event_id)
        VALUES
          (${companyId}, ${actorId}, ${actorType}, ${envelope.type},
           ${resourceType}, ${resourceId}, ${JSON.stringify(payload)}::jsonb,
           ${envelope.id})
        ON CONFLICT (event_id) DO NOTHING
      `;
    } catch (e) {
      // R12: audit nao bloqueia pipeline. Loga e segue (caller decide retry).
      jlog("warn", "audit insert failed", {
        event_type: envelope.type,
        error: e instanceof Error ? e.message : String(e),
      });
      // re-throw pra processBatch contar como falha do consumer? NAO —
      // audit eh secundario. Engole o erro pra nao bloquear pipeline
      // (pode causar replay de outros consumers).
    }
  }
}

interface ResourceMapping {
  resourceType: string | null;
  resourceId: string | null;
}

/**
 * Extrai resource_type/resource_id do payload baseado em convenções comuns
 * (file_id, person_id, channel_id, proposal_id, etc.).
 */
function extractResource(
  eventType: string,
  payload: Record<string, unknown>,
): ResourceMapping {
  const candidates: Array<[string, string]> = [
    ["file_id", "file"],
    ["folder_id", "folder"],
    ["person_id", "person"],
    ["channel_id", "channel"],
    ["proposal_id", "proposal"],
    ["module", "module"],
    ["company_id", "company"],
    ["user_id", "user"],
    ["notification_id", "notification"],
  ];

  for (const [field, type] of candidates) {
    const v = payload[field];
    if (typeof v === "string" && v.length > 0) {
      // file_id / proposal_id devem ser UUID — outros como "module" sao slugs.
      if (field === "module") {
        return { resourceType: type, resourceId: null };
      }
      return { resourceType: type, resourceId: v };
    }
  }

  // Derivado do event_type prefix se nao encontrou
  const prefix = eventType.split(".")[0] ?? "unknown";
  return { resourceType: prefix, resourceId: null };
}
