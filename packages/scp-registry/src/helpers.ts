import { randomUUID } from "node:crypto";
import type { EventEnvelope, PartialEnvelope } from "./schemas/envelope.js";
import { EventEnvelopeSchema } from "./schemas/envelope.js";
import { validate } from "./registry.js";
import type { Result } from "@aethereos/drivers";
import { ok, err, ValidationError } from "@aethereos/drivers";

/**
 * Constrói um EventEnvelope completo a partir de dados parciais.
 * Valida o payload contra o schema registrado para o tipo de evento.
 * Gera id (UUID v4), occurred_at e defaults automaticamente.
 */
export function buildEnvelope(
  partial: PartialEnvelope,
): Result<EventEnvelope, ValidationError> {
  const payloadValidation = validate(partial.type, partial.payload);
  if (!payloadValidation.ok) {
    return err(payloadValidation.error);
  }

  const envelope = {
    id: randomUUID(),
    version: "1",
    schema_version: "1",
    occurred_at: new Date().toISOString(),
    ...partial,
    payload: payloadValidation.value,
  };

  const parsed = EventEnvelopeSchema.safeParse(envelope);
  if (!parsed.success) {
    return err(
      new ValidationError(
        "Envelope inválido após construção",
        parsed.error.issues,
      ),
    );
  }

  return ok(parsed.data);
}

/**
 * Verifica a assinatura Ed25519 de um envelope usando Web Crypto API.
 * Disponível em Node.js 20+ via globalThis.crypto.
 * Retorna ok(true) para envelopes sem assinatura (assinatura opcional na v1).
 *
 * Ref: Fundamentação P11 [INV] — eventos auto-certificáveis
 * Ref: KEY_MANAGEMENT.md para gestão de chaves em produção
 */
export async function verifyEnvelope(
  envelope: EventEnvelope,
  publicKey?: Parameters<typeof crypto.subtle.verify>[1],
): Promise<Result<boolean, ValidationError>> {
  if (envelope.signature === undefined) {
    return ok(true);
  }

  if (publicKey === undefined) {
    return err(
      new ValidationError(
        "Chave pública obrigatória para verificar assinatura",
        [{ code: "missing_public_key" }],
      ),
    );
  }

  try {
    const data = new TextEncoder().encode(
      JSON.stringify({
        id: envelope.id,
        type: envelope.type,
        payload: envelope.payload,
      }),
    );
    const sigBytes = Uint8Array.from(atob(envelope.signature), (c) =>
      c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      "Ed25519",
      publicKey,
      sigBytes,
      data,
    );
    return ok(valid);
  } catch (e) {
    return err(
      new ValidationError("Falha ao verificar assinatura", [
        { code: "verify_error", detail: String(e) },
      ]),
    );
  }
}

/**
 * Assina um envelope com a chave privada Ed25519.
 * Ref: Fundamentação P11 [INV] — eventos auto-certificáveis
 */
export async function signEnvelope(
  envelope: EventEnvelope,
  privateKey: Parameters<typeof crypto.subtle.sign>[1],
): Promise<Result<EventEnvelope, ValidationError>> {
  try {
    const data = new TextEncoder().encode(
      JSON.stringify({
        id: envelope.id,
        type: envelope.type,
        payload: envelope.payload,
      }),
    );
    const sigBytes = await crypto.subtle.sign("Ed25519", privateKey, data);
    const signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));
    return ok({ ...envelope, signature });
  } catch (e) {
    return err(
      new ValidationError("Falha ao assinar envelope", [
        { code: "sign_error", detail: String(e) },
      ]),
    );
  }
}
