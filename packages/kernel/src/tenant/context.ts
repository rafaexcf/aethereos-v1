import type { TenantContext } from "@aethereos/drivers";
import { TenantContextSchema } from "@aethereos/drivers";

/**
 * withTenantContext — utilitário para executar uma função dentro de um contexto de tenant.
 * Valida o contexto antes de executar. Propaga o contexto via closure.
 *
 * Uso: toda operação que acessa dados de tenant deve passar por aqui.
 * O DatabaseDriver.withTenant() é responsável por propagar via RLS (SET LOCAL).
 *
 * Ref: Fundamentação 10.1 [INV] — RLS fail-closed
 */
export async function withTenantContext<T>(
  context: TenantContext,
  fn: (ctx: TenantContext) => Promise<T>,
): Promise<T> {
  const parsed = TenantContextSchema.safeParse(context);
  if (!parsed.success) {
    throw new Error(
      `TenantContext inválido: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
  return fn(parsed.data);
}

/**
 * assertTenantContext — asserta que um contexto de tenant é válido.
 * Lança erro se inválido. Usar no início de handlers/actions que recebem context de fora.
 */
export function assertTenantContext(
  context: unknown,
): asserts context is TenantContext {
  const parsed = TenantContextSchema.safeParse(context);
  if (!parsed.success) {
    throw new Error(
      `TenantContext inválido: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    );
  }
}
