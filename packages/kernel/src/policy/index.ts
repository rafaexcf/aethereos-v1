export { PolicyEngine } from "./PolicyEngine.js";
export type { PolicyDataSource, PolicyEngineOptions } from "./PolicyEngine.js";
export type {
  ActionIntentRow,
  ActorType,
  AllowRule,
  AppliesTo,
  ConditionMap,
  ConditionOperator,
  DenyRule,
  MatchedPolicy,
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  PolicyJson,
  PolicyResult,
  PolicyRow,
  PolicyRule,
  RequireApprovalRule,
} from "./types.js";
export { evaluateConditions } from "./conditions.js";
export type { EvaluationContext } from "./conditions.js";
