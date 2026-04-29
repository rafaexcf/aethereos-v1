import type { Result } from "../types/result.js";
import type { TenantContext } from "../types/tenant-context.js";
import type { DatabaseError, NotFoundError } from "../errors.js";

export type NotificationType = "info" | "warning" | "error" | "success";

export interface Notification {
  readonly id: string;
  readonly company_id: string;
  readonly user_id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly read_at: Date | null;
  readonly correlation_id: string | null;
  readonly metadata: Record<string, unknown>;
  readonly created_at: Date;
}

export interface CreateNotification {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  correlation_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ListNotificationsOptions {
  unreadOnly?: boolean;
  limit?: number;
  before?: Date;
}

export type NotificationDriverError = DatabaseError | NotFoundError;

/**
 * NotificationDriver — envio e consulta de notificações por tenant/usuário.
 *
 * Implementação concreta: Supabase (packages/drivers-supabase).
 * RLS garante que usuário vê apenas suas notificações no tenant ativo.
 */
export interface NotificationDriver {
  create(
    context: TenantContext,
    notification: CreateNotification,
  ): Promise<Result<Notification, NotificationDriverError>>;

  list(
    context: TenantContext,
    options?: ListNotificationsOptions,
  ): Promise<Result<Notification[], NotificationDriverError>>;

  markRead(
    context: TenantContext,
    ids: string[],
  ): Promise<Result<void, NotificationDriverError>>;

  getUnreadCount(
    context: TenantContext,
  ): Promise<Result<number, NotificationDriverError>>;
}
