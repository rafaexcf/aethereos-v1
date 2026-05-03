import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ListChecks,
  Sun,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
  Hash,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useModalA11y } from "../../components/shared/useModalA11y";
import { useNotify } from "../../hooks/useNotify";
import { moveToTrash } from "../../lib/trash";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "urgent";
type TaskStatus = "pending" | "completed";
type ViewId = "my-day" | "next-7" | "next-30" | "all" | "overdue" | "completed";
type ActiveView = ViewId | string; // string = list_id UUID

interface TaskList {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  user_id: string;
  company_id: string;
  list_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  due_time: string | null;
  reminder_at: string | null;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low"];

const LIST_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  purple: "#a855f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  pink: "#ec4899",
  teal: "#14b8a6",
  gray: "#64748b",
};

const LIST_COLOR_KEYS = Object.keys(LIST_COLORS);

const QUICK_VIEWS = [
  { id: "my-day" as ViewId, label: "Meu Dia", icon: Sun },
  { id: "next-7" as ViewId, label: "Próximos 7 Dias", icon: CalendarDays },
  { id: "next-30" as ViewId, label: "Próximos 30 Dias", icon: CalendarDays },
  { id: "all" as ViewId, label: "Todas as Tarefas", icon: ListChecks },
  { id: "overdue" as ViewId, label: "Atrasadas", icon: AlertCircle },
  { id: "completed" as ViewId, label: "Concluídas", icon: CheckCircle2 },
] as const;

// ─── Date utilities ───────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isOverdue(due: string | null): boolean {
  return due !== null && due < todayStr();
}

function isToday(due: string | null): boolean {
  return due !== null && due === todayStr();
}

function isInNext7(due: string | null): boolean {
  if (due === null) return false;
  const today = todayStr();
  const end = addDaysStr(7);
  return due >= today && due <= end;
}

function isInNext30(due: string | null): boolean {
  if (due === null) return false;
  const today = todayStr();
  const end = addDaysStr(30);
  return due >= today && due <= end;
}

function formatDueDate(due: string): string {
  const today = todayStr();
  const tomorrow = addDaysStr(1);
  if (due === today) return "Hoje";
  if (due === tomorrow) return "Amanhã";
  const d = new Date(due + "T12:00:00");
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function todayLong(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function nextPosition(arr: { position: number }[]): number {
  return arr.reduce((m, t) => Math.max(m, t.position), -1) + 1;
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const modalRef = useModalA11y<HTMLDivElement>({
    open: true,
    onClose: onCancel,
  });
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
      onClick={onCancel}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar exclusão"
        style={{
          background: "#11161c",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: "24px",
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
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
                color: "rgba(255,255,255,0.90)",
                marginBottom: 6,
              }}
            >
              Confirmar exclusão
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(255,255,255,0.50)",
              }}
            >
              {message}
            </p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
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
            onClick={onConfirm}
            style={{
              padding: "7px 16px",
              background: "#ef4444",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Excluir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CFG[priority];
  if (priority === "medium") return null; // medium is the default, skip visual noise
  return (
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
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  allTasks,
  taskLists,
  isSelected,
  canDrag,
  isDragTarget,
  onComplete,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  task: Task;
  allTasks: Task[];
  taskLists: TaskList[];
  isSelected: boolean;
  canDrag: boolean;
  isDragTarget: boolean;
  onComplete: (id: string) => void;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const overdue = isOverdue(task.due_date);
  const today = isToday(task.due_date);
  const completed = task.status === "completed";

  const subtasks = allTasks.filter((t) => t.parent_task_id === task.id);
  const completedSubs = subtasks.filter((t) => t.status === "completed").length;

  const listColor =
    task.list_id !== null
      ? (LIST_COLORS[
          taskLists.find((l) => l.id === task.list_id)?.color ?? "gray"
        ] ?? "#64748b")
      : null;

  return (
    <div
      draggable={canDrag}
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(e) => onDragOver(e, task.id)}
      onDrop={() => onDrop(task.id)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(task.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 12px",
        borderRadius: 10,
        background: isSelected
          ? "rgba(59,130,246,0.10)"
          : hovered
            ? "rgba(255,255,255,0.04)"
            : "transparent",
        border: isDragTarget
          ? "1px solid rgba(59,130,246,0.50)"
          : "1px solid transparent",
        cursor: "pointer",
        transition: "background 80ms ease, border-color 80ms ease",
        userSelect: "none",
      }}
    >
      {/* Drag handle */}
      {canDrag && (
        <div
          style={{
            color: hovered ? "rgba(255,255,255,0.25)" : "transparent",
            flexShrink: 0,
            cursor: "grab",
            transition: "color 80ms ease",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </div>
      )}

      {/* Checkbox */}
      <button
        type="button"
        title={completed ? "Reabrir" : "Concluir"}
        onClick={(e) => {
          e.stopPropagation();
          onComplete(task.id);
        }}
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: completed
            ? "none"
            : `2px solid ${PRIORITY_CFG[task.priority].color}`,
          background: completed
            ? PRIORITY_CFG[task.priority].color
            : "transparent",
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
      <PriorityDot priority={task.priority} />

      {/* Title */}
      <span
        style={{
          flex: 1,
          fontSize: 14,
          color: completed
            ? "rgba(255,255,255,0.30)"
            : "rgba(255,255,255,0.85)",
          textDecoration: completed ? "line-through" : "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {task.title}
      </span>

      {/* List color dot (in filter views) */}
      {listColor !== null && !canDrag && (
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: listColor,
            flexShrink: 0,
          }}
        />
      )}

      {/* Subtask count */}
      {subtasks.length > 0 && (
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.30)",
            flexShrink: 0,
          }}
        >
          {completedSubs}/{subtasks.length}
        </span>
      )}

      {/* Due date chip */}
      {task.due_date !== null && (
        <span
          style={{
            fontSize: 11,
            padding: "2px 7px",
            borderRadius: 20,
            background: overdue
              ? "rgba(248,113,113,0.15)"
              : today
                ? "rgba(251,146,60,0.15)"
                : "rgba(255,255,255,0.07)",
            color: overdue
              ? "#f87171"
              : today
                ? "#fb923c"
                : "rgba(255,255,255,0.40)",
            flexShrink: 0,
            fontWeight: overdue ? 500 : 400,
          }}
        >
          {formatDueDate(task.due_date)}
        </span>
      )}
    </div>
  );
}

// ─── Subtask Row (inside detail panel) ───────────────────────────────────────

function SubtaskRow({
  task,
  onComplete,
  onDelete,
}: {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const done = task.status === "completed";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 8,
        background: hovered ? "rgba(255,255,255,0.04)" : "transparent",
      }}
    >
      <button
        type="button"
        onClick={() => onComplete(task.id)}
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: done ? "none" : "1.5px solid rgba(255,255,255,0.30)",
          background: done ? "#60a5fa" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {done && <Check size={10} color="white" strokeWidth={2.5} />}
      </button>
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: done ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.75)",
          textDecoration: done ? "line-through" : "none",
        }}
      >
        {task.title}
      </span>
      {hovered && (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.25)",
            padding: 2,
            display: "flex",
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

function TaskDetailPanel({
  task,
  allTasks,
  taskLists,
  onClose,
  onUpdate,
  onDelete,
  onComplete,
  onCreateSubtask,
  onCompleteSubtask,
  onDeleteSubtask,
}: {
  task: Task;
  allTasks: Task[];
  taskLists: TaskList[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onCreateSubtask: (parentId: string, title: string) => void;
  onCompleteSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [newSubtask, setNewSubtask] = useState("");
  const [showListPicker, setShowListPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when a different task is selected
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
  }, [task.id]);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (titleDebRef.current !== null) clearTimeout(titleDebRef.current);
    titleDebRef.current = setTimeout(() => {
      onUpdate(task.id, { title: val.trim().length > 0 ? val : "Sem título" });
    }, 500);
  }

  function handleDescChange(val: string) {
    setDescription(val);
    if (descDebRef.current !== null) clearTimeout(descDebRef.current);
    descDebRef.current = setTimeout(() => {
      onUpdate(task.id, { description: val });
    }, 500);
  }

  function requestNotifPermission() {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      void Notification.requestPermission();
    }
  }

  const subtasks = allTasks.filter((t) => t.parent_task_id === task.id);
  const completedSubs = subtasks.filter((t) => t.status === "completed").length;
  const overdue = isOverdue(task.due_date);
  const done = task.status === "completed";

  const currentList =
    task.list_id !== null
      ? taskLists.find((l) => l.id === task.list_id)
      : undefined;

  return (
    <div
      style={{
        width: 360,
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        background: "#11161c",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 14px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          gap: 8,
        }}
      >
        {/* Complete toggle */}
        <button
          type="button"
          title={done ? "Reabrir tarefa" : "Concluir tarefa"}
          onClick={() => onComplete(task.id)}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: done
              ? "none"
              : `2px solid ${PRIORITY_CFG[task.priority].color}`,
            background: done
              ? PRIORITY_CFG[task.priority].color
              : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {done && <Check size={12} color="white" strokeWidth={2.5} />}
        </button>

        <span
          style={{
            fontSize: 11,
            color: done ? "#60a5fa" : "rgba(255,255,255,0.35)",
            fontWeight: 500,
            flex: 1,
          }}
        >
          {done ? "Concluída" : "Pendente"}
        </span>

        <button
          type="button"
          title="Fechar"
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {/* Title */}
        <textarea
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          rows={2}
          maxLength={200}
          aria-label="Título da tarefa"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: done ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.90)",
            fontSize: 18,
            fontWeight: 600,
            lineHeight: 1.4,
            outline: "none",
            resize: "none",
            textDecoration: done ? "line-through" : "none",
            caretColor: "#3b82f6",
            fontFamily: "inherit",
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />

        {/* Priority */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 6,
            }}
          >
            Prioridade
          </label>
          <div style={{ display: "flex", gap: 4 }}>
            {PRIORITY_ORDER.map((p) => {
              const cfg = PRIORITY_CFG[p];
              const active = task.priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onUpdate(task.id, { priority: p })}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    borderRadius: 8,
                    background: active ? cfg.bg : "rgba(255,255,255,0.04)",
                    border: active
                      ? `1px solid ${cfg.color}40`
                      : "1px solid rgba(255,255,255,0.08)",
                    color: active ? cfg.color : "rgba(255,255,255,0.40)",
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 100ms ease",
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div style={{ marginBottom: 14, position: "relative" }}>
          <label
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 6,
            }}
          >
            Lista
          </label>
          <button
            type="button"
            onClick={() => setShowListPicker((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.75)",
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {currentList !== undefined ? (
              <>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: LIST_COLORS[currentList.color] ?? "#64748b",
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1 }}>{currentList.name}</span>
              </>
            ) : (
              <>
                <Hash size={12} color="rgba(255,255,255,0.30)" />
                <span style={{ flex: 1, color: "rgba(255,255,255,0.40)" }}>
                  Sem lista
                </span>
              </>
            )}
            <ChevronDown size={13} color="rgba(255,255,255,0.30)" />
          </button>

          {showListPicker && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 20,
                background: "rgba(8,12,22,0.98)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.50)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  onUpdate(task.id, { list_id: null });
                  setShowListPicker(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.50)",
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Hash size={12} />
                Sem lista
              </button>
              {taskLists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    onUpdate(task.id, { list_id: l.id });
                    setShowListPicker(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background:
                      task.list_id === l.id
                        ? "rgba(255,255,255,0.06)"
                        : "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: LIST_COLORS[l.color] ?? "#64748b",
                      flexShrink: 0,
                    }}
                  />
                  {l.name}
                  {task.list_id === l.id && (
                    <Check
                      size={12}
                      color="#60a5fa"
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Due date */}
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 6,
            }}
          >
            Data de Vencimento
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) =>
                onUpdate(task.id, {
                  due_date: e.target.value.length > 0 ? e.target.value : null,
                })
              }
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${overdue ? "rgba(248,113,113,0.35)" : "rgba(255,255,255,0.09)"}`,
                borderRadius: 8,
                padding: "7px 10px",
                color: overdue ? "#f87171" : "rgba(255,255,255,0.75)",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
              }}
            />
            <input
              type="time"
              value={task.due_time ?? ""}
              onChange={(e) =>
                onUpdate(task.id, {
                  due_time: e.target.value.length > 0 ? e.target.value : null,
                })
              }
              style={{
                width: 96,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 8,
                padding: "7px 8px",
                color: "rgba(255,255,255,0.75)",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>
          {task.due_date !== null && (
            <button
              type="button"
              onClick={() =>
                onUpdate(task.id, { due_date: null, due_time: null })
              }
              style={{
                marginTop: 6,
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.30)",
                fontSize: 11,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Remover data
            </button>
          )}
        </div>

        {/* Reminder */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 6,
            }}
          >
            Lembrete
          </label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="datetime-local"
              value={
                task.reminder_at !== null ? task.reminder_at.slice(0, 16) : ""
              }
              onChange={(e) => {
                requestNotifPermission();
                onUpdate(task.id, {
                  reminder_at:
                    e.target.value.length > 0
                      ? new Date(e.target.value).toISOString()
                      : null,
                });
              }}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 8,
                padding: "7px 10px",
                color: "rgba(255,255,255,0.75)",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
              }}
            />
            {task.reminder_at !== null && (
              <button
                type="button"
                onClick={() => onUpdate(task.id, { reminder_at: null })}
                style={{
                  width: 28,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.40)",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          {typeof Notification !== "undefined" &&
            Notification.permission === "denied" && (
              <p
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "#fb923c",
                  margin: "6px 0 0",
                }}
              >
                Permissão de notificações negada pelo navegador.
              </p>
            )}
        </div>

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 6,
            }}
          >
            Descrição
          </label>
          <textarea
            value={description}
            onChange={(e) => handleDescChange(e.target.value)}
            placeholder="Adicionar descrição..."
            rows={4}
            maxLength={2000}
            aria-label="Descrição da tarefa"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "9px 10px",
              color: "rgba(255,255,255,0.70)",
              fontSize: 13,
              lineHeight: 1.6,
              outline: "none",
              resize: "vertical",
              caretColor: "#3b82f6",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Subtasks */}
        <div>
          <label
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 6,
            }}
          >
            Subtarefas
            {subtasks.length > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  color: "rgba(255,255,255,0.25)",
                  fontWeight: 400,
                  textTransform: "none",
                }}
              >
                {completedSubs}/{subtasks.length}
              </span>
            )}
          </label>

          {subtasks.map((st) => (
            <SubtaskRow
              key={st.id}
              task={st}
              onComplete={onCompleteSubtask}
              onDelete={onDeleteSubtask}
            />
          ))}

          {/* Add subtask */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
            }}
          >
            <Plus size={13} color="rgba(255,255,255,0.30)" />
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSubtask.trim().length > 0) {
                  onCreateSubtask(task.id, newSubtask.trim());
                  setNewSubtask("");
                }
              }}
              placeholder="Adicionar subtarefa..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.70)",
                fontSize: 13,
                outline: "none",
                caretColor: "#3b82f6",
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.20)",
          }}
        >
          {task.completed_at !== null
            ? `Concluída em ${new Date(task.completed_at).toLocaleDateString("pt-BR")}`
            : `Criada em ${new Date(task.created_at).toLocaleDateString("pt-BR")}`}
        </span>
        <button
          type="button"
          title="Excluir tarefa"
          onClick={() => setConfirmDelete(true)}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "rgba(248,113,113,0.50)",
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {confirmDelete && (
        <DeleteConfirmModal
          message="Esta tarefa e suas subtarefas serão excluídas permanentemente."
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete(task.id);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

// ─── Quick Add ────────────────────────────────────────────────────────────────

function QuickAdd({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (title: string) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    onAdd(trimmed);
    setValue("");
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        marginBottom: 16,
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <Plus size={15} color="rgba(59,130,246,0.70)" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setValue("");
        }}
        placeholder={placeholder}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.80)",
          fontSize: 14,
          outline: "none",
          caretColor: "#3b82f6",
        }}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={submit}
          style={{
            padding: "4px 10px",
            background: "#3b82f6",
            border: "none",
            borderRadius: 6,
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Adicionar
        </button>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ view, search }: { view: string; search: string }) {
  const ACCENT = "#3b82f6";
  type Msg = {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    body: string;
  };

  if (search.length > 0) {
    return (
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
            background: "rgba(59,130,246,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Search size={24} style={{ color: ACCENT }} />
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
            Nenhum resultado
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "var(--text-tertiary)",
              lineHeight: 1.6,
            }}
          >
            Tente termos diferentes ou verifique o filtro ativo.
          </p>
        </div>
      </div>
    );
  }

  const config: Record<string, Msg> = {
    "my-day": {
      icon: <Sun size={24} style={{ color: "#f59e0b" }} />,
      iconBg: "rgba(245,158,11,0.10)",
      title: "Nenhuma tarefa para hoje",
      body: "Adicione tarefas com vencimento hoje e mantenha o dia organizado.",
    },
    "next-7": {
      icon: <CalendarDays size={24} style={{ color: ACCENT }} />,
      iconBg: "rgba(59,130,246,0.10)",
      title: "Próximos 7 dias livres",
      body: "Nenhuma tarefa vence nesta semana. Aproveite para planejar.",
    },
    "next-30": {
      icon: <CalendarDays size={24} style={{ color: ACCENT }} />,
      iconBg: "rgba(59,130,246,0.10)",
      title: "Próximos 30 dias livres",
      body: "Nenhuma tarefa vence neste mês. Adicione prazos às suas tarefas.",
    },
    overdue: {
      icon: <AlertCircle size={24} style={{ color: "#22c55e" }} />,
      iconBg: "rgba(34,197,94,0.10)",
      title: "Sem tarefas atrasadas",
      body: "Parabéns, você está em dia com todos os prazos!",
    },
    completed: {
      icon: <CheckCircle2 size={24} style={{ color: ACCENT }} />,
      iconBg: "rgba(59,130,246,0.10)",
      title: "Nenhuma tarefa concluída",
      body: "Tarefas marcadas como concluídas aparecem aqui.",
    },
    all: {
      icon: <ListChecks size={24} style={{ color: ACCENT }} />,
      iconBg: "rgba(59,130,246,0.10)",
      title: "Nenhuma tarefa ainda",
      body: "Use o campo acima para criar sua primeira tarefa.",
    },
  };

  const msg = config[view] ?? {
    icon: <ListChecks size={24} style={{ color: ACCENT }} />,
    iconBg: "rgba(59,130,246,0.10)",
    title: "Lista vazia",
    body: "Use o campo acima para adicionar a primeira tarefa desta lista.",
  };

  return (
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
          background: msg.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {msg.icon}
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
          {msg.title}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--text-tertiary)",
            lineHeight: 1.6,
          }}
        >
          {msg.body}
        </p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function TarefasApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();
  const notify = useNotify();

  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState<ActiveView>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "task" | "list";
    id: string;
  } | null>(null);

  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState("blue");

  // Drag and drop
  const draggedIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Save debounce
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Map<string, Partial<Task>>>(new Map());

  // Reminder dedup
  const firedRef = useRef<Set<string>>(new Set());

  // ── Load ──

  useEffect(() => {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const d = drivers;
    const uid = userId;
    const cid = activeCompanyId;

    async function load() {
      setLoading(true);
      const [listsRes, tasksRes] = await Promise.all([
        d.data
          .from("task_lists")
          .select("*")
          .eq("user_id", uid)
          .eq("company_id", cid)
          .order("position", { ascending: true }),
        d.data
          .from("tasks")
          .select("*")
          .eq("user_id", uid)
          .eq("company_id", cid)
          .order("position", { ascending: true }),
      ]);
      setTaskLists((listsRes.data ?? []) as TaskList[]);
      setTasks((tasksRes.data ?? []) as Task[]);
      setLoading(false);
    }

    void load();
  }, [drivers, userId, activeCompanyId]);

  // ── Reminder check ──

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      const now = Date.now();
      tasks.forEach((task) => {
        if (task.reminder_at === null) return;
        const fireMs = new Date(task.reminder_at).getTime();
        const key = `${task.id}-reminder`;
        if (
          !firedRef.current.has(key) &&
          fireMs <= now &&
          now < fireMs + 60000
        ) {
          firedRef.current.add(key);
          new Notification(`📋 ${task.title}`, {
            body:
              task.due_date !== null
                ? `Vence ${formatDueDate(task.due_date)}`
                : "Lembrete de tarefa",
          });
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [tasks]);

  // ── Derived view data ──

  const isListView = !QUICK_VIEWS.some((v) => v.id === activeView);

  const parentTasks = useMemo(
    () => tasks.filter((t) => t.parent_task_id === null),
    [tasks],
  );

  const visibleTasks = useMemo(() => {
    let base = parentTasks;

    if (activeView === "my-day") {
      base = base.filter((t) => isToday(t.due_date) && t.status === "pending");
    } else if (activeView === "next-7") {
      base = base.filter(
        (t) => isInNext7(t.due_date) && t.status === "pending",
      );
    } else if (activeView === "next-30") {
      base = base.filter(
        (t) => isInNext30(t.due_date) && t.status === "pending",
      );
    } else if (activeView === "overdue") {
      base = base.filter(
        (t) => isOverdue(t.due_date) && t.status === "pending",
      );
    } else if (activeView === "completed") {
      base = base.filter((t) => t.status === "completed");
    } else if (activeView === "all") {
      base = base.filter((t) => t.status === "pending");
    } else {
      // list view
      base = base.filter((t) => t.list_id === activeView);
    }

    if (search.trim().length > 0) {
      const q = search.toLowerCase();
      base = base.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }

    return base;
  }, [parentTasks, activeView, search]);

  const pendingVisible = useMemo(
    () =>
      activeView === "completed"
        ? visibleTasks
        : visibleTasks.filter((t) => t.status === "pending"),
    [visibleTasks, activeView],
  );

  const completedVisible = useMemo(
    () =>
      activeView !== "completed" && isListView
        ? visibleTasks.filter((t) => t.status === "completed")
        : [],
    [visibleTasks, activeView, isListView],
  );

  // Sort: list view → by position; filter views → overdue first, then by due_date, then priority
  const sortedPending = useMemo(() => {
    if (isListView) {
      return [...pendingVisible].sort((a, b) => a.position - b.position);
    }
    return [...pendingVisible].sort((a, b) => {
      const aOverdue = isOverdue(a.due_date) ? -1 : 0;
      const bOverdue = isOverdue(b.due_date) ? -1 : 0;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      if (a.due_date !== null && b.due_date !== null)
        return a.due_date.localeCompare(b.due_date);
      if (a.due_date !== null) return -1;
      if (b.due_date !== null) return 1;
      return (
        PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
      );
    });
  }, [pendingVisible, isListView]);

  const selectedTask = useMemo(
    () =>
      selectedTaskId !== null
        ? (tasks.find((t) => t.id === selectedTaskId) ?? null)
        : null,
    [tasks, selectedTaskId],
  );

  // ── CRUD handlers ──

  function scheduleUpdate(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const current = pendingRef.current.get(id) ?? {};
    pendingRef.current.set(id, { ...current, ...patch });
    if (saveRef.current !== null) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      if (!drivers) return;
      const updates = Array.from(pendingRef.current.entries());
      pendingRef.current.clear();
      void Promise.all(
        updates.map(([tid, upd]) =>
          drivers.data.from("tasks").update(upd).eq("id", tid),
        ),
      );
    }, 600);
  }

  function handleCreateTask(title: string, listId?: string) {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const resolvedListId = listId ?? (isListView ? activeView : null);
    const sameLists = tasks.filter(
      (t) => t.list_id === resolvedListId && t.parent_task_id === null,
    );
    const pos = nextPosition(sameLists);

    const dueDate =
      activeView === "my-day"
        ? todayStr()
        : activeView === "next-7"
          ? addDaysStr(7)
          : activeView === "next-30"
            ? addDaysStr(30)
            : null;

    const now = new Date().toISOString();
    const tempId = `temp-${Date.now().toString()}`;
    const optimistic: Task = {
      id: tempId,
      user_id: userId,
      company_id: activeCompanyId,
      list_id: resolvedListId ?? null,
      parent_task_id: null,
      title,
      description: "",
      status: "pending",
      priority: "medium",
      due_date: dueDate,
      due_time: null,
      reminder_at: null,
      position: pos,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    setTasks((prev) => [...prev, optimistic]);

    void drivers.data
      .from("tasks")
      .insert({
        user_id: userId,
        company_id: activeCompanyId,
        list_id: resolvedListId ?? null,
        parent_task_id: null,
        title,
        description: "",
        status: "pending",
        priority: "medium",
        due_date: dueDate,
        due_time: null,
        reminder_at: null,
        position: pos,
        completed_at: null,
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (data !== null && error === null) {
          setTasks((prev) =>
            prev.map((t) => (t.id === tempId ? (data as Task) : t)),
          );
          setSelectedTaskId((data as Task).id);
        } else {
          setTasks((prev) => prev.filter((t) => t.id !== tempId));
          if (error !== null) {
            void notify({
              type: "error",
              title: "Falha ao criar tarefa",
              body: error.message,
              source_app: "tarefas",
            });
          }
        }
      });
  }

  function handleCompleteTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (task === undefined) return;
    const done = task.status === "completed";
    scheduleUpdate(id, {
      status: done ? "pending" : "completed",
      completed_at: done ? null : new Date().toISOString(),
    });
    if (!done && selectedTaskId === id) setSelectedTaskId(null);
  }

  function handleUpdateTask(id: string, patch: Partial<Task>) {
    scheduleUpdate(id, patch);
  }

  function handleDeleteTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    setTasks((prev) =>
      prev.filter((t) => t.id !== id && t.parent_task_id !== id),
    );
    if (selectedTaskId === id) setSelectedTaskId(null);
    if (
      drivers === null ||
      userId === null ||
      activeCompanyId === null ||
      task === undefined
    )
      return;
    void (async () => {
      await moveToTrash({
        drivers,
        userId,
        companyId: activeCompanyId,
        appId: "tarefas",
        itemType: "task",
        itemName: task.title.trim() !== "" ? task.title : "(Sem título)",
        itemData: task as unknown as Record<string, unknown>,
        originalId: task.id,
      });
      await drivers.data.from("tasks").delete().eq("id", id);
    })();
  }

  function handleCreateSubtask(parentId: string, title: string) {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const siblings = tasks.filter((t) => t.parent_task_id === parentId);
    const pos = nextPosition(siblings);

    void drivers.data
      .from("tasks")
      .insert({
        user_id: userId,
        company_id: activeCompanyId,
        list_id: tasks.find((t) => t.id === parentId)?.list_id ?? null,
        parent_task_id: parentId,
        title,
        description: "",
        status: "pending",
        priority: "medium",
        due_date: null,
        due_time: null,
        reminder_at: null,
        position: pos,
        completed_at: null,
      })
      .select()
      .single()
      .then(({ data }) => {
        if (data !== null) setTasks((prev) => [...prev, data as Task]);
      });
  }

  function handleCompleteSubtask(id: string) {
    handleCompleteTask(id);
  }

  function handleDeleteSubtask(id: string) {
    const sub = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (
      drivers === null ||
      userId === null ||
      activeCompanyId === null ||
      sub === undefined
    )
      return;
    void (async () => {
      await moveToTrash({
        drivers,
        userId,
        companyId: activeCompanyId,
        appId: "tarefas",
        itemType: "task",
        itemName: sub.title.trim() !== "" ? sub.title : "(Sem título)",
        itemData: sub as unknown as Record<string, unknown>,
        originalId: sub.id,
      });
      await drivers.data.from("tasks").delete().eq("id", id);
    })();
  }

  function handleCreateList() {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const name = newListName.trim();
    if (name.length === 0) return;
    const pos = nextPosition(taskLists);

    void drivers.data
      .from("task_lists")
      .insert({
        user_id: userId,
        company_id: activeCompanyId,
        name,
        color: newListColor,
        position: pos,
      })
      .select()
      .single()
      .then(({ data }) => {
        if (data !== null) {
          setTaskLists((prev) => [...prev, data as TaskList]);
          setActiveView((data as TaskList).id);
        }
      });

    setNewListName("");
    setShowNewList(false);
  }

  function handleDeleteList(id: string) {
    setTaskLists((prev) => prev.filter((l) => l.id !== id));
    setTasks((prev) => prev.filter((t) => t.list_id !== id));
    if (activeView === id) setActiveView("all");
    if (selectedTaskId !== null) {
      const task = tasks.find((t) => t.id === selectedTaskId);
      if (task?.list_id === id) setSelectedTaskId(null);
    }
    if (drivers) void drivers.data.from("task_lists").delete().eq("id", id);
  }

  // ── Drag and drop ──

  function handleDragStart(id: string) {
    draggedIdRef.current = id;
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (dragOverId !== id) setDragOverId(id);
  }

  function handleDrop(targetId: string) {
    const fromId = draggedIdRef.current;
    draggedIdRef.current = null;
    setDragOverId(null);
    if (fromId === null || fromId === targetId) return;

    const listTasks = sortedPending;
    const fromIdx = listTasks.findIndex((t) => t.id === fromId);
    const toIdx = listTasks.findIndex((t) => t.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...listTasks];
    const spliced = reordered.splice(fromIdx, 1);
    const moved = spliced[0];
    if (moved === undefined) return;
    reordered.splice(toIdx, 0, moved);

    const updates = reordered.map((t, i) => ({ id: t.id, position: i }));
    setTasks((prev) =>
      prev.map((t) => {
        const upd = updates.find((u) => u.id === t.id);
        return upd !== undefined ? { ...t, position: upd.position } : t;
      }),
    );
    if (drivers)
      void Promise.all(
        updates.map((u) =>
          drivers.data
            .from("tasks")
            .update({ position: u.position })
            .eq("id", u.id),
        ),
      );
  }

  function handleDragEnd() {
    draggedIdRef.current = null;
    setDragOverId(null);
  }

  // ── View metadata ──

  const viewLabel =
    QUICK_VIEWS.find((v) => v.id === activeView)?.label ??
    taskLists.find((l) => l.id === activeView)?.name ??
    "Tarefas";

  const activeListColor = isListView
    ? (LIST_COLORS[
        taskLists.find((l) => l.id === activeView)?.color ?? "gray"
      ] ?? "#64748b")
    : "#3b82f6";

  const ActiveViewIcon =
    QUICK_VIEWS.find((v) => v.id === activeView)?.icon ?? ListChecks;

  // ── Task count per list for sidebar badges ──

  const pendingByList = useMemo(() => {
    const m: Record<string, number> = {};
    tasks
      .filter((t) => t.status === "pending" && t.parent_task_id === null)
      .forEach((t) => {
        const key = t.list_id ?? "__none__";
        m[key] = (m[key] ?? 0) + 1;
      });
    return m;
  }, [tasks]);

  const viewCounts: Record<ViewId, number> = useMemo(
    () => ({
      "my-day": parentTasks.filter(
        (t) => isToday(t.due_date) && t.status === "pending",
      ).length,
      "next-7": parentTasks.filter(
        (t) => isInNext7(t.due_date) && t.status === "pending",
      ).length,
      "next-30": parentTasks.filter(
        (t) => isInNext30(t.due_date) && t.status === "pending",
      ).length,
      all: parentTasks.filter((t) => t.status === "pending").length,
      overdue: parentTasks.filter(
        (t) => isOverdue(t.due_date) && t.status === "pending",
      ).length,
      completed: parentTasks.filter((t) => t.status === "completed").length,
    }),
    [parentTasks],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ── Render ──
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "#191d21",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          width: collapsed ? SIDEBAR_ICON_W : SIDEBAR_W,
          flexShrink: 0,
          overflow: "visible",
          transition: "width 250ms ease",
          position: "relative",
        }}
      >
        <aside style={{ ...ASIDE_STYLE, overflow: "hidden" }}>
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
            <ListChecks
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
                Tarefas
              </span>
            )}
          </div>

          {collapsed ? (
            /* Icon-only sidebar */
            <nav
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "12px 0",
                gap: 2,
              }}
            >
              {QUICK_VIEWS.map(({ id, label, icon: Icon }) => {
                const isActive = activeView === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() => setActiveView(id)}
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
              {taskLists.map((l) => {
                const isActive = activeView === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    title={l.name}
                    onClick={() => setActiveView(l.id)}
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
                          }
                        : {
                            border: "1px solid transparent",
                            background: "transparent",
                          }),
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: LIST_COLORS[l.color] ?? "#64748b",
                      }}
                    />
                  </button>
                );
              })}
            </nav>
          ) : (
            /* Full sidebar */
            <div style={{ padding: "4px 0 16px 8px", flex: 1 }}>
              {/* Quick views */}
              {QUICK_VIEWS.map(({ id, label, icon: Icon }) => {
                const isActive = activeView === id;
                const count = viewCounts[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveView(id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 8px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition:
                        "background 120ms ease, color 120ms ease, border-color 120ms ease, margin 120ms ease",
                      marginBottom: 2,
                      fontSize: 13,
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
                    <Icon size={15} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {count > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color:
                            id === "overdue"
                              ? "#f87171"
                              : "var(--text-tertiary)",
                          fontWeight: id === "overdue" ? 600 : 400,
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Lists section */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 8px 4px",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}
                >
                  Minhas Listas
                </span>
              </div>

              {taskLists.map((l) => {
                const isActive = activeView === l.id;
                const count = pendingByList[l.id] ?? 0;
                const dot = LIST_COLORS[l.color] ?? "#64748b";
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setActiveView(l.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setDeleteConfirm({ type: "list", id: l.id });
                    }}
                    title={`${l.name} (clique direito para excluir)`}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 8px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition:
                        "background 120ms ease, color 120ms ease, border-color 120ms ease, margin 120ms ease",
                      marginBottom: 2,
                      fontSize: 13,
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
                    <div
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: dot,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.name}
                    </span>
                    {count > 0 && (
                      <span
                        style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Add new list */}
              {showNewList ? (
                <div
                  style={{
                    padding: "6px 8px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    marginTop: 4,
                  }}
                >
                  <input
                    autoFocus
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateList();
                      if (e.key === "Escape") setShowNewList(false);
                    }}
                    placeholder="Nome da lista"
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 13,
                      outline: "none",
                      marginBottom: 8,
                      boxSizing: "border-box",
                      caretColor: "#3b82f6",
                    }}
                  />
                  {/* Color picker */}
                  <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                    {LIST_COLOR_KEYS.map((ck) => (
                      <button
                        key={ck}
                        type="button"
                        aria-label={`Cor ${ck}`}
                        aria-pressed={newListColor === ck}
                        onClick={() => setNewListColor(ck)}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: LIST_COLORS[ck],
                          border:
                            newListColor === ck
                              ? "2px solid white"
                              : "2px solid transparent",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={handleCreateList}
                      disabled={newListName.trim().length === 0}
                      style={{
                        flex: 1,
                        padding: "5px 0",
                        background: "#3b82f6",
                        border: "none",
                        borderRadius: 6,
                        color: "white",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: newListName.trim().length === 0 ? 0.5 : 1,
                      }}
                    >
                      Criar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewList(false);
                        setNewListName("");
                      }}
                      style={{
                        padding: "5px 8px",
                        background: "rgba(255,255,255,0.06)",
                        border: "none",
                        borderRadius: 6,
                        color: "rgba(255,255,255,0.50)",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewList(true)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 13,
                    textAlign: "left",
                    marginTop: 2,
                  }}
                >
                  <Plus size={13} />
                  Nova lista
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Collapse toggle */}
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
      </div>

      {/* ─── Main + Detail ────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* ─── Main content ───────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            <ActiveViewIcon
              size={14}
              style={{ color: activeListColor, flexShrink: 0 }}
            />
            <h2
              style={{
                margin: "0 12px 0 0",
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(255,255,255,0.75)",
                whiteSpace: "nowrap",
                minWidth: 80,
              }}
            >
              {viewLabel}
            </h2>
            {activeView === "my-day" && (
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.35)",
                  fontWeight: 400,
                  textTransform: "capitalize",
                  whiteSpace: "nowrap",
                }}
              >
                {todayLong()}
              </span>
            )}
            {isListView && (
              <button
                type="button"
                title="Excluir lista"
                onClick={() =>
                  setDeleteConfirm({ type: "list", id: activeView })
                }
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.20)",
                }}
              >
                <Trash2 size={13} />
              </button>
            )}

            {/* Search */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              <Search size={13} color="rgba(255,255,255,0.30)" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tarefas..."
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.80)",
                  fontSize: 13,
                  outline: "none",
                  caretColor: "#3b82f6",
                }}
              />
              {search.length > 0 && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => setSearch("")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.30)",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Task list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 20px",
              paddingBottom: 160,
            }}
          >
            {loading ? (
              <div
                className="skeleton-pulse"
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                {[44, 60, 44, 52, 44].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        background: "rgba(255,255,255,0.08)",
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          height: 13,
                          width: `${w}%`,
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.08)",
                        }}
                      />
                      {i % 2 === 0 && (
                        <div
                          style={{
                            height: 10,
                            width: "30%",
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.05)",
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Quick add */}
                {activeView !== "completed" && search.length === 0 && (
                  <QuickAdd
                    placeholder={
                      isListView
                        ? `Digitar tarefa em "${viewLabel}"...`
                        : "Digitar tarefa..."
                    }
                    onAdd={handleCreateTask}
                  />
                )}

                {/* Pending tasks */}
                {sortedPending.length > 0 ? (
                  <div>
                    {sortedPending.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        allTasks={tasks}
                        taskLists={taskLists}
                        isSelected={selectedTaskId === task.id}
                        canDrag={isListView && search.length === 0}
                        isDragTarget={dragOverId === task.id}
                        onComplete={handleCompleteTask}
                        onSelect={(id) =>
                          setSelectedTaskId(selectedTaskId === id ? null : id)
                        }
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState view={activeView} search={search} />
                )}

                {/* Completed section (list views only) */}
                {completedVisible.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => setShowCompleted((v) => !v)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "rgba(255,255,255,0.35)",
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "4px 0",
                        marginBottom: 4,
                      }}
                    >
                      {showCompleted ? (
                        <ChevronDown size={13} />
                      ) : (
                        <ChevronRight size={13} />
                      )}
                      Concluídas ({completedVisible.length})
                    </button>
                    {showCompleted &&
                      completedVisible.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          allTasks={tasks}
                          taskLists={taskLists}
                          isSelected={selectedTaskId === task.id}
                          canDrag={false}
                          isDragTarget={false}
                          onComplete={handleCompleteTask}
                          onSelect={(id) =>
                            setSelectedTaskId(selectedTaskId === id ? null : id)
                          }
                          onDragStart={() => undefined}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => undefined}
                          onDragEnd={() => undefined}
                        />
                      ))}
                  </div>
                )}

                {/* "Concluídas" quick-view: show all completed */}
                {activeView === "completed" &&
                  visibleTasks.length > 0 &&
                  visibleTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      allTasks={tasks}
                      taskLists={taskLists}
                      isSelected={selectedTaskId === task.id}
                      canDrag={false}
                      isDragTarget={false}
                      onComplete={handleCompleteTask}
                      onSelect={(id) =>
                        setSelectedTaskId(selectedTaskId === id ? null : id)
                      }
                      onDragStart={() => undefined}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => undefined}
                      onDragEnd={() => undefined}
                    />
                  ))}
              </>
            )}
          </div>
        </div>

        {/* ─── Detail Panel ───────────────────────────────────────────────── */}
        {selectedTask !== null && (
          <TaskDetailPanel
            task={selectedTask}
            allTasks={tasks}
            taskLists={taskLists}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            onComplete={handleCompleteTask}
            onCreateSubtask={handleCreateSubtask}
            onCompleteSubtask={handleCompleteSubtask}
            onDeleteSubtask={handleDeleteSubtask}
          />
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm !== null && (
        <DeleteConfirmModal
          message={
            deleteConfirm.type === "list"
              ? "A lista e todas as suas tarefas serão excluídas permanentemente."
              : "Esta tarefa e suas subtarefas serão excluídas permanentemente."
          }
          onConfirm={() => {
            if (deleteConfirm.type === "list") {
              handleDeleteList(deleteConfirm.id);
            } else {
              handleDeleteTask(deleteConfirm.id);
            }
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
