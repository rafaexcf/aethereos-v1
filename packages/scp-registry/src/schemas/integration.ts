import { z } from "zod";

/**
 * Schemas de eventos integration.* (domínio reservado do kernel).
 * Eventos de conectores e integrações com sistemas externos.
 * Ref: CLAUDE.md seção 9 [INV], Fundamentação 9.x (Connector Apps)
 */

export const IntegrationConnectorRegisteredPayloadSchema = z.object({
  connector_id: z.string().uuid(),
  connector_type: z.string().min(1),
  company_id: z.string().uuid(),
  version: z.string().min(1),
  registered_by: z.string().uuid(),
});

export const IntegrationSyncCompletedPayloadSchema = z.object({
  connector_id: z.string().uuid(),
  company_id: z.string().uuid(),
  sync_type: z.string().min(1),
  records_synced: z.number().int().min(0),
  duration_ms: z.number().int().min(0),
  next_sync_at: z.string().datetime({ offset: false }).optional(),
});

export const INTEGRATION_EVENT_SCHEMAS = {
  "integration.connector.registered":
    IntegrationConnectorRegisteredPayloadSchema,
  "integration.sync.completed": IntegrationSyncCompletedPayloadSchema,
} as const satisfies Record<string, z.ZodSchema>;
