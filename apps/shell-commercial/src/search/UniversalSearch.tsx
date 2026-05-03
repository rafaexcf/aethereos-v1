import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import * as Icons from "lucide-react";
import { useDrivers } from "../lib/drivers-context";
import { useSessionStore } from "../stores/session";
import { useOSStore } from "../stores/osStore";
import { SEARCH_PROVIDERS } from "./providers/index";
import type { SearchResult, SearchGroup, SearchContext } from "./types";

// ─── Dynamic icon ─────────────────────────────────────────────────────────────

type AnyIcon = React.ComponentType<{ size?: number; color?: string }>;

function DynIcon({
  name,
  size = 16,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const Icon = (Icons as unknown as Record<string, AnyIcon>)[name];
  if (!Icon)
    return <span style={{ fontSize: size * 0.75 }}>{name.slice(0, 1)}</span>;
  return <Icon size={size} {...(color !== undefined ? { color } : {})} />;
}

// ─── Type labels ──────────────────────────────────────────────────────────────

const TYPE_GROUP: Record<string, { label: string; icon: string }> = {
  action: { label: "Ações rápidas", icon: "Zap" },
  app: { label: "Aplicativos", icon: "LayoutGrid" },
  note: { label: "Notas", icon: "StickyNote" },
  task: { label: "Tarefas", icon: "ListChecks" },
  contact: { label: "Contatos", icon: "BookUser" },
  file: { label: "Arquivos", icon: "HardDrive" },
  poll: { label: "Enquetes", icon: "Vote" },
  kanban: { label: "Kanban", icon: "Kanban" },
};

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({
  result,
  isSelected,
  onSelect,
  onHover,
}: {
  result: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <div
      onMouseEnter={onHover}
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 14px",
        cursor: "pointer",
        background: isSelected ? "rgba(99,102,241,0.15)" : "transparent",
        borderRadius: 6,
        margin: "1px 4px",
        transition: "background 0.1s",
        borderLeft: isSelected ? "2px solid #6366f1" : "2px solid transparent",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: (result.iconColor ?? "#64748b") + "20",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <DynIcon
          name={result.icon}
          size={14}
          color={result.iconColor ?? "#64748b"}
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: isSelected ? 500 : 400,
            color: "var(--text-primary, #e2e8f0)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {result.title}
        </p>
        {result.subtitle && (
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary, #64748b)",
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

      {/* Badge */}
      {result.badge && (
        <span
          style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 8,
            background: (result.badgeColor ?? "#64748b") + "25",
            color: result.badgeColor ?? "#64748b",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {result.badge}
        </span>
      )}

      {/* Enter hint */}
      {isSelected && (
        <span
          style={{
            fontSize: 10,
            color: "var(--text-tertiary, #64748b)",
            flexShrink: 0,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 3,
            padding: "1px 5px",
          }}
        >
          ↵
        </span>
      )}
    </div>
  );
}

// ─── Group header ─────────────────────────────────────────────────────────────

function GroupHeader({ label, icon }: { label: string; icon: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 18px 3px",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "var(--text-tertiary, #64748b)",
      }}
    >
      <DynIcon name={icon} size={10} />
      {label}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface UniversalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function UniversalSearch({ open, onClose }: UniversalSearchProps) {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();
  const { openApp } = useOSStore();

  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef("");

  // Flat list for keyboard navigation
  const flatResults = useMemo(() => groups.flatMap((g) => g.results), [groups]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setGroups([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build search context
  const ctx = useMemo<SearchContext>(
    () => ({
      drivers: drivers as SearchContext["drivers"],
      userId,
      companyId,
      openApp: (appId: string, title: string) => openApp(appId, title),
      closeSearch: onClose,
    }),
    [drivers, userId, companyId, openApp, onClose],
  );

  // Run search with debounce
  const runSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        latestQueryRef.current = q;
        setLoading(true);
        setError(false);
        try {
          const allResults = await Promise.all(
            SEARCH_PROVIDERS.map((p) =>
              p.search(q, ctx).then((r) => r.slice(0, p.maxResults)),
            ),
          );

          // Guard against stale responses
          if (latestQueryRef.current !== q) return;

          const builtGroups: SearchGroup[] = [];
          for (let i = 0; i < SEARCH_PROVIDERS.length; i++) {
            const provider = SEARCH_PROVIDERS[i];
            if (!provider) continue;
            const results = allResults[i] ?? [];
            if (results.length === 0) continue;
            const firstResult = results[0];
            if (!firstResult) continue;
            const typeInfo = TYPE_GROUP[firstResult.type] ?? {
              label: provider.label,
              icon: provider.icon,
            };
            builtGroups.push({
              id: provider.id,
              label: typeInfo.label,
              icon: typeInfo.icon,
              results,
            });
          }

          setGroups(builtGroups);
          setSelectedIndex(0);
        } catch {
          if (latestQueryRef.current !== q) return;
          setError(true);
        } finally {
          if (latestQueryRef.current === q) setLoading(false);
        }
      }, 250);
    },
    [ctx],
  );

  useEffect(() => {
    if (open) runSearch(query);
  }, [open, query, runSearch]);

  // Global keyboard navigation
  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = flatResults[selectedIndex];
        if (selected) selected.action();
        return;
      }
    }

    window.addEventListener("keydown", handleKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKey, { capture: true });
  }, [open, flatResults, selectedIndex, onClose]);

  if (!open) return null;

  const totalResults = flatResults.length;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          background: "#13181e",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "72vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          <DynIcon
            name="Search"
            size={18}
            color="var(--text-tertiary, #64748b)"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Pesquisar apps, notas, tarefas, contatos…"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary, #e2e8f0)",
              fontSize: 16,
              lineHeight: 1.4,
            }}
          />
          {loading && (
            <div
              style={{
                width: 16,
                height: 16,
                border: "2px solid rgba(255,255,255,0.1)",
                borderTop: "2px solid #6366f1",
                borderRadius: "50%",
                animation: "searchSpin 0.7s linear infinite",
                flexShrink: 0,
              }}
            />
          )}
          {query && !loading && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary, #64748b)",
                padding: 2,
                flexShrink: 0,
              }}
            >
              <DynIcon name="X" size={14} />
            </button>
          )}
          <kbd
            style={{
              fontSize: 10,
              padding: "2px 6px",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 4,
              color: "var(--text-tertiary, #64748b)",
              background: "rgba(255,255,255,0.04)",
              flexShrink: 0,
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0 8px" }}>
          {error ? (
            <div
              style={{
                padding: "24px 18px",
                textAlign: "center",
                color: "var(--text-tertiary, #64748b)",
                fontSize: 13,
              }}
            >
              <DynIcon name="AlertCircle" size={24} color="#ef4444" />
              <p style={{ marginTop: 8 }}>Erro ao buscar. Tente novamente.</p>
            </div>
          ) : totalResults === 0 && !loading ? (
            <EmptyState query={query} />
          ) : (
            (() => {
              let globalIdx = 0;
              return groups.map((group) => (
                <div key={group.id}>
                  <GroupHeader label={group.label} icon={group.icon} />
                  {group.results.map((result) => {
                    const idx = globalIdx++;
                    return (
                      <ResultRow
                        key={result.id}
                        result={result}
                        isSelected={idx === selectedIndex}
                        onSelect={() => result.action()}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    );
                  })}
                </div>
              ));
            })()
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "8px 16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: 10,
            color: "var(--text-tertiary, #64748b)",
            flexShrink: 0,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 3,
                padding: "1px 4px",
                fontSize: 10,
              }}
            >
              ↑↓
            </kbd>
            Navegar
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 3,
                padding: "1px 4px",
                fontSize: 10,
              }}
            >
              ↵
            </kbd>
            Abrir
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 3,
                padding: "1px 4px",
                fontSize: 10,
              }}
            >
              Esc
            </kbd>
            Fechar
          </span>
          {totalResults > 0 && (
            <span style={{ marginLeft: "auto" }}>
              {totalResults} resultado{totalResults !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes searchSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>,
    document.body,
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  if (!query) {
    return (
      <div style={{ padding: "20px 18px 12px" }}>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary, #64748b)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Ações rápidas
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            { label: "Nova nota", icon: "StickyNote", color: "#f59e0b" },
            { label: "Nova tarefa", icon: "ListChecks", color: "#3b82f6" },
            { label: "Calculadora", icon: "Calculator", color: "#f97316" },
            { label: "Relógio", icon: "Clock", color: "#6366f1" },
          ].map((a) => (
            <div
              key={a.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                color: "var(--text-secondary, #94a3b8)",
                fontSize: 12,
              }}
            >
              <DynIcon name={a.icon} size={12} color={a.color} />
              {a.label}
            </div>
          ))}
        </div>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-tertiary, #64748b)",
            marginTop: 16,
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          Comece a digitar para pesquisar…
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "32px 18px",
        textAlign: "center",
        color: "var(--text-tertiary, #64748b)",
      }}
    >
      <DynIcon name="SearchX" size={32} color="rgba(255,255,255,0.1)" />
      <p style={{ fontSize: 13, marginTop: 10 }}>
        Nenhum resultado para{" "}
        <strong style={{ color: "var(--text-secondary, #94a3b8)" }}>
          "{query}"
        </strong>
      </p>
      <p style={{ fontSize: 11, marginTop: 4 }}>
        Tente outra palavra ou use uma ação rápida acima
      </p>
    </div>
  );
}
