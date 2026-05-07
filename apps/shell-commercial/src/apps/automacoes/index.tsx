import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Workflow,
  Plus,
  Trash2,
  Pencil,
  X,
  Zap,
  Power,
  PowerOff,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Sparkles,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useModalA11y } from "../../components/shared/useModalA11y";
import { EmptyState } from "../../components/shared/EmptyState";
import {
  ACTION_DEFS,
  TRIGGER_DEFS,
  getActionDef,
  getTriggerDef,
  type ActionFieldDef,
  type ActionId,
  type TriggerFieldDef,
  type TriggerId,
} from "./registry";
import { ChoreographiesView } from "./choreographies";

type AutomacoesMode = "simple" | "advanced";

interface AutomationRow {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  enabled: boolean;
  trigger_type: TriggerId;
  trigger_config: Record<string, unknown>;
  action_type: ActionId;
  action_config: Record<string, unknown>;
  last_run_at: string | null;
  last_run_status: "success" | "error" | "skipped" | null;
  created_at: string;
  updated_at: string;
}

type FilterId = "all" | "enabled" | "disabled" | "errors";

const FILTERS: ReadonlyArray<{
  id: FilterId;
  label: string;
  icon: typeof Workflow;
}> = [
  { id: "all", label: "Todas", icon: Workflow },
  { id: "enabled", label: "Ativas", icon: Power },
  { id: "disabled", label: "Desativadas", icon: PowerOff },
  { id: "errors", label: "Com erro", icon: AlertTriangle },
];

const ASIDE_STYLE: React.CSSProperties = {
  width: 220,
  background: "#11161c",
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
  boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
  overflowY: "auto",
};

const SIDEBAR_LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "var(--text-tertiary)",
  padding: "16px 16px 8px",
};

function emptyConfigForTrigger(triggerId: TriggerId): Record<string, unknown> {
  const def = getTriggerDef(triggerId);
  if (def === undefined) return {};
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    out[f.key] = f.type === "number" ? 0 : "";
  }
  return out;
}

function emptyConfigForAction(actionId: ActionId): Record<string, unknown> {
  const def = getActionDef(actionId);
  if (def === undefined) return {};
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    out[f.key] = "";
  }
  if (actionId === "notify") out["type"] = "info";
  return out;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TriggerFieldDef | ActionFieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const baseStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 8,
    color: "var(--text-secondary)",
    fontSize: 13,
    padding: "8px 10px",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  if (
    field.type === "select" &&
    "options" in field &&
    field.options !== undefined
  ) {
    return (
      <select
        aria-label={field.label}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        style={baseStyle}
      >
        {field.options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            style={{ background: "#11161c" }}
          >
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        aria-label={field.label}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
        style={{ ...baseStyle, resize: "vertical", minHeight: 64 }}
      />
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        aria-label={field.label}
        value={
          typeof value === "number"
            ? value
            : typeof value === "string"
              ? value
              : ""
        }
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        placeholder={field.placeholder}
        style={baseStyle}
      />
    );
  }

  if (field.type === "time") {
    return (
      <input
        type="time"
        aria-label={field.label}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        style={baseStyle}
      />
    );
  }

  return (
    <input
      type={field.type === "url" ? "url" : "text"}
      aria-label={field.label}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      style={baseStyle}
    />
  );
}

interface EditorState {
  id: string | null;
  name: string;
  triggerType: TriggerId;
  triggerConfig: Record<string, unknown>;
  actionType: ActionId;
  actionConfig: Record<string, unknown>;
  enabled: boolean;
}

function makeBlankEditor(): EditorState {
  return {
    id: null,
    name: "",
    triggerType: "task.created",
    triggerConfig: emptyConfigForTrigger("task.created"),
    actionType: "notify",
    actionConfig: emptyConfigForAction("notify"),
    enabled: true,
  };
}

function AutomationModal({
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

  const triggerDef = useMemo(
    () => getTriggerDef(state.triggerType),
    [state.triggerType],
  );
  const actionDef = useMemo(
    () => getActionDef(state.actionType),
    [state.actionType],
  );

  const canSave =
    state.name.trim().length > 0 &&
    triggerDef !== undefined &&
    actionDef !== undefined &&
    triggerDef.fields.every(
      (f) => !f.required || String(state.triggerConfig[f.key] ?? "").length > 0,
    ) &&
    actionDef.fields.every(
      (f) => !f.required || String(state.actionConfig[f.key] ?? "").length > 0,
    );

  function setTrigger(id: TriggerId) {
    setState((s) => ({
      ...s,
      triggerType: id,
      triggerConfig: emptyConfigForTrigger(id),
    }));
  }

  function setAction(id: ActionId) {
    setState((s) => ({
      ...s,
      actionType: id,
      actionConfig: emptyConfigForAction(id),
    }));
  }

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSave(state);
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.60)",
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={state.id !== null ? "Editar automação" : "Nova automação"}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#11161c",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          width: 520,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Zap size={16} color="#10b981" />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              flex: 1,
            }}
          >
            {state.id !== null ? "Editar automação" : "Nova automação"}
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
              padding: 4,
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={SIDEBAR_LABEL_STYLE_INLINE}>Nome</label>
            <input
              type="text"
              value={state.name}
              onChange={(e) =>
                setState((s) => ({ ...s, name: e.target.value }))
              }
              placeholder="Ex: Notificar tarefas urgentes"
              aria-label="Nome da automação"
              style={INPUT_STYLE}
              maxLength={120}
            />
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={SIDEBAR_LABEL_STYLE_INLINE}>Quando (gatilho)</label>
            <select
              value={state.triggerType}
              onChange={(e) => setTrigger(e.target.value as TriggerId)}
              aria-label="Tipo de gatilho"
              style={INPUT_STYLE}
            >
              {TRIGGER_DEFS.map((t) => (
                <option
                  key={t.id}
                  value={t.id}
                  style={{ background: "#11161c" }}
                >
                  {t.label}
                </option>
              ))}
            </select>
            {triggerDef !== undefined && (
              <p style={HELP_STYLE}>{triggerDef.description}</p>
            )}
            {triggerDef !== undefined &&
              triggerDef.fields.map((f) => (
                <div
                  key={f.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginTop: 6,
                  }}
                >
                  <span style={FIELD_LABEL_STYLE}>
                    {f.label}
                    {f.required ? " *" : ""}
                  </span>
                  <FieldInput
                    field={f}
                    value={state.triggerConfig[f.key]}
                    onChange={(v) =>
                      setState((s) => ({
                        ...s,
                        triggerConfig: { ...s.triggerConfig, [f.key]: v },
                      }))
                    }
                  />
                  {f.helpText !== undefined && (
                    <span style={HELP_STYLE}>{f.helpText}</span>
                  )}
                </div>
              ))}
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={SIDEBAR_LABEL_STYLE_INLINE}>Então (ação)</label>
            <select
              value={state.actionType}
              onChange={(e) => setAction(e.target.value as ActionId)}
              aria-label="Tipo de ação"
              style={INPUT_STYLE}
            >
              {ACTION_DEFS.map((a) => (
                <option
                  key={a.id}
                  value={a.id}
                  style={{ background: "#11161c" }}
                >
                  {a.label}
                </option>
              ))}
            </select>
            {actionDef !== undefined && (
              <p style={HELP_STYLE}>{actionDef.description}</p>
            )}
            {actionDef !== undefined &&
              actionDef.fields.map((f) => (
                <div
                  key={f.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginTop: 6,
                  }}
                >
                  <span style={FIELD_LABEL_STYLE}>
                    {f.label}
                    {f.required ? " *" : ""}
                  </span>
                  <FieldInput
                    field={f}
                    value={state.actionConfig[f.key]}
                    onChange={(v) =>
                      setState((s) => ({
                        ...s,
                        actionConfig: { ...s.actionConfig, [f.key]: v },
                      }))
                    }
                  />
                  {f.helpText !== undefined && (
                    <span style={HELP_STYLE}>{f.helpText}</span>
                  )}
                </div>
              ))}
          </section>

          <section style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="automation-enabled"
              checked={state.enabled}
              onChange={(e) =>
                setState((s) => ({ ...s, enabled: e.target.checked }))
              }
            />
            <label
              htmlFor="automation-enabled"
              style={{ fontSize: 13, color: "var(--text-secondary)" }}
            >
              Ativada (executa quando o gatilho disparar)
            </label>
          </section>
        </div>

        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button type="button" onClick={onClose} style={BTN_GHOST_STYLE}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => void handleSave()}
            style={{
              ...BTN_PRIMARY_STYLE,
              opacity: canSave && !saving ? 1 : 0.5,
              cursor: canSave && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Salvando…" : state.id !== null ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const SIDEBAR_LABEL_STYLE_INLINE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-tertiary)",
};

const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-tertiary)",
};

const HELP_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-tertiary)",
  margin: 0,
  lineHeight: 1.4,
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "var(--text-secondary)",
  fontSize: 13,
  padding: "8px 10px",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const BTN_GHOST_STYLE: React.CSSProperties = {
  padding: "7px 14px",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "var(--text-secondary)",
  fontSize: 13,
  cursor: "pointer",
};

const BTN_PRIMARY_STYLE: React.CSSProperties = {
  padding: "7px 14px",
  background: "#10b981",
  border: "none",
  borderRadius: 8,
  color: "white",
  fontSize: 13,
  fontWeight: 600,
};

function DeleteConfirm({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose: onCancel });
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.60)",
      }}
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar exclusão"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#11161c",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: 24,
          width: 360,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <AlertTriangle
            size={20}
            color="#f87171"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              Excluir automação?
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              "{name}" será removida permanentemente.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onCancel} style={BTN_GHOST_STYLE}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ ...BTN_PRIMARY_STYLE, background: "#ef4444" }}
          >
            Excluir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function StatusBadge({ row }: { row: AutomationRow }) {
  if (row.last_run_at === null) {
    return (
      <span
        style={{
          fontSize: 11,
          color: "var(--text-tertiary)",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Clock3 size={11} />
        nunca executou
      </span>
    );
  }
  const date = new Date(row.last_run_at);
  const ts = date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (row.last_run_status === "error") {
    return (
      <span
        style={{
          fontSize: 11,
          color: "#f87171",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <CircleAlert size={11} /> erro · {ts}
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 11,
        color: "#34d399",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <CheckCircle2 size={11} /> ok · {ts}
    </span>
  );
}

export function AutomacoesApp() {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const companyId = useSessionStore((s) => s.activeCompanyId);

  const [rows, setRows] = useState<AutomationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("all");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AutomationRow | null>(
    null,
  );
  const [mode, setMode] = useState<AutomacoesMode>("simple");

  useEffect(() => {
    if (drivers === null || userId === null || companyId === null) return;
    const d = drivers;
    const uid = userId;
    const cid = companyId;
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      const { data } = await d.data
        .from("automations")
        .select("*")
        .eq("user_id", uid)
        .eq("company_id", cid)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setRows((data ?? []) as AutomationRow[]);
      setLoading(false);
    }

    void load();

    const sub = d.data.subscribeToTable({
      table: "automations",
      event: "*",
      filter: `user_id=eq.${uid}`,
      onData: () => {
        void load();
      },
    });

    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [drivers, userId, companyId]);

  const filtered = useMemo(() => {
    if (filter === "enabled") return rows.filter((r) => r.enabled);
    if (filter === "disabled") return rows.filter((r) => !r.enabled);
    if (filter === "errors")
      return rows.filter((r) => r.last_run_status === "error");
    return rows;
  }, [rows, filter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      enabled: rows.filter((r) => r.enabled).length,
      disabled: rows.filter((r) => !r.enabled).length,
      errors: rows.filter((r) => r.last_run_status === "error").length,
    }),
    [rows],
  );

  async function handleSave(state: EditorState): Promise<void> {
    if (drivers === null || userId === null || companyId === null) return;
    const payload = {
      name: state.name.trim(),
      enabled: state.enabled,
      trigger_type: state.triggerType,
      trigger_config: state.triggerConfig,
      action_type: state.actionType,
      action_config: state.actionConfig,
    };
    if (state.id !== null) {
      await drivers.data.from("automations").update(payload).eq("id", state.id);
    } else {
      await drivers.data.from("automations").insert({
        ...payload,
        user_id: userId,
        company_id: companyId,
      });
    }
    setEditor(null);
  }

  async function handleToggle(row: AutomationRow): Promise<void> {
    if (drivers === null) return;
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, enabled: !r.enabled } : r)),
    );
    await drivers.data
      .from("automations")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);
  }

  async function handleDelete(row: AutomationRow): Promise<void> {
    if (drivers === null) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setConfirmDelete(null);
    await drivers.data.from("automations").delete().eq("id", row.id);
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        background: "#191d21",
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      <aside style={ASIDE_STYLE}>
        <div
          style={{
            padding: "16px 16px 8px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Workflow size={16} color="#10b981" />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Automações
          </span>
        </div>

        <div style={{ padding: "0 12px 12px", display: "flex", gap: 4 }}>
          <button
            type="button"
            onClick={() => setMode("simple")}
            aria-pressed={mode === "simple"}
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: 8,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background:
                mode === "simple"
                  ? "rgba(16,185,129,0.14)"
                  : "rgba(255,255,255,0.04)",
              color: mode === "simple" ? "#10b981" : "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Workflow size={12} />
            Simples
          </button>
          <button
            type="button"
            onClick={() => setMode("advanced")}
            aria-pressed={mode === "advanced"}
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: 8,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background:
                mode === "advanced"
                  ? "rgba(167,139,250,0.18)"
                  : "rgba(255,255,255,0.04)",
              color: mode === "advanced" ? "#a78bfa" : "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Sparkles size={12} />
            Coreografias
          </button>
        </div>

        {mode === "simple" && (
          <button
            type="button"
            onClick={() => setEditor(makeBlankEditor())}
            style={{
              margin: "4px 12px 12px",
              padding: "8px 12px",
              background: "#10b981",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Plus size={14} />
            Nova automação
          </button>
        )}

        <div style={SIDEBAR_LABEL_STYLE}>
          {mode === "simple" ? "Filtros" : "Sobre"}
        </div>

        {mode === "simple" && (
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "0 8px",
              gap: 2,
            }}
          >
            {FILTERS.map((f) => {
              const Icon = f.icon;
              const active = filter === f.id;
              const count = counts[f.id];
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: active
                      ? "rgba(16,185,129,0.10)"
                      : "transparent",
                    color: active ? "#10b981" : "var(--text-secondary)",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Icon size={14} />
                  <span style={{ flex: 1 }}>{f.label}</span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        <div style={SIDEBAR_LABEL_STYLE}>
          {mode === "simple" ? "Limitações" : "Coreografias"}
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            padding: "0 16px 16px",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {mode === "simple"
            ? "Engine roda no navegador. Requer sessão aberta para gatilhos dispararem. Sem retry e sem execução em servidor."
            : "Coreografias rodam no servidor (scp-worker). Suportam multi-step, condições e variáveis {{trigger.payload.x}}. Steps com wait exigem Temporal."}
        </p>
      </aside>

      {mode === "advanced" ? (
        <ChoreographiesView />
      ) : (
        <main
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
              {FILTERS.find((f) => f.id === filter)?.label ?? "Automações"}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              {filtered.length} {filtered.length === 1 ? "regra" : "regras"}
            </span>
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
            ) : filtered.length === 0 ? (
              <EmptyState
                icon="Workflow"
                iconColor="#10b981"
                title={
                  rows.length === 0 ? "Nenhuma automação" : "Nada neste filtro"
                }
                description={
                  rows.length === 0
                    ? "Crie regras 'quando X acontecer, faça Y' — disparam ao vivo enquanto o navegador estiver aberto."
                    : "Tente outro filtro na barra lateral."
                }
                action={
                  rows.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setEditor(makeBlankEditor())}
                      style={{ ...BTN_PRIMARY_STYLE, marginTop: 8 }}
                    >
                      Nova automação
                    </button>
                  ) : undefined
                }
              />
            ) : (
              filtered.map((row) => {
                const triggerDef = getTriggerDef(row.trigger_type);
                const actionDef = getActionDef(row.action_type);
                return (
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
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: row.enabled
                          ? "rgba(16,185,129,0.12)"
                          : "rgba(255,255,255,0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Workflow
                        size={16}
                        color={row.enabled ? "#10b981" : "var(--text-tertiary)"}
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
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: row.enabled
                              ? "var(--text-primary)"
                              : "var(--text-tertiary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.name}
                        </span>
                        {!row.enabled && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--text-tertiary)",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            desativada
                          </span>
                        )}
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
                        <span>
                          {triggerDef !== undefined
                            ? triggerDef.describe(row.trigger_config)
                            : row.trigger_type}
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}>
                          · ENTÃO
                        </span>
                        <span>
                          {actionDef !== undefined
                            ? actionDef.describe(row.action_config)
                            : row.action_type}
                        </span>
                      </div>
                      <StatusBadge row={row} />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => void handleToggle(row)}
                        aria-label={row.enabled ? "Desativar" : "Ativar"}
                        aria-pressed={row.enabled}
                        title={row.enabled ? "Desativar" : "Ativar"}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: 6,
                          display: "flex",
                          color: row.enabled
                            ? "#10b981"
                            : "var(--text-tertiary)",
                        }}
                      >
                        {row.enabled ? (
                          <Power size={15} />
                        ) : (
                          <PowerOff size={15} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditor({
                            id: row.id,
                            name: row.name,
                            triggerType: row.trigger_type,
                            triggerConfig: row.trigger_config,
                            actionType: row.action_type,
                            actionConfig: row.action_config,
                            enabled: row.enabled,
                          })
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
                        onClick={() => setConfirmDelete(row)}
                        aria-label="Excluir"
                        title="Excluir"
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
                );
              })
            )}
          </div>
        </main>
      )}

      {editor !== null && (
        <AutomationModal
          initial={editor}
          onClose={() => setEditor(null)}
          onSave={handleSave}
        />
      )}
      {confirmDelete !== null && (
        <DeleteConfirm
          name={confirmDelete.name}
          onConfirm={() => void handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
