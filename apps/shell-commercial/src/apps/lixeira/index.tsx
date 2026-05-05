import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trash2,
  RotateCcw,
  FileText,
  ListChecks,
  File,
  Folder,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { DeleteConfirmModal } from "../../components/shared/DeleteConfirmModal";
import { EmptyState } from "../../components/shared/EmptyState";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrashedFile {
  id: string;
  company_id: string;
  parent_id: string | null;
  kind: "file" | "folder";
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}

interface TrashedNote {
  id: string;
  company_id: string;
  title: string;
  content: string;
  color: string | null;
  pinned: boolean;
  archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TrashedTask {
  id: string;
  company_id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface EmployeeProfile {
  user_id: string;
  full_name: string;
}

type TrashKind = "file" | "note" | "task";

interface TrashEntry {
  id: string;
  kind: TrashKind;
  name: string;
  typeLabel: string;
  deletedAt: string;
  deletedByUserId: string;
}

type Tab = "files" | "notes" | "tasks";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#64748b";
const APP_BG = "#191d21";
const TAB_CFG: ReadonlyArray<{
  id: Tab;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}> = [
  { id: "files", label: "Arquivos", icon: File },
  { id: "notes", label: "Notas", icon: FileText },
  { id: "tasks", label: "Tarefas", icon: ListChecks },
];

const PURGE_NOTICE =
  "Itens na lixeira são excluídos permanentemente após 30 dias.";
const CONFIRM_WORD = "EXCLUIR";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileTypeLabel(file: TrashedFile): string {
  if (file.kind === "folder") return "Pasta";
  if (file.mime_type !== null && file.mime_type.length > 0) {
    return file.mime_type;
  }
  return "Arquivo";
}

function priorityLabel(p: TrashedTask["priority"]): string {
  switch (p) {
    case "low":
      return "Baixa";
    case "medium":
      return "Média";
    case "high":
      return "Alta";
    case "urgent":
      return "Urgente";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LixeiraApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  const [files, setFiles] = useState<TrashedFile[]>([]);
  const [notes, setNotes] = useState<TrashedNote[]>([]);
  const [tasks, setTasks] = useState<TrashedTask[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [tab, setTab] = useState<Tab>("files");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TrashEntry | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const ready = drivers !== null && userId !== null && activeCompanyId !== null;

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (drivers === null || activeCompanyId === null) return;
    setLoading(true);
    const [filesRes, notesRes, tasksRes, empRes] = await Promise.all([
      drivers.data
        .from("files")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
      drivers.data
        .from("notes")
        .select("*")
        .eq("archived", true)
        .order("updated_at", { ascending: false }),
      drivers.data
        .from("tasks")
        .select("*")
        .eq("status", "cancelled")
        .order("updated_at", { ascending: false }),
      drivers.data
        .from("employees")
        .select("user_id, full_name")
        .not("user_id", "is", null),
    ]);
    setFiles((filesRes.data ?? []) as TrashedFile[]);
    setNotes((notesRes.data ?? []) as TrashedNote[]);
    setTasks((tasksRes.data ?? []) as TrashedTask[]);
    setEmployees((empRes.data ?? []) as EmployeeProfile[]);
    setLoading(false);
  }, [drivers, activeCompanyId]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const employeeMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const e of employees) {
      m.set(e.user_id, e.full_name);
    }
    return m;
  }, [employees]);

  const counts: Record<Tab, number> = useMemo(
    () => ({
      files: files.length,
      notes: notes.length,
      tasks: tasks.length,
    }),
    [files, notes, tasks],
  );

  const totalCount = counts.files + counts.notes + counts.tasks;

  const entries = useMemo<TrashEntry[]>(() => {
    if (tab === "files") {
      return files.map<TrashEntry>((f) => ({
        id: f.id,
        kind: "file",
        name: f.name,
        typeLabel: fileTypeLabel(f),
        deletedAt: f.deleted_at,
        deletedByUserId: f.created_by,
      }));
    }
    if (tab === "notes") {
      return notes.map<TrashEntry>((n) => ({
        id: n.id,
        kind: "note",
        name: n.title.trim().length > 0 ? n.title : "(Sem título)",
        typeLabel: "Nota",
        deletedAt: n.updated_at,
        deletedByUserId: n.created_by,
      }));
    }
    return tasks.map<TrashEntry>((t) => ({
      id: t.id,
      kind: "task",
      name: t.title,
      typeLabel: `Tarefa · ${priorityLabel(t.priority)}`,
      deletedAt: t.updated_at,
      deletedByUserId: t.created_by,
    }));
  }, [tab, files, notes, tasks]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  async function restoreEntry(entry: TrashEntry): Promise<void> {
    if (drivers === null || busy) return;
    setBusy(true);
    if (entry.kind === "file") {
      await drivers.data
        .from("files")
        .update({ deleted_at: null })
        .eq("id", entry.id);
      setFiles((prev) => prev.filter((f) => f.id !== entry.id));
    } else if (entry.kind === "note") {
      await drivers.data
        .from("notes")
        .update({ archived: false })
        .eq("id", entry.id);
      setNotes((prev) => prev.filter((n) => n.id !== entry.id));
    } else {
      await drivers.data
        .from("tasks")
        .update({ status: "todo" })
        .eq("id", entry.id);
      setTasks((prev) => prev.filter((t) => t.id !== entry.id));
    }
    setBusy(false);
  }

  function tableNameFor(kind: TrashKind): "files" | "notes" | "tasks" {
    if (kind === "file") return "files";
    if (kind === "note") return "notes";
    return "tasks";
  }

  async function purgeEntry(entry: TrashEntry): Promise<void> {
    if (drivers === null || busy) return;
    setBusy(true);
    await drivers.data
      .from(tableNameFor(entry.kind))
      .delete()
      .eq("id", entry.id);
    if (entry.kind === "file") {
      setFiles((prev) => prev.filter((f) => f.id !== entry.id));
    } else if (entry.kind === "note") {
      setNotes((prev) => prev.filter((n) => n.id !== entry.id));
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== entry.id));
    }
    setConfirmDelete(null);
    setBusy(false);
  }

  async function emptyTrash(): Promise<void> {
    if (drivers === null || busy) return;
    setBusy(true);
    const fileIds = files.map((f) => f.id);
    const noteIds = notes.map((n) => n.id);
    const taskIds = tasks.map((t) => t.id);

    const d = drivers;
    if (fileIds.length > 0) {
      await d.data.from("files").delete().in("id", fileIds);
    }
    if (noteIds.length > 0) {
      await d.data.from("notes").delete().in("id", noteIds);
    }
    if (taskIds.length > 0) {
      await d.data.from("tasks").delete().in("id", taskIds);
    }
    setFiles([]);
    setNotes([]);
    setTasks([]);
    setConfirmEmpty(false);
    setBusy(false);
  }

  // ── Confirm flows (R13 dupla confirmação) ───────────────────────────────────

  function askPurge(entry: TrashEntry): void {
    setConfirmDelete(entry);
  }

  function handlePurgeConfirm(): void {
    if (confirmDelete === null) return;
    const typed = window.prompt(
      `Esta ação é irreversível. Digite ${CONFIRM_WORD} para confirmar:`,
      "",
    );
    if (typed === CONFIRM_WORD) {
      void purgeEntry(confirmDelete);
    } else {
      setConfirmDelete(null);
    }
  }

  function handleEmptyConfirm(): void {
    const typed = window.prompt(
      `Esvaziar lixeira é irreversível. Digite ${CONFIRM_WORD} para confirmar:`,
      "",
    );
    if (typed === CONFIRM_WORD) {
      void emptyTrash();
    } else {
      setConfirmEmpty(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: APP_BG,
          color: "var(--text-tertiary)",
          fontSize: 13,
        }}
      >
        Aguardando sessão...
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: APP_BG,
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      <DeleteConfirmModal
        open={confirmDelete !== null}
        title="Excluir permanentemente"
        message={
          confirmDelete !== null
            ? `"${confirmDelete.name}" será excluído permanentemente. Esta ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Continuar"
        onConfirm={handlePurgeConfirm}
        onClose={() => setConfirmDelete(null)}
      />
      <DeleteConfirmModal
        open={confirmEmpty}
        title="Esvaziar lixeira"
        message={`Todos os ${String(totalCount)} itens serão excluídos permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Continuar"
        onConfirm={handleEmptyConfirm}
        onClose={() => setConfirmEmpty(false)}
      />

      <Header
        totalCount={totalCount}
        onEmpty={() => setConfirmEmpty(true)}
        emptyDisabled={totalCount === 0 || busy}
      />

      <Tabs tab={tab} counts={counts} onChange={setTab} />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: 160,
          scrollbarWidth: "thin",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            Carregando...
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="Trash2"
            title="Lixeira vazia"
            description="Lixeira vazia. Nenhum item excluído."
          />
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: "8px 0",
            }}
          >
            {entries.map((entry) => (
              <EntryRow
                key={`${entry.kind}-${entry.id}`}
                entry={entry}
                deletedByName={employeeMap.get(entry.deletedByUserId) ?? "—"}
                busy={busy}
                onRestore={() => void restoreEntry(entry)}
                onDelete={() => askPurge(entry)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Header({
  totalCount,
  onEmpty,
  emptyDisabled,
}: {
  totalCount: number;
  onEmpty: () => void;
  emptyDisabled: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}
    >
      <Trash2 size={14} style={{ color: ACCENT, flexShrink: 0 }} />
      <h2
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 600,
          color: "rgba(255,255,255,0.75)",
          whiteSpace: "nowrap",
        }}
      >
        Lixeira
      </h2>
      <span
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.35)",
          fontWeight: 400,
          whiteSpace: "nowrap",
        }}
      >
        {String(totalCount)} {totalCount === 1 ? "item" : "itens"}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 11,
          color: "var(--text-tertiary)",
          fontStyle: "italic",
          textAlign: "center",
          padding: "0 12px",
        }}
      >
        {PURGE_NOTICE}
      </span>
      <button
        type="button"
        onClick={onEmpty}
        disabled={emptyDisabled}
        aria-label="Esvaziar lixeira"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 7,
          background: "rgba(239,68,68,0.10)",
          border: "1px solid rgba(239,68,68,0.22)",
          color: "#ef4444",
          fontSize: 12,
          fontWeight: 600,
          cursor: emptyDisabled ? "not-allowed" : "pointer",
          opacity: emptyDisabled ? 0.4 : 1,
          transition: "background 120ms ease, border-color 120ms ease",
        }}
      >
        <Trash2 size={12} />
        Esvaziar lixeira
      </button>
    </div>
  );
}

function Tabs({
  tab,
  counts,
  onChange,
}: {
  tab: Tab;
  counts: Record<Tab, number>;
  onChange: (t: Tab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Categorias da lixeira"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "10px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        flexShrink: 0,
      }}
    >
      {TAB_CFG.map(({ id, label, icon: Icon }) => {
        const active = tab === id;
        const count = counts[id];
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              border: active
                ? "1px solid rgba(255,255,255,0.14)"
                : "1px solid rgba(255,255,255,0.06)",
              background: active ? "rgba(255,255,255,0.08)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              transition: "background 120ms ease, color 120ms ease",
            }}
          >
            <Icon size={12} color={active ? ACCENT : "currentColor"} />
            <span>{label}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: active ? ACCENT : "rgba(255,255,255,0.30)",
                background: active
                  ? "rgba(100,116,139,0.18)"
                  : "rgba(255,255,255,0.05)",
                borderRadius: 8,
                padding: "1px 6px",
              }}
            >
              {String(count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EntryRow({
  entry,
  deletedByName,
  busy,
  onRestore,
  onDelete,
}: {
  entry: TrashEntry;
  deletedByName: string;
  busy: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const Icon =
    entry.kind === "file"
      ? entry.typeLabel === "Pasta"
        ? Folder
        : File
      : entry.kind === "note"
        ? FileText
        : ListChecks;

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "rgba(100,116,139,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} color={ACCENT} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {entry.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span>{entry.typeLabel}</span>
          <span style={{ color: "rgba(255,255,255,0.22)" }}>·</span>
          <span>Excluído em {fmtDateTime(entry.deletedAt)}</span>
          <span style={{ color: "rgba(255,255,255,0.22)" }}>·</span>
          <span>por {deletedByName}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onRestore}
          disabled={busy}
          aria-label={`Restaurar ${entry.name}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 7,
            color: "#10b981",
            fontSize: 12,
            fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.5 : 1,
            transition: "background 120ms ease, border-color 120ms ease",
          }}
        >
          <RotateCcw size={12} />
          Restaurar
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          aria-label={`Excluir ${entry.name} permanentemente`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.22)",
            borderRadius: 7,
            color: "#ef4444",
            fontSize: 12,
            fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.5 : 1,
            transition: "background 120ms ease, border-color 120ms ease",
          }}
        >
          <Trash2 size={12} />
          Excluir
        </button>
      </div>
    </li>
  );
}
