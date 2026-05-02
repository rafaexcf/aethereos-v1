import { createPortal } from "react-dom";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { NotificationItem } from "./NotificationBell";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FilterStatus = "all" | "unread";
type FilterType = "all" | NotificationItem["type"];

const TYPE_CONFIG: Record<
  NotificationItem["type"],
  { color: string; label: string }
> = {
  success: { color: "#22c55e", label: "Sucesso" },
  info: { color: "#60a5fa", label: "Info" },
  warning: { color: "#fbbf24", label: "Aviso" },
  error: { color: "#f87171", label: "Erro" },
};

const DATE_GROUP_ORDER = ["Hoje", "Ontem", "Esta semana", "Anteriores"];

function getDateGroup(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d >= today) return "Hoje";
  if (d >= yesterday) return "Ontem";
  if (d >= weekAgo) return "Esta semana";
  return "Anteriores";
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.25)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        margin: "14px 0 4px",
        paddingLeft: 2,
      }}
    >
      {children}
    </p>
  );
}

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  dot?: string;
  children: React.ReactNode;
}

function FilterPill({ active, onClick, dot, children }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 10px",
        borderRadius: 7,
        background: active ? "rgba(139,92,246,0.15)" : "transparent",
        border: active
          ? "1px solid rgba(139,92,246,0.30)"
          : "1px solid transparent",
        color: active ? "#c4b5fd" : "rgba(255,255,255,0.45)",
        fontSize: 12,
        fontWeight: active ? 500 : 400,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "background 100ms, border-color 100ms, color 100ms",
      }}
    >
      {dot !== undefined && (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: dot,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </button>
  );
}

interface NotificationCardProps {
  notification: NotificationItem;
  onMarkRead: () => void;
}

function NotificationCard({
  notification: n,
  onMarkRead,
}: NotificationCardProps) {
  const cfg = TYPE_CONFIG[n.type];
  const isUnread = n.read_at === null;

  return (
    <div
      style={{
        borderRadius: 10,
        padding: "12px 14px",
        background: isUnread ? "rgba(255,255,255,0.04)" : "transparent",
        border: isUnread
          ? "1px solid rgba(255,255,255,0.07)"
          : "1px solid rgba(255,255,255,0.03)",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      {/* Type indicator dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: cfg.color,
          marginTop: 5,
          flexShrink: 0,
          boxShadow: isUnread ? `0 0 6px ${cfg.color}88` : "none",
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: isUnread ? 600 : 500,
              color: isUnread
                ? "rgba(255,255,255,0.88)"
                : "rgba(255,255,255,0.55)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {n.title}
          </span>
          {n.app !== undefined && (
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                fontSize: 10,
                fontWeight: 500,
                color: "rgba(255,255,255,0.35)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {n.app}
            </span>
          )}
        </div>

        {/* Body */}
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.5,
            marginBottom: 6,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {n.body}
        </p>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {n.created_at.toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
            {n.context !== undefined && (
              <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.15)" }}>
                · {capitalize(n.context)}
              </span>
            )}
          </span>
          {isUnread && (
            <button
              type="button"
              onClick={onMarkRead}
              style={{
                fontSize: 10,
                color: "#8b5cf6",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 5,
                transition: "color 100ms",
              }}
            >
              Marcar como lida
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SystemMenu — "···" dropdown no header da central
// ---------------------------------------------------------------------------

interface SystemMenuProps {
  dockHidden: boolean;
  onToggleDock: () => void;
  onOpenApps: () => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
}

function SystemMenu({
  dockHidden,
  onToggleDock,
  onOpenApps,
  onOpenSettings,
  onOpenSupport,
}: SystemMenuProps) {
  const [open, setOpen] = useState(false);

  const items = [
    {
      label: dockHidden ? "Mostrar Dock" : "Ocultar Dock",
      icon: dockHidden ? "▭" : "▬",
      onClick: () => {
        setOpen(false);
        onToggleDock();
      },
    },
    {
      label: "Todos os apps",
      icon: "⊞",
      onClick: () => {
        setOpen(false);
        onOpenApps();
      },
    },
    {
      label: "Configurações",
      icon: "⚙",
      onClick: () => {
        setOpen(false);
        onOpenSettings();
      },
    },
    {
      label: "Suporte",
      icon: "🛟",
      onClick: () => {
        setOpen(false);
        onOpenSupport();
      },
    },
  ];

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        title="Menu do sistema"
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: open
            ? "rgba(255,255,255,0.10)"
            : "rgba(255,255,255,0.05)",
          border: open
            ? "1px solid rgba(255,255,255,0.15)"
            : "1px solid rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          letterSpacing: "0.1em",
          transition: "background 120ms, border-color 120ms",
        }}
      >
        ···
      </button>

      {open && (
        <>
          {/* Click-away overlay — z acima do painel da central (201) */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 250 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 251,
              width: 196,
              borderRadius: 10,
              background: "rgba(14,16,26,0.98)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
              padding: 4,
              overflow: "hidden",
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 7,
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 100ms, color 100ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.14)";
                  e.currentTarget.style.color = "#c4b5fd";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255,255,255,0.72)";
                }}
              >
                <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotificationCenter
// ---------------------------------------------------------------------------

export interface NotificationCenterProps {
  open: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkRead: (ids: string[]) => void;
  onMarkAllRead: () => void;
  dockHidden: boolean;
  onToggleDock: () => void;
  onOpenApps: () => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
}

export function NotificationCenter({
  open,
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
  dockHidden,
  onToggleDock,
  onOpenApps,
  onOpenSettings,
  onOpenSupport,
}: NotificationCenterProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterApp, setFilterApp] = useState<string | null>(null);
  const [filterContext, setFilterContext] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const apps = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach((n) => {
      if (n.app !== undefined) set.add(n.app);
    });
    return [...set];
  }, [notifications]);

  const contexts = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach((n) => {
      if (n.context !== undefined) set.add(n.context);
    });
    return [...set];
  }, [notifications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (filterStatus === "unread" && n.read_at !== null) return false;
      if (filterType !== "all" && n.type !== filterType) return false;
      if (filterApp !== null && n.app !== filterApp) return false;
      if (filterContext !== null && n.context !== filterContext) return false;
      if (
        q &&
        !n.title.toLowerCase().includes(q) &&
        !n.body.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [
    notifications,
    filterStatus,
    filterType,
    filterApp,
    filterContext,
    search,
  ]);

  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    filtered.forEach((n) => {
      const label = getDateGroup(n.created_at);
      const bucket = map.get(label) ?? [];
      bucket.push(n);
      map.set(label, bucket);
    });
    return DATE_GROUP_ORDER.filter((l) => map.has(l)).map((l) => ({
      label: l,
      items: map.get(l)!,
    }));
  }, [filtered]);

  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="nc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />

          {/* Panel */}
          <motion.div
            key="nc-panel"
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              inset: 12,
              zIndex: 201,
              borderRadius: 16,
              background: "rgba(8,10,18,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <SystemMenu
                  dockHidden={dockHidden}
                  onToggleDock={onToggleDock}
                  onOpenApps={onOpenApps}
                  onOpenSettings={onOpenSettings}
                  onOpenSupport={onOpenSupport}
                />
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.92)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Central de Notificações
                </span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      padding: "1px 8px",
                      borderRadius: 999,
                      background: "rgba(139,92,246,0.18)",
                      border: "1px solid rgba(139,92,246,0.35)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#a78bfa",
                    }}
                  >
                    {unreadCount} não lida{unreadCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      background: "rgba(139,92,246,0.12)",
                      border: "1px solid rgba(139,92,246,0.25)",
                      color: "#c4b5fd",
                      cursor: "pointer",
                    }}
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.45)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Sidebar */}
              <div
                style={{
                  width: 210,
                  flexShrink: 0,
                  borderRight: "1px solid rgba(255,255,255,0.07)",
                  padding: "16px 12px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Search */}
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar notificações…"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "rgba(255,255,255,0.8)",
                    fontSize: 12,
                    outline: "none",
                    marginBottom: 4,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />

                <SidebarLabel>Status</SidebarLabel>
                <FilterPill
                  active={filterStatus === "all"}
                  onClick={() => setFilterStatus("all")}
                >
                  Todas
                </FilterPill>
                <FilterPill
                  active={filterStatus === "unread"}
                  onClick={() => setFilterStatus("unread")}
                >
                  Não lidas
                  {unreadCount > 0 && (
                    <span
                      style={{
                        marginLeft: "auto",
                        padding: "0 5px",
                        borderRadius: 999,
                        background: "rgba(139,92,246,0.25)",
                        fontSize: 10,
                        color: "#a78bfa",
                        fontWeight: 600,
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </FilterPill>

                <SidebarLabel>Tipo</SidebarLabel>
                <FilterPill
                  active={filterType === "all"}
                  onClick={() => setFilterType("all")}
                >
                  Todos os tipos
                </FilterPill>
                {(["success", "info", "warning", "error"] as FilterType[]).map(
                  (t) => {
                    if (t === "all") return null;
                    const cfg = TYPE_CONFIG[t];
                    return (
                      <FilterPill
                        key={t}
                        active={filterType === t}
                        dot={cfg.color}
                        onClick={() =>
                          setFilterType(filterType === t ? "all" : t)
                        }
                      >
                        {cfg.label}
                      </FilterPill>
                    );
                  },
                )}

                {apps.length > 0 && (
                  <>
                    <SidebarLabel>App</SidebarLabel>
                    <FilterPill
                      active={filterApp === null}
                      onClick={() => setFilterApp(null)}
                    >
                      Todos os apps
                    </FilterPill>
                    {apps.map((app) => (
                      <FilterPill
                        key={app}
                        active={filterApp === app}
                        onClick={() =>
                          setFilterApp(filterApp === app ? null : app)
                        }
                      >
                        {app}
                      </FilterPill>
                    ))}
                  </>
                )}

                {contexts.length > 0 && (
                  <>
                    <SidebarLabel>Contexto</SidebarLabel>
                    <FilterPill
                      active={filterContext === null}
                      onClick={() => setFilterContext(null)}
                    >
                      Todos
                    </FilterPill>
                    {contexts.map((ctx) => (
                      <FilterPill
                        key={ctx}
                        active={filterContext === ctx}
                        onClick={() =>
                          setFilterContext(filterContext === ctx ? null : ctx)
                        }
                      >
                        {capitalize(ctx)}
                      </FilterPill>
                    ))}
                  </>
                )}
              </div>

              {/* Main list */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                {groups.length === 0 && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      paddingTop: 80,
                    }}
                  >
                    <span style={{ fontSize: 36 }}>🔔</span>
                    <p
                      style={{
                        fontSize: 14,
                        color: "rgba(255,255,255,0.3)",
                      }}
                    >
                      Nenhuma notificação encontrada
                    </p>
                  </div>
                )}

                {groups.map((group) => (
                  <div key={group.label}>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.28)",
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      {group.label}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {group.items.map((n) => (
                        <NotificationCard
                          key={n.id}
                          notification={n}
                          onMarkRead={() => onMarkRead([n.id])}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
