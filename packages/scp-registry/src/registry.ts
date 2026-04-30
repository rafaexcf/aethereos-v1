import type { z } from "zod";
import type { Result } from "@aethereos/drivers";
import { ok, err, ValidationError } from "@aethereos/drivers";
import { PLATFORM_EVENT_SCHEMAS } from "./schemas/platform.js";
import { AGENT_EVENT_SCHEMAS } from "./schemas/agent.js";
import { CONTEXT_EVENT_SCHEMAS } from "./schemas/context.js";
import { INTEGRATION_EVENT_SCHEMAS } from "./schemas/integration.js";

type PayloadSchema = z.ZodSchema;

const BUILT_IN_SCHEMAS: Record<string, PayloadSchema> = {
  ...PLATFORM_EVENT_SCHEMAS,
  ...AGENT_EVENT_SCHEMAS,
  ...CONTEXT_EVENT_SCHEMAS,
  ...INTEGRATION_EVENT_SCHEMAS,
};

/** Registry mutable para schemas registrados por apps em runtime */
const appSchemas = new Map<string, PayloadSchema>();

/**
 * Registra um schema de payload para um tipo de evento.
 * CI futuro bloqueia emissão de eventos sem schema registrado.
 * Ref: CLAUDE.md seção 9 [INV]
 */
export function register(eventType: string, schema: PayloadSchema): void {
  if (BUILT_IN_SCHEMAS[eventType] !== undefined) {
    throw new Error(
      `Evento '${eventType}' é reservado pelo kernel e não pode ser registrado por apps. ` +
        `Domínios reservados: platform.*, agent.*, context.*, integration.*, financial.*, fiscal.*`,
    );
  }
  appSchemas.set(eventType, schema);
}

/**
 * Verifica se um tipo de evento tem schema registrado.
 */
export function hasSchema(eventType: string): boolean {
  return BUILT_IN_SCHEMAS[eventType] !== undefined || appSchemas.has(eventType);
}

/**
 * Recupera o schema de payload para um tipo de evento.
 */
export function getSchema(eventType: string): PayloadSchema | undefined {
  return BUILT_IN_SCHEMAS[eventType] ?? appSchemas.get(eventType);
}

/**
 * Valida um payload contra o schema registrado para o tipo de evento.
 * Retorna Result<parsed, ValidationError>.
 */
export function validate(
  eventType: string,
  payload: unknown,
): Result<Record<string, unknown>, ValidationError> {
  const schema = getSchema(eventType);

  if (schema === undefined) {
    return err(
      new ValidationError(
        `Nenhum schema registrado para evento '${eventType}'. ` +
          `Registre o schema via scp-registry.register() antes de emitir.`,
        [{ code: "no_schema", eventType }],
      ),
    );
  }

  const result = schema.safeParse(payload);

  if (!result.success) {
    return err(
      new ValidationError(
        `Payload inválido para evento '${eventType}'`,
        result.error.issues,
        { eventType },
      ),
    );
  }

  return ok(result.data as Record<string, unknown>);
}

/** Lista todos os tipos de eventos com schema registrado */
export function listRegistered(): string[] {
  return [...Object.keys(BUILT_IN_SCHEMAS), ...appSchemas.keys()];
}
