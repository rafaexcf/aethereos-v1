import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { motion } from "framer-motion";
import {
  Bot,
  Bell,
  Settings,
  Sun,
  Moon,
  Building2,
  Lock,
  LogOut,
  Search,
  X,
  Check,
  ChevronRight,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useOSStore } from "../../stores/osStore";
import { useNotificationsStore } from "../../stores/notificationsStore";
import { useTheme } from "../../lib/theme/theme-provider";
import { useModalA11y } from "../shared/useModalA11y";
import { SEARCH_PROVIDERS } from "../../search/providers/index";
import type {
  SearchContext,
  SearchGroup,
  SearchResult,
} from "../../search/types";

type AnyIcon = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

function DynIcon({
  name,
  size = 14,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const Icon = (Icons as unknown as Record<string, AnyIcon>)[name];
  if (Icon === undefined)
    return <span style={{ fontSize: size * 0.75 }}>{name.slice(0, 1)}</span>;
  return <Icon size={size} {...(color !== undefined ? { color } : {})} />;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  color: string;
  active?: boolean;
  onClick: () => void;
}

interface CompanyEntry {
  id: string;
  name: string | null;
}

interface CommandCenterProps {
  open: boolean;
  onClose: () => void;
  email: string | null;
  companyName: string | null;
  initials: string;
  avatarUrl: string | null;
  onSignOut: () => void;
}

export function CommandCenter({
  open,
  onClose,
  email,
  companyName,
  initials,
  avatarUrl,
  onSignOut,
}: CommandCenterProps) {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const activeCompanyId = useSessionStore((s) => s.activeCompanyId);
  const companies = useSessionStore((s) => s.companies);
  const setActiveCompany = useSessionStore((s) => s.setActiveCompany);
  const lockSession = useSessionStore((s) => s.lock);

  const openApp = useOSStore((s) => s.openApp);
  const toggleAIModal = useOSStore((s) => s.toggleAIModal);

  const { theme, toggleTheme } = useTheme();

  const notifications = useNotificationsStore((s) => s.items);
  const unreadCount = useMemo(
    () => notifications.filter((n) => n.read_at === null).length,
    [notifications],
  );
  const recentNotifications = useMemo(
    () => notifications.slice(0, 3),
    [notifications],
  );

  const ref = useModalA11y<HTMLDivElement>({ open, onClose });

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current !== null && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose, ref]);

  const [companySheetOpen, setCompanySheetOpen] = useState(false);
  const [companyEntries, setCompanyEntries] = useState<CompanyEntry[]>([]);

  useEffect(() => {
    if (!open) {
      setCompanySheetOpen(false);
      return;
    }
    if (drivers === null || companies.length === 0) return;
    let cancelled = false;
    void Promise.all(
      companies.map(async (id) => {
        const name = await drivers.auth.getCompanyName(id);
        return { id, name };
      }),
    ).then((entries) => {
      if (!cancelled) setCompanyEntries(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [open, drivers, companies]);

  const handleSwitchCompany = useCallback(
    (companyId: string) => {
      if (companyId === activeCompanyId) {
        setCompanySheetOpen(false);
        return;
      }
      setActiveCompany(companyId);
      setCompanySheetOpen(false);
      onClose();
      setTimeout(() => window.location.reload(), 60);
    },
    [activeCompanyId, setActiveCompany, onClose],
  );

  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setGroups([]);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const searchCtx = useMemo<SearchContext>(
    () => ({
      drivers: drivers as SearchContext["drivers"],
      userId,
      companyId: activeCompanyId,
      openApp: (appId, title) => openApp(appId, title),
      closeSearch: onClose,
    }),
    [drivers, userId, activeCompanyId, openApp, onClose],
  );

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    if (query.trim().length === 0) {
      setGroups([]);
      setSearchLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      latestQueryRef.current = query;
      setSearchLoading(true);
      void Promise.all(
        SEARCH_PROVIDERS.map((p) =>
          p.search(query, searchCtx).then((r) => r.slice(0, p.maxResults)),
        ),
      )
        .then((all) => {
          if (latestQueryRef.current !== query) return;
          const built: SearchGroup[] = [];
          for (let i = 0; i < SEARCH_PROVIDERS.length; i += 1) {
            const provider = SEARCH_PROVIDERS[i];
            if (provider === undefined) continue;
            const results = all[i] ?? [];
            if (results.length === 0) continue;
            built.push({
              id: provider.id,
              label: provider.label,
              icon: provider.icon,
              results,
            });
          }
          setGroups(built);
        })
        .finally(() => {
          if (latestQueryRef.current === query) setSearchLoading(false);
        });
    }, 220);
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, [open, query, searchCtx]);

  const aiAccent = "#8b5cf6";
  const bellAccent = "#a78bfa";
  const settingsAccent = "#64748b";
  const themeAccent = "#f59e0b";
  const companyAccent = "#06b6d4";
  const lockAccent = "#3b82f6";
  const signOutAccent = "#ef4444";

  const quickActions: QuickAction[] = [
    {
      id: "ae-ai",
      label: "Copilot",
      icon: Bot,
      color: aiAccent,
      onClick: () => {
        toggleAIModal();
        onClose();
      },
    },
    {
      id: "notifications",
      label: "Notificações",
      icon: Bell,
      color: bellAccent,
      onClick: () => {
        openApp("notifications", "Notificações");
        onClose();
      },
    },
    {
      id: "settings",
      label: "Configurações",
      icon: Settings,
      color: settingsAccent,
      onClick: () => {
        openApp("settings", "Configurações");
        onClose();
      },
    },
    {
      id: "theme",
      label: theme === "dark" ? "Modo claro" : "Modo escuro",
      icon: theme === "dark" ? Sun : Moon,
      color: themeAccent,
      active: theme === "light",
      onClick: () => {
        toggleTheme();
      },
    },
    {
      id: "company",
      label: "Trocar empresa",
      icon: Building2,
      color: companyAccent,
      onClick: () => setCompanySheetOpen((v) => !v),
    },
    {
      id: "lock",
      label: "Bloquear",
      icon: Lock,
      color: lockAccent,
      onClick: () => {
        onClose();
        lockSession();
      },
    },
  ];

  if (!open) return null;

  const showCompanyOptions = companySheetOpen && companies.length > 1;
  const flatResults = groups.flatMap((g) => g.results);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label="Painel de controle"
      initial={{ opacity: 0, scale: 0.94, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -8 }}
      transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.65 }}
      className="fixed z-[91] flex flex-col"
      style={{
        top: 48,
        right: 12,
        width: 360,
        maxHeight: "82vh",
        transformOrigin: "top right",
        background: "rgba(17,22,28,0.92)",
        backdropFilter: "blur(28px) saturate(160%)",
        WebkitBackdropFilter: "blur(28px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        boxShadow:
          "0 28px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03) inset",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(30,41,80,0.95))",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {avatarUrl !== null ? (
            <img
              src={avatarUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {initials}
            </span>
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              margin: 0,
            }}
          >
            {email ?? "—"}
          </p>
          {companyName !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 2,
              }}
            >
              <Building2
                size={10}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  margin: 0,
                }}
              >
                {companyName}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel"
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
            color: "var(--text-tertiary)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X size={12} />
        </button>
      </div>

      <div
        style={{
          padding: "12px 14px 10px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Search size={14} style={{ color: "var(--text-tertiary)" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Pesquisar apps, notas, tarefas…"
            aria-label="Busca universal"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
          {searchLoading && (
            <div
              style={{
                width: 12,
                height: 12,
                border: "2px solid rgba(255,255,255,0.1)",
                borderTop: `2px solid ${aiAccent}`,
                borderRadius: "50%",
                animation: "ccSpin 0.7s linear infinite",
                flexShrink: 0,
              }}
            />
          )}
          {query.length > 0 && !searchLoading && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 14px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {query.trim().length > 0 ? (
          <SearchSection
            groups={groups}
            loading={searchLoading}
            query={query}
            totalResults={flatResults.length}
          />
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              {quickActions.map((action) => (
                <QuickTile key={action.id} action={action} />
              ))}
            </div>

            {showCompanyOptions && (
              <div
                style={{
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--text-tertiary)",
                    padding: "6px 8px 4px",
                    margin: 0,
                  }}
                >
                  Suas empresas
                </p>
                {(companyEntries.length === companies.length
                  ? companyEntries
                  : companies.map<CompanyEntry>((id) => ({
                      id,
                      name: id === activeCompanyId ? companyName : null,
                    }))
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSwitchCompany(c.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background:
                        c.id === activeCompanyId
                          ? "rgba(6,182,212,0.10)"
                          : "transparent",
                      border: "none",
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "background 100ms",
                    }}
                    onMouseEnter={(e) => {
                      if (c.id !== activeCompanyId)
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (c.id !== activeCompanyId)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Building2
                      size={13}
                      style={{
                        color:
                          c.id === activeCompanyId
                            ? companyAccent
                            : "var(--text-tertiary)",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name ?? c.id}
                    </span>
                    {c.id === activeCompanyId && (
                      <Check size={13} style={{ color: companyAccent }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {recentNotifications.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 4px",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "var(--text-tertiary)",
                      margin: 0,
                    }}
                  >
                    Atividade recente
                  </p>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: "rgba(139,92,246,0.18)",
                        color: bellAccent,
                        fontWeight: 600,
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}
                >
                  {recentNotifications.map((n, idx) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        openApp("notifications", "Notificações");
                        onClose();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "10px 12px",
                        background: "transparent",
                        border: "none",
                        borderTop:
                          idx === 0
                            ? "none"
                            : "1px solid rgba(255,255,255,0.05)",
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "background 100ms",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          marginTop: 5,
                          flexShrink: 0,
                          background:
                            n.type === "success"
                              ? "#22c55e"
                              : n.type === "warning"
                                ? "#fbbf24"
                                : n.type === "error"
                                  ? "#f87171"
                                  : "#60a5fa",
                          boxShadow:
                            n.read_at === null
                              ? "0 0 6px currentColor"
                              : "none",
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: n.read_at === null ? 600 : 500,
                            color: "var(--text-secondary)",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {n.title}
                        </p>
                        <p
                          style={{
                            fontSize: 10,
                            color: "var(--text-tertiary)",
                            margin: "2px 0 0",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {n.body}
                        </p>
                      </div>
                      <ChevronRight
                        size={11}
                        style={{
                          color: "var(--text-tertiary)",
                          marginTop: 4,
                          flexShrink: 0,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div
        style={{
          padding: "10px 14px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            height: 36,
            borderRadius: 10,
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.18)",
            color: signOutAccent,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 100ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.18)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.10)";
          }}
        >
          <LogOut size={13} strokeWidth={1.6} />
          Sair
        </button>
      </div>

      <style>{`
        @keyframes ccSpin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

function QuickTile({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  const baseBg =
    action.active === true ? `${action.color}26` : `${action.color}14`;
  const hoverBg = `${action.color}22`;
  const baseBorder =
    action.active === true ? `${action.color}55` : `${action.color}26`;

  return (
    <button
      type="button"
      onClick={action.onClick}
      aria-label={action.label}
      aria-pressed={action.active === true}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 80,
        borderRadius: 14,
        background: baseBg,
        border: `1px solid ${baseBorder}`,
        cursor: "pointer",
        transition: "background 100ms, border-color 100ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverBg;
        e.currentTarget.style.borderColor = `${action.color}3d`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = baseBg;
        e.currentTarget.style.borderColor = baseBorder;
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: `${action.color}24`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color={action.color} strokeWidth={1.7} />
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: "var(--text-secondary)",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {action.label}
      </span>
    </button>
  );
}

function SearchSection({
  groups,
  loading,
  query,
  totalResults,
}: {
  groups: SearchGroup[];
  loading: boolean;
  query: string;
  totalResults: number;
}) {
  if (totalResults === 0) {
    return (
      <div
        style={{
          padding: "24px 12px",
          textAlign: "center",
          color: "var(--text-tertiary)",
        }}
      >
        {loading ? (
          <p style={{ fontSize: 12 }}>Buscando…</p>
        ) : (
          <>
            <p style={{ fontSize: 12, margin: 0 }}>
              Nenhum resultado para{" "}
              <strong style={{ color: "var(--text-secondary)" }}>
                &ldquo;{query}&rdquo;
              </strong>
            </p>
            <p
              style={{
                fontSize: 10,
                marginTop: 4,
                color: "var(--text-tertiary)",
              }}
            >
              Tente outra palavra-chave
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {groups.map((group) => (
        <div key={group.id}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 4px 4px",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--text-tertiary)",
            }}
          >
            <DynIcon name={group.icon} size={10} />
            {group.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {group.results.map((r) => (
              <ResultRow key={r.id} result={r} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultRow({ result }: { result: SearchResult }) {
  return (
    <button
      type="button"
      onClick={() => result.action()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 8px",
        borderRadius: 8,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "background 100ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: `${result.iconColor ?? "#64748b"}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <DynIcon
          name={result.icon}
          size={13}
          color={result.iconColor ?? "#64748b"}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {result.title}
        </p>
        {result.subtitle !== undefined && (
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {result.subtitle}
          </p>
        )}
      </div>
      {result.badge !== undefined && (
        <span
          style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 8,
            background: `${result.badgeColor ?? "#64748b"}25`,
            color: result.badgeColor ?? "#64748b",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {result.badge}
        </span>
      )}
    </button>
  );
}
