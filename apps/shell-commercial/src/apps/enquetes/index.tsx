import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useModalA11y } from "../../components/shared/useModalA11y";
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  X,
  BarChart2,
  Vote,
  LinkIcon,
  AlertTriangle,
  Download,
  CheckCircle,
  Clock,
  EyeOff,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { moveToTrash } from "../../lib/trash";

// ─── Types ────────────────────────────────────────────────────────────────────

type PollStatus = "draft" | "active" | "closed";
type PollVisibility = "private" | "public";

interface Poll {
  id: string;
  user_id: string;
  title: string;
  description: string;
  visibility: PollVisibility;
  status: PollStatus;
  allow_multiple_answers: boolean;
  show_results_before_close: boolean;
  opens_at: string | null;
  closes_at: string | null;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
}

interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  position: number;
}

interface DraftOption {
  key: string; // form identity key
  dbId: string | null;
  text: string;
}

interface PollDraft {
  title: string;
  description: string;
  visibility: PollVisibility;
  status: PollStatus;
  allow_multiple_answers: boolean;
  show_results_before_close: boolean;
  opens_at: string; // "" or "yyyy-MM-ddTHH:mm"
  closes_at: string;
  options: DraftOption[];
}

type View =
  | { kind: "empty" }
  | { kind: "create" }
  | { kind: "edit"; pollId: string }
  | { kind: "view"; pollId: string; tab: "vote" | "results" };

interface Detail {
  poll: Poll;
  options: PollOption[];
  voteCounts: Map<string, number>;
  totalVotes: number;
  hasVoted: boolean;
  myVotedOptionIds: string[];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isPollOpenNow(poll: Poll): boolean {
  if (poll.status !== "active") return false;
  const now = Date.now();
  if (poll.opens_at && new Date(poll.opens_at).getTime() > now) return false;
  if (poll.closes_at && new Date(poll.closes_at).getTime() < now) return false;
  return true;
}

function shouldShowResults(poll: Poll, isCreator: boolean): boolean {
  if (isCreator) return true;
  if (poll.status === "closed") return true;
  return poll.show_results_before_close;
}

function parsePoll(r: Record<string, unknown>): Poll {
  return {
    id: r["id"] as string,
    user_id: r["user_id"] as string,
    title: r["title"] as string,
    description: (r["description"] as string) ?? "",
    visibility: r["visibility"] as PollVisibility,
    status: r["status"] as PollStatus,
    allow_multiple_answers: r["allow_multiple_answers"] as boolean,
    show_results_before_close: r["show_results_before_close"] as boolean,
    opens_at: (r["opens_at"] as string | null) ?? null,
    closes_at: (r["closes_at"] as string | null) ?? null,
    public_slug: (r["public_slug"] as string | null) ?? null,
    created_at: r["created_at"] as string,
    updated_at: r["updated_at"] as string,
  };
}

function parsePollOption(r: Record<string, unknown>): PollOption {
  return {
    id: r["id"] as string,
    poll_id: r["poll_id"] as string,
    text: r["text"] as string,
    position: r["position"] as number,
  };
}

function exportCSV(
  poll: Poll,
  options: PollOption[],
  voteCounts: Map<string, number>,
) {
  const total = Array.from(voteCounts.values()).reduce((a, b) => a + b, 0);
  const rows = [
    ["Opção", "Votos", "Porcentagem"],
    ...options.map((o) => {
      const c = voteCounts.get(o.id) ?? 0;
      return [
        o.text,
        String(c),
        total > 0 ? `${((c / total) * 100).toFixed(1)}%` : "0.0%",
      ];
    }),
    ["TOTAL", String(total), "100%"],
  ];
  const csv = rows
    .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${poll.title.replace(/[^a-z0-9]/gi, "_")}_resultados.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function emptyDraft(): PollDraft {
  return {
    title: "",
    description: "",
    visibility: "private",
    status: "draft",
    allow_multiple_answers: false,
    show_results_before_close: true,
    opens_at: "",
    closes_at: "",
    options: [
      { key: crypto.randomUUID(), dbId: null, text: "" },
      { key: crypto.randomUUID(), dbId: null, text: "" },
    ],
  };
}

// ─── Sidebar constants (configurações pattern) ────────────────────────────────

const SIDEBAR_W = 239;
const SIDEBAR_ICON_W = 48;

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const BTN: React.CSSProperties = {
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  transition: "all 120ms ease",
  fontFamily: "inherit",
};

const INPUT: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  display: "block",
  marginBottom: 6,
};

const STATUS_COLORS: Record<PollStatus, string> = {
  draft: "#94a3b8",
  active: "#22c55e",
  closed: "#f59e0b",
};

const STATUS_LABELS: Record<PollStatus, string> = {
  draft: "Rascunho",
  active: "Ativa",
  closed: "Encerrada",
};

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

function DeleteConfirmModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose: onCancel });
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Excluir enquete"
        style={{
          background: "#1e2328",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: 24,
          width: 380,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <AlertTriangle
            size={20}
            style={{ color: "#f87171", flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
              Excluir enquete?
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              "<strong>{title}</strong>" e todos os votos registrados serão
              excluídos permanentemente. Esta ação não pode ser desfeita.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              ...BTN,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-secondary)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...BTN,
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              background: "rgba(239,68,68,0.2)",
              color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <Trash2 size={13} /> Excluir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Bar chart (CSS only) ─────────────────────────────────────────────────────

function BarChart({
  options,
  counts,
  total,
  myVotedIds,
  showHighlight,
}: {
  options: PollOption[];
  counts: Map<string, number>;
  total: number;
  myVotedIds: string[];
  showHighlight: boolean;
}) {
  const maxCount = Math.max(...options.map((o) => counts.get(o.id) ?? 0), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {options.map((opt) => {
        const count = counts.get(opt.id) ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const barPct = (count / maxCount) * 100;
        const voted = showHighlight && myVotedIds.includes(opt.id);
        return (
          <div key={opt.id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: voted ? "#a5b4fc" : "var(--text-primary)",
                  fontWeight: voted ? 500 : 400,
                }}
              >
                {voted && (
                  <CheckCircle
                    size={12}
                    style={{
                      marginRight: 5,
                      color: "#a5b4fc",
                      verticalAlign: "middle",
                    }}
                  />
                )}
                {opt.text}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                {count} voto{count !== 1 ? "s" : ""} · {pct.toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                borderRadius: 4,
                height: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: voted ? "#6366f1" : "rgba(99,102,241,0.5)",
                  borderRadius: 4,
                  height: "100%",
                  width: `${barPct}%`,
                  transition: "width 600ms cubic-bezier(0.4,0,0.2,1)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PollForm ─────────────────────────────────────────────────────────────────

interface PollFormProps {
  initial: PollDraft;
  originalOptionIds: string[];
  editingPollId: string | null;
  onSave: (
    draft: PollDraft,
    originalOptionIds: string[],
    editingId: string | null,
  ) => Promise<void>;
  onCancel: () => void;
}

function PollForm({
  initial,
  originalOptionIds,
  editingPollId,
  onSave,
  onCancel,
}: PollFormProps) {
  const [form, setForm] = useState<PollDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function updateField<K extends keyof PollDraft>(key: K, value: PollDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addOption() {
    setForm((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { key: crypto.randomUUID(), dbId: null, text: "" },
      ],
    }));
  }

  function removeOption(key: string) {
    setForm((prev) => ({
      ...prev,
      options:
        prev.options.length > 2
          ? prev.options.filter((o) => o.key !== key)
          : prev.options,
    }));
  }

  function updateOption(key: string, text: string) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o) => (o.key === key ? { ...o, text } : o)),
    }));
  }

  function moveOption(key: string, dir: -1 | 1) {
    setForm((prev) => {
      const arr = [...prev.options];
      const i = arr.findIndex((o) => o.key === key);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return prev;
      const tmp = arr[i] as (typeof arr)[number];
      arr[i] = arr[j] as (typeof arr)[number];
      arr[j] = tmp;
      return { ...prev, options: arr };
    });
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (form.title.trim().length < 3)
      errs.push("Título precisa ter pelo menos 3 caracteres.");
    if (form.options.length < 2) errs.push("Adicione pelo menos 2 opções.");
    if (form.options.some((o) => !o.text.trim()))
      errs.push("Todas as opções precisam de texto.");
    if (
      form.opens_at &&
      form.closes_at &&
      new Date(form.closes_at) <= new Date(form.opens_at)
    ) {
      errs.push("Data de encerramento deve ser após a abertura.");
    }
    return errs;
  }

  async function handleSave(status: PollStatus) {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, status }, originalOptionIds, editingPollId);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Falha ao salvar enquete."]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ maxWidth: 640, margin: "0 auto", padding: "28px 24px 160px" }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
        {editingPollId ? "Editar enquete" : "Nova enquete"}
      </h2>

      {errors.length > 0 && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            color: "#fca5a5",
          }}
        >
          {errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <label style={LABEL}>Título *</label>
        <input
          value={form.title}
          onChange={(e) => {
            updateField("title", e.target.value);
            setErrors([]);
          }}
          placeholder="Qual a sua pergunta?"
          maxLength={120}
          style={INPUT}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 20 }}>
        <label style={LABEL}>
          Descrição <span style={{ opacity: 0.5 }}>(opcional)</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Contexto adicional sobre a enquete..."
          rows={2}
          maxLength={400}
          style={{ ...INPUT, resize: "vertical" }}
        />
      </div>

      {/* Options */}
      <div style={{ marginBottom: 24 }}>
        <label style={LABEL}>Opções *</label>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 8,
          }}
        >
          {form.options.map((opt, i) => (
            <div
              key={opt.key}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button
                  aria-label="Mover opção para cima"
                  onClick={() => moveOption(opt.key, -1)}
                  disabled={i === 0}
                  style={{
                    ...BTN,
                    width: 18,
                    height: 12,
                    background: "none",
                    color:
                      i === 0
                        ? "rgba(255,255,255,0.15)"
                        : "var(--text-tertiary)",
                    padding: 0,
                  }}
                >
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="currentColor"
                  >
                    <path d="M5 0L10 6H0z" />
                  </svg>
                </button>
                <button
                  aria-label="Mover opção para baixo"
                  onClick={() => moveOption(opt.key, 1)}
                  disabled={i === form.options.length - 1}
                  style={{
                    ...BTN,
                    width: 18,
                    height: 12,
                    background: "none",
                    color:
                      i === form.options.length - 1
                        ? "rgba(255,255,255,0.15)"
                        : "var(--text-tertiary)",
                    padding: 0,
                  }}
                >
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="currentColor"
                  >
                    <path d="M5 6L0 0h10z" />
                  </svg>
                </button>
              </div>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: form.allow_multiple_answers ? 4 : "50%",
                  border: "1px solid rgba(255,255,255,0.2)",
                  flexShrink: 0,
                }}
              />
              <input
                value={opt.text}
                onChange={(e) => updateOption(opt.key, e.target.value)}
                placeholder={`Opção ${i + 1}`}
                style={{ ...INPUT, flex: 1 }}
                maxLength={120}
              />
              <button
                aria-label="Remover opção"
                onClick={() => removeOption(opt.key)}
                disabled={form.options.length <= 2}
                style={{
                  ...BTN,
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "none",
                  color:
                    form.options.length <= 2
                      ? "rgba(255,255,255,0.15)"
                      : "#f87171",
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addOption}
          style={{
            ...BTN,
            padding: "7px 14px",
            borderRadius: 8,
            fontSize: 13,
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-secondary)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Plus size={13} /> Adicionar opção
        </button>
      </div>

      {/* Settings */}
      <div
        style={{
          padding: "16px 20px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 14,
          }}
        >
          Configurações
        </div>

        {/* Toggle row helper */}
        {(
          [
            ["allow_multiple_answers", "Permitir múltiplas respostas"],
            [
              "show_results_before_close",
              "Mostrar resultados antes de encerrar",
            ],
          ] as [keyof PollDraft, string][]
        ).map(([key, label]) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {label}
            </span>
            <button
              onClick={() => updateField(key, !form[key])}
              style={{
                ...BTN,
                width: 40,
                height: 22,
                borderRadius: 11,
                padding: 0,
                position: "relative",
                background: form[key] ? "#6366f1" : "rgba(255,255,255,0.12)",
                border: "none",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 150ms ease",
                  left: form[key] ? 21 : 3,
                }}
              />
            </button>
          </div>
        ))}

        {/* Visibility */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Visibilidade
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {(["private", "public"] as PollVisibility[]).map((v) => (
              <button
                key={v}
                onClick={() => updateField("visibility", v)}
                style={{
                  ...BTN,
                  padding: "4px 12px",
                  borderRadius: 16,
                  fontSize: 12,
                  background:
                    form.visibility === v
                      ? "rgba(99,102,241,0.2)"
                      : "rgba(255,255,255,0.05)",
                  color:
                    form.visibility === v ? "#a5b4fc" : "var(--text-secondary)",
                  border:
                    form.visibility === v
                      ? "1px solid rgba(99,102,241,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {v === "private" ? "Privada" : "Pública"}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 4,
          }}
        >
          <div>
            <label style={{ ...LABEL, marginBottom: 4 }}>Abertura</label>
            <input
              type="datetime-local"
              value={form.opens_at}
              onChange={(e) => updateField("opens_at", e.target.value)}
              style={{ ...INPUT, fontSize: 12 }}
            />
          </div>
          <div>
            <label style={{ ...LABEL, marginBottom: 4 }}>Encerramento</label>
            <input
              type="datetime-local"
              value={form.closes_at}
              onChange={(e) => updateField("closes_at", e.target.value)}
              style={{ ...INPUT, fontSize: 12 }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            ...BTN,
            padding: "9px 18px",
            borderRadius: 8,
            fontSize: 13,
            background: "rgba(255,255,255,0.05)",
            color: "var(--text-secondary)",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={() => void handleSave("draft")}
          disabled={saving}
          style={{
            ...BTN,
            padding: "9px 18px",
            borderRadius: 8,
            fontSize: 13,
            background: "rgba(255,255,255,0.07)",
            color: "var(--text-secondary)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          Salvar rascunho
        </button>
        <button
          onClick={() => void handleSave("active")}
          disabled={saving}
          style={{
            ...BTN,
            padding: "9px 22px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            background: "#6366f1",
            color: "#fff",
          }}
        >
          {editingPollId ? "Salvar e ativar" : "Criar e ativar"}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function EnquetesApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();

  const [collapsed, setCollapsed] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [view, setView] = useState<View>({ kind: "empty" });
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Poll | null>(null);
  const [copied, setCopied] = useState(false);
  const [votingOptions, setVotingOptions] = useState<Set<string>>(new Set());
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | PollStatus>("all");
  const [formData, setFormData] = useState<{
    draft: PollDraft;
    origIds: string[];
  } | null>(null);
  const [generatingSlug, setGeneratingSlug] = useState(false);

  // ── DB: load poll list ──

  const loadPolls = useCallback(async () => {
    if (!drivers?.data || !userId || !companyId) return;
    const { data } = await drivers.data
      .from("polls")
      .select(
        "id,user_id,title,description,visibility,status,allow_multiple_answers,show_results_before_close,opens_at,closes_at,public_slug,created_at,updated_at",
      )
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (data) setPolls((data as Record<string, unknown>[]).map(parsePoll));
  }, [drivers, userId, companyId]);

  useEffect(() => {
    void loadPolls();
  }, [loadPolls]);

  // ── DB: load poll detail ──

  const loadDetail = useCallback(
    async (pollId: string) => {
      if (!drivers?.data || !userId) return;
      setLoading(true);

      const [pollRes, optRes, votesRes, myVotesRes] = await Promise.all([
        drivers.data.from("polls").select("*").eq("id", pollId).single(),
        drivers.data
          .from("poll_options")
          .select("*")
          .eq("poll_id", pollId)
          .order("position"),
        drivers.data
          .from("poll_votes")
          .select("option_id")
          .eq("poll_id", pollId),
        drivers.data
          .from("poll_votes")
          .select("option_id")
          .eq("poll_id", pollId)
          .eq("user_id", userId),
      ]);

      const poll = pollRes.data
        ? parsePoll(pollRes.data as Record<string, unknown>)
        : null;
      const options = optRes.data
        ? (optRes.data as Record<string, unknown>[]).map(parsePollOption)
        : [];

      const voteCounts = new Map<string, number>();
      if (votesRes.data) {
        (votesRes.data as Record<string, unknown>[]).forEach((v) => {
          const oid = v["option_id"] as string;
          voteCounts.set(oid, (voteCounts.get(oid) ?? 0) + 1);
        });
      }

      const myVotedOptionIds =
        (myVotesRes.data as Record<string, unknown>[] | null)?.map(
          (v) => v["option_id"] as string,
        ) ?? [];

      const anonVoted = !!localStorage.getItem(`anon_vote_${pollId}`);
      const hasVoted = myVotedOptionIds.length > 0 || anonVoted;

      if (poll) {
        setDetail({
          poll,
          options,
          voteCounts,
          totalVotes: Array.from(voteCounts.values()).reduce(
            (a, b) => a + b,
            0,
          ),
          hasVoted,
          myVotedOptionIds,
        });
        setVotingOptions(new Set());
        setVoteError(null);
      }
      setLoading(false);
    },
    [drivers, userId],
  );

  // ── DB: save poll ──

  async function savePoll(
    draft: PollDraft,
    origIds: string[],
    editingId: string | null,
  ) {
    if (!drivers?.data || !userId || !companyId)
      throw new Error("Sessão não inicializada.");

    const payload = {
      user_id: userId,
      company_id: companyId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      visibility: draft.visibility,
      status: draft.status,
      allow_multiple_answers: draft.allow_multiple_answers,
      show_results_before_close: draft.show_results_before_close,
      opens_at: draft.opens_at ? new Date(draft.opens_at).toISOString() : null,
      closes_at: draft.closes_at
        ? new Date(draft.closes_at).toISOString()
        : null,
    };

    let pollId: string;
    if (editingId) {
      const { error: updErr } = await drivers.data
        .from("polls")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingId);
      if (updErr) throw new Error(updErr.message);
      pollId = editingId;
    } else {
      const { data, error: insErr } = await drivers.data
        .from("polls")
        .insert(payload)
        .select("id")
        .single();
      if (insErr || !data)
        throw new Error(insErr?.message ?? "Falha ao criar enquete.");
      pollId = (data as Record<string, unknown>)["id"] as string;
    }

    // Options diff
    const currentDbIds = new Set(
      draft.options.filter((o) => o.dbId !== null).map((o) => o.dbId as string),
    );
    const toDelete = origIds.filter((id) => !currentDbIds.has(id));

    if (toDelete.length > 0) {
      await drivers.data.from("poll_options").delete().in("id", toDelete);
    }
    for (let i = 0; i < draft.options.length; i++) {
      const opt = draft.options[i];
      if (!opt) continue;
      if (opt.dbId !== null) {
        await drivers.data
          .from("poll_options")
          .update({ text: opt.text.trim(), position: i })
          .eq("id", opt.dbId);
      } else {
        await drivers.data
          .from("poll_options")
          .insert({ poll_id: pollId, text: opt.text.trim(), position: i });
      }
    }

    await loadPolls();
    setView({ kind: "view", pollId, tab: "vote" });
    await loadDetail(pollId);
  }

  // ── DB: delete poll ──

  async function deletePoll(poll: Poll) {
    if (!drivers?.data || !userId || !companyId) return;
    const optsRes = await drivers.data
      .from("poll_options")
      .select("id,text,position")
      .eq("poll_id", poll.id);
    const options = (optsRes.data ?? []) as {
      id: string;
      text: string;
      position: number;
    }[];
    await moveToTrash({
      drivers,
      userId,
      companyId,
      appId: "enquetes",
      itemType: "poll",
      itemName: poll.title.trim() !== "" ? poll.title : "(Sem título)",
      itemData: {
        ...(poll as unknown as Record<string, unknown>),
        options,
      },
      originalId: poll.id,
    });
    await drivers.data.from("polls").delete().eq("id", poll.id);
    setDeleteTarget(null);
    await loadPolls();
    setView({ kind: "empty" });
    setDetail(null);
  }

  // ── DB: toggle poll status ──

  async function toggleStatus(poll: Poll) {
    if (!drivers?.data) return;
    const next: PollStatus = poll.status === "active" ? "closed" : "active";
    await drivers.data
      .from("polls")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", poll.id);
    await loadPolls();
    if (detail?.poll.id === poll.id) await loadDetail(poll.id);
  }

  // ── DB: generate public slug ──

  async function generateSlug(pollId: string) {
    if (!drivers?.data) return;
    setGeneratingSlug(true);
    const slug = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    await drivers.data
      .from("polls")
      .update({ public_slug: slug, updated_at: new Date().toISOString() })
      .eq("id", pollId);
    await loadPolls();
    await loadDetail(pollId);
    setGeneratingSlug(false);
  }

  // ── DB: submit vote ──

  async function submitVote() {
    const d = detail;
    if (!d || !drivers?.data) return;
    if (votingOptions.size === 0) {
      setVoteError("Selecione pelo menos uma opção.");
      return;
    }
    if (!d.poll.allow_multiple_answers && votingOptions.size > 1) {
      setVoteError("Esta enquete permite apenas uma resposta.");
      return;
    }
    if (!isPollOpenNow(d.poll)) {
      setVoteError("Esta enquete não está aberta para votos.");
      return;
    }

    setSubmittingVote(true);
    setVoteError(null);
    try {
      for (const optId of Array.from(votingOptions)) {
        await drivers.data.from("poll_votes").insert({
          poll_id: d.poll.id,
          option_id: optId,
          user_id: userId ?? null,
          anonymous_key: userId ? null : crypto.randomUUID(),
        });
      }
      if (!userId) localStorage.setItem(`anon_vote_${d.poll.id}`, "1");
      await loadDetail(d.poll.id);
      setView({ kind: "view", pollId: d.poll.id, tab: "results" });
    } catch {
      setVoteError("Erro ao registrar voto. Tente novamente.");
    }
    setSubmittingVote(false);
  }

  // ── Enter edit mode ──

  async function openEdit(poll: Poll) {
    if (!drivers?.data) return;
    const { data: opts } = await drivers.data
      .from("poll_options")
      .select("*")
      .eq("poll_id", poll.id)
      .order("position");
    const options: DraftOption[] = (
      (opts as Record<string, unknown>[] | null) ?? []
    ).map((o) => ({
      key: o["id"] as string,
      dbId: o["id"] as string,
      text: o["text"] as string,
    }));
    const draft: PollDraft = {
      title: poll.title,
      description: poll.description,
      visibility: poll.visibility,
      status: poll.status,
      allow_multiple_answers: poll.allow_multiple_answers,
      show_results_before_close: poll.show_results_before_close,
      opens_at: toLocalInput(poll.opens_at),
      closes_at: toLocalInput(poll.closes_at),
      options,
    };
    setFormData({
      draft,
      origIds: options
        .map((o) => o.dbId)
        .filter((id): id is string => id !== null),
    });
    setView({ kind: "edit", pollId: poll.id });
  }

  // ── Derived ──

  const filteredPolls = useMemo(
    () =>
      filterStatus === "all"
        ? polls
        : polls.filter((p) => p.status === filterStatus),
    [polls, filterStatus],
  );

  const currentPollId =
    view.kind === "view" || view.kind === "edit" ? view.pollId : null;
  const currentTab = view.kind === "view" ? view.tab : null;
  const isCreator = detail?.poll.user_id === userId;
  const canVote = detail ? isPollOpenNow(detail.poll) : false;
  const showResults = detail
    ? shouldShowResults(detail.poll, isCreator ?? false)
    : false;

  // ─── Render ───────────────────────────────────────────────────────────────

  function copyLink(slug: string) {
    void navigator.clipboard.writeText(
      `${window.location.origin}/poll/${slug}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function SidebarItem({ poll }: { poll: Poll }) {
    const active = currentPollId === poll.id;
    return (
      <div
        onClick={() => {
          setView({ kind: "view", pollId: poll.id, tab: "vote" });
          void loadDetail(poll.id);
        }}
        style={{
          padding: "9px 12px",
          borderRadius: 8,
          cursor: "pointer",
          marginBottom: 2,
          background: active ? "rgba(99,102,241,0.12)" : "transparent",
          border: `1px solid ${active ? "rgba(99,102,241,0.22)" : "transparent"}`,
          transition: "all 120ms",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              marginTop: 4,
              background: STATUS_COLORS[poll.status],
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: active ? "#a5b4fc" : "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {poll.title}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 11, color: STATUS_COLORS[poll.status] }}>
                {STATUS_LABELS[poll.status]}
              </span>
              {poll.visibility === "public" && (
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  Pública
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: "#191d21",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Animated sidebar wrapper ── */}
      <div
        style={{
          width: collapsed ? SIDEBAR_ICON_W : SIDEBAR_W,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 250ms ease",
        }}
      >
        <aside style={ASIDE_STYLE}>
          {/* App identity header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : undefined,
              gap: collapsed ? 0 : 10,
              padding: "16px 14px 12px",
              flexShrink: 0,
            }}
          >
            <Vote
              size={18}
              strokeWidth={1.6}
              style={{ color: "var(--text-primary)", flexShrink: 0 }}
            />
            {!collapsed && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                  fontFamily: "var(--font-display)",
                }}
              >
                Enquetes
              </span>
            )}
          </div>

          {collapsed ? (
            /* Icon-only nav */
            <nav
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "12px 0",
                gap: 2,
              }}
            >
              {(() => {
                const isActive = filterStatus === "all";
                return (
                  <button
                    type="button"
                    title="Todas"
                    onClick={() => setFilterStatus("all")}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "background 120ms ease",
                      ...(isActive
                        ? {
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.08)",
                            color: "var(--text-primary)",
                          }
                        : {
                            border: "1px solid transparent",
                            background: "transparent",
                            color: "var(--text-secondary)",
                          }),
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.05)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }
                    }}
                  >
                    <BarChart2 size={16} />
                  </button>
                );
              })()}
              {(["active", "draft", "closed"] as const).map((s) => {
                const isActive = filterStatus === s;
                const Icon =
                  s === "active" ? CheckCircle : s === "draft" ? EyeOff : Clock;
                return (
                  <button
                    key={s}
                    type="button"
                    title={STATUS_LABELS[s]}
                    onClick={() => setFilterStatus(s)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "background 120ms ease",
                      ...(isActive
                        ? {
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.08)",
                            color: "var(--text-primary)",
                          }
                        : {
                            border: "1px solid transparent",
                            background: "transparent",
                            color: "var(--text-secondary)",
                          }),
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.05)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }
                    }}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
              <div
                style={{
                  height: 1,
                  width: 28,
                  background: "rgba(255,255,255,0.08)",
                  margin: "4px 0",
                }}
              />
              <button
                type="button"
                title="Nova enquete"
                onClick={() => {
                  setFormData({ draft: emptyDraft(), origIds: [] });
                  setView({ kind: "create" });
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: "#6366f1",
                  border: "none",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <Plus size={16} />
              </button>
            </nav>
          ) : (
            /* Expanded sidebar */
            <>
              {/* Nova enquete button */}
              <div style={{ padding: "0 10px 4px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ draft: emptyDraft(), origIds: [] });
                    setView({ kind: "create" });
                  }}
                  style={{
                    ...BTN,
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: "#6366f1",
                    color: "#fff",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#4f46e5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#6366f1";
                  }}
                >
                  <Plus size={13} /> Nova Enquete
                </button>
              </div>

              {/* Nav */}
              <nav style={{ flex: 1, padding: "4px 0 160px 8px" }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    padding: "10px 8px 4px",
                    margin: 0,
                  }}
                >
                  Filtrar
                </p>
                {[
                  { id: "all" as const, label: "Todas", icon: BarChart2 },
                  {
                    id: "active" as const,
                    label: STATUS_LABELS.active,
                    icon: CheckCircle,
                  },
                  {
                    id: "draft" as const,
                    label: STATUS_LABELS.draft,
                    icon: EyeOff,
                  },
                  {
                    id: "closed" as const,
                    label: STATUS_LABELS.closed,
                    icon: Clock,
                  },
                ].map(({ id, label, icon: Icon }) => {
                  const isActive = filterStatus === id;
                  const count =
                    id === "all"
                      ? polls.length
                      : polls.filter((p) => p.status === id).length;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilterStatus(id)}
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
                        ...(isActive
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
                        if (!isActive) {
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.05)";
                          e.currentTarget.style.color = "var(--text-primary)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }
                      }}
                    >
                      <Icon
                        size={15}
                        strokeWidth={1.8}
                        style={{ color: "currentColor", flexShrink: 0 }}
                      />
                      <span style={{ flex: 1 }}>{label}</span>
                      {count > 0 && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}

                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    padding: "10px 8px 4px",
                    margin: 0,
                  }}
                >
                  Enquetes
                </p>
                {filteredPolls.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "32px 12px",
                      color: "var(--text-tertiary)",
                      fontSize: 12,
                    }}
                  >
                    <Vote size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                    <div>
                      {polls.length === 0
                        ? "Nenhuma enquete criada ainda"
                        : "Nenhum resultado"}
                    </div>
                  </div>
                ) : (
                  filteredPolls.map((p) => <SidebarItem key={p.id} poll={p} />)
                )}
              </nav>
            </>
          )}
        </aside>
      </div>

      {/* Collapse/expand toggle */}
      <button
        type="button"
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        onClick={() => setCollapsed((v) => !v)}
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
          background: "rgba(15,21,27,0.95)",
          border: "1px solid rgba(255,255,255,0.10)",
          cursor: "pointer",
          color: "var(--text-tertiary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(40,55,80,0.95)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(15,21,27,0.95)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          e.currentTarget.style.color = "var(--text-tertiary)";
        }}
      >
        {collapsed ? (
          <PanelLeftOpen size={16} strokeWidth={1.8} />
        ) : (
          <PanelLeftClose size={16} strokeWidth={1.8} />
        )}
      </button>

      {/* ── Main area ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Content header */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <BarChart2 size={14} style={{ color: "#6366f1", flexShrink: 0 }} />
          <h2
            style={{
              margin: "0 12px 0 0",
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
              whiteSpace: "nowrap",
            }}
          >
            {view.kind === "create"
              ? "Nova Enquete"
              : view.kind === "edit"
                ? (detail?.poll.title ?? "Editar Enquete")
                : view.kind === "view"
                  ? (detail?.poll.title ?? "Enquete")
                  : "Enquetes"}
          </h2>
        </div>

        <main style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
          {/* Empty state */}
          {view.kind === "empty" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "60px 32px 160px",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "rgba(99,102,241,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BarChart2 size={24} style={{ color: "#6366f1" }} />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxWidth: 280,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  Nenhuma enquete ainda
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--text-tertiary)",
                    lineHeight: 1.6,
                  }}
                >
                  Crie enquetes para coletar opiniões da equipe, compartilhe
                  links e visualize resultados em tempo real.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({ draft: emptyDraft(), origIds: [] });
                  setView({ kind: "create" });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#6366f1",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 20px",
                  cursor: "pointer",
                }}
              >
                <Plus size={14} /> Nova enquete
              </button>
            </div>
          )}

          {/* Create / Edit form */}
          {(view.kind === "create" || view.kind === "edit") && formData && (
            <PollForm
              initial={formData.draft}
              originalOptionIds={formData.origIds}
              editingPollId={view.kind === "edit" ? view.pollId : null}
              onSave={(draft, origIds, editId) =>
                savePoll(draft, origIds, editId)
              }
              onCancel={() => {
                if (currentPollId && detail) {
                  setView({ kind: "view", pollId: currentPollId, tab: "vote" });
                } else {
                  setView({ kind: "empty" });
                }
              }}
            />
          )}

          {/* Poll detail view */}
          {view.kind === "view" && (
            <div
              style={{
                padding: "24px 28px 160px",
                maxWidth: 700,
                margin: "0 auto",
              }}
            >
              {loading && !detail && (
                <div
                  style={{
                    textAlign: "center",
                    paddingTop: 60,
                    color: "var(--text-tertiary)",
                    fontSize: 14,
                  }}
                >
                  Carregando...
                </div>
              )}

              {detail && (
                <>
                  {/* Poll header */}
                  <div style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <h1
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          lineHeight: 1.3,
                          flex: 1,
                        }}
                      >
                        {detail.poll.title}
                      </h1>
                      {isCreator && (
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={() => void openEdit(detail.poll)}
                            style={{
                              ...BTN,
                              padding: "6px 12px",
                              borderRadius: 7,
                              fontSize: 12,
                              background: "rgba(255,255,255,0.06)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <Edit2 size={12} /> Editar
                          </button>
                          <button
                            onClick={() => void toggleStatus(detail.poll)}
                            style={{
                              ...BTN,
                              padding: "6px 12px",
                              borderRadius: 7,
                              fontSize: 12,
                              background:
                                detail.poll.status === "active"
                                  ? "rgba(245,158,11,0.1)"
                                  : "rgba(34,197,94,0.1)",
                              color:
                                detail.poll.status === "active"
                                  ? "#fbbf24"
                                  : "#86efac",
                            }}
                          >
                            {detail.poll.status === "active"
                              ? "Encerrar"
                              : "Ativar"}
                          </button>
                          <button
                            aria-label="Excluir enquete"
                            onClick={() => setDeleteTarget(detail.poll)}
                            style={{
                              ...BTN,
                              padding: "6px 10px",
                              borderRadius: 7,
                              background: "rgba(239,68,68,0.08)",
                              color: "#f87171",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    {detail.poll.description && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                          marginBottom: 10,
                        }}
                      >
                        {detail.poll.description}
                      </p>
                    )}

                    {/* Meta info */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          background: `${STATUS_COLORS[detail.poll.status]}18`,
                          color: STATUS_COLORS[detail.poll.status],
                          border: `1px solid ${STATUS_COLORS[detail.poll.status]}30`,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "currentColor",
                          }}
                        />
                        {STATUS_LABELS[detail.poll.status]}
                      </span>
                      {detail.poll.allow_multiple_answers && (
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            background: "rgba(255,255,255,0.06)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          Múltiplas respostas
                        </span>
                      )}
                      {detail.poll.closes_at && (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            background: "rgba(255,255,255,0.06)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          <Clock size={10} /> Encerra{" "}
                          {fmtDateTime(detail.poll.closes_at)}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                          paddingTop: 4,
                        }}
                      >
                        {detail.totalVotes} voto
                        {detail.totalVotes !== 1 ? "s" : ""} · criada em{" "}
                        {fmtDate(detail.poll.created_at)}
                      </span>
                    </div>

                    {/* Public link */}
                    {detail.poll.visibility === "public" && isCreator && (
                      <div style={{ marginTop: 12 }}>
                        {detail.poll.public_slug ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "8px 12px",
                              background: "rgba(99,102,241,0.08)",
                              border: "1px solid rgba(99,102,241,0.2)",
                              borderRadius: 8,
                            }}
                          >
                            <LinkIcon
                              size={13}
                              style={{ color: "#a5b4fc", flexShrink: 0 }}
                            />
                            <span
                              style={{
                                fontSize: 12,
                                color: "#a5b4fc",
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {window.location.origin}/poll/
                              {detail.poll.public_slug}
                            </span>
                            <button
                              onClick={() =>
                                detail.poll.public_slug &&
                                copyLink(detail.poll.public_slug)
                              }
                              style={{
                                ...BTN,
                                padding: "3px 10px",
                                borderRadius: 6,
                                fontSize: 11,
                                background: copied
                                  ? "rgba(34,197,94,0.2)"
                                  : "rgba(99,102,241,0.2)",
                                color: copied ? "#86efac" : "#a5b4fc",
                              }}
                            >
                              {copied ? (
                                <>
                                  <Check size={11} /> Copiado
                                </>
                              ) : (
                                <>
                                  <Copy size={11} /> Copiar
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => void generateSlug(detail.poll.id)}
                            disabled={generatingSlug}
                            style={{
                              ...BTN,
                              padding: "6px 14px",
                              borderRadius: 7,
                              fontSize: 12,
                              background: "rgba(255,255,255,0.05)",
                              color: "var(--text-secondary)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <LinkIcon size={12} />{" "}
                            {generatingSlug ? "Gerando…" : "Gerar link público"}
                          </button>
                        )}
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            marginTop: 6,
                          }}
                        >
                          Rota pública em desenvolvimento — link preparado para
                          integração futura.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tab bar: Votar / Resultados */}
                  <div
                    style={{
                      display: "flex",
                      gap: 2,
                      marginBottom: 24,
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {(["vote", "results"] as const).map((t) => {
                      const active = currentTab === t;
                      const canSeeResults =
                        t === "results" && !showResults && !isCreator;
                      return (
                        <button
                          key={t}
                          onClick={() =>
                            !canSeeResults &&
                            setView({
                              kind: "view",
                              pollId: detail.poll.id,
                              tab: t,
                            })
                          }
                          disabled={canSeeResults}
                          style={{
                            ...BTN,
                            padding: "7px 18px",
                            borderRadius: "6px 6px 0 0",
                            fontSize: 13,
                            fontWeight: active ? 500 : 400,
                            color: canSeeResults
                              ? "var(--text-tertiary)"
                              : active
                                ? "var(--text-primary)"
                                : "var(--text-secondary)",
                            background: active
                              ? "rgba(255,255,255,0.06)"
                              : "transparent",
                            borderBottom: active
                              ? "2px solid #6366f1"
                              : "2px solid transparent",
                            marginBottom: -1,
                            cursor: canSeeResults ? "not-allowed" : "pointer",
                          }}
                        >
                          {t === "vote" ? (
                            <>
                              <Vote size={13} /> Votar
                            </>
                          ) : (
                            <>
                              <BarChart2 size={13} /> Resultados
                            </>
                          )}
                          {t === "results" && !showResults && !isCreator && (
                            <EyeOff
                              size={11}
                              style={{ marginLeft: 4, opacity: 0.5 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Vote tab */}
                  {currentTab === "vote" && (
                    <div>
                      {!canVote && !detail.hasVoted && (
                        <div
                          style={{
                            padding: "12px 16px",
                            background: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.2)",
                            borderRadius: 8,
                            marginBottom: 20,
                            fontSize: 13,
                            color: "#fbbf24",
                          }}
                        >
                          {detail.poll.status === "draft" &&
                            "Esta enquete ainda é um rascunho e não está aberta para votação."}
                          {detail.poll.status === "closed" &&
                            "Esta enquete foi encerrada."}
                          {detail.poll.status === "active" &&
                            detail.poll.opens_at &&
                            new Date(detail.poll.opens_at) > new Date() &&
                            `Abertura em ${fmtDateTime(detail.poll.opens_at)}.`}
                          {detail.poll.status === "active" &&
                            detail.poll.closes_at &&
                            new Date(detail.poll.closes_at) < new Date() &&
                            "O prazo de votação encerrou."}
                        </div>
                      )}

                      {detail.hasVoted ? (
                        <div
                          style={{
                            padding: "16px 20px",
                            background: "rgba(34,197,94,0.08)",
                            border: "1px solid rgba(34,197,94,0.18)",
                            borderRadius: 10,
                            marginBottom: 20,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            fontSize: 14,
                            color: "#86efac",
                          }}
                        >
                          <Check size={16} /> Você já votou nesta enquete.
                          {!showResults && (
                            <span
                              style={{
                                color: "var(--text-tertiary)",
                                fontSize: 12,
                              }}
                            >
                              Resultados disponíveis após o encerramento.
                            </span>
                          )}
                        </div>
                      ) : canVote ? (
                        <>
                          {!userId && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--text-tertiary)",
                                marginBottom: 12,
                              }}
                            >
                              Voto anônimo. Registrado localmente para evitar
                              duplicatas — não garante segurança absoluta.
                            </div>
                          )}

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                              marginBottom: 20,
                            }}
                          >
                            {detail.options.map((opt) => {
                              const selected = votingOptions.has(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    if (detail.poll.allow_multiple_answers) {
                                      setVotingOptions((prev) => {
                                        const s = new Set(prev);
                                        if (s.has(opt.id)) s.delete(opt.id);
                                        else s.add(opt.id);
                                        return s;
                                      });
                                    } else {
                                      setVotingOptions(new Set([opt.id]));
                                    }
                                    setVoteError(null);
                                  }}
                                  style={{
                                    ...BTN,
                                    padding: "12px 16px",
                                    borderRadius: 10,
                                    justifyContent: "flex-start",
                                    background: selected
                                      ? "rgba(99,102,241,0.15)"
                                      : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${selected ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.09)"}`,
                                    color: selected
                                      ? "#c7d2fe"
                                      : "var(--text-primary)",
                                    fontSize: 14,
                                    fontWeight: selected ? 500 : 400,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: detail.poll
                                        .allow_multiple_answers
                                        ? 4
                                        : "50%",
                                      border: `2px solid ${selected ? "#6366f1" : "rgba(255,255,255,0.25)"}`,
                                      background: selected
                                        ? "#6366f1"
                                        : "transparent",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                      transition: "all 120ms",
                                    }}
                                  >
                                    {selected && (
                                      <Check
                                        size={10}
                                        style={{ color: "#fff" }}
                                      />
                                    )}
                                  </span>
                                  {opt.text}
                                </button>
                              );
                            })}
                          </div>

                          {voteError && (
                            <div
                              style={{
                                fontSize: 13,
                                color: "#fca5a5",
                                marginBottom: 12,
                              }}
                            >
                              {voteError}
                            </div>
                          )}

                          <button
                            onClick={() => void submitVote()}
                            disabled={
                              submittingVote || votingOptions.size === 0
                            }
                            style={{
                              ...BTN,
                              padding: "11px 28px",
                              borderRadius: 10,
                              fontSize: 14,
                              fontWeight: 600,
                              background:
                                votingOptions.size > 0
                                  ? "#6366f1"
                                  : "rgba(99,102,241,0.25)",
                              color:
                                votingOptions.size > 0
                                  ? "#fff"
                                  : "rgba(255,255,255,0.35)",
                              cursor:
                                votingOptions.size > 0 && !submittingVote
                                  ? "pointer"
                                  : "not-allowed",
                            }}
                          >
                            {submittingVote ? "Registrando…" : "Votar"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}

                  {/* Results tab */}
                  {currentTab === "results" && (
                    <div>
                      {showResults ? (
                        <>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 20,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--text-tertiary)",
                              }}
                            >
                              Total:{" "}
                              <strong style={{ color: "var(--text-primary)" }}>
                                {detail.totalVotes}
                              </strong>{" "}
                              voto{detail.totalVotes !== 1 ? "s" : ""}
                            </span>
                            <button
                              onClick={() =>
                                exportCSV(
                                  detail.poll,
                                  detail.options,
                                  detail.voteCounts,
                                )
                              }
                              style={{
                                ...BTN,
                                padding: "6px 14px",
                                borderRadius: 7,
                                fontSize: 12,
                                background: "rgba(255,255,255,0.05)",
                                color: "var(--text-secondary)",
                                border: "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              <Download size={12} /> Exportar CSV
                            </button>
                          </div>

                          {detail.totalVotes === 0 ? (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "32px 0",
                                color: "var(--text-tertiary)",
                                fontSize: 14,
                              }}
                            >
                              Nenhum voto registrado ainda.
                            </div>
                          ) : (
                            <BarChart
                              options={detail.options}
                              counts={detail.voteCounts}
                              total={detail.totalVotes}
                              myVotedIds={detail.myVotedOptionIds}
                              showHighlight={detail.hasVoted}
                            />
                          )}
                        </>
                      ) : (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "48px 24px",
                            color: "var(--text-tertiary)",
                            fontSize: 14,
                          }}
                        >
                          <EyeOff
                            size={36}
                            style={{ marginBottom: 12, opacity: 0.3 }}
                          />
                          <div>
                            Resultados disponíveis após o encerramento da
                            enquete.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirmModal
          title={deleteTarget.title}
          onConfirm={() => void deletePoll(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
