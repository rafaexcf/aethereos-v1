// Schemas
export type { EventEnvelope, PartialEnvelope } from "./schemas/envelope";
export { EventEnvelopeSchema } from "./schemas/envelope";
export type { Actor } from "./schemas/actor";
export { ActorSchema } from "./schemas/actor";

// Platform events
export { PLATFORM_EVENT_SCHEMAS } from "./schemas/platform";
export type {
  PlatformTenantCreatedPayload,
  PlatformTenantSuspendedPayload,
  PlatformUserCreatedPayload,
  PlatformStaffAccessPayload,
} from "./schemas/platform";

// Agent events
export { AGENT_EVENT_SCHEMAS, COPILOT_INTENT_SCHEMAS } from "./schemas/agent";
export type {
  AgentRegisteredPayload,
  AgentActionRequestedPayload,
  CopilotIntentPayload,
  CopilotIntentCreatePerson,
  CopilotIntentCreateFile,
  CopilotIntentSendNotification,
  CopilotIntentUpdateSettings,
  CopilotIntentCreateChannel,
} from "./schemas/agent";

// Context events
export { CONTEXT_EVENT_SCHEMAS } from "./schemas/context";

// Integration events
export { INTEGRATION_EVENT_SCHEMAS } from "./schemas/integration";

// Registry
export {
  register,
  hasSchema,
  getSchema,
  validate,
  listRegistered,
} from "./registry";

// Commerce events
export { COMMERCE_EVENT_SCHEMAS } from "./schemas/commerce";
export type {
  CommerceProductCreatedPayload,
  CommerceProductUpdatedPayload,
  CommerceProductArchivedPayload,
} from "./schemas/commerce";

// Commerce checkout events
export { COMMERCE_CHECKOUT_EVENT_SCHEMAS } from "./schemas/commerce-checkout";
export type {
  CommerceCheckoutStartedPayload,
  CommerceOrderPlacedPayload,
  CommerceOrderPaidPayload,
  CommerceOrderFailedPayload,
  CommerceOrderRefundedPayload,
} from "./schemas/commerce-checkout";

// Helpers
export { buildEnvelope, verifyEnvelope, signEnvelope } from "./helpers";
