import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import {
  ChoreographyEngine,
  type ChoreographyDataSource,
  type ChoreographyRow,
  type ChoreographyTriggerEvent,
} from "@aethereos/kernel";
import { jlog, type InlineConsumer } from "../consumer.js";

/**
 * Super Sprint D / MX227 — ChoreographyConsumer.
 *
 * Avalia cada evento SCP contra coreografias ativas. Para cada match:
 *   1. Cria registro em kernel.choreography_executions com status=running
 *   2. Itera steps:
 *      - Se step tem `wait`: marca execução como awaiting_approval e sai
 *        (continuação seria responsabilidade de Temporal — futuro)
 *      - Se step tem `intent` + `agent`: TODO consultar PolicyEngine
 *      - Se step define `emit`: insere evento no scp_outbox
 *      - Marca step como completo
 *   3. Quando todos steps terminam: status=completed
 *
 * Limitações conhecidas (documentadas no README do worker):
 *   - Sem suporte a `wait` (timer) em modo inline — coreografia pausa.
 *     Em produção: usar Temporal `choreographyWorkflow`.
 *   - Steps com agent ainda sem gate completo do PolicyEngine — TODO.
 *
 * Idempotência: trigger_event_id está disponível como dedup key se preciso;
 * por enquanto cada evento dispara nova execução (engine de Temporal
 * deduplicaria via workflowId determinístico).
 */
export class ChoreographyConsumer implements InlineConsumer {
  readonly name = "ChoreographyConsumer";

  constructor(
    private readonly dataSourceBuilder: (sql: Sql) => ChoreographyDataSource,
  ) {}

  /**
   * Coreografias podem ser disparadas por qualquer event_type — engine
   * decide via DB lookup. Aceita tudo, custo do match é mínimo (índice
   * em trigger_event_type WHERE status='active').
   */
  matches(_eventType: string): boolean {
    return true;
  }

  async handle(envelope: EventEnvelope, sql: Sql): Promise<void> {
    const dataSource = this.dataSourceBuilder(sql);
    const engine = new ChoreographyEngine(dataSource);

    const { actorId, actorType } = extractActor(envelope.actor);
    const event: ChoreographyTriggerEvent = {
      eventId: envelope.id,
      eventType: envelope.type,
      companyId: envelope.tenant_id,
      payload: (envelope.payload as Record<string, unknown>) ?? {},
      actorId,
      actorType,
    };

    let matches: Awaited<ReturnType<ChoreographyEngine["match"]>>;
    try {
      matches = await engine.match(event);
    } catch (err) {
      jlog("error", "choreography_match_failed", {
        event_id: envelope.id,
        event_type: envelope.type,
        error: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    if (matches.length === 0) return;

    for (const match of matches) {
      try {
        const executionId = await engine.start(match);
        jlog("info", "choreography_started", {
          execution_id: executionId,
          choreography_id: match.choreography.id,
          choreography_name: match.choreography.name,
          event_id: envelope.id,
        });

        let aborted = false;
        for (const step of match.choreography.steps) {
          if (!engine.stepConditionMatches(step, event)) {
            await engine.recordStepCompleted(executionId, `${step.id}:skipped`);
            continue;
          }

          if (step.wait !== undefined && step.wait !== "") {
            jlog("warn", "choreography_wait_not_supported_inline", {
              execution_id: executionId,
              step_id: step.id,
              wait: step.wait,
            });
            await engine.finish(
              executionId,
              "failed",
              `Step '${step.id}' requer wait — execute via Temporal choreographyWorkflow`,
            );
            aborted = true;
            break;
          }

          // Step com agent + intent passaria pelo PolicyEngine aqui (TODO MX-future).

          if (step.emit !== undefined && step.emit !== "") {
            const eventType = engine.resolveTemplates(step.emit, event);
            await this.emitOutbox(sql, eventType, match, event);
          }

          await engine.recordStepCompleted(executionId, step.id);
        }

        if (!aborted) {
          await engine.finish(executionId, "completed");
          jlog("info", "choreography_completed", {
            execution_id: executionId,
            choreography_id: match.choreography.id,
          });
        }
      } catch (err) {
        jlog("error", "choreography_execution_failed", {
          choreography_id: match.choreography.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async emitOutbox(
    sql: Sql,
    eventType: string,
    match: { choreography: { id: string; companyId: string } },
    event: ChoreographyTriggerEvent,
  ): Promise<void> {
    const eventId = crypto.randomUUID();
    const envelope = {
      id: eventId,
      type: eventType,
      version: "1",
      tenant_id: match.choreography.companyId,
      actor: {
        type: "system",
        service_name: "choreography-engine",
        version: "1",
      },
      correlation_id: event.eventId,
      causation_id: event.eventId,
      payload: {
        choreography_id: match.choreography.id,
        trigger_event_id: event.eventId,
        trigger_payload: event.payload,
      },
      occurred_at: new Date().toISOString(),
      schema_version: "1",
    };
    await sql`
      INSERT INTO kernel.scp_outbox (event_id, event_type, company_id, payload, envelope, attempts)
      VALUES (
        ${eventId},
        ${eventType},
        ${match.choreography.companyId},
        ${envelope.payload as never},
        ${envelope as never},
        0
      )
    `;
  }
}

function extractActor(actor: EventEnvelope["actor"]): {
  actorId: string;
  actorType: "user" | "agent" | "system";
} {
  if (actor.type === "human")
    return { actorId: actor.user_id, actorType: "user" };
  if (actor.type === "agent")
    return { actorId: actor.agent_id, actorType: "agent" };
  return {
    actorId: "00000000-0000-0000-0000-000000000000",
    actorType: "system",
  };
}

export function buildChoreographyDataSource(sql: Sql): ChoreographyDataSource {
  return {
    async findActiveByTrigger(
      eventType: string,
      companyId: string,
    ): Promise<ChoreographyRow[]> {
      const rows = await sql<ChoreographyRow[]>`
        SELECT id, company_id, name, description, status,
               trigger_event_type, trigger_condition, steps, error_handling
        FROM kernel.choreographies
        WHERE company_id = ${companyId}
          AND trigger_event_type = ${eventType}
          AND status = 'active'
      `;
      return rows;
    },
    async startExecution({
      choreographyId,
      companyId,
      triggerEventId,
      triggerEventType,
      triggerPayload,
    }) {
      const rows = await sql<{ id: string }[]>`
        INSERT INTO kernel.choreography_executions
          (choreography_id, company_id, trigger_event_id, trigger_event_type, trigger_payload, status)
        VALUES
          (${choreographyId}, ${companyId}, ${triggerEventId}, ${triggerEventType}, ${triggerPayload as never}, 'running')
        RETURNING id
      `;
      return { executionId: rows[0]?.id ?? "" };
    },
    async recordStepCompleted(executionId: string, stepId: string) {
      await sql`
        UPDATE kernel.choreography_executions
        SET steps_completed = steps_completed || ${JSON.stringify([stepId]) as never}::jsonb,
            current_step_id = ${stepId}
        WHERE id = ${executionId}
      `;
    },
    async finishExecution({ executionId, status, error }) {
      const errorClause = error ?? null;
      await sql`
        UPDATE kernel.choreography_executions
        SET status = ${status},
            completed_at = NOW(),
            error = ${errorClause}
        WHERE id = ${executionId}
      `;
    },
    async incrementExecutionCount(choreographyId: string) {
      await sql`
        UPDATE kernel.choreographies
        SET execution_count = execution_count + 1,
            last_executed_at = NOW()
        WHERE id = ${choreographyId}
      `;
    },
  };
}
