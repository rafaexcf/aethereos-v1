/**
 * Super Sprint D / MX227 — SCP Choreography types.
 *
 * Coreografias declarativas: trigger SCP → sequência de steps. Cada step
 * pode emitir evento, executar action via intent, ou aguardar tempo/aprovação.
 */

import type { ConditionMap } from "../policy/types.js";

export interface ChoreographyStep {
  /** Identificador estável do step (usado em logs e steps_completed). */
  id: string;
  /** Descrição humana opcional. */
  description?: string;
  /** Intent do action_intents catalog. Se presente, passa por Policy Engine quando agent definido. */
  intent?: string;
  /** Identificador do agente que executa o step. Se ausente, ator é "system". */
  agent?: string;
  /** Inputs passados ao executor da action. Strings podem usar variáveis {{trigger.payload.x}}. */
  inputs?: Record<string, unknown>;
  /** Tipo de evento SCP a emitir após o step. Default: choreography.step.<id>.completed. */
  emit?: string;
  /** Se presente, suspende o step por essa duração (ex: "2 days", "1h"). */
  wait?: string;
  /** Condição opcional avaliada antes do step. Se falsa, step é skipped. */
  condition?: ConditionMap;
  /** Override do default error_handling. */
  on_failure?: "notify_human" | "abort" | "skip";
  /** Se presente, sobrescreve max duration do step (Policy require_approval timeout). */
  max_duration?: string;
}

export interface ChoreographyDefinition {
  id: string;
  companyId: string;
  name: string;
  description: string;
  triggerEventType: string;
  triggerCondition: ConditionMap | null;
  steps: ChoreographyStep[];
  errorHandling: { on_failure: "notify_human" | "abort" | "skip" };
  status: "draft" | "active" | "paused" | "archived";
}

export interface ChoreographyRow {
  id: string;
  company_id: string;
  name: string;
  description: string;
  status: string;
  trigger_event_type: string;
  trigger_condition: ConditionMap | null;
  steps: unknown;
  error_handling: { on_failure: "notify_human" | "abort" | "skip" };
}

export interface ChoreographyTriggerEvent {
  eventId: string;
  eventType: string;
  companyId: string;
  payload: Record<string, unknown>;
  actorId: string;
  actorType: "user" | "agent" | "system";
}

export interface ChoreographyMatch {
  choreography: ChoreographyDefinition;
  triggerEvent: ChoreographyTriggerEvent;
}

export interface ChoreographyExecutionStart {
  executionId: string;
  choreographyId: string;
  companyId: string;
  triggerEventId: string;
  triggerEventType: string;
  triggerPayload: Record<string, unknown>;
}

export interface ChoreographyDataSource {
  /** Lista coreografias ativas que tenham trigger_event_type igual ao evento. */
  findActiveByTrigger(
    eventType: string,
    companyId: string,
  ): Promise<ChoreographyRow[]>;
  /** Cria registro em choreography_executions. */
  startExecution(input: {
    choreographyId: string;
    companyId: string;
    triggerEventId: string;
    triggerEventType: string;
    triggerPayload: Record<string, unknown>;
  }): Promise<{ executionId: string }>;
  /** Marca step como completo no array steps_completed. */
  recordStepCompleted(executionId: string, stepId: string): Promise<void>;
  /** Finaliza execução com status terminal. */
  finishExecution(input: {
    executionId: string;
    status: "completed" | "failed" | "cancelled";
    error?: string;
  }): Promise<void>;
  /** Incrementa contador da coreografia (best-effort). */
  incrementExecutionCount(choreographyId: string): Promise<void>;
}
