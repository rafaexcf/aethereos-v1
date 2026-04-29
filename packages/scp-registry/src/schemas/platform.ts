import { z } from "zod";

/**
 * Schemas de eventos platform.* (domínio reservado do kernel).
 * Apps comuns NÃO podem emitir eventos platform.* (CLAUDE.md seção 9 [INV]).
 *
 * Ref: Fundamentação 8.10, CLAUDE.md seção 9
 */

export const PlatformTenantCreatedPayloadSchema = z.object({
  company_id: z.string().uuid(),
  plan: z.enum(["free", "starter", "professional", "enterprise"]),
  name: z.string().min(1).max(200),
  country: z.string().length(2), // ISO 3166-1 alpha-2
  tax_id: z.string().optional(), // CNPJ, RUT, etc.
  distribution: z.string().min(1).default("aethereos"),
});

export type PlatformTenantCreatedPayload = z.infer<
  typeof PlatformTenantCreatedPayloadSchema
>;

export const PlatformTenantSuspendedPayloadSchema = z.object({
  company_id: z.string().uuid(),
  reason: z.enum(["payment_overdue", "policy_violation", "admin_action"]),
  suspended_by: z.string().uuid(), // user_id do admin
});

export type PlatformTenantSuspendedPayload = z.infer<
  typeof PlatformTenantSuspendedPayloadSchema
>;

export const PlatformUserCreatedPayloadSchema = z.object({
  user_id: z.string().uuid(),
  company_id: z.string().uuid(),
  email: z.string().email(),
  role: z.string().min(1),
  invited_by: z.string().uuid().optional(),
});

export type PlatformUserCreatedPayload = z.infer<
  typeof PlatformUserCreatedPayloadSchema
>;

// platform.company.created é o evento canônico de criação de empresa/tenant.
// Alias de platform.tenant.created — ambos usam o mesmo payload.
export const PlatformCompanyCreatedPayloadSchema =
  PlatformTenantCreatedPayloadSchema;
export type PlatformCompanyCreatedPayload = PlatformTenantCreatedPayload;

/** Mapa de tipo de evento → schema de payload para eventos platform.* */
export const PLATFORM_EVENT_SCHEMAS = {
  "platform.tenant.created": PlatformTenantCreatedPayloadSchema,
  "platform.company.created": PlatformCompanyCreatedPayloadSchema,
  "platform.tenant.suspended": PlatformTenantSuspendedPayloadSchema,
  "platform.user.created": PlatformUserCreatedPayloadSchema,
} as const satisfies Record<string, z.ZodSchema>;
