import { z } from "zod";

/**
 * ActorType — distingue humano de agente em todo evento (Fundamentação P9 [INV]).
 * Refs: Fundamentação 12.4, ADR-0001 seção 2 (Modelo de Agentes / Interpretação A+)
 */
export const ActorTypeSchema = z.enum(["human", "agent", "system"]);
export type ActorType = z.infer<typeof ActorTypeSchema>;

/**
 * Actor — identidade de quem executa uma ação.
 * - human: user_id obrigatório
 * - agent: agent_id + supervising_user_id obrigatórios (Interpretação A+)
 * - system: service_name + version obrigatórios
 */
export const ActorSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("human"),
    user_id: z.string().uuid(),
    session_id: z.string().uuid().optional(),
  }),
  z.object({
    type: z.literal("agent"),
    agent_id: z.string().uuid(),
    supervising_user_id: z.string().uuid(), // OBRIGATÓRIO — Interpretação A+
    capability_token: z.string().optional(),
  }),
  z.object({
    type: z.literal("system"),
    service_name: z.string().min(1),
    version: z.string().min(1),
  }),
]);
export type Actor = z.infer<typeof ActorSchema>;

/**
 * TenantContext — contexto de tenant propagado em toda operação multi-tenant.
 * RLS PostgreSQL é fail-closed: query sem contexto retorna zero rows. (Fundamentação 10.1 [INV])
 */
export const TenantContextSchema = z.object({
  company_id: z.string().uuid(),
  actor: ActorSchema,
  correlation_id: z.string().uuid().optional(),
  causation_id: z.string().uuid().optional(),
});
export type TenantContext = z.infer<typeof TenantContextSchema>;
