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
