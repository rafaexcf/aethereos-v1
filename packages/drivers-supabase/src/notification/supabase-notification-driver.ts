import type {
  NotificationDriver,
  Notification,
  CreateNotification,
  ListNotificationsOptions,
} from "@aethereos/drivers";
import { ok, err, DatabaseError } from "@aethereos/drivers";
import type { TenantContext, Result } from "@aethereos/drivers";
import type { SupabaseClient } from "@supabase/supabase-js";

interface NotificationRow {
  id: string;
  company_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  correlation_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    company_id: row.company_id,
    user_id: row.user_id,
    type: row.type as Notification["type"],
    title: row.title,
    body: row.body,
    read_at: row.read_at !== null ? new Date(row.read_at) : null,
    correlation_id: row.correlation_id,
    metadata: row.metadata,
    created_at: new Date(row.created_at),
  };
}

export class SupabaseNotificationDriver implements NotificationDriver {
  constructor(private readonly client: SupabaseClient) {}

  async create(
    context: TenantContext,
    notification: CreateNotification,
  ): Promise<Result<Notification, DatabaseError>> {
    const { data, error } = await this.client
      .schema("kernel")
      .from("notifications")
      .insert({
        company_id: context.company_id,
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        correlation_id: notification.correlation_id ?? null,
        metadata: notification.metadata ?? {},
      })
      .select()
      .single<NotificationRow>();

    if (error !== null) {
      return err(new DatabaseError(error.message));
    }
    return ok(rowToNotification(data));
  }

  async list(
    context: TenantContext,
    options?: ListNotificationsOptions,
  ): Promise<Result<Notification[], DatabaseError>> {
    const actor = context.actor;
    const userId =
      actor.type === "human"
        ? actor.user_id
        : actor.type === "agent"
          ? actor.supervising_user_id
          : null;

    if (userId === null) {
      return ok([]);
    }

    let query = this.client
      .schema("kernel")
      .from("notifications")
      .select("*")
      .eq("company_id", context.company_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(options?.limit ?? 50);

    if (options?.unreadOnly === true) {
      query = query.is("read_at", null);
    }

    if (options?.before !== undefined) {
      query = query.lt("created_at", options.before.toISOString());
    }

    const { data, error } = await query.returns<NotificationRow[]>();

    if (error !== null) {
      return err(new DatabaseError(error.message));
    }

    return ok((data ?? []).map(rowToNotification));
  }

  async markRead(
    context: TenantContext,
    ids: string[],
  ): Promise<Result<void, DatabaseError>> {
    if (ids.length === 0) return ok(undefined);

    const { error } = await this.client
      .schema("kernel")
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids)
      .eq("company_id", context.company_id);

    if (error !== null) {
      return err(new DatabaseError(error.message));
    }
    return ok(undefined);
  }

  async getUnreadCount(
    context: TenantContext,
  ): Promise<Result<number, DatabaseError>> {
    const actor = context.actor;
    const userId =
      actor.type === "human"
        ? actor.user_id
        : actor.type === "agent"
          ? actor.supervising_user_id
          : null;

    if (userId === null) {
      return ok(0);
    }

    const { count, error } = await this.client
      .schema("kernel")
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("company_id", context.company_id)
      .eq("user_id", userId)
      .is("read_at", null);

    if (error !== null) {
      return err(new DatabaseError(error.message));
    }
    return ok(count ?? 0);
  }
}
