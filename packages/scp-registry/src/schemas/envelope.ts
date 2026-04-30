import { z } from "zod";
import { ActorSchema } from "./actor.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_TYPE_REGEX = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,3}$/;

/**
 * EventEnvelope — envelope canônico do Software Context Protocol.
 *
 * Contrato de campos (Fundamentação 8.10 [INV]):
 * - id: UUID v7 (ordenação cronológica + unicidade global)
 * - type: formato domain.entity.action (3-4 níveis, lowercase, pontos como separador)
 * - actor: human|agent|system — agent requer supervising_user_id obrigatório (Interpretação A+)
 * - signature: Ed25519 base64url — eventos auto-certificáveis (P11 [INV])
 * - correlation_id: rastreamento de cadeia de operações
 * - causation_id: referência ao evento que causou este
 *
 * Campos NOT NULL na prática: id, type, version, tenant_id, actor,
 * correlation_id, payload, occurred_at.
 */
export const EventEnvelopeSchema = z.object({
  /** UUID v7 — permite ordenação cronológica sem clock dedicado */
  id: z
    .string()
    .regex(UUID_V7_REGEX, "id deve ser UUID v7")
    .or(z.string().regex(UUID_V4_REGEX, "id deve ser UUID v4 ou v7")),
  /** Formato: domain.entity.action — 3 níveis mínimo, 4 permitido */
  type: z.string().regex(EVENT_TYPE_REGEX, {
    message:
      "type deve ter formato domain.entity.action (3-4 níveis, lowercase)",
  }),
  /** Versão do schema deste tipo de evento */
  version: z.string().min(1).default("1"),
  /** company_id do tenant — RLS por company_id (Fundamentação 10.1 [INV]) */
  tenant_id: z.string().uuid(),
  actor: ActorSchema,
  /** Correlação de operações distribuídas para tracing */
  correlation_id: z.string().uuid(),
  /** Evento que causou este (chain de causalidade) */
  causation_id: z.string().uuid().optional(),
  /** Payload específico do tipo de evento — validado separadamente pelo schema registrado */
  payload: z.record(z.unknown()),
  /** ISO 8601 UTC */
  occurred_at: z.string().datetime({ offset: false }),
  /** Versão do schema do envelope em si */
  schema_version: z.string().default("1"),
  /** Assinatura Ed25519 base64url do payload — P11 [INV] eventos auto-certificáveis */
  signature: z.string().min(1).optional(),
  /** Hash do envelope anterior — hash chain opcional na v1 */
  parent_hash: z.string().min(1).optional(),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

/** Tipo parcial para construção do envelope (antes de signing) */
export type PartialEnvelope = Omit<
  EventEnvelope,
  "id" | "occurred_at" | "version" | "schema_version" | "signature"
>;
