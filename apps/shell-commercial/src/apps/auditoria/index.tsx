import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@aethereos/ui-shell";
import { EmptyState } from "../../components/shared/EmptyState";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";

type Tab = "eventos" | "audit" | "trust";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "eventos", label: "Eventos SCP", icon: "📡" },
  { id: "audit", label: "Audit Log", icon: "📋" },
  { id: "trust", label: "Trust Center", icon: "🔐" },
];

type ActorType = "human" | "agent" | "system";

interface ActorInfo {
  type: ActorType;
  id: string;
  serviceName?: string;
}

interface EnvelopeActor {
  type?: string;
  user_id?: string;
  agent_id?: string;
  supervising_user_id?: string;
  service_name?: string;
}

interface Envelope {
  id?: string;
  type?: string;
  tenant_id?: string;
  actor?: EnvelopeActor;
  correlation_id?: string;
  causation_id?: string;
  payload?: Record<string, unknown>;
  occurred_at?: string;
  signature?: string;
  parent_hash?: string;
}

interface OutboxRow {
  id: number;
  company_id: string;
  event_type: string;
  event_id: string;
  payload: Record<string, unknown>;
  envelope: Envelope;
  status: "pending" | "published" | "failed";
  attempts: number;
  last_error: string | null;
  created_at: string;
  published_at: string | null;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
}

interface AuditEntry {
  id: number;
  company_id: string;
  actor_id: string;
  actor_type: ActorType;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

const PAGE_SIZE = 100;

function extractActor(env: Envelope): ActorInfo {
  const a = env.actor;
  if (a === undefined) {
    return { type: "system", id: "unknown" };
  }
  const t = a.type;
  if (t === "agent") {
    return { type: "agent", id: a.agent_id ?? "unknown" };
  }
  if (t === "system") {
    return {
      type: "system",
      id: a.service_name ?? "system",
      serviceName: a.service_name ?? "",
    };
  }
  return { type: "human", id: a.user_id ?? "unknown" };
}

function eventDomain(eventType: string): string {
  const idx = eventType.indexOf(".");
  return idx === -1 ? eventType : eventType.slice(0, idx);
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s atrás`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function absoluteTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function actorLabel(info: ActorInfo, users: Map<string, UserRow>): string {
  if (info.type === "human") {
    const u = users.get(info.id);
    return u?.display_name ?? u?.email ?? info.id.slice(0, 8);
  }
  if (info.type === "agent") {
    return `agent ${info.id.slice(0, 8)}`;
  }
  return info.serviceName ?? info.id;
}

function ActorBadge({ type }: { type: ActorType }) {
  const cfg: Record<ActorType, { bg: string; fg: string; label: string }> = {
    human: {
      bg: "rgba(255,255,255,0.06)",
      fg: "var(--text-secondary)",
      label: "human",
    },
    agent: {
      bg: "rgba(168,85,247,0.18)",
      fg: "#d8b4fe",
      label: "agent",
    },
    system: {
      bg: "rgba(59,130,246,0.18)",
      fg: "#93c5fd",
      label: "system",
    },
  };
  const c = cfg[type];
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        flexShrink: 0,
      }}
    >
      {c.label}
    </span>
  );
}

function StatusPill({ status }: { status: OutboxRow["status"] }) {
  const cfg: Record<OutboxRow["status"], { bg: string; fg: string }> = {
    published: { bg: "rgba(34,197,94,0.15)", fg: "#86efac" },
    pending: { bg: "rgba(234,179,8,0.15)", fg: "#fde047" },
    failed: { bg: "rgba(239,68,68,0.15)", fg: "#fca5a5" },
  };
  const c = cfg[status];
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
      }}
    >
      {status}
    </span>
  );
}

function TabEventosSCP({
  events,
  users,
  loading,
  hasMore,
  onLoadMore,
  loadingMore,
  filterActor,
  onFilterActor,
  filterDomain,
  onFilterDomain,
  domains,
  selectedId,
  onSelect,
}: {
  events: OutboxRow[];
  users: Map<string, UserRow>;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  filterActor: ActorType | "all";
  onFilterActor: (f: ActorType | "all") => void;
  filterDomain: string;
  onFilterDomain: (d: string) => void;
  domains: string[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const filtered = useMemo(() => {
    return events.filter((e) => {
      const info = extractActor(e.envelope);
      if (filterActor !== "all" && info.type !== filterActor) return false;
      if (
        filterDomain !== "all" &&
        eventDomain(e.event_type) !== filterDomain
      ) {
        return false;
      }
      return true;
    });
  }, [events, filterActor, filterDomain]);

  const selected =
    selectedId !== null
      ? (events.find((e) => e.id === selectedId) ?? null)
      : null;

  if (loading) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: "var(--text-tertiary)" }}>
        Carregando eventos…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={{ padding: "32px 16px" }}>
        <EmptyState
          icon="Radio"
          title="Sem eventos SCP"
          description="Eventos do barramento SCP aparecem aqui em ordem cronológica reversa. Append-only (P11)."
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          flex: selected !== null ? "0 0 480px" : 1,
          overflowY: "auto",
          borderRight:
            selected !== null ? "1px solid rgba(255,255,255,0.08)" : "none",
          padding: "16px 16px 160px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Eventos SCP — append-only (P11)
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              aria-label="Filtrar por domínio"
              value={filterDomain}
              onChange={(e) => onFilterDomain(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "var(--text-secondary)",
                fontSize: 11,
                borderRadius: 6,
                padding: "3px 6px",
                outline: "none",
              }}
            >
              <option value="all">todos domínios</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}.*
                </option>
              ))}
            </select>
            {(["all", "human", "agent", "system"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFilterActor(f)}
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 6,
                  background:
                    filterActor === f ? "rgba(168,85,247,0.18)" : "transparent",
                  color: filterActor === f ? "#d8b4fe" : "var(--text-tertiary)",
                  border: "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                {f === "all" ? "todos" : f}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {filtered.map((evt, idx) => {
            const info = extractActor(evt.envelope);
            const isSelected = selected?.id === evt.id;
            return (
              <button
                key={evt.id}
                type="button"
                onClick={() => onSelect(isSelected ? null : evt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: isSelected
                    ? "rgba(168,85,247,0.10)"
                    : "transparent",
                  border: "none",
                  borderTop:
                    idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  width: "100%",
                }}
              >
                <ActorBadge type={info.type} />
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: "ui-monospace, monospace",
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {evt.event_type}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {actorLabel(info, users)} · {relativeTime(evt.created_at)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <StatusPill status={evt.status} />
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div
              style={{
                padding: "20px 14px",
                fontSize: 12,
                color: "var(--text-tertiary)",
                textAlign: "center",
              }}
            >
              Nenhum evento corresponde aos filtros.
            </div>
          )}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            style={{
              alignSelf: "center",
              marginTop: 4,
              fontSize: 12,
              padding: "6px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              color: "var(--text-secondary)",
              cursor: loadingMore ? "default" : "pointer",
              opacity: loadingMore ? 0.6 : 1,
            }}
          >
            {loadingMore ? "Carregando…" : "Carregar mais"}
          </button>
        )}
      </div>

      {selected !== null && (
        <EventDetail
          event={selected}
          users={users}
          onClose={() => onSelect(null)}
        />
      )}
    </div>
  );
}

function EventDetail({
  event,
  users,
  onClose,
}: {
  event: OutboxRow;
  users: Map<string, UserRow>;
  onClose: () => void;
}) {
  const info = extractActor(event.envelope);
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 20px 160px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "ui-monospace, monospace",
              color: "var(--text-primary)",
            }}
          >
            {event.event_type}
          </span>
          <span
            style={{
              fontSize: 10,
              fontFamily: "ui-monospace, monospace",
              color: "var(--text-tertiary)",
            }}
          >
            id #{event.id} · {event.event_id}
          </span>
        </div>
        <button
          type="button"
          aria-label="Fechar detalhes"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "var(--text-secondary)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Fechar
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <DetailField label="Status" value={event.status} />
        <DetailField label="Tentativas" value={String(event.attempts)} />
        <DetailField label="Criado" value={absoluteTime(event.created_at)} />
        <DetailField
          label="Publicado"
          value={
            event.published_at !== null ? absoluteTime(event.published_at) : "—"
          }
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Actor
        </span>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ActorBadge type={info.type} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {actorLabel(info, users)}
            </span>
            <span
              style={{
                fontSize: 10,
                fontFamily: "ui-monospace, monospace",
                color: "var(--text-tertiary)",
              }}
            >
              {info.id}
            </span>
          </div>
        </div>
      </div>

      {event.last_error !== null && (
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#fca5a5",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 4,
            }}
          >
            Último erro
          </div>
          <div style={{ fontSize: 12, color: "#fecaca" }}>
            {event.last_error}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Payload
        </span>
        <pre
          style={{
            margin: 0,
            background: "rgba(0,0,0,0.30)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: 12,
            fontSize: 11,
            fontFamily: "ui-monospace, monospace",
            color: "var(--text-secondary)",
            overflow: "auto",
            maxHeight: 240,
            lineHeight: 1.5,
          }}
        >
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Envelope completo
        </span>
        <pre
          style={{
            margin: 0,
            background: "rgba(0,0,0,0.30)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: 12,
            fontSize: 11,
            fontFamily: "ui-monospace, monospace",
            color: "var(--text-secondary)",
            overflow: "auto",
            maxHeight: 320,
            lineHeight: 1.5,
          }}
        >
          {JSON.stringify(event.envelope, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          fontFamily: "ui-monospace, monospace",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TabAuditLog({
  audit,
  users,
  loading,
}: {
  audit: AuditEntry[];
  users: Map<string, UserRow>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: "var(--text-tertiary)" }}>
        Carregando audit log…
      </div>
    );
  }

  if (audit.length === 0) {
    return (
      <div style={{ padding: "32px 16px" }}>
        <EmptyState
          icon="ClipboardList"
          title="Sem entradas no audit log"
          description="Ações registradas via auditLog() aparecem aqui. Imutável por desenho — UPDATE/DELETE bloqueado."
        />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "16px 16px 160px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>
        Registro de ações. Actor humano e agente distinguidos (P9). Imutável —
        ações de moderação criam novos eventos, nunca sobrescrevem.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {audit.map((entry, idx) => {
          const u = users.get(entry.actor_id);
          const label =
            entry.actor_type === "human"
              ? (u?.display_name ?? u?.email ?? entry.actor_id.slice(0, 8))
              : entry.actor_type === "agent"
                ? `agent ${entry.actor_id.slice(0, 8)}`
                : entry.actor_id;
          return (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderTop:
                  idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  opacity: entry.actor_type === "agent" ? 0.6 : 1,
                  flexShrink: 0,
                }}
              >
                {entry.actor_type === "agent"
                  ? "🤖"
                  : entry.actor_type === "system"
                    ? "⚙️"
                    : "👤"}
              </span>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "ui-monospace, monospace",
                    color: "var(--text-primary)",
                  }}
                >
                  {entry.action}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                  {label}
                  {entry.resource_type !== null && ` · ${entry.resource_type}`}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-tertiary)",
                  flexShrink: 0,
                }}
              >
                {absoluteTime(entry.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LLMMetricBar {
  label: string;
  value: number;
  limit: number;
  unit?: string;
}

const LLM_METRICS: LLMMetricBar[] = [
  { label: "Tokens consumidos (30d)", value: 12_400, limit: 100_000 },
  { label: "Custo LLM (30d)", value: 0.18, limit: 5, unit: "USD" },
  { label: "Chamadas ao Copilot (30d)", value: 47, limit: 500 },
  { label: "Taxa de fallback degenerado", value: 100, limit: 100, unit: "%" },
];

function TabTrustCenter() {
  return (
    <div
      style={{
        padding: "16px 16px 160px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 10,
          padding: 12,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          🔐 Trust Center — Métricas LLM (P15)
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
          }}
        >
          Declaradas antes do merge de cada feature LLM. Budget: 2 000 in / 1
          000 out por turno · Modelo: claude-3-5-sonnet · Fallback:
          DegradedLLMDriver · Kill switch: VITE_LITELLM_KEY não configurada.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {LLM_METRICS.map((m) => {
          const pct = Math.min((m.value / m.limit) * 100, 100);
          const barColor =
            pct > 80 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#a855f7";
          return (
            <div
              key={m.label}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  {m.label}
                </span>
                <span
                  style={{
                    color: "var(--text-tertiary)",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {m.value}
                  {m.unit !== undefined ? ` ${m.unit}` : ""} / {m.limit}
                  {m.unit !== undefined ? ` ${m.unit}` : ""}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: barColor,
                    width: `${pct}%`,
                    transition: "width 200ms ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
          }}
        >
          Latência p50/p95/p99
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
          }}
        >
          {[
            { label: "p50", value: "—", note: "modo degenerado" },
            { label: "p95", value: "—", note: "modo degenerado" },
            { label: "p99", value: "—", note: "modo degenerado" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: 12,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontFamily: "ui-monospace, monospace",
                  color: "var(--text-secondary)",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                {stat.note}
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>
          Métricas reais disponíveis quando LiteLLM conectado (configure
          VITE_LITELLM_KEY). Langfuse coleta automaticamente via
          instrumentedChat().
        </p>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          padding: 12,
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
          }}
        >
          Status dos drivers LLM
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            {
              name: "LiteLLM Gateway",
              status: "degraded",
              note: "VITE_LITELLM_KEY ausente",
            },
            {
              name: "DegradedLLMDriver",
              status: "active",
              note: "Fallback P14 ativo",
            },
            {
              name: "Langfuse",
              status: "offline",
              note: "Container em restart loop",
            },
            {
              name: "OTel Collector",
              status: "offline",
              note: "Container em restart loop",
            },
          ].map((svc) => {
            const cfg: Record<string, { bg: string; fg: string }> = {
              active: { bg: "rgba(34,197,94,0.15)", fg: "#86efac" },
              degraded: { bg: "rgba(234,179,8,0.15)", fg: "#fde047" },
              offline: {
                bg: "rgba(255,255,255,0.06)",
                fg: "var(--text-tertiary)",
              },
            };
            const c = cfg[svc.status] ?? cfg["offline"];
            return (
              <div
                key={svc.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {svc.name}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                    {svc.note}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: c?.bg ?? "rgba(255,255,255,0.06)",
                      color: c?.fg ?? "var(--text-tertiary)",
                    }}
                  >
                    {svc.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AuditoriaApp() {
  const [activeTab, setActiveTab] = useState<Tab>("eventos");
  const [events, setEvents] = useState<OutboxRow[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<Map<string, UserRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filterActor, setFilterActor] = useState<ActorType | "all">("all");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  useEffect(() => {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const d = drivers;

    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      const [eventsRes, auditRes, usersRes] = await Promise.all([
        d.data
          .from("scp_outbox")
          .select(
            "id,company_id,event_type,event_id,payload,envelope,status,attempts,last_error,created_at,published_at",
          )
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE),
        d.data
          .from("audit_log")
          .select(
            "id,company_id,actor_id,actor_type,action,resource_type,resource_id,payload,created_at",
          )
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE),
        d.data.from("users").select("id,email,display_name"),
      ]);
      if (cancelled) return;

      const eventRows = (eventsRes.data ?? []) as OutboxRow[];
      const auditRows = (auditRes.data ?? []) as AuditEntry[];
      const userRows = (usersRes.data ?? []) as UserRow[];

      setEvents(eventRows);
      setAudit(auditRows);
      setUsers(new Map(userRows.map((u) => [u.id, u])));
      setHasMore(eventRows.length === PAGE_SIZE);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [drivers, userId, activeCompanyId]);

  async function handleLoadMore(): Promise<void> {
    if (drivers === null || events.length === 0 || loadingMore) return;
    setLoadingMore(true);
    const last = events[events.length - 1];
    if (last === undefined) {
      setLoadingMore(false);
      return;
    }
    const { data } = await drivers.data
      .from("scp_outbox")
      .select(
        "id,company_id,event_type,event_id,payload,envelope,status,attempts,last_error,created_at,published_at",
      )
      .lt("created_at", last.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    const next = (data ?? []) as OutboxRow[];
    setEvents((prev) => [...prev, ...next]);
    setHasMore(next.length === PAGE_SIZE);
    setLoadingMore(false);
  }

  const domains = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(eventDomain(e.event_type)));
    return Array.from(set).sort();
  }, [events]);

  const tabContent = useMemo<Record<Tab, React.ReactNode>>(
    () => ({
      eventos: (
        <TabEventosSCP
          events={events}
          users={users}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={() => void handleLoadMore()}
          loadingMore={loadingMore}
          filterActor={filterActor}
          onFilterActor={setFilterActor}
          filterDomain={filterDomain}
          onFilterDomain={setFilterDomain}
          domains={domains}
          selectedId={selectedEventId}
          onSelect={setSelectedEventId}
        />
      ),
      audit: <TabAuditLog audit={audit} users={users} loading={loading} />,
      trust: <TabTrustCenter />,
    }),
    [
      events,
      audit,
      users,
      loading,
      hasMore,
      loadingMore,
      filterActor,
      filterDomain,
      domains,
      selectedEventId,
    ],
  );

  return (
    <AppShell
      title="Auditoria"
      sidebar={
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: 8,
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: isActive
                    ? "rgba(168,85,247,0.15)"
                    : "transparent",
                  border: "1px solid transparent",
                  color: isActive ? "#d8b4fe" : "var(--text-secondary)",
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      }
      sidebarWidth={180}
    >
      <div style={{ height: "100%", overflow: "hidden" }}>
        {tabContent[activeTab]}
      </div>
    </AppShell>
  );
}
