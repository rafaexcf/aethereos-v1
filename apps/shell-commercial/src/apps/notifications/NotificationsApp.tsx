import { useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Search,
  Circle,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Monitor,
  ShoppingCart,
  Users,
  HardDrive,
  Workflow,
  DollarSign,
  Bot,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useNotificationsStore } from "../../stores/notificationsStore";
import type { NotificationItem } from "../../components/NotificationBell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterStatus = "all" | "unread";
type FilterType = "all" | NotificationItem["type"];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_W = 239;
const SIDEBAR_ICON_W = 48;

const DATE_GROUP_ORDER = ["Hoje", "Ontem", "Esta semana", "Anteriores"];

const TYPE_CONFIG: Record<
  NotificationItem["type"],
  { color: string; label: string; Icon: React.FC<{ size?: number }> }
> = {
  success: { color: "#22c55e", label: "Sucesso", Icon: CheckCircle },
  info: { color: "#60a5fa", label: "Info", Icon: Info },
  warning: { color: "#fbbf24", label: "Aviso", Icon: AlertTriangle },
  error: { color: "#f87171", label: "Erro", Icon: XCircle },
};

const APP_ICON: Record<string, React.FC<{ size?: number }>> = {
  Sistema: Monitor,
  Comércio: ShoppingCart,
  RH: Users,
  Drive: HardDrive,
  Integrações: Workflow,
  Financeiro: DollarSign,
  Copilot: Bot,
};

const ASIDE_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  background: "rgba(15,21,27,0.82)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
  scrollbarWidth: "none",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// SidebarNavItem — OS open-notch pattern (padrão Configurações)
// ---------------------------------------------------------------------------

interface SidebarNavItemProps {
  active: boolean;
  onClick: () => void;
  dot?: string | undefined;
  icon?: React.ReactNode;
  label: string;
  badge?: number | undefined;
}

function SidebarNavItem({
  active,
  onClick,
  dot,
  icon,
  label,
  badge,
}: SidebarNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "6px 8px",
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
        transition:
          "background 120ms ease, color 120ms ease, border-color 120ms ease, margin 120ms ease",
        marginBottom: 2,
        ...(active
          ? {
              borderRadius: "8px 0 0 8px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              borderRight: "1px solid transparent",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              fontWeight: 500,
              marginRight: 0,
            }
          : {
              borderRadius: 8,
              border: "1px solid transparent",
              background: "transparent",
              color: "var(--text-secondary)",
              fontWeight: 400,
              marginRight: 8,
            }),
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.color = "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }
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
      {icon !== undefined && (
        <span style={{ flexShrink: 0, color: "currentColor" }}>{icon}</span>
      )}
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            padding: "1px 6px",
            borderRadius: 999,
            background: "rgba(139,92,246,0.22)",
            fontSize: 10,
            fontWeight: 600,
            color: "#a78bfa",
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// NotificationCard
// ---------------------------------------------------------------------------

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
  const AppIcon = n.app !== undefined ? (APP_ICON[n.app] ?? Bell) : Bell;

  return (
    <div
      style={{
        borderRadius: 10,
        padding: "12px 14px",
        background: isUnread ? "rgba(255,255,255,0.035)" : "transparent",
        border: isUnread
          ? "1px solid rgba(255,255,255,0.07)"
          : "1px solid rgba(255,255,255,0.03)",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        transition: "background 150ms",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${cfg.color}18`,
          border: `1px solid ${cfg.color}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <cfg.Icon size={15} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
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
                : "rgba(255,255,255,0.5)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {n.title}
          </span>
          {isUnread && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: cfg.color,
                flexShrink: 0,
                boxShadow: `0 0 6px ${cfg.color}88`,
              }}
            />
          )}
        </div>

        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.38)",
            lineHeight: 1.5,
            marginBottom: 7,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {n.body}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {n.app !== undefined && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.05)",
                  fontSize: 10,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                <AppIcon size={10} />
                {n.app}
              </span>
            )}
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
                <span
                  style={{ marginLeft: 8, color: "rgba(255,255,255,0.12)" }}
                >
                  · {capitalize(n.context)}
                </span>
              )}
            </span>
          </div>
          {isUnread && (
            <button
              type="button"
              onClick={onMarkRead}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                color: "rgba(139,92,246,0.7)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 5,
                transition: "color 100ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#a78bfa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(139,92,246,0.7)";
              }}
            >
              <CheckCircle2 size={11} />
              Marcar como lida
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingBottom: 80,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Bell size={24} style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
      <p
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.28)",
          textAlign: "center",
        }}
      >
        {hasFilters
          ? "Nenhuma notificação com esses filtros"
          : "Tudo em dia — nenhuma notificação"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotificationsApp
// ---------------------------------------------------------------------------

export function NotificationsApp() {
  const { items, markRead, markAllRead } = useNotificationsStore();

  const [collapsed, setCollapsed] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterApp, setFilterApp] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const unreadCount = useMemo(
    () => items.filter((n) => n.read_at === null).length,
    [items],
  );

  const apps = useMemo(() => {
    const set = new Set<string>();
    items.forEach((n) => {
      if (n.app !== undefined) set.add(n.app);
    });
    return [...set].sort();
  }, [items]);

  const appUnreadCounts = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((n) => {
      if (n.read_at === null && n.app !== undefined) {
        map[n.app] = (map[n.app] ?? 0) + 1;
      }
    });
    return map;
  }, [items]);

  const typeUnreadCounts = useMemo(() => {
    const map: Partial<Record<NotificationItem["type"], number>> = {};
    items.forEach((n) => {
      if (n.read_at === null) {
        map[n.type] = (map[n.type] ?? 0) + 1;
      }
    });
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((n) => {
      if (filterStatus === "unread" && n.read_at !== null) return false;
      if (filterType !== "all" && n.type !== filterType) return false;
      if (filterApp !== null && n.app !== filterApp) return false;
      if (
        q &&
        !n.title.toLowerCase().includes(q) &&
        !n.body.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [items, filterStatus, filterType, filterApp, search]);

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
      items: map.get(l) ?? [],
    }));
  }, [filtered]);

  const hasActiveFilters =
    filterStatus !== "all" ||
    filterType !== "all" ||
    filterApp !== null ||
    search.trim() !== "";

  const navSections = [
    {
      label: "Status",
      items: (
        <>
          <SidebarNavItem
            active={filterStatus === "all"}
            onClick={() => setFilterStatus("all")}
            icon={<Circle size={13} />}
            label="Todas"
          />
          <SidebarNavItem
            active={filterStatus === "unread"}
            onClick={() => setFilterStatus("unread")}
            icon={<Bell size={13} />}
            label="Não lidas"
            badge={unreadCount > 0 ? unreadCount : undefined}
          />
        </>
      ),
    },
    {
      label: "Tipo",
      items: (
        <>
          <SidebarNavItem
            active={filterType === "all"}
            onClick={() => setFilterType("all")}
            icon={<Circle size={13} />}
            label="Todos"
          />
          {(
            [
              "success",
              "info",
              "warning",
              "error",
            ] as NotificationItem["type"][]
          ).map((t) => {
            const cfg = TYPE_CONFIG[t];
            return (
              <SidebarNavItem
                key={t}
                active={filterType === t}
                onClick={() => setFilterType(filterType === t ? "all" : t)}
                dot={cfg.color}
                label={cfg.label}
                badge={typeUnreadCounts[t]}
              />
            );
          })}
        </>
      ),
    },
    ...(apps.length > 0
      ? [
          {
            label: "App",
            items: (
              <>
                <SidebarNavItem
                  active={filterApp === null}
                  onClick={() => setFilterApp(null)}
                  icon={<Circle size={13} />}
                  label="Todos os apps"
                />
                {apps.map((app) => {
                  const Icon = APP_ICON[app] ?? Bell;
                  return (
                    <SidebarNavItem
                      key={app}
                      active={filterApp === app}
                      onClick={() =>
                        setFilterApp(filterApp === app ? null : app)
                      }
                      icon={<Icon size={13} />}
                      label={app}
                      badge={appUnreadCounts[app]}
                    />
                  );
                })}
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "var(--bg-elevated)",
        position: "relative",
      }}
    >
      {/* Animated sidebar wrapper */}
      <div
        style={{
          width: collapsed ? SIDEBAR_ICON_W : SIDEBAR_W,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 250ms ease",
        }}
      >
        {collapsed ? (
          /* ── Collapsed sidebar ── */
          <aside style={ASIDE_STYLE}>
            <nav
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "12px 0",
                gap: 2,
                flex: 1,
              }}
            >
              {/* Bell icon — resets all filters */}
              <button
                type="button"
                title="Notificações"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterType("all");
                  setFilterApp(null);
                  setSearch("");
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid transparent",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "background 120ms ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <Bell
                  size={16}
                  strokeWidth={1.8}
                  style={{ color: "currentColor", flexShrink: 0 }}
                />
              </button>

              {/* Status items */}
              {[
                {
                  icon: Circle,
                  active: filterStatus === "all",
                  onClick: () => setFilterStatus("all"),
                  title: "Todas",
                },
                {
                  icon: Bell,
                  active: filterStatus === "unread",
                  onClick: () => setFilterStatus("unread"),
                  title: "Não lidas",
                },
              ].map(({ icon: Icon, active, onClick, title }) => (
                <button
                  key={title}
                  type="button"
                  title={title}
                  onClick={onClick}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: active
                      ? "1px solid rgba(255,255,255,0.08)"
                      : "1px solid transparent",
                    background: active
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                    color: active
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "background 120ms ease",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <Icon
                    size={16}
                    strokeWidth={1.8}
                    style={{ color: "currentColor", flexShrink: 0 }}
                  />
                </button>
              ))}
            </nav>
          </aside>
        ) : (
          /* ── Expanded sidebar ── */
          <aside style={ASIDE_STYLE}>
            {/* App identity header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "16px 14px 12px",
              }}
            >
              <Bell
                size={18}
                style={{ color: "var(--text-primary)", flexShrink: 0 }}
                strokeWidth={1.6}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  fontFamily: "var(--font-display)",
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Notificações
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: "rgba(139,92,246,0.22)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#a78bfa",
                    flexShrink: 0,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>

            {/* Search */}
            <div style={{ padding: "10px 10px 4px" }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 9,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-tertiary)",
                    pointerEvents: "none",
                  }}
                  strokeWidth={1.8}
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar…"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    padding: "6px 10px 6px 28px",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    outline: "none",
                    transition: "border-color 120ms ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(99,102,241,0.50)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.08)";
                  }}
                />
              </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: "4px 0 16px 8px" }}>
              {navSections.map((section, idx) => (
                <div
                  key={section.label}
                  style={{ marginTop: idx === 0 ? 4 : 8 }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      padding: "10px 8px 4px",
                    }}
                  >
                    {section.label}
                  </p>
                  {section.items}
                </div>
              ))}
            </nav>
          </aside>
        )}
      </div>

      {/* Collapse / expand toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        style={{
          position: "absolute",
          left: (collapsed ? SIDEBAR_ICON_W : SIDEBAR_W) - 14,
          top: "50%",
          transform: "translateY(-50%)",
          transition: "left 250ms ease",
          zIndex: 10,
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(15,21,27,0.95)",
          border: "1px solid rgba(255,255,255,0.10)",
          cursor: "pointer",
          color: "var(--text-tertiary)",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(40,55,80,0.95)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)";
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(15,21,27,0.95)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--text-tertiary)";
        }}
      >
        {collapsed ? (
          <PanelLeftOpen size={16} strokeWidth={1.8} />
        ) : (
          <PanelLeftClose size={16} strokeWidth={1.8} />
        )}
      </button>

      {/* ── Main content ── */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 28px 160px",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {/* Action bar */}
          {unreadCount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 20,
              }}
            >
              <button
                type="button"
                onClick={markAllRead}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  transition: "background 120ms, color 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.12)";
                  e.currentTarget.style.color = "#c4b5fd";
                  e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
                }}
              >
                <CheckCheck size={13} />
                Marcar todas como lidas
              </button>
            </div>
          )}

          {/* Notification groups */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {groups.length === 0 ? (
              <EmptyState hasFilters={hasActiveFilters} />
            ) : (
              groups.map((group) => (
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
                    <span
                      style={{
                        marginLeft: 8,
                        fontWeight: 400,
                        color: "rgba(255,255,255,0.15)",
                        fontSize: 10,
                        letterSpacing: 0,
                        textTransform: "none",
                      }}
                    >
                      {group.items.length} item
                      {group.items.length !== 1 ? "s" : ""}
                    </span>
                  </p>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {group.items.map((n) => (
                      <NotificationCard
                        key={n.id}
                        notification={n}
                        onMarkRead={() => markRead([n.id])}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
