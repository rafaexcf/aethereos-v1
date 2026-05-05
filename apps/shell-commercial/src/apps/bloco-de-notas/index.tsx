import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  StickyNote,
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Palette,
  Check,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { EmptyState } from "../../components/shared/EmptyState";
import { DeleteConfirmModal } from "../../components/shared/DeleteConfirmModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  company_id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_W = 280;

const DEFAULT_COLOR = "#fbbf24";

const COLOR_SWATCHES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "#fbbf24", label: "Amarelo" },
  { value: "#22c55e", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#a855f7", label: "Lilás" },
];

const DEFAULT_TITLE = "Sem título";

const AUTO_SAVE_DEBOUNCE_MS = 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${String(min)}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${String(h)}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${String(d)}d`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function previewFromContent(content: string, max = 60): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}…`;
}

function deriveTitle(rawTitle: string, content: string): string {
  if (rawTitle.trim().length > 0 && rawTitle !== DEFAULT_TITLE) {
    return rawTitle;
  }
  const firstLine = content.split("\n").find((l) => l.trim().length > 0);
  if (firstLine === undefined) return DEFAULT_TITLE;
  const trimmed = firstLine.trim();
  return trimmed.length > 60 ? trimmed.slice(0, 60) : trimmed;
}

function sortNotes(notes: ReadonlyArray<Note>): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

// ─── Save status pill ────────────────────────────────────────────────────────

function SaveStatusPill({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const text =
    status === "pending"
      ? "Aguardando…"
      : status === "saving"
        ? "Salvando…"
        : status === "saved"
          ? "Salvo"
          : "Erro ao salvar";
  const color =
    status === "error"
      ? "#ef4444"
      : status === "saved"
        ? "#22c55e"
        : "var(--text-tertiary)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        color,
      }}
      role="status"
      aria-live="polite"
    >
      {status === "saved" ? <Check size={12} /> : null}
      {text}
    </span>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export function BlocoDeNotasApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auto-save debounce
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<{
    id: string;
    title: string;
    content: string;
  } | null>(null);

  // ── Load on mount ──

  useEffect(() => {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const d = drivers;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const res = await d.data
        .from("notes")
        .select("*")
        .eq("archived", false)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      const rows = (res.data ?? []) as Note[];
      setNotes(rows);
      setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [drivers, userId, activeCompanyId]);

  // ── Cleanup debounce on unmount ──

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ── Derived ──

  const filteredNotes = useMemo(() => {
    if (search.trim().length === 0) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q),
    );
  }, [notes, search]);

  const selectedNote = useMemo(
    () =>
      selectedId !== null
        ? (notes.find((n) => n.id === selectedId) ?? null)
        : null,
    [notes, selectedId],
  );

  // ── Auto-save (debounce 1s) ──

  const flushSave = useCallback(async () => {
    if (drivers === null) return;
    const patch = pendingPatchRef.current;
    if (patch === null) return;
    pendingPatchRef.current = null;
    setSaveStatus("saving");
    const finalTitle = deriveTitle(patch.title, patch.content);
    const { error } = await drivers.data
      .from("notes")
      .update({ title: finalTitle, content: patch.content })
      .eq("id", patch.id);
    if (error !== null) {
      setSaveStatus("error");
      return;
    }
    setNotes((prev) =>
      prev.map((n) =>
        n.id === patch.id
          ? {
              ...n,
              title: finalTitle,
              content: patch.content,
              updated_at: new Date().toISOString(),
            }
          : n,
      ),
    );
    setSaveStatus("saved");
  }, [drivers]);

  const scheduleSave = useCallback(
    (id: string, title: string, content: string) => {
      pendingPatchRef.current = { id, title, content };
      setSaveStatus("pending");
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void flushSave();
      }, AUTO_SAVE_DEBOUNCE_MS);
    },
    [flushSave],
  );

  // ── Editor handlers ──

  const handleContentChange = useCallback(
    (newContent: string) => {
      if (selectedNote === null) return;
      const id = selectedNote.id;
      // Optimistic local update
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, content: newContent } : n)),
      );
      scheduleSave(id, selectedNote.title, newContent);
    },
    [selectedNote, scheduleSave],
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (selectedNote === null) return;
      const id = selectedNote.id;
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, title: newTitle } : n)),
      );
      scheduleSave(id, newTitle, selectedNote.content);
    },
    [selectedNote, scheduleSave],
  );

  // ── CRUD ──

  const handleCreate = useCallback(async () => {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const { data, error } = await drivers.data
      .from("notes")
      .insert({
        company_id: activeCompanyId,
        created_by: userId,
        title: DEFAULT_TITLE,
        content: "",
        color: DEFAULT_COLOR,
        pinned: false,
        archived: false,
      })
      .select()
      .single();
    if (error !== null || data === null) return;
    const created = data as Note;
    setNotes((prev) => sortNotes([created, ...prev]));
    setSelectedId(created.id);
    setSaveStatus("idle");
  }, [drivers, userId, activeCompanyId]);

  const handleTogglePin = useCallback(
    async (id: string) => {
      if (drivers === null) return;
      const note = notes.find((n) => n.id === id);
      if (note === undefined) return;
      const newPinned = !note.pinned;
      setNotes((prev) =>
        sortNotes(
          prev.map((n) => (n.id === id ? { ...n, pinned: newPinned } : n)),
        ),
      );
      const { error } = await drivers.data
        .from("notes")
        .update({ pinned: newPinned })
        .eq("id", id);
      if (error !== null) {
        // revert on failure
        setNotes((prev) =>
          sortNotes(
            prev.map((n) => (n.id === id ? { ...n, pinned: note.pinned } : n)),
          ),
        );
      }
    },
    [drivers, notes],
  );

  const handleChangeColor = useCallback(
    async (color: string) => {
      if (drivers === null || selectedNote === null) return;
      const id = selectedNote.id;
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)));
      setColorPickerOpen(false);
      await drivers.data.from("notes").update({ color }).eq("id", id);
    },
    [drivers, selectedNote],
  );

  const handleDelete = useCallback(async () => {
    if (drivers === null || deleteConfirmId === null) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    // Flush any pending save targeting the same note
    if (pendingPatchRef.current !== null && pendingPatchRef.current.id === id) {
      pendingPatchRef.current = null;
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id ?? null);
    }
    setSaveStatus("idle");
    await drivers.data.from("notes").update({ archived: true }).eq("id", id);
  }, [drivers, deleteConfirmId, notes, selectedId]);

  // ── Render guards ──

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

  // ── Render ──

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
      {/* Sidebar */}
      <aside
        style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          background: "#11161c",
          boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Sidebar header */}
        <div
          style={{
            padding: "16px 16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-secondary)",
            }}
          >
            <StickyNote size={14} />
            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                letterSpacing: 0.5,
              }}
            >
              Bloco de Notas
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleCreate();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Nova nota
          </button>

          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <Search size={13} color="var(--text-tertiary)" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Buscar"
              aria-label="Buscar notas"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-secondary)",
                fontSize: 13,
              }}
            />
          </div>
        </div>

        {/* List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 8px 160px",
          }}
        >
          {loading ? (
            <div
              style={{
                padding: 16,
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              Carregando…
            </div>
          ) : filteredNotes.length === 0 ? (
            <div style={{ padding: 16 }}>
              <EmptyState
                icon="StickyNote"
                title={
                  search.trim().length > 0
                    ? "Nenhum resultado"
                    : "Nenhuma nota. Crie a primeira."
                }
              />
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = note.id === selectedId;
              const displayTitle =
                note.title.trim().length > 0 && note.title !== DEFAULT_TITLE
                  ? note.title
                  : previewFromContent(note.content, 40) || DEFAULT_TITLE;
              return (
                <div
                  key={note.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedId(note.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(note.id);
                    }
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "10px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    marginBottom: 2,
                    background: isSelected
                      ? "rgba(255,255,255,0.06)"
                      : "transparent",
                    borderLeft: `3px solid ${note.color}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displayTitle}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleTogglePin(note.id);
                      }}
                      aria-label={note.pinned ? "Desfixar nota" : "Fixar nota"}
                      aria-pressed={note.pinned}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 2,
                        color: note.pinned ? "#fbbf24" : "var(--text-tertiary)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {note.pinned ? <Pin size={12} /> : <PinOff size={12} />}
                    </button>
                  </div>
                  {note.content.trim().length > 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {previewFromContent(note.content, 60)}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {relativeTime(note.updated_at)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Editor */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {selectedNote === null ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <EmptyState
              icon="StickyNote"
              title="Nenhuma nota selecionada"
              description="Selecione uma nota na lista ou crie uma nova."
              action={
                <button
                  type="button"
                  onClick={() => {
                    void handleCreate();
                  }}
                  style={{
                    marginTop: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} /> Nova nota
                </button>
              }
            />
          </div>
        ) : (
          <>
            {/* Editor header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <input
                type="text"
                value={
                  selectedNote.title === DEFAULT_TITLE ? "" : selectedNote.title
                }
                onChange={(e) => {
                  handleTitleChange(
                    e.target.value.length === 0
                      ? DEFAULT_TITLE
                      : e.target.value,
                  );
                }}
                placeholder="Sem título"
                aria-label="Título da nota"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: 15,
                  fontWeight: 600,
                }}
              />

              <SaveStatusPill status={saveStatus} />

              {/* Color picker */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setColorPickerOpen((v) => !v);
                  }}
                  aria-label="Mudar cor da nota"
                  aria-expanded={colorPickerOpen}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 6,
                    padding: 6,
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Palette size={14} />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: selectedNote.color,
                      border: "1px solid rgba(255,255,255,0.20)",
                    }}
                  />
                </button>
                {colorPickerOpen ? (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      zIndex: 10,
                      display: "flex",
                      gap: 6,
                      padding: 8,
                      borderRadius: 8,
                      background: "#11161c",
                      border: "1px solid rgba(255,255,255,0.10)",
                      boxShadow: "0 6px 16px rgba(0,0,0,0.4)",
                    }}
                  >
                    {COLOR_SWATCHES.map((sw) => {
                      const active = sw.value === selectedNote.color;
                      return (
                        <button
                          key={sw.value}
                          type="button"
                          onClick={() => {
                            void handleChangeColor(sw.value);
                          }}
                          aria-label={`Cor ${sw.label}`}
                          aria-pressed={active}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: sw.value,
                            border: active
                              ? "2px solid #fff"
                              : "1px solid rgba(255,255,255,0.20)",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {/* Pin toggle */}
              <button
                type="button"
                onClick={() => {
                  void handleTogglePin(selectedNote.id);
                }}
                aria-label={
                  selectedNote.pinned ? "Desfixar nota" : "Fixar nota"
                }
                aria-pressed={selectedNote.pinned}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 6,
                  padding: 6,
                  cursor: "pointer",
                  color: selectedNote.pinned
                    ? "#fbbf24"
                    : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {selectedNote.pinned ? <Pin size={14} /> : <PinOff size={14} />}
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmId(selectedNote.id);
                }}
                aria-label="Excluir nota"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 6,
                  padding: 6,
                  cursor: "pointer",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Editor body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 20px 160px",
              }}
            >
              <textarea
                value={selectedNote.content}
                onChange={(e) => {
                  handleContentChange(e.target.value);
                }}
                placeholder="Comece a escrever…"
                aria-label="Conteúdo da nota"
                style={{
                  width: "100%",
                  minHeight: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  fontFamily: "inherit",
                }}
              />
            </div>
          </>
        )}
      </main>

      <DeleteConfirmModal
        open={deleteConfirmId !== null}
        title="Excluir nota"
        message="A nota será movida para a lixeira. Você poderá restaurá-la depois."
        onConfirm={handleDelete}
        onClose={() => {
          setDeleteConfirmId(null);
        }}
      />
    </div>
  );
}
