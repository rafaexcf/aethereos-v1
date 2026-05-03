import { create } from "zustand";
import type { NotificationItem } from "../components/NotificationBell";
import type { CloudDrivers } from "../lib/drivers";

export interface NotifyInput {
  type: NotificationItem["type"];
  title: string;
  body?: string;
  source_app?: string;
  source_id?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationRow {
  id: string;
  type: NotificationItem["type"];
  title: string;
  body: string;
  source_app: string | null;
  source_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

function rowToItem(r: NotificationRow): NotificationItem {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    read_at: r.read_at !== null ? new Date(r.read_at) : null,
    created_at: new Date(r.created_at),
    ...(r.source_app !== null
      ? { app: r.source_app, appId: r.source_app }
      : {}),
  };
}

interface NotificationsState {
  items: NotificationItem[];
  loaded: boolean;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  loadInitial: (drivers: CloudDrivers, userId: string) => Promise<void>;
  subscribeRealtime: (drivers: CloudDrivers, userId: string) => () => void;
  push: (item: NotificationItem) => void;
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  loaded: false,

  push: (item) =>
    set((s) =>
      s.items.some((n) => n.id === item.id) ? s : { items: [item, ...s.items] },
    ),

  reset: () => set({ items: [], loaded: false }),

  loadInitial: async (drivers, _userId) => {
    if (get().loaded) return;
    try {
      const { data, error } = await drivers.data
        .from("notifications")
        .select(
          "id,type,title,body,source_app,source_id,metadata,read_at,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error !== null || data === null) {
        set({ loaded: true });
        return;
      }
      set({
        items: (data as unknown as NotificationRow[]).map(rowToItem),
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  subscribeRealtime: (drivers, userId) => {
    const sub = drivers.data.subscribeToTable({
      table: "notifications",
      event: "INSERT",
      filter: `user_id=eq.${userId}`,
      onData: (payload) => {
        const row = payload.new as unknown as NotificationRow;
        if (row === undefined || row === null || row.id === undefined) return;
        get().push(rowToItem(row));
      },
    });
    return () => sub.unsubscribe();
  },

  markRead: async (ids) => {
    if (ids.length === 0) return;
    set((s) => ({
      items: s.items.map((n) =>
        ids.includes(n.id) ? { ...n, read_at: new Date() } : n,
      ),
    }));
    try {
      await drivers_markRead(ids);
    } catch {
      // optimistic update kept; next reload will re-sync
    }
  },

  markAllRead: async () => {
    const unreadIds = get()
      .items.filter((n) => n.read_at === null)
      .map((n) => n.id);
    if (unreadIds.length === 0) return;
    set((s) => ({
      items: s.items.map((n) => ({ ...n, read_at: n.read_at ?? new Date() })),
    }));
    try {
      await drivers_markRead(unreadIds);
    } catch {
      // optimistic
    }
  },
}));

// drivers reference is passed in via loadInitial; we cache it for markRead.
let cachedDrivers: CloudDrivers | null = null;

export function bindNotificationsDrivers(d: CloudDrivers): void {
  cachedDrivers = d;
}

async function drivers_markRead(ids: string[]): Promise<void> {
  if (cachedDrivers === null) return;
  await cachedDrivers.data
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);
}

/**
 * Emite uma notificação inserindo na tabela kernel.notifications.
 * O Realtime subscribe entrega a notificação de volta ao próprio cliente,
 * então `push()` local é desnecessário aqui.
 *
 * @returns id da notificação criada, ou null em caso de falha.
 */
export async function notify(
  drivers: CloudDrivers,
  userId: string,
  companyId: string,
  input: NotifyInput,
): Promise<string | null> {
  try {
    const { data, error } = await drivers.data
      .from("notifications")
      .insert({
        user_id: userId,
        company_id: companyId,
        type: input.type,
        title: input.title,
        body: input.body ?? "",
        source_app: input.source_app ?? null,
        source_id: input.source_id ?? null,
        metadata: input.metadata ?? {},
      })
      .select("id")
      .single();
    if (error !== null || data === null) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}
