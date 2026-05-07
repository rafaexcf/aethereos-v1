/**
 * Super Sprint D / MX229 — Coreografias UI.
 *
 * Aba avançada do app Automacoes. Lista coreografias da company,
 * permite ativar/pausar, criar a partir de template ou YAML livre,
 * e ver histórico de execuções recentes.
 *
 * Vs aba Simples (kernel.automations 1:1 trigger→action), Coreografias
 * suportam multi-step, condições e Policy Engine (steps com agente).
 */

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import yaml from "js-yaml";
import {
  Sparkles,
  Plus,
  Power,
  PowerOff,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  X,
  History,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useModalA11y } from "../../components/shared/useModalA11y";
import { EmptyState } from "../../components/shared/EmptyState";
import {
  CHOREOGRAPHY_TEMPLATES,
  type ChoreographyTemplate,
} from "./choreography-templates";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChoreographyRow {
  id: string;
  company_id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "paused" | "archived";
  trigger_event_type: string;
  steps: unknown;
  choreography_yaml: string;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
}

interface ExecutionRow {
  id: string;
  choreography_id: string;
  status:
    | "running"
    | "completed"
    | "failed"
    | "cancelled"
    | "awaiting_approval";
  trigger_event_type: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
  steps_completed: unknown;
}

interface ChoreographyPayload {
  name: string;
  description?: string;
  trigger_event_type: string;
  trigger_condition?: Record<string, unknown> | null;
  error_handling?: { on_failure: "notify_human" | "abort" | "skip" };
  steps: Array<Record<string, unknown>>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseYaml(
  text: string,
): { ok: true; data: ChoreographyPayload } | { ok: false; error: string } {
  try {
    const parsed = yaml.load(text) as unknown;
    if (parsed === null || typeof parsed !== "object") {
      return { ok: false, error: "YAML deve ser um objeto" };
    }
    const obj = parsed as Record<string, unknown>;
    if (typeof obj["name"] !== "string" || obj["name"].trim().length === 0) {
      return { ok: false, error: "Campo 'name' obrigatório (string)" };
    }
    if (
      typeof obj["trigger_event_type"] !== "string" ||
      obj["trigger_event_type"].trim().length === 0
    ) {
      return {
        ok: false,
        error: "Campo 'trigger_event_type' obrigatório (string)",
      };
    }
    if (!Array.isArray(obj["steps"]) || obj["steps"].length === 0) {
      return {
        ok: false,
        error: "Campo 'steps' obrigatório (array com 1+ steps)",
      };
    }
    return { ok: true, data: obj as unknown as ChoreographyPayload };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "YAML inválido",
    };
  }
}

function formatTimestamp(iso: string | null): string {
  if (iso === null) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BTN_PRIMARY: React.CSSProperties = {
  background: "#10b981",
  border: "none",
  borderRadius: 8,
  color: "white",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 14px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
const BTN_GHOST: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "var(--text-secondary)",
  fontSize: 13,
  padding: "8px 14px",
  cursor: "pointer",
};

// ─── Editor modal ───────────────────────────────────────────────────────────

interface EditorState {
  id: string | null;
  yamlText: string;
}

function ChoreographyEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: EditorState;
  onClose: () => void;
  onSave: (state: EditorState) => Promise<void>;
}) {
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose });
  const [state, setState] = useState<EditorState>(initial);
  const [saving, setSaving] = useState(false);
  const validation = useMemo(() => parseYaml(state.yamlText), [state.yamlText]);

  async function handleSave(): Promise<void> {
    if (!validation.ok || saving) return;
    setSaving(true);
    try {
      await onSave(state);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "rgba(0,0,0,0.60)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={
          initial.id === null ? "Criar coreografia" : "Editar coreografia"
        }
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#11161c",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: 20,
          width: 640,
          maxWidth: "92vw",
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {initial.id === null ? "Nova coreografia" : "Editar coreografia"}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
            }}
          >
            <X size={16} />
          </button>
        </header>

        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
          }}
        >
          Defina trigger e steps em YAML. Variáveis disponíveis:{" "}
          <code>{"{{trigger.payload.x}}"}</code>,{" "}
          <code>{"{{trigger.actor_id}}"}</code>.
        </p>

        <textarea
          value={state.yamlText}
          onChange={(e) =>
            setState((s) => ({ ...s, yamlText: e.target.value }))
          }
          spellCheck={false}
          aria-label="YAML da coreografia"
          style={{
            flex: 1,
            minHeight: 280,
            background: "rgba(0,0,0,0.30)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 8,
            color: "var(--text-secondary)",
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            padding: 12,
            outline: "none",
            resize: "vertical",
          }}
        />

        {validation.ok ? (
          <div
            style={{
              fontSize: 12,
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CheckCircle2 size={13} /> YAML válido — trigger{" "}
            {validation.data.trigger_event_type}, {validation.data.steps.length}{" "}
            step
            {validation.data.steps.length === 1 ? "" : "s"}
          </div>
        ) : (
          <div
            style={{
              fontSize: 12,
              color: "#f87171",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <AlertTriangle size={13} /> {validation.error}
          </div>
        )}

        <footer style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={BTN_GHOST}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!validation.ok || saving}
            style={{
              ...BTN_PRIMARY,
              opacity: !validation.ok || saving ? 0.5 : 1,
            }}
          >
            {saving ? "Salvando…" : "Salvar como rascunho"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─── Templates picker ───────────────────────────────────────────────────────

function TemplatesPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (template: ChoreographyTemplate) => void;
}) {
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose });
  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "rgba(0,0,0,0.60)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Escolher template"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#11161c",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: 20,
          width: 720,
          maxWidth: "94vw",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Usar template
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
            }}
          >
            <X size={16} />
          </button>
        </header>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          {CHOREOGRAPHY_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              style={{
                textAlign: "left",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: 12,
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: 12,
                lineHeight: 1.45,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={12} color="#a78bfa" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {t.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    marginLeft: "auto",
                  }}
                >
                  {t.category}
                </span>
              </span>
              <span style={{ color: "var(--text-tertiary)" }}>
                {t.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Executions drawer ──────────────────────────────────────────────────────

function ExecutionsDrawer({
  choreography,
  onClose,
}: {
  choreography: ChoreographyRow;
  onClose: () => void;
}) {
  const drivers = useDrivers();
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose });
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (drivers === null) return;
    const d = drivers;
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      const { data } = await d.data
        .from("choreography_executions")
        .select("*")
        .eq("choreography_id", choreography.id)
        .order("started_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      setExecutions((data ?? []) as ExecutionRow[]);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [drivers, choreography.id]);

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "rgba(0,0,0,0.60)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Histórico de execuções"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#11161c",
          borderLeft: "1px solid rgba(255,255,255,0.10)",
          width: 480,
          maxWidth: "92vw",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <History size={16} color="#a78bfa" />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              flex: 1,
            }}
          >
            {choreography.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
            }}
          >
            <X size={16} />
          </button>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 160px" }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              Carregando…
            </p>
          ) : executions.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              Nenhuma execução ainda.
            </p>
          ) : (
            executions.map((e) => (
              <article
                key={e.id}
                style={{
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  marginBottom: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <StatusDot status={e.status} />
                  <span
                    style={{ color: "var(--text-primary)", fontWeight: 600 }}
                  >
                    {e.status}
                  </span>
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      marginLeft: "auto",
                    }}
                  >
                    {formatTimestamp(e.started_at)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  trigger: {e.trigger_event_type}
                </div>
                {e.error !== null && (
                  <div style={{ fontSize: 11, color: "#f87171" }}>
                    {e.error}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({
  status,
}: {
  status: ExecutionRow["status"];
}): React.ReactElement {
  const color =
    status === "completed"
      ? "#34d399"
      : status === "failed"
        ? "#f87171"
        : status === "cancelled"
          ? "var(--text-tertiary)"
          : status === "awaiting_approval"
            ? "#f59e0b"
            : "#60a5fa";
  return (
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        background: color,
        display: "inline-block",
      }}
    />
  );
}

// ─── Main view ──────────────────────────────────────────────────────────────

const BLANK_YAML = `name: ""
description: ""
trigger_event_type: ""
trigger_condition: null
error_handling:
  on_failure: "notify_human"
steps:
  - id: "step1"
    intent: ""
    inputs: {}
    emit: ""
`;

export function ChoreographiesView(): React.ReactElement {
  const drivers = useDrivers();
  const companyId = useSessionStore((s) => s.activeCompanyId);

  const [rows, setRows] = useState<ChoreographyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const [viewingHistory, setViewingHistory] = useState<ChoreographyRow | null>(
    null,
  );

  useEffect(() => {
    if (drivers === null || companyId === null) return;
    const d = drivers;
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      const { data } = await d.data
        .from("choreographies")
        .select("*")
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      setRows((data ?? []) as ChoreographyRow[]);
      setLoading(false);
    }
    void load();

    const sub = d.data.subscribeToTable({
      table: "choreographies",
      event: "*",
      onData: () => {
        void load();
      },
    });
    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [drivers, companyId]);

  async function handleSave(state: EditorState): Promise<void> {
    if (drivers === null || companyId === null) return;
    const validation = parseYaml(state.yamlText);
    if (!validation.ok) return;
    const data = validation.data;
    const payload = {
      company_id: companyId,
      name: data.name,
      description: data.description ?? "",
      choreography_yaml: state.yamlText,
      choreography_json: data as unknown as Record<string, unknown>,
      trigger_event_type: data.trigger_event_type,
      trigger_condition: data.trigger_condition ?? null,
      steps: data.steps,
      error_handling: data.error_handling ?? { on_failure: "notify_human" },
      status: "draft" as const,
    };
    if (state.id === null) {
      await drivers.data.from("choreographies").insert(payload);
    } else {
      await drivers.data
        .from("choreographies")
        .update(payload)
        .eq("id", state.id);
    }
    setEditor(null);
  }

  async function handleToggleStatus(row: ChoreographyRow): Promise<void> {
    if (drivers === null) return;
    const next = row.status === "active" ? "paused" : "active";
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)),
    );
    await drivers.data
      .from("choreographies")
      .update({ status: next })
      .eq("id", row.id);
  }

  async function handleDelete(row: ChoreographyRow): Promise<void> {
    if (drivers === null) return;
    if (!confirm(`Arquivar "${row.name}"?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    await drivers.data
      .from("choreographies")
      .update({ status: "archived" })
      .eq("id", row.id);
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Coreografias
        </span>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", flex: 1 }}>
          {rows.length} {rows.length === 1 ? "fluxo" : "fluxos"}
        </span>
        <button
          type="button"
          onClick={() => setPickingTemplate(true)}
          style={BTN_GHOST}
        >
          <Sparkles size={13} style={{ marginRight: 6 }} />
          Templates
        </button>
        <button
          type="button"
          onClick={() => setEditor({ id: null, yamlText: BLANK_YAML })}
          style={BTN_PRIMARY}
        >
          <Plus size={14} />
          Nova
        </button>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px 160px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            Carregando…
          </p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="Sparkles"
            iconColor="#a78bfa"
            title="Nenhuma coreografia"
            description="Coreografias são fluxos multi-step disparados por eventos do SCP. Comece por um template ou escreva o YAML do zero."
            action={
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setPickingTemplate(true)}
                  style={BTN_GHOST}
                >
                  Ver templates
                </button>
                <button
                  type="button"
                  onClick={() => setEditor({ id: null, yamlText: BLANK_YAML })}
                  style={BTN_PRIMARY}
                >
                  Nova coreografia
                </button>
              </div>
            }
          />
        ) : (
          rows
            .filter((r) => r.status !== "archived")
            .map((row) => (
              <article
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background:
                      row.status === "active"
                        ? "rgba(167,139,250,0.18)"
                        : "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Sparkles
                    size={16}
                    color={
                      row.status === "active"
                        ? "#a78bfa"
                        : "var(--text-tertiary)"
                    }
                  />
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color:
                          row.status === "active"
                            ? "var(--text-primary)"
                            : "var(--text-tertiary)",
                      }}
                    >
                      {row.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {row.status}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "2px 6px",
                    }}
                  >
                    <span style={{ color: "var(--text-tertiary)" }}>
                      QUANDO
                    </span>
                    <span>{row.trigger_event_type}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>
                      · EXECUÇÕES
                    </span>
                    <span>{row.execution_count}</span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock3 size={11} /> última:{" "}
                    {formatTimestamp(row.last_executed_at)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => void handleToggleStatus(row)}
                    aria-label={row.status === "active" ? "Pausar" : "Ativar"}
                    aria-pressed={row.status === "active"}
                    title={row.status === "active" ? "Pausar" : "Ativar"}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 6,
                      display: "flex",
                      color:
                        row.status === "active"
                          ? "#a78bfa"
                          : "var(--text-tertiary)",
                    }}
                  >
                    {row.status === "active" ? (
                      <Power size={15} />
                    ) : (
                      <PowerOff size={15} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingHistory(row)}
                    aria-label="Histórico"
                    title="Histórico"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 6,
                      display: "flex",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <History size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditor({ id: row.id, yamlText: row.choreography_yaml })
                    }
                    aria-label="Editar"
                    title="Editar"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 6,
                      display: "flex",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(row)}
                    aria-label="Arquivar"
                    title="Arquivar"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 6,
                      display: "flex",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))
        )}
      </div>

      {editor !== null && (
        <ChoreographyEditor
          initial={editor}
          onClose={() => setEditor(null)}
          onSave={handleSave}
        />
      )}
      {pickingTemplate && (
        <TemplatesPicker
          onClose={() => setPickingTemplate(false)}
          onPick={(t) => {
            setPickingTemplate(false);
            setEditor({ id: null, yamlText: t.yaml });
          }}
        />
      )}
      {viewingHistory !== null && (
        <ExecutionsDrawer
          choreography={viewingHistory}
          onClose={() => setViewingHistory(null)}
        />
      )}
    </div>
  );
}
