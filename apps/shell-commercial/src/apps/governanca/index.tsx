/**
 * GovernancaApp — M47
 * Visibilidade sobre o modelo de agentes, capabilities e invariantes.
 * Read-only: compliance/auditoria, não executa ações.
 */
import { useState } from "react";
import { AppShell } from "@aethereos/ui-shell";
import { KERNEL_CAPABILITIES } from "@aethereos/kernel";
import { INVARIANT_OPERATIONS } from "@aethereos/kernel";

// ---------------------------------------------------------------------------
// Tipos de abas
// ---------------------------------------------------------------------------

type Tab = "agentes" | "capabilities" | "invariantes" | "shadow";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "agentes", label: "Agentes", icon: "🤖" },
  { id: "capabilities", label: "Capabilities", icon: "🔑" },
  { id: "invariantes", label: "Invariantes", icon: "🔒" },
  { id: "shadow", label: "Shadow Mode", icon: "👤" },
];

// ---------------------------------------------------------------------------
// Demo state
// ---------------------------------------------------------------------------

const DEMO_AGENT_ID = "00000000-0000-0000-0000-000000000001";

interface DemoAgent {
  id: string;
  name: string;
  kind: "copilot" | "autonomous" | "observer";
  autonomyLevel: 0 | 1;
  supervisingUser: string;
  status: "active" | "suspended";
  capabilities: string[];
}

const DEMO_AGENTS: DemoAgent[] = [
  {
    id: DEMO_AGENT_ID,
    name: "Copilot Aethereos",
    kind: "copilot",
    autonomyLevel: 0,
    supervisingUser: "admin@demo.company",
    status: "active",
    capabilities: ["data:read", "data:write"],
  },
];

interface DemoShadowProposal {
  id: string;
  intent: string;
  status: "pending" | "approved" | "rejected";
  agentName: string;
  createdAt: Date;
}

const DEMO_PROPOSALS: DemoShadowProposal[] = [
  {
    id: crypto.randomUUID(),
    intent: "create_person",
    status: "approved",
    agentName: "Copilot Aethereos",
    createdAt: new Date(Date.now() - 3_600_000),
  },
  {
    id: crypto.randomUUID(),
    intent: "create_channel",
    status: "rejected",
    agentName: "Copilot Aethereos",
    createdAt: new Date(Date.now() - 7_200_000),
  },
];

// ---------------------------------------------------------------------------
// Aba Agentes
// ---------------------------------------------------------------------------

function TabAgentes() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Agentes registrados nesta company. Todo agente requer
          supervising_user_id (Interpretação A+).
        </p>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {DEMO_AGENTS.length} ativo(s)
        </span>
      </div>

      {DEMO_AGENTS.map((agent) => (
        <div
          key={agent.id}
          className="rounded-lg border border-zinc-800 p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-100">
                  {agent.name}
                </span>
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs",
                    agent.status === "active"
                      ? "bg-green-900/30 text-green-400"
                      : "bg-red-900/30 text-red-400",
                  ].join(" ")}
                >
                  {agent.status}
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-600">{agent.id}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {agent.kind}
              </span>
              <span className="text-xs text-zinc-600">
                autonomy: {agent.autonomyLevel}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs text-zinc-600">
              Supervisor:{" "}
              <span className="text-zinc-400">{agent.supervisingUser}</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {agent.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}

      <p className="text-xs text-zinc-700 border-t border-zinc-800 pt-3">
        Autonomia 0-1: agentes sugerem, humanos executam. Ações irreversíveis
        sempre exigem aprovação explícita (Fundamentação 12.4).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Capabilities
// ---------------------------------------------------------------------------

const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  "platform:admin": "Acesso administrativo total à plataforma",
  "tenant:manage": "Gerenciar configurações da empresa",
  "members:manage": "Adicionar/remover membros",
  "billing:manage": "Acessar e alterar billing",
  "agents:manage": "Criar e configurar agentes",
  "data:read": "Ler dados de qualquer módulo",
  "data:write": "Escrever dados em qualquer módulo",
  "data:delete": "Deletar dados (operação invariante para agentes)",
  "access:grant": "Conceder acesso a outros usuários",
  "access:revoke": "Revogar acesso de usuários",
};

const AGENT_BLOCKED: Set<string> = new Set([
  "data:delete",
  "access:grant",
  "access:revoke",
  "platform:admin",
  "members:manage",
]);

function TabCapabilities() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <p className="text-xs text-zinc-500">
        Capabilities do kernel. Agentes recebem subconjunto explícito das
        capabilities do supervisor. Marcadas com 🔒 nunca são delegadas a
        agentes.
      </p>
      <div className="flex flex-col gap-2">
        {KERNEL_CAPABILITIES.map((cap) => {
          const blocked = AGENT_BLOCKED.has(cap);
          return (
            <div
              key={cap}
              className="flex items-center gap-3 rounded-lg border border-zinc-800 px-4 py-2.5"
            >
              <span
                className={[
                  "shrink-0 text-base",
                  blocked ? "opacity-50" : "",
                ].join(" ")}
              >
                {blocked ? "🔒" : "🔑"}
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="font-mono text-xs text-zinc-200">{cap}</p>
                <p className="text-xs text-zinc-600">
                  {CAPABILITY_DESCRIPTIONS[cap] ?? "—"}
                </p>
              </div>
              {blocked ? (
                <span className="rounded-full bg-red-900/20 px-2 py-0.5 text-xs text-red-400">
                  agente bloqueado
                </span>
              ) : (
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                  delegável
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Invariantes
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  hr: "RH",
  erp: "ERP",
  finance: "Financeiro",
  governance: "Governança",
  iam: "IAM",
  data: "Dados",
  fiscal: "Fiscal",
};

function TabInvariantes() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <div className="rounded-lg border border-red-900/30 bg-red-950/10 p-3">
        <p className="text-xs font-medium text-red-400">
          🔒 8 operações invariantes — agentes NUNCA executam
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Ref: Fundamentação 12.4 [INV]. Bloqueio mecânico no PermissionEngine,
          não apenas documental.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {INVARIANT_OPERATIONS.map((op, idx) => (
          <div
            key={op.id}
            className="flex items-start gap-3 rounded-lg border border-zinc-800 px-4 py-3"
          >
            <span className="shrink-0 text-xs font-mono text-zinc-700 mt-0.5">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-sm text-zinc-200">{op.description}</p>
              <div className="flex items-center gap-2">
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">
                  {CATEGORY_LABELS[op.category] ?? op.category}
                </span>
                <span className="font-mono text-xs text-zinc-700">{op.id}</span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-red-900/20 px-2 py-0.5 text-xs text-red-400">
              bloqueado
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Shadow Mode
// ---------------------------------------------------------------------------

function TabShadow() {
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-900/20 text-yellow-400",
    approved: "bg-green-900/20 text-green-400",
    rejected: "bg-zinc-800 text-zinc-500",
  };

  const statusLabel: Record<string, string> = {
    pending: "Aguardando",
    approved: "Aprovado",
    rejected: "Rejeitado",
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="rounded-lg border border-violet-800/30 bg-violet-950/10 p-3">
        <p className="text-xs font-medium text-violet-300">
          👤 Shadow Mode — autonomia 0-1
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Copilot propõe ações tipadas (Action Intents). Humano aprova/rejeita.
          Agente nunca executa sem aprovação explícita. Toda proposta tem TTL de
          1 hora.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">Histórico recente de propostas</p>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {DEMO_PROPOSALS.length} propostas
        </span>
      </div>

      {DEMO_PROPOSALS.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 rounded-lg border border-zinc-800 px-4 py-3"
        >
          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-sm text-zinc-200">{p.intent}</p>
            <p className="text-xs text-zinc-600">
              {p.agentName} ·{" "}
              {p.createdAt.toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
          <span
            className={[
              "rounded-full px-2 py-0.5 text-xs",
              statusColor[p.status] ?? "bg-zinc-800 text-zinc-500",
            ].join(" ")}
          >
            {statusLabel[p.status] ?? p.status}
          </span>
        </div>
      ))}

      <p className="text-xs text-zinc-700 border-t border-zinc-800 pt-3">
        Propostas expiram em 1 hora. Propostas expiradas são marcadas como
        `expired` — não são deletadas (imutabilidade de evidência, P11).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GovernancaApp principal
// ---------------------------------------------------------------------------

export function GovernancaApp() {
  const [activeTab, setActiveTab] = useState<Tab>("agentes");

  const tabContent: Record<Tab, React.ReactNode> = {
    agentes: <TabAgentes />,
    capabilities: <TabCapabilities />,
    invariantes: <TabInvariantes />,
    shadow: <TabShadow />,
  };

  return (
    <AppShell
      title="Governança"
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
