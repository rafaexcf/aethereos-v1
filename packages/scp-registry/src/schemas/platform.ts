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

// ---------------------------------------------------------------------------
// Eventos de arquivos (Drive — M41)
// ---------------------------------------------------------------------------

export const PlatformFileUploadedPayloadSchema = z.object({
  file_id: z.string().uuid(),
  company_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  name: z.string().min(1),
  mime_type: z.string().optional(),
  size_bytes: z.number().int().nonnegative(),
  storage_path: z.string().min(1),
  uploaded_by: z.string().uuid(),
});
export type PlatformFileUploadedPayload = z.infer<
  typeof PlatformFileUploadedPayloadSchema
>;

export const PlatformFileDeletedPayloadSchema = z.object({
  file_id: z.string().uuid(),
  company_id: z.string().uuid(),
  name: z.string().min(1),
  deleted_by: z.string().uuid(),
});
export type PlatformFileDeletedPayload = z.infer<
  typeof PlatformFileDeletedPayloadSchema
>;

export const PlatformFolderCreatedPayloadSchema = z.object({
  folder_id: z.string().uuid(),
  company_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  name: z.string().min(1),
  created_by: z.string().uuid(),
});
export type PlatformFolderCreatedPayload = z.infer<
  typeof PlatformFolderCreatedPayloadSchema
>;

// ---------------------------------------------------------------------------
// Eventos de notificação (M37)
// ---------------------------------------------------------------------------

export const PlatformNotificationDispatchedPayloadSchema = z.object({
  notification_id: z.string().uuid(),
  company_id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1),
});
export type PlatformNotificationDispatchedPayload = z.infer<
  typeof PlatformNotificationDispatchedPayloadSchema
>;

// ---------------------------------------------------------------------------
// Eventos de pessoas (Cadastro de Pessoas — M42)
// ---------------------------------------------------------------------------

export const PlatformPersonCreatedPayloadSchema = z.object({
  person_id: z.string().uuid(),
  company_id: z.string().uuid(),
  full_name: z.string().min(1),
  email: z.string().email().optional(),
  created_by: z.string().uuid(),
});
export type PlatformPersonCreatedPayload = z.infer<
  typeof PlatformPersonCreatedPayloadSchema
>;

export const PlatformPersonUpdatedPayloadSchema = z.object({
  person_id: z.string().uuid(),
  company_id: z.string().uuid(),
  fields_changed: z.array(z.string()),
  updated_by: z.string().uuid(),
});
export type PlatformPersonUpdatedPayload = z.infer<
  typeof PlatformPersonUpdatedPayloadSchema
>;

export const PlatformPersonDeactivatedPayloadSchema = z.object({
  person_id: z.string().uuid(),
  company_id: z.string().uuid(),
  full_name: z.string().min(1),
  deactivated_by: z.string().uuid(),
  approval_token: z.string().uuid(),
});
export type PlatformPersonDeactivatedPayload = z.infer<
  typeof PlatformPersonDeactivatedPayloadSchema
>;

// ---------------------------------------------------------------------------
// Eventos de configurações (M44)
// ---------------------------------------------------------------------------

export const PlatformSettingsUpdatedPayloadSchema = z.object({
  scope: z.enum(["user", "company", "platform"]),
  scope_id: z.string().uuid(),
  key: z.string().min(1),
  updated_by: z.string().uuid(),
});
export type PlatformSettingsUpdatedPayload = z.infer<
  typeof PlatformSettingsUpdatedPayloadSchema
>;

// ---------------------------------------------------------------------------
// Eventos de chat (M43)
// ---------------------------------------------------------------------------

export const PlatformChatMessageSentPayloadSchema = z.object({
  message_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  company_id: z.string().uuid(),
  sender_user_id: z.string().uuid(),
  body_length: z.number().int().nonnegative(),
});
export type PlatformChatMessageSentPayload = z.infer<
  typeof PlatformChatMessageSentPayloadSchema
>;

export const PlatformChatChannelCreatedPayloadSchema = z.object({
  channel_id: z.string().uuid(),
  company_id: z.string().uuid(),
  kind: z.enum(["channel", "dm"]),
  name: z.string().optional(),
  created_by: z.string().uuid(),
});
export type PlatformChatChannelCreatedPayload = z.infer<
  typeof PlatformChatChannelCreatedPayloadSchema
>;

/** Mapa de tipo de evento → schema de payload para eventos platform.* */
export const PLATFORM_EVENT_SCHEMAS = {
  "platform.tenant.created": PlatformTenantCreatedPayloadSchema,
  "platform.company.created": PlatformCompanyCreatedPayloadSchema,
  "platform.tenant.suspended": PlatformTenantSuspendedPayloadSchema,
  "platform.user.created": PlatformUserCreatedPayloadSchema,
  "platform.file.uploaded": PlatformFileUploadedPayloadSchema,
  "platform.file.deleted": PlatformFileDeletedPayloadSchema,
  "platform.folder.created": PlatformFolderCreatedPayloadSchema,
  "platform.notification.dispatched":
    PlatformNotificationDispatchedPayloadSchema,
  "platform.person.created": PlatformPersonCreatedPayloadSchema,
  "platform.person.updated": PlatformPersonUpdatedPayloadSchema,
  "platform.person.deactivated": PlatformPersonDeactivatedPayloadSchema,
  "platform.chat.message_sent": PlatformChatMessageSentPayloadSchema,
  "platform.chat.channel_created": PlatformChatChannelCreatedPayloadSchema,
  "platform.settings.updated": PlatformSettingsUpdatedPayloadSchema,
} as const satisfies Record<string, z.ZodSchema>;
