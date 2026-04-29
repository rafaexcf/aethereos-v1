import { z } from "zod";
import { ActorSchema } from "./tenant-context.js";

/**
 * PlatformEvent / EventEnvelope — envelope canônico de evento SCP.
 * Refs: Fundamentação 8.10 [INV], ADR-0014 seção convergências
 */
export const EventEnvelopeSchema = z.object({
  id: z.string().uuid(), // UUID v7 preferido para ordenação cronológica
  type: z.string().regex(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,3}$/, {
    message: "Event type: formato domain.entity.action (3-4 níveis, lowercase)",
  }),
  version: z.string().default("1"),
  tenant_id: z.string().uuid(),
  actor: ActorSchema,
  correlation_id: z.string().uuid(),
  causation_id: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
  occurred_at: z.string().datetime(), // ISO 8601
  schema_version: z.string().default("1"),
  // Assinatura Ed25519 — Fundamentação P11 [INV]: eventos auto-certificáveis
  signature: z.string().optional(), // base64url Ed25519
  // Hash chain opcional na v1
  parent_hash: z.string().optional(),
});
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export type PlatformEvent<TPayload = Record<string, unknown>> = Omit<
  EventEnvelope,
  "payload"
> & { payload: TPayload };
