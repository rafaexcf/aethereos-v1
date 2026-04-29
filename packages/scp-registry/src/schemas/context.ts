import { z } from "zod";

/**
 * Schemas de eventos context.* (domínio reservado do kernel).
 * Context Engine events — enriquecimento e snapshot de contexto.
 * Ref: CLAUDE.md seção 9 [INV], Fundamentação 8.10
 */

export const ContextSnapshotRequestedPayloadSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
  company_id: z.string().uuid(),
  requested_by: z.string().uuid(),
  layers: z.array(z.string()).optional(),
});

export const ContextSnapshotReadyPayloadSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
  company_id: z.string().uuid(),
  snapshot_id: z.string().uuid(),
  layers_included: z.array(z.string()),
});

export const CONTEXT_EVENT_SCHEMAS = {
  "context.snapshot.requested": ContextSnapshotRequestedPayloadSchema,
  "context.snapshot.ready": ContextSnapshotReadyPayloadSchema,
} as const satisfies Record<string, z.ZodSchema>;
