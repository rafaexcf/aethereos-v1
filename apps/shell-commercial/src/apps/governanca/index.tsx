import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@aethereos/ui-shell";
import { KERNEL_CAPABILITIES } from "@aethereos/kernel";
import { INVARIANT_OPERATIONS } from "@aethereos/kernel";
import { EmptyState } from "../../components/shared/EmptyState";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { executeProposal } from "../../lib/proposal-executor";

type Tab = "agentes" | "capabilities" | "invariantes" | "shadow";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "agentes", label: "Agentes", icon: "🤖" },
  { id: "capabilities", label: "Capabilities", icon: "🔑" },
  { id: "invariantes", label: "Invariantes", icon: "🔒" },
  { id: "shadow", label: "Shadow Mode", icon: "👤" },
];

interface AgentRow {
  id: string;
  company_id: string;
  supervising_user_id: string;
  name: string;
  description: string | null;
  capabilities: string[];
  status: "active" | "suspended" | "deleted";
  kind: "copilot" | "autonomous" | "observer" | null;
  autonomy_level: 0 | 1 | null;
  created_at: string;
  updated_at: string;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
}

interface ProposalRow {
  id: string;
  agent_id: string;
  intent_type: string;
  status: "pending" | "approved" | "rejected" | "executed" | "expired";
  supervising_user_id: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  expires_at: string;
  payload?: Record<string, unknown> | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function TabAgentes({
  agents,
  users,
  loading,
  selectedId,
  onSelect,
}: {
  agents: AgentRow[];
  users: Map<string, UserRow>;
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          fontSize: 13,
          color: "var(--text-tertiary)",
        }}
      >
        Carregando agentes…
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div style={{ padding: "32px 16px" }}>
        <EmptyState
          icon="Bot"
          title="Nenhum agente registrado"
          description="Agentes são criados quando o Copilot é provisionado para esta empresa. Cada agente requer supervising_user_id."
        />
      </div>
    );
  }

  const selected =
    selectedId !== null
      ? (agents.find((a) => a.id === selectedId) ?? null)
      : null;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          flex: selected !== null ? "0 0 360px" : 1,
          overflowY: "auto",
          borderRight:
            selected !== null ? "1px solid rgba(255,255,255,0.08)" : "none",
          padding: "16px 16px 160px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Agentes registrados nesta company
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              background: "rgba(255,255,255,0.06)",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {agents.length} total
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {agents.map((a) => {
            const sup = users.get(a.supervising_user_id);
            const isSelected = selected?.id === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(isSelected ? null : a.id)}
                style={{
                  textAlign: "left",
                  background: isSelected
                    ? "rgba(168,85,247,0.10)"
                    : "rgba(255,255,255,0.03)",
                  border: isSelected
                    ? "1px solid rgba(168,85,247,0.40)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: 12,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  color: "var(--text-secondary)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {a.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background:
                        a.status === "active"
                          ? "rgba(34,197,94,0.15)"
                          : a.status === "suspended"
                            ? "rgba(234,179,8,0.15)"
                            : "rgba(239,68,68,0.15)",
                      color:
                        a.status === "active"
                          ? "#86efac"
                          : a.status === "suspended"
                            ? "#fde047"
                            : "#fca5a5",
                    }}
                  >
                    {a.status}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {a.id}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  <span>
                    Supervisor:{" "}
                    <span style={{ color: "var(--text-secondary)" }}>
                      {sup?.display_name ??
                        sup?.email ??
                        a.supervising_user_id.slice(0, 8)}
                    </span>
                  </span>
                  {a.kind !== null && (
                    <span
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {a.kind}
                    </span>
                  )}
                  {a.autonomy_level !== null && (
                    <span style={{ color: "var(--text-tertiary)" }}>
                      autonomia {a.autonomy_level}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected !== null && (
        <AgentDetail
          agent={selected}
          supervisor={users.get(selected.supervising_user_id) ?? null}
          onClose={() => onSelect(null)}
        />
      )}
    </div>
  );
}

function AgentDetail({
  agent,
  supervisor,
  onClose,
}: {
  agent: AgentRow;
  supervisor: UserRow | null;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 20px 160px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {agent.name}
          </span>
          <span
            style={{
              fontSize: 10,
              fontFamily: "ui-monospace, monospace",
              color: "var(--text-tertiary)",
            }}
          >
            {agent.id}
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
          }}
        >
          Fechar
        </button>
      </div>

      {agent.description !== null && agent.description !== "" && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {agent.description}
        </p>
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
          Supervisor
        </span>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {supervisor?.display_name ?? supervisor?.email ?? "—"}
          </span>
          {supervisor?.email !== undefined && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
            >
              {supervisor.email}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              fontFamily: "ui-monospace, monospace",
              color: "var(--text-tertiary)",
            }}
          >
            {agent.supervising_user_id}
          </span>
        </div>
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
          Capabilities ({agent.capabilities.length})
        </span>
        {agent.capabilities.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            Nenhuma capability concedida
          </span>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                style={{
                  fontSize: 11,
                  fontFamily: "ui-monospace, monospace",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-secondary)",
                  padding: "3px 8px",
                  borderRadius: 4,
                }}
              >
                {cap}
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
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
            Tipo
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {agent.kind ?? "—"}
          </div>
        </div>
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
            Autonomia
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {agent.autonomy_level !== null
              ? `nível ${agent.autonomy_level}`
              : "—"}
          </div>
        </div>
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
            Criado em
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {formatDateTime(agent.created_at)}
          </div>
        </div>
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
            Atualizado em
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {formatDateTime(agent.updated_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div
      style={{
        padding: "16px 16px 160px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "var(--text-tertiary)",
        }}
      >
        Capabilities do kernel. Agentes recebem subconjunto explícito das
        capabilities do supervisor. Marcadas com 🔒 nunca são delegadas a
        agentes.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {KERNEL_CAPABILITIES.map((cap) => {
          const blocked = AGENT_BLOCKED.has(cap);
          return (
            <div
              key={cap}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  opacity: blocked ? 0.5 : 1,
                }}
              >
                {blocked ? "🔒" : "🔑"}
              </span>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: "ui-monospace, monospace",
                    color: "var(--text-secondary)",
                  }}
                >
                  {cap}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {CAPABILITY_DESCRIPTIONS[cap] ?? "—"}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: blocked
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(255,255,255,0.06)",
                  color: blocked ? "#fca5a5" : "var(--text-tertiary)",
                }}
              >
                {blocked ? "agente bloqueado" : "delegável"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
    <div
      style={{
        padding: "16px 16px 160px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 10,
          padding: 12,
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "#fca5a5" }}>
          🔒 8 operações invariantes — agentes NUNCA executam
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          Ref: Fundamentação 12.4 [INV]. Bloqueio mecânico no PermissionEngine,
          não apenas documental.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {INVARIANT_OPERATIONS.map((op, idx) => (
          <div
            key={op.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: "10px 14px",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
                color: "var(--text-tertiary)",
                marginTop: 1,
              }}
            >
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {op.description}
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10,
                    background: "rgba(255,255,255,0.06)",
                    color: "var(--text-tertiary)",
                    padding: "1px 6px",
                    borderRadius: 4,
                  }}
                >
                  {CATEGORY_LABELS[op.category] ?? op.category}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "ui-monospace, monospace",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {op.id}
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(239,68,68,0.15)",
                color: "#fca5a5",
              }}
            >
              bloqueado
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabShadow({
  proposals,
  agents,
  users,
  loading,
  currentUserId,
  onApprove,
  onReject,
}: {
  proposals: ProposalRow[];
  agents: AgentRow[];
  users: Map<string, UserRow>;
  loading: boolean;
  currentUserId: string | null;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  // Sprint 17 MX88: filtros + drawer inline
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const allIntentTypes = Array.from(
    new Set(proposals.map((p) => p.intent_type)),
  ).sort();

  const filteredProposals = proposals.filter(
    (p) =>
      (statusFilter === "all" || p.status === statusFilter) &&
      (intentFilter === "all" || p.intent_type === intentFilter),
  );
  const statusColor: Record<string, { bg: string; fg: string }> = {
    pending: { bg: "rgba(234,179,8,0.15)", fg: "#fde047" },
    approved: { bg: "rgba(34,197,94,0.15)", fg: "#86efac" },
    rejected: { bg: "rgba(255,255,255,0.06)", fg: "var(--text-tertiary)" },
    executed: { bg: "rgba(168,85,247,0.15)", fg: "#d8b4fe" },
    expired: { bg: "rgba(255,255,255,0.04)", fg: "var(--text-tertiary)" },
  };

  const statusLabel: Record<string, string> = {
    pending: "Aguardando",
    approved: "Aprovado",
    rejected: "Rejeitado",
    executed: "Executado",
    expired: "Expirado",
  };

  const agentName = (id: string): string =>
    agents.find((a) => a.id === id)?.name ?? id.slice(0, 8);

  return (
    <div
      style={{
        padding: "16px 16px 160px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          background: "rgba(168,85,247,0.08)",
          border: "1px solid rgba(168,85,247,0.30)",
          borderRadius: 10,
          padding: 12,
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "#d8b4fe" }}>
          👤 Shadow Mode — autonomia 0-1
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          Copilot propõe ações tipadas (Action Intents). Humano aprova/rejeita.
          Agente nunca executa sem aprovação explícita. Toda proposta tem TTL de
          1 hora.
        </p>
      </div>

      {/* Sprint 17 MX88: filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "4px 8px",
            fontSize: 11,
            borderRadius: 6,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "var(--text-primary)",
          }}
        >
          <option value="all">Todos status</option>
          <option value="pending">Aguardando</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Rejeitado</option>
          <option value="executed">Executado</option>
          <option value="expired">Expirado</option>
        </select>
        <select
          value={intentFilter}
          onChange={(e) => setIntentFilter(e.target.value)}
          style={{
            padding: "4px 8px",
            fontSize: 11,
            borderRadius: 6,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "var(--text-primary)",
          }}
        >
          <option value="all">Todas intents</option>
          {allIntentTypes.map((it) => (
            <option key={it} value={it}>
              {it}
            </option>
          ))}
        </select>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            background: "rgba(255,255,255,0.06)",
            padding: "2px 8px",
            borderRadius: 999,
            alignSelf: "center",
            marginLeft: "auto",
          }}
        >
          {filteredProposals.length} de {proposals.length} propostas
        </span>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Carregando propostas…
        </div>
      ) : filteredProposals.length === 0 ? (
        <EmptyState
          icon="UserCheck"
          title="Sem propostas correspondentes"
          description={
            proposals.length === 0
              ? "O Copilot ainda não submeteu nenhuma proposta para revisão."
              : "Nenhuma proposta corresponde aos filtros."
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filteredProposals.map((p) => {
            const sup = users.get(p.supervising_user_id);
            const color = statusColor[p.status] ?? {
              bg: "rgba(255,255,255,0.06)",
              fg: "var(--text-tertiary)",
            };
            const expanded = expandedId === p.id;
            const canAct =
              p.status === "pending" &&
              currentUserId !== null &&
              p.supervising_user_id === currentUserId;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <span
                      style={{ fontSize: 13, color: "var(--text-secondary)" }}
                    >
                      {p.intent_type}
                    </span>
                    <span
                      style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                    >
                      {agentName(p.agent_id)} ·{" "}
                      {sup?.display_name ??
                        sup?.email ??
                        p.supervising_user_id.slice(0, 8)}
                      {" · "}
                      {formatDateTime(p.created_at)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: color.bg,
                      color: color.fg,
                    }}
                  >
                    {statusLabel[p.status] ?? p.status}
                  </span>
                </button>

                {expanded && (
                  <div
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      padding: "10px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontSize: 10,
                        fontFamily: "var(--font-mono, monospace)",
                        color: "var(--text-tertiary)",
                        background: "rgba(0,0,0,0.25)",
                        padding: 8,
                        borderRadius: 6,
                        overflow: "auto",
                        maxHeight: 200,
                      }}
                    >
                      {JSON.stringify(p.payload ?? {}, null, 2)}
                    </pre>
                    {p.reviewed_at !== null && (
                      <span
                        style={{ fontSize: 10, color: "var(--text-tertiary)" }}
                      >
                        Revisado em {formatDateTime(p.reviewed_at)}
                        {p.reviewed_by !== null
                          ? ` por ${users.get(p.reviewed_by)?.display_name ?? p.reviewed_by.slice(0, 8)}`
                          : ""}
                      </span>
                    )}
                    {canAct && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          disabled={actingId === p.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setActingId(p.id);
                            await onApprove(p.id);
                            setActingId(null);
                          }}
                          style={{
                            padding: "5px 12px",
                            fontSize: 11,
                            borderRadius: 6,
                            background: "rgba(34,197,94,0.18)",
                            border: "1px solid rgba(34,197,94,0.32)",
                            color: "#86efac",
                            cursor: actingId === p.id ? "wait" : "pointer",
                          }}
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          disabled={actingId === p.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setActingId(p.id);
                            await onReject(p.id);
                            setActingId(null);
                          }}
                          style={{
                            padding: "5px 12px",
                            fontSize: 11,
                            borderRadius: 6,
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid rgba(239,68,68,0.28)",
                            color: "#fca5a5",
                            cursor: actingId === p.id ? "wait" : "pointer",
                          }}
                        >
                          Rejeitar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "var(--text-tertiary)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 12,
        }}
      >
        Propostas expiram em 1 hora. Propostas expiradas são marcadas como
        `expired` — não são deletadas (imutabilidade de evidência, P11).
      </p>
    </div>
  );
}

export function GovernancaApp() {
  const [activeTab, setActiveTab] = useState<Tab>("agentes");
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [users, setUsers] = useState<Map<string, UserRow>>(new Map());
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  useEffect(() => {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const d = drivers;

    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      const [agentsRes, usersRes, proposalsRes] = await Promise.all([
        d.data
          .from("agents")
          .select(
            "id,company_id,supervising_user_id,name,description,capabilities,status,kind,autonomy_level,created_at,updated_at",
          )
          .order("created_at", { ascending: false }),
        d.data.from("users").select("id,email,display_name"),
        d.data
          .from("agent_proposals")
          .select(
            "id,agent_id,intent_type,status,supervising_user_id,reviewed_by,reviewed_at,rejection_reason,created_at,expires_at,payload",
          )
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;

      const agentRows = (agentsRes.data ?? []) as AgentRow[];
      const userRows = (usersRes.data ?? []) as UserRow[];
      const proposalRows = (proposalsRes.data ?? []) as ProposalRow[];

      setAgents(agentRows);
      setUsers(new Map(userRows.map((u) => [u.id, u])));
      setProposals(proposalRows);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [drivers, userId, activeCompanyId]);

  // Sprint 17 MX88: handlers de approve/reject de proposals.
  // Approve tambem dispara executeProposal (mesma logica do CopilotDrawer).
  const handleApproveProposal = useCallback(
    async (proposalId: string) => {
      if (drivers === null || userId === null || activeCompanyId === null)
        return;
      const target = proposals.find((p) => p.id === proposalId);
      if (target === undefined || target.status !== "pending") return;

      // 1. UPDATE status="approved"
      await drivers.data
        .from("agent_proposals")
        .update({
          status: "approved",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", proposalId);
      void drivers.scp.publishEvent(
        "agent.copilot.action_approved",
        {
          proposal_id: proposalId,
          company_id: activeCompanyId,
          approved_by: userId,
          approved_at: new Date().toISOString(),
        },
        {
          actor: {
            type: "agent",
            agent_id: target.agent_id,
            supervising_user_id: userId,
          },
        },
      );

      // 2. Executa
      const exec = await executeProposal(
        { data: drivers.data, scp: drivers.scp },
        {
          id: target.id,
          intentType: target.intent_type,
          payload: (target.payload ?? {}) as Record<string, unknown>,
        },
        userId,
        activeCompanyId,
      );

      if (exec.ok) {
        await drivers.data
          .from("agent_proposals")
          .update({
            status: "executed",
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", proposalId);
        void drivers.scp.publishEvent(
          "agent.copilot.action_executed",
          {
            proposal_id: proposalId,
            company_id: activeCompanyId,
            executed_by: userId,
            intent_type: target.intent_type,
            ...(exec.resourceId !== undefined
              ? { resource_id: exec.resourceId }
              : {}),
          },
          { actor: { type: "human", user_id: userId } },
        );
        // Refresh local state
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId ? { ...p, status: "executed" as const } : p,
          ),
        );
      } else {
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId ? { ...p, status: "approved" as const } : p,
          ),
        );
      }
    },
    [drivers, userId, activeCompanyId, proposals],
  );

  const handleRejectProposal = useCallback(
    async (proposalId: string) => {
      if (drivers === null || userId === null || activeCompanyId === null)
        return;
      const target = proposals.find((p) => p.id === proposalId);
      if (target === undefined || target.status !== "pending") return;

      await drivers.data
        .from("agent_proposals")
        .update({
          status: "rejected",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", proposalId);
      void drivers.scp.publishEvent(
        "agent.copilot.action_rejected",
        {
          proposal_id: proposalId,
          company_id: activeCompanyId,
          rejected_by: userId,
        },
        {
          actor: {
            type: "agent",
            agent_id: target.agent_id,
            supervising_user_id: userId,
          },
        },
      );
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId ? { ...p, status: "rejected" as const } : p,
        ),
      );
    },
    [drivers, userId, activeCompanyId, proposals],
  );

  const tabContent = useMemo<Record<Tab, React.ReactNode>>(
    () => ({
      agentes: (
        <TabAgentes
          agents={agents}
          users={users}
          loading={loading}
          selectedId={selectedAgentId}
          onSelect={setSelectedAgentId}
        />
      ),
      capabilities: <TabCapabilities />,
      invariantes: <TabInvariantes />,
      shadow: (
        <TabShadow
          proposals={proposals}
          agents={agents}
          users={users}
          loading={loading}
          currentUserId={userId}
          onApprove={handleApproveProposal}
          onReject={handleRejectProposal}
        />
      ),
    }),
    [
      agents,
      users,
      proposals,
      loading,
      selectedAgentId,
      userId,
      handleApproveProposal,
      handleRejectProposal,
    ],
  );

  return (
    <AppShell
      title="Governança"
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
                  transition: "background 120ms ease, color 120ms ease",
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
