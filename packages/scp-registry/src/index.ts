// Schemas
export type { EventEnvelope, PartialEnvelope } from "./schemas/envelope.js";
export { EventEnvelopeSchema } from "./schemas/envelope.js";
export type { Actor } from "./schemas/actor.js";
export { ActorSchema } from "./schemas/actor.js";

// Platform events
export { PLATFORM_EVENT_SCHEMAS } from "./schemas/platform.js";
export type {
  PlatformTenantCreatedPayload,
  PlatformTenantSuspendedPayload,
  PlatformUserCreatedPayload,
} from "./schemas/platform.js";

// Agent events
export { AGENT_EVENT_SCHEMAS } from "./schemas/agent.js";
export type {
  AgentRegisteredPayload,
  AgentActionRequestedPayload,
} from "./schemas/agent.js";

// Context events
export { CONTEXT_EVENT_SCHEMAS } from "./schemas/context.js";

// Integration events
export { INTEGRATION_EVENT_SCHEMAS } from "./schemas/integration.js";

// Registry
export {
  register,
  hasSchema,
  getSchema,
  validate,
  listRegistered,
} from "./registry.js";

// Commerce events
export { COMMERCE_EVENT_SCHEMAS } from "./schemas/commerce.js";
export type {
  CommerceProductCreatedPayload,
  CommerceProductUpdatedPayload,
  CommerceProductArchivedPayload,
} from "./schemas/commerce.js";

// Commerce checkout events
export { COMMERCE_CHECKOUT_EVENT_SCHEMAS } from "./schemas/commerce-checkout.js";
export type {
  CommerceCheckoutStartedPayload,
  CommerceOrderPlacedPayload,
  CommerceOrderPaidPayload,
  CommerceOrderFailedPayload,
  CommerceOrderRefundedPayload,
} from "./schemas/commerce-checkout.js";

// Helpers
export { buildEnvelope, verifyEnvelope, signEnvelope } from "./helpers.js";
