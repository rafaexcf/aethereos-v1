import type { TenantContext } from "@aethereos/drivers";

export interface AuditEntry {
  readonly id: string;
  readonly tenant_id: string;
  readonly actor: TenantContext["actor"];
  readonly action: string;
  readonly resource_type: string;
  readonly resource_id: string;
  readonly metadata?: Record<string, unknown>;
  readonly occurred_at: string; // ISO 8601
}

export interface AuditLogDriver {
  /** Persiste entrada de audit. Fail-loud: erro propaga ao caller. */
  append(entry: Omit<AuditEntry, "id" | "occurred_at">): Promise<void>;
}

/**
 * auditLog — função canônica de registro de audit.
 *
 * Garantia: fail-loud. Erro no audit log NUNCA é silenciado — propaga ao caller.
 * Audit log é append-only — nunca atualiza ou deleta linhas.
 *
 * Ref: Fundamentação 12.x, SECURITY_GUIDELINES.md
 */
export async function auditLog(
  driver: AuditLogDriver,
  context: TenantContext,
  action: string,
  resource: { type: string; id: string },
  metadata?: Record<string, unknown>,
): Promise<void> {
  const entry: Omit<AuditEntry, "id" | "occurred_at"> = {
    tenant_id: context.company_id,
    actor: context.actor,
    action,
    resource_type: resource.type,
    resource_id: resource.id,
    ...(metadata !== undefined ? { metadata } : {}),
  };

  // fail-loud: não silencia erros de audit
  await driver.append(entry);
}
