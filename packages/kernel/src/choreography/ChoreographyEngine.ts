/**
 * Super Sprint D / MX227 — ChoreographyEngine.
 *
 * Observa eventos SCP e dispara coreografias ativas com trigger match.
 * Engine puro: recebe eventos via `onEvent()` e delega persistência ao
 * `ChoreographyDataSource`. A execução dos steps é responsabilidade do
 * caller (scp-worker registra inline runner; Temporal pode rodar via
 * `choreographyWorkflow`).
 *
 * Variáveis de template: substitui `{{trigger.payload.<key>}}` e
 * `{{trigger.actor_id}}` em strings de inputs/emit antes de executar.
 *
 * R10: steps com agent passam pelo PolicyEngine antes de executar.
 */

import { evaluateConditions } from "../policy/conditions.js";
import type { ConditionMap } from "../policy/types.js";
import type {
  ChoreographyDefinition,
  ChoreographyDataSource,
  ChoreographyMatch,
  ChoreographyRow,
  ChoreographyStep,
  ChoreographyTriggerEvent,
} from "./types.js";

export interface ChoreographyEngineOptions {
  /** Cache TTL em ms para definitions ativas (default 30s). */
  cacheTtlMs?: number;
}

interface CacheEntry {
  definitions: ChoreographyDefinition[];
  expiresAt: number;
}

const DEFAULT_CACHE_TTL_MS = 30_000;

function rowToDefinition(row: ChoreographyRow): ChoreographyDefinition {
  const stepsRaw = Array.isArray(row.steps)
    ? (row.steps as ChoreographyStep[])
    : [];
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    triggerEventType: row.trigger_event_type,
    triggerCondition: row.trigger_condition ?? null,
    steps: stepsRaw,
    errorHandling: row.error_handling,
    status: row.status as ChoreographyDefinition["status"],
  };
}

export class ChoreographyEngine {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;

  constructor(
    private readonly dataSource: ChoreographyDataSource,
    options: ChoreographyEngineOptions = {},
  ) {
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  /**
   * Avalia um evento contra coreografias ativas e retorna matches.
   * Não inicia execução — caller decide o runner (inline ou Temporal).
   */
  async match(event: ChoreographyTriggerEvent): Promise<ChoreographyMatch[]> {
    const definitions = await this.loadActive(event.eventType, event.companyId);
    const matches: ChoreographyMatch[] = [];
    for (const def of definitions) {
      if (!this.triggerConditionMatches(def.triggerCondition, event)) continue;
      matches.push({ choreography: def, triggerEvent: event });
    }
    return matches;
  }

  /**
   * Inicia uma execução para um match. Retorna executionId. Caller deve
   * iterar `runStep()` ou delegar a Temporal.
   */
  async start(match: ChoreographyMatch): Promise<string> {
    const { executionId } = await this.dataSource.startExecution({
      choreographyId: match.choreography.id,
      companyId: match.choreography.companyId,
      triggerEventId: match.triggerEvent.eventId,
      triggerEventType: match.triggerEvent.eventType,
      triggerPayload: match.triggerEvent.payload,
    });
    await this.dataSource.incrementExecutionCount(match.choreography.id);
    return executionId;
  }

  async recordStepCompleted(
    executionId: string,
    stepId: string,
  ): Promise<void> {
    await this.dataSource.recordStepCompleted(executionId, stepId);
  }

  async finish(
    executionId: string,
    status: "completed" | "failed" | "cancelled",
    error?: string,
  ): Promise<void> {
    await this.dataSource.finishExecution(
      error === undefined
        ? { executionId, status }
        : { executionId, status, error },
    );
  }

  /**
   * Resolve `{{trigger.payload.x}}` e `{{trigger.actor_id}}` em strings.
   * Aplica recursivamente em records.
   */
  resolveTemplates<T>(value: T, event: ChoreographyTriggerEvent): T {
    if (typeof value === "string") {
      return resolveString(value, event) as unknown as T;
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.resolveTemplates(v, event)) as unknown as T;
    }
    if (value !== null && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = this.resolveTemplates(v, event);
      }
      return out as unknown as T;
    }
    return value;
  }

  /**
   * Avalia condition de step (não trigger) para skip lógico.
   */
  stepConditionMatches(
    step: ChoreographyStep,
    event: ChoreographyTriggerEvent,
  ): boolean {
    if (!step.condition) return true;
    return this.matchCondition(step.condition, event);
  }

  invalidateCache(companyId?: string): void {
    if (companyId === undefined) {
      this.cache.clear();
      return;
    }
    for (const key of [...this.cache.keys()]) {
      if (key.endsWith(`::${companyId}`)) this.cache.delete(key);
    }
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private async loadActive(
    eventType: string,
    companyId: string,
  ): Promise<ChoreographyDefinition[]> {
    const key = `${eventType}::${companyId}`;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) return hit.definitions;
    const rows = await this.dataSource.findActiveByTrigger(
      eventType,
      companyId,
    );
    const definitions = rows
      .filter((r) => r.status === "active")
      .map(rowToDefinition);
    this.cache.set(key, { definitions, expiresAt: now + this.cacheTtlMs });
    return definitions;
  }

  private triggerConditionMatches(
    condition: ConditionMap | null,
    event: ChoreographyTriggerEvent,
  ): boolean {
    if (!condition) return true;
    return this.matchCondition(condition, event);
  }

  private matchCondition(
    condition: ConditionMap,
    event: ChoreographyTriggerEvent,
  ): boolean {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return evaluateConditions(condition, {
      parameters: event.payload,
      hourOfDay: `${hh}:${mm}`,
    });
  }
}

function resolveString(input: string, event: ChoreographyTriggerEvent): string {
  return input.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, expr: string) => {
    const path = expr.split(".");
    if (path[0] === "trigger") {
      if (path[1] === "actor_id") return event.actorId;
      if (path[1] === "event_type") return event.eventType;
      if (path[1] === "company_id") return event.companyId;
      if (path[1] === "payload") {
        let cur: unknown = event.payload;
        for (let i = 2; i < path.length; i += 1) {
          if (cur !== null && typeof cur === "object") {
            cur = (cur as Record<string, unknown>)[path[i] as string];
          } else {
            return "";
          }
        }
        return cur === null || cur === undefined ? "" : String(cur);
      }
    }
    return "";
  });
}
