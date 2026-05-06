/**
 * Avaliação de condicionais de policy.
 *
 * Operadores suportados: max, min, above, below, equals, in, not_in, contains.
 * Valores especiais para hour_of_day: HH:MM strings.
 */

import type { ConditionMap, ConditionOperator } from "./types.js";

export interface EvaluationContext {
  parameters: Record<string, unknown>;
  /** Hora atual em formato "HH:MM" (timezone do servidor). Injetada pelo engine. */
  hourOfDay?: string;
  /** risk_class do intent (A|B|C). Injetada pelo engine. */
  riskClass?: string;
}

export function evaluateConditions(
  conditions: ConditionMap | undefined,
  ctx: EvaluationContext,
): boolean {
  if (conditions === undefined) return true;
  for (const [field, op] of Object.entries(conditions)) {
    const value = resolveField(field, ctx);
    if (!evaluateOperator(value, op)) return false;
  }
  return true;
}

function resolveField(field: string, ctx: EvaluationContext): unknown {
  if (field === "hour_of_day") return ctx.hourOfDay;
  if (field === "risk_class") return ctx.riskClass;
  return ctx.parameters[field];
}

function evaluateOperator(value: unknown, op: ConditionOperator): boolean {
  if (op.equals !== undefined) {
    if (value !== op.equals) return false;
  }
  if (op.in !== undefined) {
    if (!Array.isArray(op.in) || !op.in.includes(value)) return false;
  }
  if (op.not_in !== undefined) {
    if (Array.isArray(op.not_in) && op.not_in.includes(value)) return false;
  }
  if (op.contains !== undefined) {
    if (typeof value !== "string") return false;
    if (!value.includes(op.contains)) return false;
  }
  if (op.max !== undefined) {
    if (!compareLE(value, op.max)) return false;
  }
  if (op.min !== undefined) {
    if (!compareGE(value, op.min)) return false;
  }
  if (op.above !== undefined) {
    if (typeof value !== "number" || !(value > op.above)) return false;
  }
  if (op.below !== undefined) {
    if (typeof value !== "number" || !(value < op.below)) return false;
  }
  return true;
}

function compareLE(value: unknown, bound: number | string): boolean {
  if (typeof bound === "number") {
    return typeof value === "number" && value <= bound;
  }
  // String comparison (ex: hour_of_day "HH:MM").
  return typeof value === "string" && value <= bound;
}

function compareGE(value: unknown, bound: number | string): boolean {
  if (typeof bound === "number") {
    return typeof value === "number" && value >= bound;
  }
  return typeof value === "string" && value >= bound;
}
