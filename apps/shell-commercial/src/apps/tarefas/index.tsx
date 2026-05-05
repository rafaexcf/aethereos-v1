import { useState, useEffect, useMemo } from "react";
import {
  ListChecks,
  Plus,
  Check,
  Trash2,
  Pencil,
  X,
  Filter,
  Inbox,
  CircleDashed,
  Loader,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "todo" | "in_progress" | "done" | "cancelled";

interface Task {
  id: string;
  company_id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type StatusFilter = "all" | Status;
type PriorityFilter = "all" | Priority;

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<
  Priority,
  { label: string; color: string; bg: string }
> = {
  low: {
    label: "Baixa",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.15)",
  },
  medium: {
    label: "Média",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.15)",
  },
  high: {
    label: "Alta",
    color: "#fb923c",
    bg: "rgba(251,146,60,0.15)",
  },
  urgent: {
    label: "Urgente",
    color: "#f87171",
    bg: "rgba(248,113,113,0.15)",
  },
};

const STATUS_CFG: Record<
  Status,
  { label: string; color: string; icon: typeof CircleDashed }
> = {
  todo: {
    label: "A Fazer",
    color: "#94a3b8",
    icon: CircleDashed,
  },
  in_progress: {
    label: "Em Andamento",
    color: "#60a5fa",
    icon: Loader,
  },
  done: {
    label: "Concluída",
    color: "#22c55e",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelada",
    color: "#64748b",
    icon: XCircle,
  },
};

const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low"];
const STATUS_ORDER: Status[] = ["todo", "in_progress", "done", "cancelled"];

// ─── Date utilities ───────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDueDate(due: string): string {
  const today = todayStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tStr = tomorrow.toISOString().slice(0, 10);
  if (due === today) return "Hoje";
  if (due === tStr) return "Amanhã";
  const d = new Date(due + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

function isOverdue(due: string | null, status: Status): boolean {
  if (due === null) return false;
  if (status === "done" || status === "cancelled") return false;
  return due < todayStr();
}

// ─── Driver row helpers (typed unknown→Task assertions) ──────────────────────

interface QueryResult<T> {
  data: T | null;
  error: unknown;
}

function asTaskList(rows: unknown): Task[] {
  if (!Array.isArray(rows)) return [];
  return rows as Task[];
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────

function SidebarItem({
  active,
  onClick,
  icon,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  color?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "7px 10px",
        background: active
          ? "rgba(59,130,246,0.18)"
          : hovered
            ? "rgba(255,255,255,0.05)"
            : "transparent",
        border: "1px solid transparent",
        borderRadius: 8,
        color: active ? "rgba(255,255,255,0.95)" : "var(--text-secondary)",
        fontSize: 13,
        cursor: "pointer",
        textAlign: "left",
        transition: "background 80ms ease, color 80ms ease",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          color: color ?? "currentColor",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {typeof count === "number" && count > 0 && (
        <span
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            background: "rgba(255,255,255,0.06)",
            padding: "1px 6px",
            borderRadius: 10,
            flexShrink: 0,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        padding: "12px 10px 6px",
      }}
    >
      {children}
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string, status: Status) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const completed = task.status === "done";
  const cancelled = task.status === "cancelled";
  const overdue = isOverdue(task.due_date, task.status);
  const cfg = PRIORITY_CFG[task.priority];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
        border: "1px solid rgba(255,255,255,0.06)",
        transition: "background 80ms ease",
      }}
    >
      {/* Checkbox */}
      <button
        type="button"
        title={completed ? "Reabrir" : "Concluir"}
        aria-label={completed ? "Reabrir tarefa" : "Concluir tarefa"}
        onClick={() => onToggle(task.id, completed ? "todo" : "done")}
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: completed ? "none" : `2px solid ${cfg.color}`,
          background: completed ? cfg.color : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          transition: "all 120ms ease",
        }}
      >
        {completed && <Check size={11} color="white" strokeWidth={2.5} />}
      </button>

      {/* Priority dot */}
      {task.priority !== "medium" && (
        <div
          title={cfg.label}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: cfg.color,
            flexShrink: 0,
          }}
        />
      )}

      {/* Title + description */}
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
            fontSize: 13,
            color:
              completed || cancelled
                ? "rgba(255,255,255,0.30)"
                : "rgba(255,255,255,0.85)",
            textDecoration: completed || cancelled ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.title}
        </span>
        {task.description.trim() !== "" && (
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {task.description}
          </span>
        )}
      </div>

      {/* Status chip */}
      <span
        style={{
          fontSize: 10,
          padding: "2px 7px",
          borderRadius: 20,
          background: "rgba(255,255,255,0.06)",
          color: STATUS_CFG[task.status].color,
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {STATUS_CFG[task.status].label}
      </span>

      {/* Due date chip */}
      {task.due_date !== null && (
        <span
          style={{
            fontSize: 10,
            padding: "2px 7px",
            borderRadius: 20,
            background: overdue
              ? "rgba(248,113,113,0.15)"
              : "rgba(255,255,255,0.06)",
            color: overdue ? "#f87171" : "var(--text-tertiary)",
            fontWeight: overdue ? 500 : 400,
            flexShrink: 0,
          }}
        >
          {formatDueDate(task.due_date)}
        </span>
      )}

      {/* Action buttons (visible on hover) */}
      <div
        style={{
          display: "flex",
          gap: 4,
          opacity: hovered ? 1 : 0,
          transition: "opacity 80ms ease",
        }}
      >
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label="Editar tarefa"
          title="Editar"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            padding: 4,
            display: "flex",
          }}
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          aria-label="Excluir tarefa"
          title="Excluir"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#f87171",
            padding: 4,
            display: "flex",
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface TaskFormState {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  due_date: string;
}

function TaskFormModal({
  initial,
  onSubmit,
  onClose,
}: {
  initial: TaskFormState;
  onSubmit: (form: TaskFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<TaskFormState>(initial);

  function update<K extends keyof TaskFormState>(k: K, v: TaskFormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleSubmit() {
    if (form.title.trim() === "") return;
    onSubmit(form);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editar tarefa"
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
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#11161c",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: 24,
          width: 420,
          maxWidth: "90vw",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {initial.title === "" ? "Nova tarefa" : "Editar tarefa"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <FormField label="Título">
          <input
            autoFocus
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Ex: Revisar proposta comercial"
            style={inputStyle}
          />
        </FormField>

        <FormField label="Descrição">
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Detalhes opcionais"
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </FormField>

        <div style={{ display: "flex", gap: 10 }}>
          <FormField label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value as Status)}
              style={inputStyle}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_CFG[s].label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Prioridade">
            <select
              value={form.priority}
              onChange={(e) => update("priority", e.target.value as Priority)}
              style={inputStyle}
            >
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_CFG[p].label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Data de vencimento">
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => update("due_date", e.target.value)}
            style={inputStyle}
          />
        </FormField>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 16px",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.65)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={form.title.trim() === ""}
            style={{
              padding: "7px 16px",
              background:
                form.title.trim() === "" ? "rgba(59,130,246,0.30)" : "#3b82f6",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: form.title.trim() === "" ? "not-allowed" : "pointer",
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  padding: "8px 10px",
  outline: "none",
};

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        flex: 1,
        fontSize: 11,
        fontWeight: 500,
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {label}
      {children}
    </label>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function TarefasApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const [editing, setEditing] = useState<{
    mode: "create" | "edit";
    task: Task | null;
  } | null>(null);

  // ── Load ──

  useEffect(() => {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const d = drivers;
    const cid = activeCompanyId;
    let active = true;

    async function load() {
      setLoading(true);
      const res = (await d.data
        .from("tasks")
        .select("*")
        .eq("company_id", cid)
        .order("sort_order", { ascending: true })
        .order("created_at", {
          ascending: false,
        })) as unknown as QueryResult<unknown[]>;
      if (!active) return;
      if (res.error !== null && res.error !== undefined) {
        setTasks([]);
      } else {
        setTasks(asTaskList(res.data));
      }
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [drivers, userId, activeCompanyId]);

  // ── Derived ──

  const counts = useMemo(() => {
    const byStatus: Record<Status, number> = {
      todo: 0,
      in_progress: 0,
      done: 0,
      cancelled: 0,
    };
    const byPriority: Record<Priority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    for (const t of tasks) {
      byStatus[t.status] += 1;
      byPriority[t.priority] += 1;
    }
    return { byStatus, byPriority, total: tasks.length };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    let base = tasks;
    if (statusFilter !== "all")
      base = base.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "all")
      base = base.filter((t) => t.priority === priorityFilter);
    return [...base].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [tasks, statusFilter, priorityFilter]);

  // ── Handlers ──

  async function handleCreate(form: TaskFormState) {
    if (drivers === null || userId === null || activeCompanyId === null) return;

    const tempId = `tmp-${Date.now().toString()}`;
    const nowIso = new Date().toISOString();
    const optimistic: Task = {
      id: tempId,
      company_id: activeCompanyId,
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      due_date: form.due_date === "" ? null : form.due_date,
      assigned_to: null,
      created_by: userId,
      completed_at: form.status === "done" ? nowIso : null,
      sort_order: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };
    setTasks((prev) => [optimistic, ...prev]);
    setEditing(null);

    const insertPayload: Record<string, unknown> = {
      company_id: activeCompanyId,
      created_by: userId,
      title: optimistic.title,
      description: optimistic.description,
      status: optimistic.status,
      priority: optimistic.priority,
      due_date: optimistic.due_date,
      sort_order: 0,
      ...(optimistic.completed_at !== null && {
        completed_at: optimistic.completed_at,
      }),
    };

    const res = (await drivers.data
      .from("tasks")
      .insert(insertPayload)
      .select()
      .single()) as unknown as QueryResult<Task>;

    if (
      res.error !== null &&
      res.error !== undefined &&
      typeof res.error === "object"
    ) {
      // Rollback optimistic
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      return;
    }
    if (res.data !== null) {
      const saved = res.data;
      setTasks((prev) => prev.map((t) => (t.id === tempId ? saved : t)));
    }
  }

  async function handleUpdate(id: string, form: TaskFormState) {
    if (drivers === null) return;

    const dueDate = form.due_date === "" ? null : form.due_date;
    const nowIso = new Date().toISOString();
    const completed_at =
      form.status === "done"
        ? (tasks.find((t) => t.id === id)?.completed_at ?? nowIso)
        : null;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              title: form.title.trim(),
              description: form.description.trim(),
              status: form.status,
              priority: form.priority,
              due_date: dueDate,
              completed_at,
              updated_at: nowIso,
            }
          : t,
      ),
    );
    setEditing(null);

    await drivers.data
      .from("tasks")
      .update({
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        due_date: dueDate,
        completed_at,
      })
      .eq("id", id);
  }

  async function handleToggleStatus(id: string, status: Status) {
    if (drivers === null) return;
    const nowIso = new Date().toISOString();
    const completed_at = status === "done" ? nowIso : null;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status, completed_at, updated_at: nowIso } : t,
      ),
    );

    await drivers.data
      .from("tasks")
      .update({ status, completed_at })
      .eq("id", id);
  }

  async function handleDelete(id: string) {
    if (drivers === null) return;
    const ok = window.confirm("Excluir esta tarefa? Esta ação é permanente.");
    if (!ok) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await drivers.data.from("tasks").delete().eq("id", id);
  }

  // ── Render ──

  if (drivers === null || userId === null || activeCompanyId === null) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#191d21",
          color: "var(--text-tertiary)",
          fontSize: 13,
        }}
      >
        Carregando…
      </div>
    );
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
      {/* ─── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 200,
          background: "#11161c",
          boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 14px 6px",
          }}
        >
          <ListChecks size={16} color="#3b82f6" />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Tarefas
          </span>
        </div>

        <div style={{ padding: "0 8px 8px" }}>
          <button
            type="button"
            onClick={() => setEditing({ mode: "create", task: null })}
            style={{
              width: "100%",
              padding: "7px 10px",
              background: "#3b82f6",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Plus size={13} strokeWidth={2.5} />
            Nova tarefa
          </button>
        </div>

        <SectionLabel>Status</SectionLabel>
        <div style={{ padding: "0 8px" }}>
          <SidebarItem
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            icon={<Inbox size={14} />}
            label="Todas"
            count={counts.total}
          />
          {STATUS_ORDER.map((s) => {
            const Icon = STATUS_CFG[s].icon;
            return (
              <SidebarItem
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                icon={<Icon size={14} />}
                label={STATUS_CFG[s].label}
                count={counts.byStatus[s]}
                color={STATUS_CFG[s].color}
              />
            );
          })}
        </div>

        <SectionLabel>Prioridade</SectionLabel>
        <div style={{ padding: "0 8px 16px" }}>
          <SidebarItem
            active={priorityFilter === "all"}
            onClick={() => setPriorityFilter("all")}
            icon={<Filter size={14} />}
            label="Todas"
          />
          {PRIORITY_ORDER.map((p) => (
            <SidebarItem
              key={p}
              active={priorityFilter === p}
              onClick={() => setPriorityFilter(p)}
              icon={
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: PRIORITY_CFG[p].color,
                  }}
                />
              }
              label={PRIORITY_CFG[p].label}
              count={counts.byPriority[p]}
            />
          ))}
        </div>
      </aside>

      {/* ─── Content ─────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "20px 24px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {statusFilter === "all"
                ? "Todas as tarefas"
                : STATUS_CFG[statusFilter].label}
              {priorityFilter !== "all" &&
                ` · ${PRIORITY_CFG[priorityFilter].label}`}
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
            >
              {visibleTasks.length}{" "}
              {visibleTasks.length === 1 ? "tarefa" : "tarefas"}
            </p>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 24px 160px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {loading ? (
            <div
              style={{
                padding: "48px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              Carregando…
            </div>
          ) : visibleTasks.length === 0 ? (
            <div
              style={{
                padding: "48px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              {tasks.length === 0
                ? "Nenhuma tarefa. Crie a primeira."
                : "Nenhuma tarefa nesse filtro."}
            </div>
          ) : (
            visibleTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={handleToggleStatus}
                onEdit={(task) => setEditing({ mode: "edit", task })}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </main>

      {/* ─── Modal ───────────────────────────────────────────────────── */}
      {editing !== null && (
        <TaskFormModal
          initial={
            editing.task !== null
              ? {
                  title: editing.task.title,
                  description: editing.task.description,
                  status: editing.task.status,
                  priority: editing.task.priority,
                  due_date: editing.task.due_date ?? "",
                }
              : {
                  title: "",
                  description: "",
                  status: "todo",
                  priority: "medium",
                  due_date: "",
                }
          }
          onSubmit={(form) => {
            if (editing.mode === "create") void handleCreate(form);
            else if (editing.task !== null)
              void handleUpdate(editing.task.id, form);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
