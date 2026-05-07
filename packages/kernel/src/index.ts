// Tenant
export { withTenantContext, assertTenantContext } from "./tenant/context.js";
export type {
  Membership,
  MembershipRole,
  MembershipStatus,
} from "./tenant/membership.js";
export {
  MembershipRoleSchema,
  ROLE_CAPABILITIES,
} from "./tenant/membership.js";

// SCP
export { KernelPublisher } from "./scp/publisher.js";
export type { PublishResult } from "./scp/publisher.js";
export { BaseConsumer } from "./scp/consumer.js";
export type { OutboxEntry, OutboxWriter } from "./scp/outbox.js";

// Audit
export { auditLog } from "./audit/logger.js";
export type { AuditEntry, AuditLogDriver } from "./audit/logger.js";

// Permissions
export { PermissionEngine, KERNEL_CAPABILITIES } from "./permissions/index.js";
export type { AuthorizationResult, Capability } from "./permissions/index.js";

// Policy Engine (Super Sprint A — MX199)
export { PolicyEngine, evaluateConditions } from "./policy/index.js";
export type {
  ActionIntentRow,
  ActorType,
  AllowRule,
  AppliesTo,
  ConditionMap,
  ConditionOperator,
  DenyRule,
  EvaluationContext,
  MatchedPolicy,
  PolicyDataSource,
  PolicyEngineOptions,
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  PolicyJson,
  PolicyResult,
  PolicyRow,
  PolicyRule,
  RequireApprovalRule,
} from "./policy/index.js";

// Billing — Plans + Quota Enforcer (Super Sprint E — MX233 / MX239)
export {
  PLANS,
  PLAN_CODES,
  METRIC_CODES,
  getPlan,
  getLimit,
  isPlanCode,
  isMetricCode,
  formatBytes,
  formatBRL,
  QuotaEnforcer,
} from "./billing/index.js";
export type {
  Plan,
  PlanCode,
  MetricCode,
  PlanLimit,
  QuotaCheckResult,
  QuotaDataSource,
  QuotaEnforcerOptions,
} from "./billing/index.js";

// Choreography Engine (Super Sprint D — MX227)
export { ChoreographyEngine } from "./choreography/index.js";
export type {
  ChoreographyDataSource,
  ChoreographyDefinition,
  ChoreographyEngineOptions,
  ChoreographyExecutionStart,
  ChoreographyMatch,
  ChoreographyRow,
  ChoreographyStep,
  ChoreographyTriggerEvent,
} from "./choreography/index.js";

// Invariants
export {
  INVARIANT_OPERATIONS,
  isInvariantOperation,
  getInvariantOperation,
} from "./invariants/operations.js";
export type { InvariantOperation } from "./invariants/operations.js";

// LLM
export { instrumentedChat } from "./llm/instrumented-chat.js";
export type { InstrumentedChatOptions } from "./llm/instrumented-chat.js";

// Correlation
export { getCurrentCorrelationId } from "./correlation.js";

// Degraded Mode (P14)
export {
  DegradedLLMDriver,
  DegradedObservabilityDriver,
  withDegradedLLM,
  withDegradedObservability,
} from "./degraded/index.js";
export type { DegradedCallback } from "./degraded/index.js";
