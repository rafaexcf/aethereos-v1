import { useState, useCallback } from "react";

export interface NotificationItem {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  body: string;
  read_at: Date | null;
  created_at: Date;
  app?: string;
  context?: string;
}

interface NotificationBellProps {
  notifications: NotificationItem[];
  onMarkRead: (ids: string[]) => void;
  onExpand: () => void;
}

const TYPE_COLORS: Record<NotificationItem["type"], string> = {
  info: "text-blue-400",
  warning: "text-amber-400",
  error: "text-red-400",
  success: "text-emerald-400",
};

export function NotificationBell({
  notifications,
  onMarkRead,
  onExpand,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => n.read_at === null);

  const handleOpen = useCallback(() => {
    setOpen((prev) => !prev);
    if (!open && unread.length > 0) {
      onMarkRead(unread.map((n) => n.id));
    }
  }, [open, unread, onMarkRead]);

  const handleExpand = useCallback(() => {
    setOpen(false);
    onExpand();
  }, [onExpand]);

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        aria-label={`Notificações (${unread.length} não lidas)`}
        className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop leve para fechar clicando fora */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-100">
                Notificações
              </p>
              <button
                type="button"
                onClick={handleExpand}
                title="Abrir central de notificações"
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
              >
                {/* Maximize icon */}
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
                Expandir
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-zinc-500">Nenhuma notificação</p>
              </div>
            ) : (
              <ul className="max-h-80 divide-y divide-zinc-800 overflow-y-auto">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 ${n.read_at === null ? "bg-zinc-800/40" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 text-xs font-bold uppercase ${TYPE_COLORS[n.type]}`}
                      >
                        {n.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {n.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                          {n.body}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-xs text-zinc-600">
                            {n.created_at.toLocaleString("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                          {n.app !== undefined && (
                            <span className="rounded bg-zinc-700/60 px-1.5 py-0.5 text-[10px] text-zinc-500">
                              {n.app}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {notifications.length > 0 && (
              <div className="border-t border-zinc-800 px-4 py-2">
                <button
                  type="button"
                  onClick={handleExpand}
                  className="w-full rounded-lg py-1.5 text-center text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                >
                  Ver todas as notificações →
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
