import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trash2,
  RotateCcw,
  FileText,
  ListChecks,
  Users,
  Mic,
  BarChart2,
  Kanban,
  Search,
  X,
  Calendar,
  Filter,
  Image as ImageIcon,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { DeleteConfirmModal } from "../../components/shared/DeleteConfirmModal";

interface TrashedNote {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  content: string;
  trashed_at: string | null;
}

interface TrashItem {
  id: string;
  user_id: string;
  company_id: string;
  app_id: string;
  item_type: string;
  item_name: string;
  item_data: Record<string, unknown>;
  original_id: string | null;
  deleted_at: string;
  expires_at: string;
}

type EntrySource = "note" | "trash_item";

interface TrashEntry {
  id: string;
  source: EntrySource;
  appId: string;
  itemType: string;
  name: string;
  preview: string;
  data: Record<string, unknown>;
  deletedAt: string;
  expiresAt: string;
}

type TypeFilter =
  | "all"
  | "bloco-de-notas"
  | "tarefas"
  | "agenda-telefonica"
  | "gravador-de-voz"
  | "enquetes"
  | "kanban"
  | "camera";

type DateFilter = "all" | "today" | "7d" | "30d";

const ACCENT = "#64748b";
const TOTAL_DAYS = 30;
const WARN_DAYS = 25;

const TYPE_CFG: {
  id: TypeFilter;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { id: "all", label: "Todos", icon: Trash2 },
  { id: "bloco-de-notas", label: "Notas", icon: FileText },
  { id: "tarefas", label: "Tarefas", icon: ListChecks },
  { id: "agenda-telefonica", label: "Contatos", icon: Users },
  { id: "camera", label: "Fotos", icon: ImageIcon },
  { id: "gravador-de-voz", label: "Áudios", icon: Mic },
  { id: "enquetes", label: "Enquetes", icon: BarChart2 },
  { id: "kanban", label: "Kanban", icon: Kanban },
];

const DATE_CFG: { id: DateFilter; label: string }[] = [
  { id: "all", label: "Qualquer data" },
  { id: "today", label: "Hoje" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
];

function daysDiff(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function daysAgo(iso: string): number {
  return daysDiff(iso, new Date().toISOString());
}

function daysUntil(iso: string): number {
  return daysDiff(new Date().toISOString(), iso);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, n: number): string {
  return text.length <= n ? text : text.slice(0, n - 1) + "…";
}

function noteToEntry(note: TrashedNote): TrashEntry {
  const deletedAt = note.trashed_at ?? new Date().toISOString();
  const expiresAt = new Date(
    new Date(deletedAt).getTime() + TOTAL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  return {
    id: note.id,
    source: "note",
    appId: "bloco-de-notas",
    itemType: "note",
    name: note.title.trim() !== "" ? note.title : "(Sem título)",
    preview: note.content,
    data: { content: note.content },
    deletedAt,
    expiresAt,
  };
}

function trashItemToEntry(item: TrashItem): TrashEntry {
  const data = item.item_data;
  let preview = "";
  const desc = data["description"];
  const content = data["content"];
  const phone = data["phone"];
  if (typeof desc === "string") preview = desc;
  else if (typeof content === "string") preview = content;
  else if (typeof phone === "string") preview = phone;
  return {
    id: item.id,
    source: "trash_item",
    appId: item.app_id,
    itemType: item.item_type,
    name: item.item_name.trim() !== "" ? item.item_name : "(Sem nome)",
    preview,
    data,
    deletedAt: item.deleted_at,
    expiresAt: item.expires_at,
  };
}

function getAppIcon(
  appId: string,
): React.ComponentType<{ size?: number; color?: string }> {
  switch (appId) {
    case "bloco-de-notas":
      return FileText;
    case "tarefas":
      return ListChecks;
    case "agenda-telefonica":
      return Users;
    case "gravador-de-voz":
      return Mic;
    case "enquetes":
      return BarChart2;
    case "kanban":
      return Kanban;
    case "camera":
      return ImageIcon;
    default:
      return Trash2;
  }
}

function getAppLabel(appId: string): string {
  switch (appId) {
    case "bloco-de-notas":
      return "Nota";
    case "tarefas":
      return "Tarefa";
    case "agenda-telefonica":
      return "Contato";
    case "gravador-de-voz":
      return "Gravação";
    case "enquetes":
      return "Enquete";
    case "kanban":
      return "Quadro Kanban";
    case "camera":
      return "Foto";
    default:
      return "Item";
  }
}

function restoreTableFor(appId: string): string | null {
  switch (appId) {
    case "tarefas":
      return "tasks";
    case "agenda-telefonica":
      return "contacts";
    case "kanban":
      return "kanban_cards";
    case "enquetes":
      return "polls";
    case "documentos":
      return "documents";
    case "apresentacoes":
      return "presentations";
    case "planilhas":
      return "spreadsheets";
    case "camera":
      return "media_files";
    case "gravador-de-voz":
      return "voice_recordings";
    default:
      return null;
  }
}

const TRANSIENT_KEYS_BY_APP: Record<string, string[]> = {
  "agenda-telefonica": ["methods", "addresses", "groupIds", "phone", "email"],
  enquetes: ["options"],
  camera: ["url", "bucket"],
  "gravador-de-voz": ["url", "bucket", "duration"],
};

function stripJoinedFields(
  appId: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const drop = TRANSIENT_KEYS_BY_APP[appId] ?? [];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (drop.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

function getCategoryLabel(appId: string): string {
  switch (appId) {
    case "bloco-de-notas":
      return "Notas";
    case "tarefas":
      return "Tarefas";
    case "agenda-telefonica":
      return "Contatos";
    case "gravador-de-voz":
      return "Áudios";
    case "enquetes":
      return "Enquetes";
    case "kanban":
      return "Kanban";
    case "camera":
      return "Fotos";
    default:
      return "Outros";
  }
}

export function LixeiraApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();

  const [trashedNotes, setTrashedNotes] = useState<TrashedNote[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TrashEntry | null>(null);

  const load = useCallback(async () => {
    if (drivers === null || userId === null || companyId === null) return;
    setLoading(true);
    const [notesRes, itemsRes] = await Promise.all([
      drivers.data
        .from("notes")
        .select("id,user_id,company_id,title,content,trashed_at")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .eq("trashed", true)
        .order("trashed_at", { ascending: false }),
      drivers.data
        .from("trash_items")
        .select("*")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .order("deleted_at", { ascending: false }),
    ]);
    setTrashedNotes((notesRes.data ?? []) as TrashedNote[]);
    setTrashItems((itemsRes.data ?? []) as TrashItem[]);
    setLoading(false);
  }, [drivers, userId, companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const allEntries = useMemo<TrashEntry[]>(() => {
    const notes = trashedNotes.map(noteToEntry);
    const items = trashItems.map(trashItemToEntry);
    return [...notes, ...items].sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
    );
  }, [trashedNotes, trashItems]);

  const typeCounts = useMemo<Record<TypeFilter, number>>(() => {
    const counts: Record<TypeFilter, number> = {
      all: allEntries.length,
      "bloco-de-notas": 0,
      tarefas: 0,
      "agenda-telefonica": 0,
      "gravador-de-voz": 0,
      enquetes: 0,
      kanban: 0,
      camera: 0,
    };
    for (const e of allEntries) {
      if (e.appId in counts) {
        counts[e.appId as TypeFilter] += 1;
      }
    }
    return counts;
  }, [allEntries]);

  const filteredEntries = useMemo<TrashEntry[]>(() => {
    let base = allEntries;
    if (typeFilter !== "all") {
      base = base.filter((e) => e.appId === typeFilter);
    }
    if (dateFilter !== "all") {
      const limit = dateFilter === "today" ? 1 : dateFilter === "7d" ? 7 : 30;
      base = base.filter((e) => daysAgo(e.deletedAt) <= limit);
    }
    if (search.trim() !== "") {
      const q = search.toLowerCase();
      base = base.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.preview.toLowerCase().includes(q),
      );
    }
    return base;
  }, [allEntries, typeFilter, dateFilter, search]);

  const grouped = useMemo<{ appId: string; entries: TrashEntry[] }[]>(() => {
    const map = new Map<string, TrashEntry[]>();
    for (const e of filteredEntries) {
      const arr = map.get(e.appId) ?? [];
      arr.push(e);
      map.set(e.appId, arr);
    }
    const order: string[] = [
      "bloco-de-notas",
      "tarefas",
      "agenda-telefonica",
      "camera",
      "gravador-de-voz",
      "enquetes",
      "kanban",
    ];
    const groups: { appId: string; entries: TrashEntry[] }[] = [];
    for (const id of order) {
      const arr = map.get(id);
      if (arr !== undefined && arr.length > 0)
        groups.push({ appId: id, entries: arr });
      map.delete(id);
    }
    for (const [id, arr] of map.entries()) {
      groups.push({ appId: id, entries: arr });
    }
    return groups;
  }, [filteredEntries]);

  const selected = useMemo<TrashEntry | null>(() => {
    if (selectedKey === null) return null;
    return (
      filteredEntries.find((e) => `${e.source}-${e.id}` === selectedKey) ??
      allEntries.find((e) => `${e.source}-${e.id}` === selectedKey) ??
      null
    );
  }, [selectedKey, filteredEntries, allEntries]);

  async function restoreEntry(entry: TrashEntry): Promise<void> {
    if (drivers === null || busy) return;
    setBusy(true);
    if (entry.source === "note") {
      await drivers.data
        .from("notes")
        .update({ trashed: false, trashed_at: null })
        .eq("id", entry.id);
      setTrashedNotes((prev) => prev.filter((n) => n.id !== entry.id));
    } else {
      const tableName = restoreTableFor(entry.appId);
      if (tableName !== null) {
        const insertRow = stripJoinedFields(entry.appId, entry.data);
        await drivers.data.from(tableName).insert(insertRow);
      }
      await drivers.data.from("trash_items").delete().eq("id", entry.id);
      setTrashItems((prev) => prev.filter((i) => i.id !== entry.id));
    }
    setSelectedKey(null);
    setBusy(false);
  }

  async function deleteEntry(entry: TrashEntry): Promise<void> {
    if (drivers === null || busy) return;
    setBusy(true);
    if (entry.source === "note") {
      await drivers.data.from("notes").delete().eq("id", entry.id);
      setTrashedNotes((prev) => prev.filter((n) => n.id !== entry.id));
    } else {
      await drivers.data.from("trash_items").delete().eq("id", entry.id);
      setTrashItems((prev) => prev.filter((i) => i.id !== entry.id));
    }
    setSelectedKey(null);
    setConfirmDelete(null);
    setBusy(false);
  }

  if (drivers === null || userId === null || companyId === null) {
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
        Aguardando sessão...
      </div>
    );
  }

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
      <DeleteConfirmModal
        open={confirmDelete !== null}
        title="Excluir permanentemente"
        message={
          confirmDelete !== null
            ? `"${confirmDelete.name}" será excluído permanentemente. Esta ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          if (confirmDelete !== null) void deleteEntry(confirmDelete);
        }}
        onClose={() => setConfirmDelete(null)}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
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
          <Trash2 size={14} style={{ color: ACCENT, flexShrink: 0 }} />
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
            {allEntries.length} {allEntries.length === 1 ? "item" : "itens"}
          </span>

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
              placeholder="Buscar por título ou conteúdo..."
              aria-label="Buscar na lixeira"
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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <Filter
            size={11}
            color="var(--text-tertiary)"
            style={{ marginRight: 4 }}
          />
          {TYPE_CFG.map(({ id, label, icon: Icon }) => {
            const active = typeFilter === id;
            const count = typeCounts[id];
            const disabled = id !== "all" && count === 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTypeFilter(id)}
                disabled={disabled}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: disabled ? "default" : "pointer",
                  border: active
                    ? "1px solid rgba(255,255,255,0.14)"
                    : "1px solid rgba(255,255,255,0.06)",
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: active
                    ? "var(--text-primary)"
                    : disabled
                      ? "rgba(255,255,255,0.20)"
                      : "var(--text-secondary)",
                  opacity: disabled ? 0.5 : 1,
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
                  {count}
                </span>
              </button>
            );
          })}

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Calendar size={11} color="var(--text-tertiary)" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              aria-label="Filtrar por data"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 7,
                color: "var(--text-secondary)",
                fontSize: 12,
                padding: "5px 8px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {DATE_CFG.map((d) => (
                <option
                  key={d.id}
                  value={d.id}
                  style={{ background: "#191d21" }}
                >
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

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
              Carregando…
            </div>
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              hasFilter={
                search.trim() !== "" ||
                typeFilter !== "all" ||
                dateFilter !== "all"
              }
            />
          ) : (
            grouped.map(({ appId, entries }) => (
              <CategorySection
                key={appId}
                appId={appId}
                entries={entries}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
              />
            ))
          )}
        </div>
      </div>

      {selected !== null && (
        <PreviewPane
          entry={selected}
          busy={busy}
          onClose={() => setSelectedKey(null)}
          onRestore={() => void restoreEntry(selected)}
          onDelete={() => setConfirmDelete(selected)}
        />
      )}
    </div>
  );
}

function CategorySection({
  appId,
  entries,
  selectedKey,
  onSelect,
}: {
  appId: string;
  entries: TrashEntry[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const Icon = getAppIcon(appId);
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 20px 6px",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
        }}
      >
        <Icon size={11} color="currentColor" />
        <span>{getCategoryLabel(appId)}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,0.40)",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 8,
            padding: "1px 7px",
            letterSpacing: 0,
            textTransform: "none",
          }}
        >
          {entries.length}
        </span>
      </div>
      {entries.map((entry) => {
        const key = `${entry.source}-${entry.id}`;
        return (
          <EntryRow
            key={key}
            entry={entry}
            selected={selectedKey === key}
            onClick={() => onSelect(key)}
          />
        );
      })}
    </div>
  );
}

function EntryRow({
  entry,
  selected,
  onClick,
}: {
  entry: TrashEntry;
  selected: boolean;
  onClick: () => void;
}) {
  const AppIcon = getAppIcon(entry.appId);
  const ago = daysAgo(entry.deletedAt);
  const remaining = daysUntil(entry.expiresAt);
  const expiringSoon = ago >= WARN_DAYS;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 20px",
        background: selected ? "rgba(255,255,255,0.06)" : "transparent",
        border: "none",
        borderLeft: selected ? "2px solid #64748b" : "2px solid transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = "transparent";
        }
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
        <AppIcon size={14} color={ACCENT} />
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
          }}
        >
          <span>Excluído em {fmtDate(entry.deletedAt)}</span>
          {expiringSoon ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#eab308",
                background: "rgba(234,179,8,0.12)",
                border: "1px solid rgba(234,179,8,0.25)",
                borderRadius: 4,
                padding: "1px 6px",
              }}
            >
              Expira em breve
            </span>
          ) : (
            <span style={{ color: "rgba(255,255,255,0.22)" }}>
              · {remaining > 0 ? remaining : 0}d restante
              {remaining !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "60px 24px",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "rgba(100,116,139,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Trash2 size={22} color="rgba(100,116,139,0.55)" />
      </div>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          {hasFilter ? "Nenhum resultado" : "Lixeira vazia"}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
          }}
        >
          {hasFilter
            ? "Nenhum item excluído corresponde aos filtros."
            : "Nenhum item excluído recentemente."}
        </p>
      </div>
    </div>
  );
}

function PreviewPane({
  entry,
  busy,
  onClose,
  onRestore,
  onDelete,
}: {
  entry: TrashEntry;
  busy: boolean;
  onClose: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const AppIcon = getAppIcon(entry.appId);
  const appLabel = getAppLabel(entry.appId);
  const categoryLabel = getCategoryLabel(entry.appId);

  return (
    <aside
      style={{
        width: 360,
        flexShrink: 0,
        background: "#11161c",
        boxShadow: "inset 1px 0 0 rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <AppIcon size={14} color={ACCENT} />
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          {appLabel}
        </span>
        <button
          type="button"
          aria-label="Fechar pré-visualização"
          onClick={onClose}
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
            color: "var(--text-tertiary)",
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 18px 24px",
          scrollbarWidth: "thin",
        }}
      >
        <h3
          style={{
            margin: "0 0 12px",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {entry.name}
        </h3>

        <MetaRow label="Categoria" value={categoryLabel} />
        <MetaRow label="Tipo" value={entry.itemType} />
        <MetaRow label="Excluído em" value={fmtDateTime(entry.deletedAt)} />
        <MetaRow label="Expira em" value={fmtDate(entry.expiresAt)} />

        <PreviewBody entry={entry} />
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          onClick={onRestore}
          disabled={busy}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "9px 12px",
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 8,
            color: "#10b981",
            fontSize: 13,
            fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.5 : 1,
            transition: "background 120ms ease, border-color 120ms ease",
          }}
          onMouseEnter={(e) => {
            if (!busy) {
              e.currentTarget.style.background = "rgba(16,185,129,0.20)";
              e.currentTarget.style.borderColor = "rgba(16,185,129,0.40)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(16,185,129,0.12)";
            e.currentTarget.style.borderColor = "rgba(16,185,129,0.25)";
          }}
        >
          <RotateCcw size={13} />
          Restaurar
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "9px 12px",
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.22)",
            borderRadius: 8,
            color: "#ef4444",
            fontSize: 13,
            fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.5 : 1,
            transition: "background 120ms ease, border-color 120ms ease",
          }}
          onMouseEnter={(e) => {
            if (!busy) {
              e.currentTarget.style.background = "rgba(239,68,68,0.20)";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.40)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.10)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.22)";
          }}
        >
          <Trash2 size={13} />
          Excluir
        </button>
      </div>
    </aside>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "6px 0",
        fontSize: 12,
      }}
    >
      <span
        style={{
          color: "var(--text-tertiary)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          minWidth: 90,
          paddingTop: 2,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--text-secondary)",
          flex: 1,
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PreviewBody({ entry }: { entry: TrashEntry }) {
  if (entry.appId === "bloco-de-notas") {
    const content =
      typeof entry.data["content"] === "string" ? entry.data["content"] : "";
    return (
      <PreviewSection title="Conteúdo">
        {content.trim() === "" ? (
          <Muted>(Sem conteúdo)</Muted>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {truncate(content, 800)}
          </p>
        )}
      </PreviewSection>
    );
  }

  if (entry.appId === "agenda-telefonica") {
    const phone =
      typeof entry.data["phone"] === "string" ? entry.data["phone"] : "";
    const email =
      typeof entry.data["email"] === "string" ? entry.data["email"] : "";
    const company =
      typeof entry.data["company"] === "string" ? entry.data["company"] : "";
    return (
      <PreviewSection title="Detalhes">
        {phone !== "" && <MetaRow label="Telefone" value={phone} />}
        {email !== "" && <MetaRow label="Email" value={email} />}
        {company !== "" && <MetaRow label="Empresa" value={company} />}
        {phone === "" && email === "" && company === "" && (
          <Muted>(Sem detalhes adicionais)</Muted>
        )}
      </PreviewSection>
    );
  }

  if (entry.appId === "tarefas") {
    const description =
      typeof entry.data["description"] === "string"
        ? entry.data["description"]
        : "";
    const priority =
      typeof entry.data["priority"] === "string" ? entry.data["priority"] : "";
    const dueDate =
      typeof entry.data["due_date"] === "string" ? entry.data["due_date"] : "";
    return (
      <PreviewSection title="Detalhes">
        {priority !== "" && <MetaRow label="Prioridade" value={priority} />}
        {dueDate !== "" && <MetaRow label="Vencimento" value={dueDate} />}
        {description !== "" && (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {truncate(description, 600)}
          </p>
        )}
        {priority === "" && dueDate === "" && description === "" && (
          <Muted>(Sem detalhes adicionais)</Muted>
        )}
      </PreviewSection>
    );
  }

  if (entry.appId === "camera") {
    const url = typeof entry.data["url"] === "string" ? entry.data["url"] : "";
    const dataUrl =
      typeof entry.data["dataUrl"] === "string" ? entry.data["dataUrl"] : "";
    const src = url !== "" ? url : dataUrl;
    return (
      <PreviewSection title="Pré-visualização">
        {src !== "" ? (
          <img
            src={src}
            alt={entry.name}
            style={{
              width: "100%",
              maxHeight: 220,
              objectFit: "cover",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        ) : (
          <Muted>(Imagem indisponível)</Muted>
        )}
      </PreviewSection>
    );
  }

  if (entry.appId === "gravador-de-voz") {
    const duration =
      typeof entry.data["duration"] === "number"
        ? entry.data["duration"]
        : null;
    const url = typeof entry.data["url"] === "string" ? entry.data["url"] : "";
    return (
      <PreviewSection title="Detalhes">
        {duration !== null && (
          <MetaRow
            label="Duração"
            value={`${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`}
          />
        )}
        {url !== "" && (
          <audio controls src={url} style={{ width: "100%", marginTop: 8 }} />
        )}
        {duration === null && url === "" && (
          <Muted>(Sem mídia disponível)</Muted>
        )}
      </PreviewSection>
    );
  }

  if (entry.preview.trim() !== "") {
    return (
      <PreviewSection title="Pré-visualização">
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {truncate(entry.preview, 600)}
        </p>
      </PreviewSection>
    );
  }

  return null;
}

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        color: "var(--text-tertiary)",
        fontStyle: "italic",
      }}
    >
      {children}
    </span>
  );
}
