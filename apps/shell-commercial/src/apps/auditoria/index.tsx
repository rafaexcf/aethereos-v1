/**
 * AuditoriaApp — M48
 * Log de eventos SCP + audit_log + Trust Center (métricas LLM P15).
 * Read-only: eventos são append-only (P11 — imutabilidade de evidência).
 */
import { useState } from "react";
import { AppShell } from "@aethereos/ui-shell";

// ---------------------------------------------------------------------------
// Tipos de abas
// ---------------------------------------------------------------------------

type Tab = "eventos" | "audit" | "trust";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "eventos", label: "Eventos SCP", icon: "📡" },
  { id: "audit", label: "Audit Log", icon: "📋" },
  { id: "trust", label: "Trust Center", icon: "🔐" },
];

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

interface ScpEvent {
  id: string;
  eventType: string;
  actorType: "human" | "agent";
  actorId: string;
  status: "published" | "pending" | "failed";
  createdAt: Date;
}

const DEMO_SCP_EVENTS: ScpEvent[] = [
  {
    id: crypto.randomUUID(),
    eventType: "platform.person.created",
    actorType: "human",
    actorId: "usr-demo",
    status: "published",
    createdAt: new Date(Date.now() - 300_000),
  },
  {
    id: crypto.randomUUID(),
    eventType: "agent.copilot.action_proposed",
    actorType: "agent",
    actorId: "00000000-0000-0000-0000-000000000001",
    status: "published",
    createdAt: new Date(Date.now() - 600_000),
  },
  {
    id: crypto.randomUUID(),
    eventType: "platform.chat.message_sent",
    actorType: "human",
    actorId: "usr-demo",
    status: "published",
    createdAt: new Date(Date.now() - 1_200_000),
  },
  {
    id: crypto.randomUUID(),
    eventType: "platform.file.uploaded",
    actorType: "human",
    actorId: "usr-demo",
    status: "published",
    createdAt: new Date(Date.now() - 3_600_000),
  },
  {
    id: crypto.randomUUID(),
    eventType: "agent.copilot.message_sent",
    actorType: "agent",
    actorId: "00000000-0000-0000-0000-000000000001",
    status: "published",
    createdAt: new Date(Date.now() - 7_200_000),
  },
];

interface AuditEntry {
  id: string;
  action: string;
  actorType: "human" | "agent";
  actorEmail: string;
  resourceType: string;
  createdAt: Date;
}

const DEMO_AUDIT: AuditEntry[] = [
  {
    id: crypto.randomUUID(),
    action: "person.created",
    actorType: "human",
    actorEmail: "admin@demo.company",
    resourceType: "person",
    createdAt: new Date(Date.now() - 300_000),
  },
  {
    id: crypto.randomUUID(),
    action: "copilot.action_proposed",
    actorType: "agent",
    actorEmail: "copilot@aethereos.io",
    resourceType: "agent_proposal",
    createdAt: new Date(Date.now() - 600_000),
  },
  {
    id: crypto.randomUUID(),
    action: "settings.updated",
    actorType: "human",
    actorEmail: "admin@demo.company",
    resourceType: "settings",
    createdAt: new Date(Date.now() - 900_000),
  },
];

// ---------------------------------------------------------------------------
// Aba Eventos SCP
// ---------------------------------------------------------------------------

function TabEventosSCP() {
  const [filterActor, setFilterActor] = useState<"all" | "human" | "agent">(
    "all",
  );

  const filtered =
    filterActor === "all"
      ? DEMO_SCP_EVENTS
      : DEMO_SCP_EVENTS.filter((e) => e.actorType === filterActor);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Eventos SCP do outbox — append-only (P11). Read-only mesmo para staff.
        </p>
        <div className="flex gap-1">
          {(["all", "human", "agent"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterActor(f)}
              className={[
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                filterActor === f
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              {f === "all" ? "Todos" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
        {filtered.map((evt) => (
          <div key={evt.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className={[
                "shrink-0 rounded-full px-2 py-0.5 text-xs",
                evt.actorType === "agent"
                  ? "bg-violet-900/30 text-violet-400"
                  : "bg-zinc-800 text-zinc-400",
              ].join(" ")}
            >
              {evt.actorType}
            </span>
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <p className="truncate font-mono text-xs text-zinc-200">
                {evt.eventType}
              </p>
              <p className="truncate font-mono text-xs text-zinc-600">
                {evt.actorId.slice(0, 16)}…
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-xs",
                  evt.status === "published"
                    ? "bg-green-900/20 text-green-400"
                    : evt.status === "failed"
                      ? "bg-red-900/20 text-red-400"
                      : "bg-yellow-900/20 text-yellow-400",
                ].join(" ")}
              >
                {evt.status}
              </span>
              <span className="text-xs text-zinc-700">
                {evt.createdAt.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Audit Log
// ---------------------------------------------------------------------------

function TabAuditLog() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-xs text-zinc-500">
        Registro de ações. Actor humano e agente distinguidos (P9). Imutável —
        ações de moderação criam novos eventos, nunca sobrescrevem.
      </p>
      <div className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
        {DEMO_AUDIT.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className={[
                "shrink-0 text-base",
                entry.actorType === "agent" ? "opacity-60" : "",
              ].join(" ")}
            >
              {entry.actorType === "agent" ? "🤖" : "👤"}
            </span>
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <p className="text-xs text-zinc-200">{entry.action}</p>
              <p className="text-xs text-zinc-600">
                {entry.actorEmail} · {entry.resourceType}
              </p>
            </div>
            <span className="shrink-0 text-xs text-zinc-700">
              {entry.createdAt.toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Trust Center (métricas LLM P15)
// ---------------------------------------------------------------------------

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
    <div className="flex flex-col gap-4 p-6">
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
        <p className="text-xs font-medium text-zinc-300">
          🔐 Trust Center — Métricas LLM (P15)
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Declaradas antes do merge de cada feature LLM. Budget: 2 000 in / 1
          000 out por turno · Modelo: claude-3-5-sonnet · Fallback:
          DegradedLLMDriver · Kill switch: VITE_LITELLM_KEY não configurada.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {LLM_METRICS.map((m) => {
          const pct = Math.min((m.value / m.limit) * 100, 100);
          return (
            <div key={m.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">{m.label}</span>
                <span className="text-zinc-500 font-mono">
                  {m.value}
                  {m.unit !== undefined ? ` ${m.unit}` : ""} / {m.limit}
                  {m.unit !== undefined ? ` ${m.unit}` : ""}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={[
                    "h-full rounded-full transition-all",
                    pct > 80
                      ? "bg-red-500"
                      : pct > 50
                        ? "bg-yellow-500"
                        : "bg-violet-500",
                  ].join(" ")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
        <p className="text-xs font-medium text-zinc-300">
          Latência p50/p95/p99
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "p50", value: "—", note: "modo degenerado" },
            { label: "p95", value: "—", note: "modo degenerado" },
            { label: "p99", value: "—", note: "modo degenerado" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-zinc-800 p-3 text-center"
            >
              <p className="text-xs text-zinc-600">{stat.label}</p>
              <p className="text-lg font-mono text-zinc-400">{stat.value}</p>
              <p className="text-xs text-zinc-700">{stat.note}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-700">
          Métricas reais disponíveis quando LiteLLM conectado (configure
          VITE_LITELLM_KEY). Langfuse coleta automaticamente via
          instrumentedChat().
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 p-3">
        <p className="text-xs font-medium text-zinc-300 mb-2">
          Status dos drivers LLM
        </p>
        <div className="flex flex-col gap-1.5">
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
          ].map((svc) => (
            <div key={svc.name} className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">{svc.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-600">{svc.note}</span>
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs",
                    svc.status === "active"
                      ? "bg-green-900/20 text-green-400"
                      : svc.status === "degraded"
                        ? "bg-yellow-900/20 text-yellow-400"
                        : "bg-zinc-800 text-zinc-600",
                  ].join(" ")}
                >
                  {svc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuditoriaApp principal
// ---------------------------------------------------------------------------

export function AuditoriaApp() {
  const [activeTab, setActiveTab] = useState<Tab>("eventos");

  const tabContent: Record<Tab, React.ReactNode> = {
    eventos: <TabEventosSCP />,
    audit: <TabAuditLog />,
    trust: <TabTrustCenter />,
  };

  return (
    <AppShell
      title="Auditoria"
      sidebar={
        <nav className="flex flex-col gap-1 p-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left",
                activeTab === tab.id
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
              ].join(" ")}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      }
      sidebarWidth={180}
    >
      <div className="overflow-y-auto">{tabContent[activeTab]}</div>
    </AppShell>
  );
}
