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

export const AGENT_EVENT_SCHEMAS = {
  "agent.registered": AgentRegisteredPayloadSchema,
  "agent.action.requested": AgentActionRequestedPayloadSchema,
  "agent.action.approved": AgentActionApprovedPayloadSchema,
} as const satisfies Record<string, z.ZodSchema>;
