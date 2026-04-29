import { z } from "zod";

/**
 * Schemas de Actor para uso no SCP.
 * Re-exporta e refina os tipos de @aethereos/drivers/types/tenant-context.
 *
 * Actor discrimina por type:
 * - human: user_id obrigatório
 * - agent: agent_id + supervising_user_id OBRIGATÓRIOS (Interpretação A+ [INV])
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
    supervising_user_id: z.string().uuid(),
    capability_token: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal("system"),
    service_name: z.string().min(1).max(100),
    version: z.string().min(1).max(50),
  }),
]);

export type Actor = z.infer<typeof ActorSchema>;
