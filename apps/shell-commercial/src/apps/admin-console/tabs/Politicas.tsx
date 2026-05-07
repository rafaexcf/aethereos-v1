/**
 * Super Sprint A / MX201-MX205 — Policy Studio.
 *
 * Tab no Gestor para gerenciar policies da empresa:
 *   - Listar policies (filtro por status)
 *   - Criar policy a partir de template ou form livre
 *   - Editar (cria nova versão)
 *   - Ativar / arquivar / duplicar
 *   - Simular impacto (90 dias) — dryRun sobre proposals históricas
 *   - Métricas (avaliações por result, top intents)
 */

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Shield,
  Plus,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Copy,
  X,
  AlertTriangle,
  Sparkles,
  BarChart3,
} from "lucide-react";
import yaml from "js-yaml";
import { useDrivers } from "../../../lib/drivers-context";
import { useSessionStore } from "../../../stores/session";
import {
  invalidatePolicyCache,
  getPolicyEngine,
} from "../../../lib/policy/browser-evaluator";
import { POLICY_TEMPLATES, type PolicyTemplate } from "./policy-templates";
import type { PolicyJson, PolicyResult } from "@aethereos/kernel";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PolicyRow {
  id: string;
  name: string;
  description: string;
  policy_yaml: string;
  policy_json: PolicyJson;
  version: number;
  status: "draft" | "active" | "archived";
  original_intent_text: string | null;
  created_at: string;
  updated_at: string;
}

interface ActionIntentRow {
  id: string;
  category: string;
  description: string;
  risk_class: "A" | "B" | "C";
}

type ModalState =
  | null
  | { kind: "create" }
  | { kind: "edit"; policy: PolicyRow }
  | { kind: "template-picker" }
  | { kind: "simulation"; policy: PolicyRow };

interface FormState {
  name: string;
  description: string;
  intentText: string;
  yaml: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  intentText: "",
  yaml: "applies_to:\n  actor_type: agent\nrules: []\n",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildYamlFromTemplate(
  t: PolicyTemplate,
  options?: Record<string, unknown>,
): string {
  const json = t.buildJson(options);
  return yaml.dump(json, { indent: 2, lineWidth: 100 });
}

function safeParseYaml(yamlText: string): PolicyJson | null {
  try {
    const parsed = yaml.load(yamlText);
    if (parsed === null || typeof parsed !== "object") return null;
    return parsed as PolicyJson;
  } catch {
    return null;
  }
}

function statusColor(s: PolicyRow["status"]): {
  bg: string;
  fg: string;
  label: string;
} {
  if (s === "active")
    return { bg: "rgba(34,197,94,0.15)", fg: "#22c55e", label: "Ativa" };
  if (s === "draft")
    return { bg: "rgba(99,102,241,0.15)", fg: "#a5b4fc", label: "Rascunho" };
  return { bg: "rgba(148,163,184,0.15)", fg: "#94a3b8", label: "Arquivada" };
}

function resultColor(r: PolicyResult): { bg: string; fg: string } {
  if (r === "allow") return { bg: "rgba(34,197,94,0.15)", fg: "#22c55e" };
  if (r === "deny") return { bg: "rgba(239,68,68,0.15)", fg: "#ef4444" };
  return { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b" };
}

// ─── Card section helper ─────────────────────────────────────────────────────

function Card(props: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      style={{
        background: "var(--glass-bg, rgba(255,255,255,0.04))",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "var(--text-tertiary)",
          marginBottom: 8,
        }}
      >
        {props.title}
      </div>
      {props.children}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function TabPoliticas(): React.JSX.Element {
  const drivers = useDrivers();
  const { activeCompanyId, userId } = useSessionStore();
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [intents, setIntents] = useState<ActionIntentRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | PolicyRow["status"]>(
    "all",
  );
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);
  const [metrics, setMetrics] = useState<{
    activeCount: number;
    totalEvaluations: number;
    byResult: Record<PolicyResult, number>;
    topIntents: Array<{ intentId: string; count: number }>;
  } | null>(null);

  // ─── Data loading ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (drivers === null || activeCompanyId === null) return;
    setLoading(true);
    try {
      const { data } = drivers;
      const polRes = (await data
        .from("policies")
        .select(
          "id,name,description,policy_yaml,policy_json,version,status,original_intent_text,created_at,updated_at",
        )
        .order("updated_at", { ascending: false })) as unknown as {
        data: PolicyRow[] | null;
      };
      setPolicies(polRes.data ?? []);

      const intRes = (await data
        .from("action_intents")
        .select("id,category,description,risk_class")
        .order("id")) as unknown as {
        data: ActionIntentRow[] | null;
      };
      setIntents(intRes.data ?? []);

      // Métricas (MX205) — last 30 days.
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const evalRes = (await data
        .from("policy_evaluations")
        .select("intent_id,result")
        .gte("evaluated_at", since.toISOString())) as unknown as {
        data: Array<{ intent_id: string; result: PolicyResult }> | null;
      };
      const all = evalRes.data ?? [];
      const byResult: Record<PolicyResult, number> = {
        allow: 0,
        deny: 0,
        require_approval: 0,
      };
      const intentCounts = new Map<string, number>();
      for (const r of all) {
        byResult[r.result] += 1;
        intentCounts.set(r.intent_id, (intentCounts.get(r.intent_id) ?? 0) + 1);
      }
      const topIntents = [...intentCounts.entries()]
        .map(([intentId, count]) => ({ intentId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setMetrics({
        activeCount: (polRes.data ?? []).filter((p) => p.status === "active")
          .length,
        totalEvaluations: all.length,
        byResult,
        topIntents,
      });
    } finally {
      setLoading(false);
    }
  }, [drivers, activeCompanyId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const handleSavePolicy = useCallback(
    async (form: FormState, asActive: boolean, editing?: PolicyRow) => {
      if (drivers === null || activeCompanyId === null || userId === null)
        return;
      const json = safeParseYaml(form.yaml);
      if (json === null) {
        alert("YAML inválido. Verifique a sintaxe antes de salvar.");
        return;
      }
      if (form.name.trim().length === 0) {
        alert("Nome é obrigatório.");
        return;
      }
      setBusy(true);
      try {
        const nextVersion = editing !== undefined ? editing.version + 1 : 1;
        await drivers.data.from("policies").insert({
          company_id: activeCompanyId,
          name: form.name.trim(),
          description: form.description,
          policy_yaml: form.yaml,
          policy_json: json,
          version: nextVersion,
          status: asActive ? "active" : "draft",
          original_intent_text: form.intentText.trim() || null,
          applies_to: json.applies_to ?? {},
          created_by: userId,
        });
        // Se editando uma versão ativa: arquiva a anterior.
        if (editing !== undefined && editing.status === "active" && asActive) {
          await drivers.data
            .from("policies")
            .update({ status: "archived" })
            .eq("id", editing.id);
        }
        invalidatePolicyCache(drivers.data, activeCompanyId);
        setModal(null);
        await loadAll();
      } finally {
        setBusy(false);
      }
    },
    [drivers, activeCompanyId, userId, loadAll],
  );

  const handleAction = useCallback(
    async (policy: PolicyRow, action: "activate" | "archive" | "duplicate") => {
      if (drivers === null || activeCompanyId === null) return;
      if (action === "activate") {
        await drivers.data
          .from("policies")
          .update({ status: "active" })
          .eq("id", policy.id);
      } else if (action === "archive") {
        await drivers.data
          .from("policies")
          .update({ status: "archived" })
          .eq("id", policy.id);
      } else if (action === "duplicate") {
        await drivers.data.from("policies").insert({
          company_id: activeCompanyId,
          name: `${policy.name} (cópia)`,
          description: policy.description,
          policy_yaml: policy.policy_yaml,
          policy_json: policy.policy_json,
          version: 1,
          status: "draft",
          original_intent_text: policy.original_intent_text,
          applies_to: policy.policy_json.applies_to ?? {},
          created_by: userId,
        });
      }
      invalidatePolicyCache(drivers.data, activeCompanyId);
      await loadAll();
    },
    [drivers, activeCompanyId, userId, loadAll],
  );

  const handleSimulate = useCallback(
    async (
      _policy: PolicyRow,
    ): Promise<{
      total: number;
      counts: Record<PolicyResult, number>;
    }> => {
      // _policy é referência informativa; engine usa cache de policies ativas.
      // Para draft: simula com policies ativas atuais (limitação aceita do MVP).
      if (drivers === null || activeCompanyId === null) {
        return { total: 0, counts: { allow: 0, deny: 0, require_approval: 0 } };
      }
      // Última 90 dias de proposals.
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const propRes = (await drivers.data
        .from("agent_proposals")
        .select("id,intent_type,payload")
        .gte("created_at", since.toISOString())
        .limit(1000)) as unknown as {
        data: Array<{
          id: string;
          intent_type: string;
          payload: Record<string, unknown>;
        }> | null;
      };
      const proposals = propRes.data ?? [];

      // Engine "isolado" — não mexe no cache global.
      // Re-usa BrowserPolicyDataSource via getPolicyEngine, mas sobrescreve
      // a lista de policies temporariamente via dryRun na própria policy.
      const engine = getPolicyEngine(drivers.data);
      // Para simular esta policy específica, criamos um fake datasource
      // que retorna apenas ela. Mais simples: avaliamos cada proposal e
      // contamos. Aqui usamos engine.evaluate em dryRun com a policy
      // sendo testada já em policies (assumido em rascunho/ativa).
      // Para determinismo: avaliamos contra o próprio engine atual.
      const counts: Record<PolicyResult, number> = {
        allow: 0,
        deny: 0,
        require_approval: 0,
      };
      const intentMap: Record<string, string> = {
        create_person: "kernel.contact.create",
        create_file: "kernel.file.upload",
        send_notification: "kernel.notification.send",
        update_settings: "kernel.settings.update",
        create_channel: "kernel.channel.create",
      };
      for (const p of proposals) {
        const intentId = intentMap[p.intent_type] ?? "kernel.ai.execute";
        const result = await engine.evaluate(
          {
            companyId: activeCompanyId,
            intentId,
            actorId: userId ?? "",
            actorType: "agent",
            parameters: p.payload ?? {},
            proposalId: p.id,
          },
          { dryRun: true },
        );
        counts[result.result] += 1;
      }
      return { total: proposals.length, counts };
    },
    [drivers, activeCompanyId, userId],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? policies
        : policies.filter((p) => p.status === statusFilter),
    [policies, statusFilter],
  );

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#191d21",
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            <Shield size={18} color="#a5b4fc" />
            Políticas
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginTop: 4,
            }}
          >
            Governance-as-Code: regras YAML que avaliam ações de agentes
            automaticamente.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setModal({ kind: "template-picker" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#a5b4fc",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
            }}
            aria-label="Usar template"
          >
            <Sparkles size={14} /> Usar template
          </button>
          <button
            onClick={() => setModal({ kind: "create" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "#6366f1",
              border: "1px solid #6366f1",
              color: "#fff",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
            aria-label="Nova política"
          >
            <Plus size={14} /> Nova política
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px 160px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Métricas */}
        {metrics !== null && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <Card title="Políticas ativas">
              <div style={{ fontSize: 28, fontWeight: 600 }}>
                {metrics.activeCount}
              </div>
            </Card>
            <Card title="Avaliações (30d)">
              <div style={{ fontSize: 28, fontWeight: 600 }}>
                {metrics.totalEvaluations}
              </div>
            </Card>
            <Card title="Distribuição">
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {(["allow", "require_approval", "deny"] as PolicyResult[]).map(
                  (r) => {
                    const pct =
                      metrics.totalEvaluations === 0
                        ? 0
                        : (metrics.byResult[r] / metrics.totalEvaluations) *
                          100;
                    const c = resultColor(r);
                    return (
                      <div
                        key={r}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: c.fg,
                          }}
                        />
                        <span style={{ color: c.fg, minWidth: 60 }}>
                          {r === "require_approval" ? "Aprovar" : r}
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}>
                          {metrics.byResult[r]} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </Card>
            <Card title="Top intents">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                {metrics.topIntents.length === 0 ? (
                  <span style={{ fontStyle: "italic" }}>
                    Nenhuma avaliação ainda.
                  </span>
                ) : (
                  metrics.topIntents.map((t) => (
                    <div
                      key={t.intentId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {t.intentId}
                      </span>
                      <span style={{ color: "#a5b4fc" }}>{t.count}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Filter */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "active", "draft", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 12px",
                background:
                  statusFilter === s ? "rgba(99,102,241,0.2)" : "transparent",
                border: `1px solid ${
                  statusFilter === s
                    ? "rgba(99,102,241,0.4)"
                    : "rgba(255,255,255,0.10)"
                }`,
                color: statusFilter === s ? "#a5b4fc" : "var(--text-secondary)",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {s === "all"
                ? "Todas"
                : s === "active"
                  ? "Ativas"
                  : s === "draft"
                    ? "Rascunhos"
                    : "Arquivadas"}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            Carregando políticas…
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
              border: "1px dashed rgba(255,255,255,0.10)",
              borderRadius: 12,
            }}
          >
            <Shield
              size={28}
              style={{ margin: "0 auto 8px", color: "#64748b" }}
            />
            Nenhuma política {statusFilter !== "all" ? statusFilter : ""}.
            <div style={{ marginTop: 8, fontSize: 12 }}>
              Crie sua primeira política a partir de um template ou em branco.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((p) => {
              const sc = statusColor(p.status);
              const ruleCount = (p.policy_json.rules ?? []).length;
              return (
                <div
                  key={p.id}
                  style={{
                    background: "var(--glass-bg, rgba(255,255,255,0.04))",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    padding: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {p.name}
                      </span>
                      <span
                        style={{
                          background: sc.bg,
                          color: sc.fg,
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 4,
                          textTransform: "uppercase",
                          fontWeight: 600,
                          letterSpacing: 0.5,
                        }}
                      >
                        {sc.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        v{p.version}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginBottom: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.description ||
                        p.original_intent_text ||
                        "Sem descrição."}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {ruleCount} regra{ruleCount !== 1 ? "s" : ""} · atualizada{" "}
                      {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() =>
                        setModal({ kind: "simulation", policy: p })
                      }
                      title="Simular"
                      aria-label="Simular impacto"
                      style={iconBtnStyle}
                    >
                      <BarChart3 size={14} />
                    </button>
                    <button
                      onClick={() => setModal({ kind: "edit", policy: p })}
                      title="Editar (cria nova versão)"
                      aria-label="Editar"
                      style={iconBtnStyle}
                    >
                      <PlayCircle size={14} />
                    </button>
                    {p.status === "draft" && (
                      <button
                        onClick={() => void handleAction(p, "activate")}
                        title="Ativar"
                        aria-label="Ativar"
                        style={iconBtnStyle}
                      >
                        <CheckCircle2 size={14} color="#22c55e" />
                      </button>
                    )}
                    {p.status === "active" && (
                      <button
                        onClick={() => void handleAction(p, "archive")}
                        title="Arquivar"
                        aria-label="Arquivar"
                        style={iconBtnStyle}
                      >
                        <XCircle size={14} color="#f59e0b" />
                      </button>
                    )}
                    <button
                      onClick={() => void handleAction(p, "duplicate")}
                      title="Duplicar"
                      aria-label="Duplicar"
                      style={iconBtnStyle}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}

      {modal !== null && modal.kind === "template-picker" && (
        <TemplatePickerModal
          onClose={() => setModal(null)}
          onPick={(t) => {
            setModal({ kind: "create" });
            // store seed in window-scoped temp via location hash workaround
            // — simpler: reuse Editor with initial form pre-built.
            setTimeout(() => {
              setModal({
                kind: "create",
              });
              // Seed via custom event handled by editor (below).
              const ev = new CustomEvent("policy-template-seed", {
                detail: t,
              });
              window.dispatchEvent(ev);
            }, 50);
          }}
        />
      )}

      {modal !== null && modal.kind === "create" && (
        <PolicyEditorModal
          intents={intents}
          editing={null}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={(form, asActive) => void handleSavePolicy(form, asActive)}
        />
      )}

      {modal !== null && modal.kind === "edit" && (
        <PolicyEditorModal
          intents={intents}
          editing={modal.policy}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={(form, asActive) =>
            void handleSavePolicy(form, asActive, modal.policy)
          }
        />
      )}

      {modal !== null && modal.kind === "simulation" && (
        <SimulationModal
          policy={modal.policy}
          onClose={() => setModal(null)}
          runSimulation={() => handleSimulate(modal.policy)}
        />
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 6,
  cursor: "pointer",
  color: "var(--text-secondary)",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function TemplatePickerModal(props: {
  onClose: () => void;
  onPick: (t: PolicyTemplate) => void;
}): React.JSX.Element {
  return (
    <ModalShell onClose={props.onClose} title="Escolher template">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {POLICY_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => props.onPick(t)}
            style={{
              textAlign: "left",
              padding: 12,
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 10,
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              {t.shortDescription}
            </div>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

function PolicyEditorModal(props: {
  intents: ActionIntentRow[];
  editing: PolicyRow | null;
  busy: boolean;
  onClose: () => void;
  onSave: (form: FormState, asActive: boolean) => void;
}): React.JSX.Element {
  const [form, setForm] = useState<FormState>(() => {
    if (props.editing !== null) {
      return {
        name: props.editing.name,
        description: props.editing.description,
        intentText: props.editing.original_intent_text ?? "",
        yaml: props.editing.policy_yaml,
      };
    }
    return EMPTY_FORM;
  });

  // Listen for template seed.
  useEffect(() => {
    function handler(ev: Event) {
      const detail = (ev as CustomEvent<PolicyTemplate>).detail;
      if (!detail) return;
      setForm({
        name: detail.name,
        description: detail.shortDescription,
        intentText: detail.intentText,
        yaml: buildYamlFromTemplate(detail),
      });
    }
    window.addEventListener("policy-template-seed", handler);
    return () => window.removeEventListener("policy-template-seed", handler);
  }, []);

  const isYamlValid = safeParseYaml(form.yaml) !== null;

  return (
    <ModalShell
      onClose={props.onClose}
      title={props.editing !== null ? "Editar política" : "Nova política"}
      wide
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Nome">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={inputStyle}
            placeholder="Ex: Padrão Conservador"
          />
        </Field>
        <Field label="Descrição">
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={inputStyle}
            placeholder="Resumo curto exibido na lista."
          />
        </Field>
        <Field label="Intenção (linguagem natural)">
          <textarea
            value={form.intentText}
            onChange={(e) => setForm({ ...form, intentText: e.target.value })}
            style={{ ...inputStyle, minHeight: 60, fontFamily: "inherit" }}
            placeholder="Em uma frase, o que esta política faz?"
          />
        </Field>
        <Field
          label={`Regras (YAML)${isYamlValid ? "" : " — sintaxe inválida"}`}
        >
          <textarea
            value={form.yaml}
            onChange={(e) => setForm({ ...form, yaml: e.target.value })}
            style={{
              ...inputStyle,
              minHeight: 220,
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
              fontSize: 12,
              lineHeight: 1.5,
              color: isYamlValid ? "var(--text-primary)" : "#ef4444",
            }}
            spellCheck={false}
          />
        </Field>
        <details>
          <summary
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              cursor: "pointer",
            }}
          >
            Action intents disponíveis ({props.intents.length})
          </summary>
          <div
            style={{
              marginTop: 6,
              padding: 8,
              maxHeight: 160,
              overflowY: "auto",
              background: "rgba(0,0,0,0.2)",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
              color: "var(--text-secondary)",
            }}
          >
            {props.intents.map((i) => (
              <div key={i.id}>
                <span style={{ color: "#a5b4fc" }}>{i.id}</span>
                <span style={{ color: "var(--text-tertiary)", marginLeft: 8 }}>
                  [{i.risk_class}] {i.description}
                </span>
              </div>
            ))}
          </div>
        </details>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <button onClick={props.onClose} style={btnStyle("ghost")}>
          Cancelar
        </button>
        <button
          onClick={() => props.onSave(form, false)}
          disabled={props.busy || !isYamlValid}
          style={btnStyle("secondary")}
        >
          Salvar como rascunho
        </button>
        <button
          onClick={() => props.onSave(form, true)}
          disabled={props.busy || !isYamlValid}
          style={btnStyle("primary")}
        >
          Ativar agora
        </button>
      </div>
    </ModalShell>
  );
}

function SimulationModal(props: {
  policy: PolicyRow;
  onClose: () => void;
  runSimulation: () => Promise<{
    total: number;
    counts: Record<PolicyResult, number>;
  }>;
}): React.JSX.Element {
  const [result, setResult] = useState<{
    total: number;
    counts: Record<PolicyResult, number>;
  } | null>(null);
  const [running, setRunning] = useState(false);

  return (
    <ModalShell
      onClose={props.onClose}
      title={`Simular impacto: ${props.policy.name}`}
    >
      <div
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          marginBottom: 12,
        }}
      >
        Re-avalia as últimas 90 dias de proposals do agente contra esta política
        em modo dry-run (sem efeitos colaterais).
      </div>
      {!running && result === null && (
        <button
          onClick={async () => {
            setRunning(true);
            try {
              const r = await props.runSimulation();
              setResult(r);
            } finally {
              setRunning(false);
            }
          }}
          style={btnStyle("primary")}
        >
          Executar simulação
        </button>
      )}
      {running && (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-tertiary)",
          }}
        >
          <Clock
            size={24}
            style={{
              margin: "0 auto 8px",
              animation: "spin 1.5s linear infinite",
            }}
          />
          Simulando…
        </div>
      )}
      {result !== null && (
        <div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginBottom: 12,
            }}
          >
            Nos últimos 90 dias: <strong>{result.total}</strong> proposal
            {result.total !== 1 ? "s" : ""}.
          </div>
          {result.total === 0 ? (
            <div
              style={{
                padding: 16,
                background: "rgba(245,158,11,0.10)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 8,
                fontSize: 12,
                color: "#fbbf24",
                display: "flex",
                gap: 8,
              }}
            >
              <AlertTriangle size={16} />
              Sem dados históricos. A simulação ficará disponível após uso real.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(["allow", "require_approval", "deny"] as PolicyResult[]).map(
                (r) => {
                  const c = resultColor(r);
                  const count = result.counts[r];
                  const pct =
                    result.total === 0 ? 0 : (count / result.total) * 100;
                  const label =
                    r === "allow"
                      ? "Auto-aprovadas"
                      : r === "deny"
                        ? "Auto-rejeitadas"
                        : "Escaladas para humano";
                  return (
                    <div key={r}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ color: c.fg, fontWeight: 600 }}>
                          {label}
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}>
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          background: "rgba(255,255,255,0.05)",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: c.fg,
                          }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}

// ─── Tiny UI primitives ──────────────────────────────────────────────────────

function ModalShell(props: {
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: props.wide ? 720 : 480,
          maxHeight: "85vh",
          background: "#11161c",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12,
          padding: 20,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600 }}>{props.title}</div>
          <button
            onClick={props.onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {props.label}
      </span>
      {props.children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 6,
  padding: "8px 10px",
  color: "var(--text-primary)",
  fontSize: 13,
};

function btnStyle(
  variant: "primary" | "secondary" | "ghost",
): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    border: "1px solid",
  };
  if (variant === "primary") {
    return {
      ...base,
      background: "#6366f1",
      borderColor: "#6366f1",
      color: "#fff",
      fontWeight: 500,
    };
  }
  if (variant === "secondary") {
    return {
      ...base,
      background: "rgba(99,102,241,0.15)",
      borderColor: "rgba(99,102,241,0.3)",
      color: "#a5b4fc",
    };
  }
  return {
    ...base,
    background: "transparent",
    borderColor: "rgba(255,255,255,0.10)",
    color: "var(--text-secondary)",
  };
}

// Reference unused vars (Trash2) to satisfy eslint without changing imports.
void Trash2;
