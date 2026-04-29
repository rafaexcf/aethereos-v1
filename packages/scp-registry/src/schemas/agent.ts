import { z } from "zod";

/**
 * Schemas de eventos agent.* (domínio reservado do kernel).
 * Ref: CLAUDE.md seção 9 [INV], Fundamentação 12.4
 */

export const AgentRegisteredPayloadSchema = z.object({
  agent_id: z.string().uuid(),
  supervising_user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  capabilities: z.array(z.string()),
  model: z.string().min(1),
  company_id: z.string().uuid(),
});

export type AgentRegisteredPayload = z.infer<
  typeof AgentRegisteredPayloadSchema
>;

export const AgentActionRequestedPayloadSchema = z.object({
  agent_id: z.string().uuid(),
  supervising_user_id: z.string().uuid(),
  action_type: z.string().min(1),
  parameters: z.record(z.unknown()),
  autonomy_level: z.number().int().min(0).max(1), // Ano 1: max 1 (Fundamentação P11)
  requires_human_approval: z.boolean(),
});

export type AgentActionRequestedPayload = z.infer<
  typeof AgentActionRequestedPayloadSchema
>;

export const AgentActionApprovedPayloadSchema = z.object({
  agent_id: z.string().uuid(),
  approved_by: z.string().uuid(), // supervising_user_id obrigatório
  action_correlation_id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Copilot — interação assistiva (M45)
// ---------------------------------------------------------------------------

export const AgentCopilotMessageSentPayloadSchema = z.object({
  message_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  company_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  supervising_user_id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  prompt_tokens: z.number().int().nonnegative().optional(),
  completion_tokens: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
  correlation_id: z.string().uuid().optional(),
});
export type AgentCopilotMessageSentPayload = z.infer<
  typeof AgentCopilotMessageSentPayloadSchema
>;

// ---------------------------------------------------------------------------
// Action Intents — Shadow Mode (M46 prep)
// ---------------------------------------------------------------------------

export const AgentCopilotActionProposedPayloadSchema = z.object({
  proposal_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  company_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  supervising_user_id: z.string().uuid(),
  intent_type: z.enum([
    "create_person",
    "create_file",
    "send_notification",
    "update_settings",
    "create_channel",
  ]),
  payload_preview: z.record(z.unknown()),
  correlation_id: z.string().uuid().optional(),
});
export type AgentCopilotActionProposedPayload = z.infer<
  typeof AgentCopilotActionProposedPayloadSchema
>;

export const AgentCopilotActionApprovedPayloadSchema = z.object({
  proposal_id: z.string().uuid(),
  company_id: z.string().uuid(),
  approved_by: z.string().uuid(),
  approved_at: z.string().datetime(),
  correlation_id: z.string().uuid().optional(),
});
export type AgentCopilotActionApprovedPayload = z.infer<
  typeof AgentCopilotActionApprovedPayloadSchema
>;

export const AgentCopilotActionRejectedPayloadSchema = z.object({
  proposal_id: z.string().uuid(),
  company_id: z.string().uuid(),
  rejected_by: z.string().uuid(),
  reason: z.string().optional(),
  correlation_id: z.string().uuid().optional(),
});
export type AgentCopilotActionRejectedPayload = z.infer<
  typeof AgentCopilotActionRejectedPayloadSchema
>;

// ---------------------------------------------------------------------------
// Intent Payload Schemas — typed payloads for Copilot Action Intents (MX5)
// Each intent type has its own Zod schema; the union is the canonical type.
// ---------------------------------------------------------------------------

export const CopilotIntentCreatePersonSchema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().max(200),
  source_request: z.string().max(120),
});
export type CopilotIntentCreatePerson = z.infer<
  typeof CopilotIntentCreatePersonSchema
>;

export const CopilotIntentCreateFileSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(["folder", "file"]),
  source_request: z.string().max(120),
});
export type CopilotIntentCreateFile = z.infer<
  typeof CopilotIntentCreateFileSchema
>;

export const CopilotIntentSendNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().max(200),
  type: z.enum(["info", "warning", "error"]),
});
export type CopilotIntentSendNotification = z.infer<
  typeof CopilotIntentSendNotificationSchema
>;

export const CopilotIntentUpdateSettingsSchema = z.object({
  scope: z.enum(["user", "company"]),
  key: z.string().min(1),
  source_request: z.string().max(120),
});
export type CopilotIntentUpdateSettings = z.infer<
  typeof CopilotIntentUpdateSettingsSchema
>;

export const CopilotIntentCreateChannelSchema = z.object({
  name: z.string().min(1).max(80),
  kind: z.enum(["channel", "dm"]),
  source_request: z.string().max(120),
});
export type CopilotIntentCreateChannel = z.infer<
  typeof CopilotIntentCreateChannelSchema
>;

export type CopilotIntentPayload =
  | ({ intent_type: "create_person" } & CopilotIntentCreatePerson)
  | ({ intent_type: "create_file" } & CopilotIntentCreateFile)
  | ({ intent_type: "send_notification" } & CopilotIntentSendNotification)
  | ({ intent_type: "update_settings" } & CopilotIntentUpdateSettings)
  | ({ intent_type: "create_channel" } & CopilotIntentCreateChannel);

export const COPILOT_INTENT_SCHEMAS = {
  create_person: CopilotIntentCreatePersonSchema,
  create_file: CopilotIntentCreateFileSchema,
  send_notification: CopilotIntentSendNotificationSchema,
  update_settings: CopilotIntentUpdateSettingsSchema,
  create_channel: CopilotIntentCreateChannelSchema,
} as const satisfies Record<string, z.ZodSchema>;

export const AGENT_EVENT_SCHEMAS = {
  "agent.registered": AgentRegisteredPayloadSchema,
  "agent.action.requested": AgentActionRequestedPayloadSchema,
  "agent.action.approved": AgentActionApprovedPayloadSchema,
  "agent.copilot.message_sent": AgentCopilotMessageSentPayloadSchema,
  "agent.copilot.action_proposed": AgentCopilotActionProposedPayloadSchema,
  "agent.copilot.action_approved": AgentCopilotActionApprovedPayloadSchema,
  "agent.copilot.action_rejected": AgentCopilotActionRejectedPayloadSchema,
} as const satisfies Record<string, z.ZodSchema>;
