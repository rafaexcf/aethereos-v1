import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  StickyNote,
  Archive,
  Trash2,
  Tag,
  Plus,
  Search,
  LayoutGrid,
  List,
  Pin,
  PinOff,
  ArchiveRestore,
  RotateCcw,
  Palette,
  X,
  Check,
  CheckSquare,
  Type,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
  Pencil,
  Bookmark,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useModalA11y } from "../../components/shared/useModalA11y";

// ─── Types ────────────────────────────────────────────────────────────────────

type NoteColor =
  | "default"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "purple"
  | "pink";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface Note {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  content: string;
  checklist: ChecklistItem[];
  is_checklist: boolean;
  color: NoteColor;
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
  labelIds: string[];
}

interface Label {
  id: string;
  name: string;
}

type Section = "notes" | "archive" | "trash";

interface NoteCategory {
  id: string;
  label: string;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_W = 239;
const SIDEBAR_ICON_W = 48;

const CATEGORY_COLORS = [
  "#8b5cf6",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#f97316",
  "#84cc16",
];

const INITIAL_CATEGORIES: NoteCategory[] = [
  { id: "personal", label: "Pessoal", color: "#8b5cf6" },
  { id: "work", label: "Trabalho", color: "#06b6d4" },
];

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

const NOTE_COLORS: Record<
  NoteColor,
  { bg: string; border: string; dot: string; label: string }
> = {
  default: {
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.10)",
    dot: "rgba(255,255,255,0.30)",
    label: "Padrão",
  },
  red: {
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.35)",
    dot: "#ef4444",
    label: "Tomate",
  },
  orange: {
    bg: "rgba(249,115,22,0.15)",
    border: "rgba(249,115,22,0.35)",
    dot: "#f97316",
    label: "Laranja",
  },
  yellow: {
    bg: "rgba(234,179,8,0.15)",
    border: "rgba(234,179,8,0.35)",
    dot: "#eab308",
    label: "Amarelo",
  },
  green: {
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.35)",
    dot: "#22c55e",
    label: "Verde",
  },
  teal: {
    bg: "rgba(20,184,166,0.15)",
    border: "rgba(20,184,166,0.35)",
    dot: "#14b8a6",
    label: "Teal",
  },
  blue: {
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.35)",
    dot: "#3b82f6",
    label: "Azul",
  },
  purple: {
    bg: "rgba(168,85,247,0.15)",
    border: "rgba(168,85,247,0.35)",
    dot: "#a855f7",
    label: "Uva",
  },
  pink: {
    bg: "rgba(236,72,153,0.15)",
    border: "rgba(236,72,153,0.35)",
    dot: "#ec4899",
    label: "Rosa",
  },
};

const COLOR_ORDER: NoteColor[] = [
  "default",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
];

function newChecklistItem(text = ""): ChecklistItem {
  return { id: crypto.randomUUID(), text, checked: false };
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({
  current,
  onChange,
}: {
  current: NoteColor;
  onChange: (c: NoteColor) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        padding: "8px 10px",
        background: "rgba(8,12,22,0.98)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 10,
        width: 176,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {COLOR_ORDER.map((c) => (
        <button
          key={c}
          type="button"
          title={NOTE_COLORS[c].label}
          onClick={() => onChange(c)}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: NOTE_COLORS[c].dot,
            border:
              current === c
                ? "2px solid white"
                : "2px solid rgba(255,255,255,0.15)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─── Label Picker ─────────────────────────────────────────────────────────────

function LabelPicker({
  labels,
  selected,
  onToggle,
  onCreate,
}: {
  labels: Label[];
  selected: string[];
  onToggle: (id: string) => void;
  onCreate: (name: string) => Promise<string | null>;
}) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const trimmed = newName.trim();
    if (trimmed.length === 0) return;
    setCreating(true);
    const id = await onCreate(trimmed);
    if (id !== null) {
      onToggle(id);
    }
    setNewName("");
    setCreating(false);
  }

  return (
    <div
      style={{
        background: "rgba(8,12,22,0.98)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 10,
        padding: "8px 0",
        minWidth: 200,
        maxHeight: 240,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ overflowY: "auto", flex: 1 }}>
        {labels.map((l) => {
          const active = selected.includes(l.id);
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onToggle(l.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.82)",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: active
                    ? "none"
                    : "1.5px solid rgba(255,255,255,0.25)",
                  background: active ? "#a855f7" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {active && <Check size={10} color="white" />}
              </div>
              <span style={{ flex: 1 }}>{l.name}</span>
            </button>
          );
        })}
        {labels.length === 0 && (
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              padding: "4px 12px",
            }}
          >
            Nenhum label
          </p>
        )}
      </div>
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "6px 8px",
          display: "flex",
          gap: 6,
        }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreate();
          }}
          placeholder="Novo label..."
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 12,
            color: "white",
            outline: "none",
          }}
        />
        <button
          type="button"
          aria-label="Criar nota"
          onClick={() => void handleCreate()}
          disabled={creating || newName.trim().length === 0}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "#a855f7",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            opacity: newName.trim().length === 0 ? 0.4 : 1,
          }}
        >
          <Plus size={14} color="white" />
        </button>
      </div>
    </div>
  );
}

// ─── Checklist Editor ─────────────────────────────────────────────────────────

function ChecklistEditor({
  items,
  onChange,
  readOnly,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  readOnly?: boolean;
}) {
  function toggle(id: string) {
    onChange(
      items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
    );
  }

  function updateText(id: string, text: string) {
    onChange(items.map((it) => (it.id === id ? { ...it, text } : it)));
  }

  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  function addItem() {
    onChange([...items, newChecklistItem()]);
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {unchecked.map((item) => (
        <div
          key={item.id}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={false}
            aria-label={`Marcar "${item.text}" como concluído`}
            onClick={() => toggle(item.id)}
            disabled={readOnly}
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              border: "1.5px solid rgba(255,255,255,0.30)",
              background: "transparent",
              cursor: readOnly ? "default" : "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
          {readOnly ? (
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
              {item.text}
            </span>
          ) : (
            <input
              value={item.text}
              onChange={(e) => updateText(item.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addItem();
                if (e.key === "Backspace" && item.text === "") remove(item.id);
              }}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.82)",
                fontSize: 13,
                outline: "none",
              }}
            />
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => remove(item.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.30)",
                padding: 2,
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}

      {!readOnly && (
        <button
          type="button"
          onClick={addItem}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            fontSize: 12,
            cursor: "pointer",
            padding: "4px 0",
            textAlign: "left",
          }}
        >
          <Plus size={12} /> Adicionar item
        </button>
      )}

      {checked.length > 0 && (
        <>
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.08)",
              margin: "6px 0",
            }}
          />
          {checked.map((item) => (
            <div
              key={item.id}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={true}
                aria-label={`Desmarcar "${item.text}" como concluído`}
                onClick={() => toggle(item.id)}
                disabled={readOnly}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: "rgba(168,85,247,0.60)",
                  border: "none",
                  cursor: readOnly ? "default" : "pointer",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={10} color="white" />
              </button>
              {readOnly ? (
                <span
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.35)",
                    textDecoration: "line-through",
                  }}
                >
                  {item.text}
                </span>
              ) : (
                <input
                  value={item.text}
                  onChange={(e) => updateText(item.id, e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 13,
                    textDecoration: "line-through",
                    outline: "none",
                  }}
                />
              )}
              {!readOnly && (
                <button
                  type="button"
                  aria-label="Remover item da lista"
                  onClick={() => remove(item.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.20)",
                    padding: 2,
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Note Editor Modal ────────────────────────────────────────────────────────

function NoteEditorModal({
  note,
  labels,
  labelLinks,
  categories,
  initialCategoryId,
  onSave,
  onClose,
  onCreateLabel,
}: {
  note: Note;
  labels: Label[];
  labelLinks: { note_id: string; label_id: string }[];
  categories?: NoteCategory[];
  initialCategoryId?: string | null;
  onSave: (patch: Partial<Note> & { categoryId?: string | null }) => void;
  onClose: () => void;
  onCreateLabel: (name: string) => Promise<string | null>;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(note.checklist);
  const [isChecklist, setIsChecklist] = useState(note.is_checklist);
  const [color, setColor] = useState<NoteColor>(note.color);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    labelLinks.filter((l) => l.note_id === note.id).map((l) => l.label_id),
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialCategoryId ?? null,
  );
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const labelBtnRef = useRef<HTMLButtonElement>(null);

  function toggleLabel(id: string) {
    setSelectedLabels((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleClose() {
    onSave({
      title,
      content,
      checklist,
      is_checklist: isChecklist,
      color,
      labelIds: selectedLabels,
      categoryId: selectedCategoryId,
    });
    onClose();
  }

  const noteColors = NOTE_COLORS[color];
  const modalRef = useModalA11y<HTMLDivElement>({
    open: true,
    onClose: handleClose,
  });

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
      }}
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Editar nota"
        style={{
          width: 520,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          background: noteColors.bg,
          border: `1px solid ${noteColors.border}`,
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px 0" }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            maxLength={200}
            aria-label="Título da nota"
            autoFocus
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.90)",
              fontSize: 16,
              fontWeight: 600,
              outline: "none",
              caretColor: "#a855f7",
            }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 12px" }}>
          {isChecklist ? (
            <ChecklistEditor items={checklist} onChange={setChecklist} />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Criar uma nota..."
              rows={8}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.75)",
                fontSize: 14,
                lineHeight: 1.6,
                outline: "none",
                resize: "none",
                caretColor: "#a855f7",
                fontFamily: "inherit",
              }}
            />
          )}
        </div>

        {/* Labels chips */}
        {selectedLabels.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              padding: "0 16px 8px",
            }}
          >
            {selectedLabels.map((id) => {
              const label = labels.find((l) => l.id === id);
              if (label === undefined) return null;
              return (
                <span
                  key={id}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: "rgba(168,85,247,0.20)",
                    border: "1px solid rgba(168,85,247,0.35)",
                    color: "rgba(168,85,247,0.90)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                  }}
                  onClick={() => toggleLabel(id)}
                >
                  {label.name}
                  <X size={9} />
                </span>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "10px 12px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Toggle checklist */}
          <ToolbarBtn
            title={isChecklist ? "Mudar para texto" : "Converter para lista"}
            onClick={() => setIsChecklist((v) => !v)}
            active={isChecklist}
          >
            {isChecklist ? <Type size={15} /> : <CheckSquare size={15} />}
          </ToolbarBtn>

          {/* Color picker */}
          <div style={{ position: "relative" }}>
            <ToolbarBtn
              ref={colorBtnRef}
              title="Cor da nota"
              onClick={() => {
                setShowColorPicker((v) => !v);
                setShowLabelPicker(false);
              }}
            >
              <Palette size={15} />
            </ToolbarBtn>
            {showColorPicker && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: 0,
                  zIndex: 10,
                }}
              >
                <ColorPicker
                  current={color}
                  onChange={(c) => {
                    setColor(c);
                    setShowColorPicker(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Label picker */}
          <div style={{ position: "relative" }}>
            <ToolbarBtn
              ref={labelBtnRef}
              title="Labels"
              onClick={() => {
                setShowLabelPicker((v) => !v);
                setShowColorPicker(false);
                setShowCatDropdown(false);
              }}
              active={selectedLabels.length > 0}
            >
              <Tag size={15} />
            </ToolbarBtn>
            {showLabelPicker && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: 0,
                  zIndex: 10,
                }}
              >
                <LabelPicker
                  labels={labels}
                  selected={selectedLabels}
                  onToggle={toggleLabel}
                  onCreate={onCreateLabel}
                />
              </div>
            )}
          </div>

          {/* Category picker */}
          {(categories?.length ?? 0) > 0 && (
            <div style={{ position: "relative" }}>
              <ToolbarBtn
                title="Categoria"
                onClick={() => {
                  setShowCatDropdown((v) => !v);
                  setShowColorPicker(false);
                  setShowLabelPicker(false);
                }}
                active={selectedCategoryId !== null}
              >
                <Bookmark size={15} />
              </ToolbarBtn>
              {showCatDropdown && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 6px)",
                    left: 0,
                    zIndex: 10,
                    background: "#0d1824",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    overflow: "hidden",
                    boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
                    minWidth: 160,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(null);
                      setShowCatDropdown(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 12px",
                      background:
                        selectedCategoryId === null
                          ? "rgba(255,255,255,0.06)"
                          : "transparent",
                      border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 12,
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        border: "1.5px solid rgba(255,255,255,0.20)",
                        flexShrink: 0,
                      }}
                    />
                    Sem categoria
                    {selectedCategoryId === null && (
                      <Check
                        size={11}
                        style={{ marginLeft: "auto", color: "#a78bfa" }}
                      />
                    )}
                  </button>
                  {categories?.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setShowCatDropdown(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "8px 12px",
                        background:
                          selectedCategoryId === cat.id
                            ? "rgba(255,255,255,0.06)"
                            : "transparent",
                        border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        cursor: "pointer",
                        color: "rgba(255,255,255,0.82)",
                        fontSize: 12,
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCategoryId !== cat.id)
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCategoryId !== cat.id)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: cat.color,
                          flexShrink: 0,
                        }}
                      />
                      {cat.label}
                      {selectedCategoryId === cat.id && (
                        <Check
                          size={11}
                          style={{ marginLeft: "auto", color: "#a78bfa" }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Category chip */}
          {(() => {
            const selCat =
              selectedCategoryId !== null
                ? categories?.find((c) => c.id === selectedCategoryId)
                : undefined;
            if (selCat === undefined) return null;
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: `${selCat.color}22`,
                  border: `1px solid ${selCat.color}55`,
                  fontSize: 11,
                  color: selCat.color,
                  cursor: "pointer",
                }}
                onClick={() => setSelectedCategoryId(null)}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 2,
                    background: selCat.color,
                    flexShrink: 0,
                  }}
                />
                {selCat.label}
                <X size={9} />
              </div>
            );
          })()}

          {/* Close */}
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: "5px 14px",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.70)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Category Modal ───────────────────────────────────────────────────────────

function CategoryModal({
  category,
  onSave,
  onDelete,
  onClose,
}: {
  category: NoteCategory | null;
  onSave: (cat: NoteCategory) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(category?.label ?? "");
  const [color, setColor] = useState(category?.color ?? "#8b5cf6");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const modalRef = useModalA11y<HTMLDivElement>({ open: true, onClose });

  function catUid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function handleSave() {
    if (!label.trim()) return;
    onSave({ id: category?.id ?? catUid(), label: label.trim(), color });
    onClose();
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={category !== null ? "Editar categoria" : "Nova categoria"}
        style={{
          width: "100%",
          maxWidth: 360,
          margin: "0 16px",
          background: "#0d1421",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.65)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            {category !== null ? "Editar categoria" : "Nova categoria"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.38)",
              display: "flex",
              padding: 4,
            }}
          >
            <X size={15} />
          </button>
        </div>
        <div
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.30)",
                letterSpacing: "0.07em",
                textTransform: "uppercase" as const,
                display: "block",
                marginBottom: 6,
              }}
            >
              Nome
            </label>
            <input
              autoFocus
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              placeholder="Nome da categoria"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
                color: "rgba(255,255,255,0.9)",
                outline: "none",
                boxSizing: "border-box" as const,
                fontFamily: "inherit",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(255,255,255,0.30)",
                letterSpacing: "0.07em",
                textTransform: "uppercase" as const,
                display: "block",
                marginBottom: 8,
              }}
            >
              Cor
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: c,
                    border:
                      color === c ? "2px solid #fff" : "2px solid transparent",
                    cursor: "pointer",
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: 2,
                    transition: "outline 120ms",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {category !== null && onDelete != null ? (
            confirmDelete ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(category.id);
                    onClose();
                  }}
                  style={{
                    background: "rgba(239,68,68,0.16)",
                    border: "1px solid rgba(239,68,68,0.28)",
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#f87171",
                    cursor: "pointer",
                  }}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "none",
                  fontSize: 12,
                  color: "rgba(239,68,68,0.65)",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={13} /> Excluir
              </button>
            )
          ) : (
            <div />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                padding: "7px 16px",
                fontSize: 13,
                color: "rgba(255,255,255,0.50)",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!label.trim()}
              style={{
                background: color,
                border: "none",
                borderRadius: 8,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                cursor: label.trim() ? "pointer" : "not-allowed",
                opacity: label.trim() ? 1 : 0.4,
              }}
            >
              {category !== null ? "Salvar" : "Criar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

const ToolbarBtn = ({
  children,
  title,
  onClick,
  active,
  ref: _ref,
  ...rest
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  ref?: React.RefObject<HTMLButtonElement | null>;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    {...rest}
    style={{
      width: 30,
      height: 30,
      borderRadius: 8,
      background: active ? "rgba(168,85,247,0.20)" : "transparent",
      border: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: active ? "#a855f7" : "rgba(255,255,255,0.50)",
    }}
  >
    {children}
  </button>
);

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  labels,
  layout,
  onOpen,
  onPin,
  onArchive,
  onTrash,
  onRestore,
  onDelete,
  section,
  category,
}: {
  note: Note;
  labels: Label[];
  layout: "grid" | "list";
  onOpen: () => void;
  onPin: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDelete: () => void;
  section: Section;
  category?: NoteCategory;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = NOTE_COLORS[note.color];
  const noteLabels = labels.filter((l) => note.labelIds.includes(l.id));

  const isTrash = section === "trash";
  const isArchive = section === "archive";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
      style={{
        background: colors.bg,
        border: `1px solid ${hovered ? colors.dot : colors.border}`,
        borderRadius: 12,
        padding: "12px 14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color 120ms ease, box-shadow 120ms ease",
        boxShadow: hovered
          ? "0 4px 24px rgba(0,0,0,0.30)"
          : "0 1px 4px rgba(0,0,0,0.15)",
        position: "relative",
        breakInside: "avoid",
        minHeight: layout === "list" ? undefined : 80,
      }}
    >
      {/* Title */}
      {note.title.length > 0 && (
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(255,255,255,0.90)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {note.title}
        </p>
      )}

      {/* Content preview */}
      {!note.is_checklist && note.content.length > 0 && (
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.60)",
            margin: 0,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: layout === "list" ? 2 : 6,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {note.content}
        </p>
      )}

      {/* Checklist preview */}
      {note.is_checklist && note.checklist.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {note.checklist.slice(0, layout === "list" ? 3 : 5).map((item) => (
            <div
              key={item.id}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  border: item.checked
                    ? "none"
                    : "1.5px solid rgba(255,255,255,0.25)",
                  background: item.checked
                    ? "rgba(168,85,247,0.60)"
                    : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.checked && <Check size={8} color="white" />}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: item.checked
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(255,255,255,0.70)",
                  textDecoration: item.checked ? "line-through" : "none",
                }}
              >
                {item.text}
              </span>
            </div>
          ))}
          {note.checklist.length > (layout === "list" ? 3 : 5) && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)" }}>
              +{note.checklist.length - (layout === "list" ? 3 : 5)} mais
            </span>
          )}
        </div>
      )}

      {/* Category + Labels */}
      {(category !== undefined || noteLabels.length > 0) && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}
        >
          {category !== undefined && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                padding: "1px 7px",
                borderRadius: 20,
                background: `${category.color}1a`,
                border: `1px solid ${category.color}44`,
                color: category.color,
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2,
                  background: category.color,
                  flexShrink: 0,
                }}
              />
              {category.label}
            </span>
          )}
          {noteLabels.map((l) => (
            <span
              key={l.id}
              style={{
                fontSize: 10,
                padding: "1px 7px",
                borderRadius: 20,
                background: "rgba(168,85,247,0.15)",
                border: "1px solid rgba(168,85,247,0.25)",
                color: "rgba(168,85,247,0.80)",
              }}
            >
              {l.name}
            </span>
          ))}
        </div>
      )}

      {/* Hover actions */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 2,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!isTrash && (
            <CardActionBtn
              title={note.pinned ? "Desafixar" : "Fixar"}
              onClick={onPin}
            >
              {note.pinned ? <PinOff size={13} /> : <Pin size={13} />}
            </CardActionBtn>
          )}
          {!isTrash && !isArchive && (
            <CardActionBtn title="Arquivar" onClick={onArchive}>
              <Archive size={13} />
            </CardActionBtn>
          )}
          {isArchive && (
            <CardActionBtn title="Restaurar do arquivo" onClick={onRestore}>
              <ArchiveRestore size={13} />
            </CardActionBtn>
          )}
          {!isTrash && (
            <CardActionBtn title="Mover para lixeira" onClick={onTrash}>
              <Trash2 size={13} />
            </CardActionBtn>
          )}
          {isTrash && (
            <>
              <CardActionBtn title="Restaurar" onClick={onRestore}>
                <RotateCcw size={13} />
              </CardActionBtn>
              <CardActionBtn
                title="Excluir permanentemente"
                onClick={onDelete}
                danger
              >
                <Trash2 size={13} />
              </CardActionBtn>
            </>
          )}
        </div>
      )}

      {/* Pin indicator */}
      {note.pinned && !hovered && (
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <Pin size={12} color="rgba(255,255,255,0.35)" />
        </div>
      )}
    </div>
  );
}

function CardActionBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        background: "rgba(0,0,0,0.50)",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: danger ? "#f87171" : "rgba(255,255,255,0.65)",
      }}
    >
      {children}
    </button>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  onConfirm,
  onCancel,
}: {
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
        aria-label="Excluir nota"
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
              Excluir nota permanentemente?
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(255,255,255,0.50)",
              }}
            >
              Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
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

// ─── Main App ─────────────────────────────────────────────────────────────────

export function BlocoDeNotasApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  const [notes, setNotes] = useState<Note[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelLinks, setLabelLinks] = useState<
    { note_id: string; label_id: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [section, setSection] = useState<Section>("notes");
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [collapsed, setCollapsed] = useState(false);

  const [categories, setCategories] =
    useState<NoteCategory[]>(INITIAL_CATEGORIES);
  const [activeCategories, setActiveCategories] = useState(
    new Set(INITIAL_CATEGORIES.map((c) => c.id)),
  );
  const [noteCategories, setNoteCategories] = useState<Record<string, string>>(
    {},
  );
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [categoryModal, setCategoryModal] = useState<
    NoteCategory | null | "new"
  >(null);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load ──

  useEffect(() => {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const d = drivers;
    const uid = userId;
    const cid = activeCompanyId;

    async function load() {
      setLoading(true);
      const [notesRes, labelsRes, linksRes] = await Promise.all([
        d.data
          .from("notes")
          .select("*")
          .eq("user_id", uid)
          .eq("company_id", cid)
          .order("updated_at", { ascending: false }),
        d.data
          .from("note_labels")
          .select("*")
          .eq("user_id", uid)
          .eq("company_id", cid)
          .order("name", { ascending: true }),
        d.data.from("note_label_links").select("*"),
      ]);

      const rawNotes = (notesRes.data ?? []) as Omit<Note, "labelIds">[];
      const rawLinks = (linksRes.data ?? []) as {
        note_id: string;
        label_id: string;
      }[];

      setNotes(
        rawNotes.map((n) => ({
          ...n,
          labelIds: rawLinks
            .filter((l) => l.note_id === n.id)
            .map((l) => l.label_id),
        })),
      );
      setLabels((labelsRes.data ?? []) as Label[]);
      setLabelLinks(rawLinks);
      setLoading(false);
    }

    void load();
  }, [drivers, userId, activeCompanyId]);

  // ── Persist helpers ──

  async function persistCreate(
    partial: Omit<
      Note,
      | "id"
      | "user_id"
      | "company_id"
      | "created_at"
      | "updated_at"
      | "trashed_at"
    >,
  ): Promise<Note | null> {
    if (drivers === null || userId === null || activeCompanyId === null)
      return null;
    const { labelIds, ...rest } = partial;
    const { data, error } = await drivers.data
      .from("notes")
      .insert({
        ...rest,
        user_id: userId,
        company_id: activeCompanyId,
      })
      .select()
      .single();
    if (error !== null || data === null) return null;
    const note = {
      ...(data as Omit<Note, "labelIds">),
      labelIds: labelIds ?? [],
    };
    if (labelIds !== undefined && labelIds.length > 0) {
      await drivers.data
        .from("note_label_links")
        .insert(labelIds.map((label_id) => ({ note_id: note.id, label_id })));
    }
    return note;
  }

  async function persistUpdate(
    id: string,
    patch: Partial<Note>,
  ): Promise<void> {
    if (drivers === null) return;
    const { labelIds, ...rest } = patch;
    if (Object.keys(rest).length > 0) {
      await drivers.data.from("notes").update(rest).eq("id", id);
    }
    if (labelIds !== undefined) {
      await drivers.data.from("note_label_links").delete().eq("note_id", id);
      if (labelIds.length > 0) {
        await drivers.data
          .from("note_label_links")
          .insert(labelIds.map((label_id) => ({ note_id: id, label_id })));
      }
      setLabelLinks((prev) => [
        ...prev.filter((l) => l.note_id !== id),
        ...labelIds.map((label_id) => ({ note_id: id, label_id })),
      ]);
    }
  }

  async function persistDelete(id: string): Promise<void> {
    if (drivers === null) return;
    await drivers.data.from("notes").delete().eq("id", id);
  }

  // ── CRUD operations ──

  function handleCreate(
    partial: Omit<
      Note,
      | "id"
      | "user_id"
      | "company_id"
      | "created_at"
      | "updated_at"
      | "trashed_at"
    >,
    categoryId?: string | null,
  ) {
    void persistCreate(partial).then((note) => {
      if (note !== null) {
        setNotes((prev) => [note, ...prev]);
        if (categoryId != null && categoryId !== "") {
          setNoteCategories((prev) => ({ ...prev, [note.id]: categoryId }));
        }
      }
    });
  }

  function applyPatch(id: string, patch: Partial<Note>) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    if (saveTimeoutRef.current !== null) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void persistUpdate(id, patch);
    }, 600);
  }

  function handleSaveEditor(
    patch: Partial<Note> & { categoryId?: string | null },
  ) {
    if (editingNote === null) return;
    const { categoryId, ...notePatch } = patch;
    if (categoryId !== undefined) {
      if (categoryId !== null && categoryId !== "") {
        setNoteCategories((prev) => ({
          ...prev,
          [editingNote.id]: categoryId,
        }));
      } else {
        setNoteCategories((prev) => {
          const next = { ...prev };
          delete next[editingNote.id];
          return next;
        });
      }
    }
    applyPatch(editingNote.id, notePatch);
  }

  function handlePin(id: string) {
    const note = notes.find((n) => n.id === id);
    if (note === undefined) return;
    applyPatch(id, { pinned: !note.pinned });
  }

  function handleArchive(id: string) {
    applyPatch(id, { archived: true, pinned: false });
  }

  function handleTrash(id: string) {
    applyPatch(id, {
      trashed: true,
      archived: false,
      pinned: false,
      trashed_at: new Date().toISOString(),
    });
  }

  function handleRestore(id: string) {
    applyPatch(id, { trashed: false, archived: false, trashed_at: null });
  }

  function handleDeletePermanent(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setLabelLinks((prev) => prev.filter((l) => l.note_id !== id));
    setDeleteConfirmId(null);
    void persistDelete(id);
  }

  async function handleCreateLabel(name: string): Promise<string | null> {
    if (drivers === null || userId === null || activeCompanyId === null)
      return null;
    const { data } = await drivers.data
      .from("note_labels")
      .insert({ name, user_id: userId, company_id: activeCompanyId })
      .select()
      .single();
    if (data === null) return null;
    const label = data as Label;
    setLabels((prev) => [...prev, label]);
    return label.id;
  }

  // ── Category helpers ──

  function toggleCategory(id: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function saveCategory(cat: NoteCategory) {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id);
      if (idx >= 0) return prev.map((c) => (c.id === cat.id ? cat : c));
      return [...prev, cat];
    });
    setActiveCategories((prev) => new Set([...prev, cat.id]));
  }

  function deleteCategory(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setActiveCategories((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setNoteCategories((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === id) delete next[k];
      });
      return next;
    });
  }

  // ── Derived notes ──

  const visibleNotes = useMemo(() => {
    let filtered = notes.filter((n) => {
      if (section === "trash") return n.trashed;
      if (section === "archive") return n.archived && !n.trashed;
      return !n.trashed && !n.archived;
    });

    if (filterLabel !== null) {
      filtered = filtered.filter((n) => n.labelIds.includes(filterLabel));
    }

    // Hide notes whose category is toggled off
    filtered = filtered.filter((n) => {
      const catId = noteCategories[n.id];
      if (catId === undefined) return true;
      return activeCategories.has(catId);
    });

    if (search.trim().length > 0) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.checklist.some((i) => i.text.toLowerCase().includes(q)),
      );
    }

    return filtered;
  }, [notes, section, filterLabel, search, noteCategories, activeCategories]);

  const pinnedNotes = useMemo(
    () => (section === "notes" ? visibleNotes.filter((n) => n.pinned) : []),
    [visibleNotes, section],
  );

  const unpinnedNotes = useMemo(
    () =>
      section === "notes"
        ? visibleNotes.filter((n) => !n.pinned)
        : visibleNotes,
    [visibleNotes, section],
  );

  // ── Keyboard shortcut ──

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        const searchEl = document.getElementById("notes-search");
        searchEl?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // ── Sidebar sections ──

  const NAV_SECTIONS = [
    { id: "notes" as Section, label: "Notas", icon: StickyNote },
    { id: "archive" as Section, label: "Arquivo", icon: Archive },
    { id: "trash" as Section, label: "Lixeira", icon: Trash2 },
  ];

  function handleSectionClick(s: Section) {
    setSection(s);
    setFilterLabel(null);
  }

  // ── Render ──

  const HeaderNavIcon =
    NAV_SECTIONS.find((s) => s.id === section)?.icon ?? StickyNote;

  const gridStyle: React.CSSProperties =
    layout === "grid"
      ? {
          columns: "220px",
          columnGap: 12,
          gap: 12,
        }
      : {
          display: "flex",
          flexDirection: "column",
          gap: 10,
        };

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
      {/* ─── Sidebar ─── */}
      <div
        style={{
          width: collapsed ? SIDEBAR_ICON_W : SIDEBAR_W,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 250ms ease",
          position: "relative",
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
            <StickyNote
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
                Bloco de Notas
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
              {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
                const isActive = section === id && filterLabel === null;
                return (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() => handleSectionClick(id)}
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
              {(() => {
                const isActive = filterLabel !== null;
                return (
                  <button
                    type="button"
                    title="Labels"
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
                    <Tag size={16} />
                  </button>
                );
              })()}
              {/* Category dots */}
              {categories.length > 0 && (
                <>
                  <div
                    style={{
                      height: 1,
                      width: 28,
                      background: "rgba(255,255,255,0.08)",
                      margin: "4px 0",
                    }}
                  />
                  {categories.map((cat) => {
                    const active = activeCategories.has(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        title={cat.label}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          border: "1px solid transparent",
                          cursor: "pointer",
                          transition: "background 120ms",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 4,
                            background: active ? cat.color : "transparent",
                            border: `2px solid ${cat.color}`,
                            transition: "background 120ms",
                            flexShrink: 0,
                          }}
                        />
                      </button>
                    );
                  })}
                </>
              )}
            </nav>
          ) : (
            /* Full sidebar */
            <>
              {/* Nova nota button */}
              <div style={{ padding: "10px 10px 4px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "#f59e0b",
                    border: "none",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                    transition: "background 120ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#d97706";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f59e0b";
                  }}
                >
                  <Plus size={13} />
                  Nova nota
                </button>
              </div>

              <div style={{ padding: "4px 0 16px 8px", flex: 1 }}>
                {/* Nav items */}
                {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
                  const isActive = section === id && filterLabel === null;
                  const count = notes.filter((n) => {
                    if (id === "trash") return n.trashed;
                    if (id === "archive") return n.archived && !n.trashed;
                    return !n.trashed && !n.archived;
                  }).length;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSectionClick(id)}
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
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Labels section */}
                {labels.length > 0 && (
                  <>
                    <div
                      style={{
                        height: 1,
                        background: "rgba(255,255,255,0.08)",
                        margin: "8px 0",
                      }}
                    />
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
                      Labels
                    </p>
                    {labels.map((label) => {
                      const isActive = filterLabel === label.id;
                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => {
                            setFilterLabel(label.id);
                            setSection("notes");
                          }}
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
                                  borderLeft:
                                    "1px solid rgba(255,255,255,0.08)",
                                  borderBottom:
                                    "1px solid rgba(255,255,255,0.08)",
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
                              e.currentTarget.style.color =
                                "var(--text-primary)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color =
                                "var(--text-secondary)";
                            }
                          }}
                        >
                          <Tag size={13} style={{ flexShrink: 0 }} />
                          <span
                            style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label.name}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Categorias section */}
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
                    Categorias
                  </span>
                  <button
                    type="button"
                    onClick={() => setCategoryModal("new")}
                    title="Nova categoria"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.32)",
                      display: "flex",
                      padding: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    marginBottom: 8,
                  }}
                >
                  {categories.map((cat) => {
                    const active = activeCategories.has(cat.id);
                    return (
                      <div
                        key={cat.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          borderRadius: 8,
                          padding: "4px 4px 4px 6px",
                          transition: "background 120ms",
                          background:
                            hoveredCat === cat.id
                              ? "rgba(255,255,255,0.05)"
                              : "transparent",
                        }}
                        onMouseEnter={() => setHoveredCat(cat.id)}
                        onMouseLeave={() => setHoveredCat(null)}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            flex: 1,
                            textAlign: "left",
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              background: active ? cat.color : "transparent",
                              border: `2px solid ${cat.color}`,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "background 120ms",
                            }}
                          >
                            {active && (
                              <svg
                                width="7"
                                height="7"
                                viewBox="0 0 8 8"
                                fill="none"
                              >
                                <path
                                  d="M1.5 4L3 5.5L6.5 2"
                                  stroke="#fff"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {cat.label}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoryModal(cat)}
                          title="Editar categoria"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "rgba(255,255,255,0.35)",
                            display: "flex",
                            padding: 3,
                            borderRadius: 4,
                            opacity: hoveredCat === cat.id ? 1 : 0,
                            transition: "opacity 120ms",
                            flexShrink: 0,
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Collapse toggle button */}
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

      {/* ─── Main content ─── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
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
          }}
        >
          {/* Section icon */}
          <HeaderNavIcon
            size={14}
            style={{ color: "#f59e0b", flexShrink: 0 }}
          />
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
              minWidth: 80,
            }}
          >
            {filterLabel !== null
              ? (labels.find((l) => l.id === filterLabel)?.name ?? "Label")
              : (NAV_SECTIONS.find((s) => s.id === section)?.label ?? "Notas")}
          </h2>

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
            <Search size={14} color="rgba(255,255,255,0.30)" />
            <input
              id="notes-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar notas..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.80)",
                fontSize: 13,
                outline: "none",
                caretColor: "#a855f7",
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
                <X size={13} />
              </button>
            )}
          </div>

          {/* Layout toggle */}
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 8,
              padding: 3,
            }}
          >
            {(["grid", "list"] as const).map((l) => (
              <button
                key={l}
                type="button"
                title={l === "grid" ? "Grade" : "Lista"}
                onClick={() => setLayout(l)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background:
                    layout === l ? "rgba(255,255,255,0.10)" : "transparent",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color:
                    layout === l
                      ? "rgba(255,255,255,0.80)"
                      : "rgba(255,255,255,0.35)",
                }}
              >
                {l === "grid" ? <LayoutGrid size={14} /> : <List size={14} />}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 20px",
            paddingBottom: 160,
          }}
        >
          {loading ? (
            <div
              className="skeleton-pulse"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {[
                { lines: [70, 40] },
                { lines: [55] },
                { lines: [80, 45] },
                { lines: [60] },
              ].map((card, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 8,
                    padding: 14,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {card.lines.map((w, j) => (
                    <div
                      key={j}
                      style={{
                        height: 13,
                        width: `${w}%`,
                        borderRadius: 4,
                        background: "rgba(255,255,255,0.08)",
                        marginBottom: j < card.lines.length - 1 ? 8 : 0,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Pinned notes */}
              {pinnedNotes.length > 0 && (
                <>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.30)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    Fixadas
                  </p>
                  <div style={{ ...gridStyle, marginBottom: 20 }}>
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        labels={labels}
                        layout={layout}
                        section={section}
                        {...(noteCategories[note.id] !== undefined &&
                        categories.find(
                          (c) => c.id === noteCategories[note.id],
                        ) !== undefined
                          ? {
                              category: categories.find(
                                (c) => c.id === noteCategories[note.id],
                              ) as NoteCategory,
                            }
                          : {})}
                        onOpen={() => setEditingNote(note)}
                        onPin={() => handlePin(note.id)}
                        onArchive={() => handleArchive(note.id)}
                        onTrash={() => handleTrash(note.id)}
                        onRestore={() => handleRestore(note.id)}
                        onDelete={() => setDeleteConfirmId(note.id)}
                      />
                    ))}
                  </div>
                  {unpinnedNotes.length > 0 && (
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.30)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      Outras
                    </p>
                  )}
                </>
              )}

              {/* Main notes */}
              {unpinnedNotes.length > 0 ? (
                <div style={gridStyle}>
                  {unpinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      labels={labels}
                      layout={layout}
                      section={section}
                      {...(noteCategories[note.id] !== undefined &&
                      categories.find(
                        (c) => c.id === noteCategories[note.id],
                      ) !== undefined
                        ? {
                            category: categories.find(
                              (c) => c.id === noteCategories[note.id],
                            ) as NoteCategory,
                          }
                        : {})}
                      onOpen={() => setEditingNote(note)}
                      onPin={() => handlePin(note.id)}
                      onArchive={() => handleArchive(note.id)}
                      onTrash={() => handleTrash(note.id)}
                      onRestore={() => handleRestore(note.id)}
                      onDelete={() => setDeleteConfirmId(note.id)}
                    />
                  ))}
                </div>
              ) : pinnedNotes.length === 0 ? (
                <EmptyState
                  section={section}
                  search={search}
                  onCreateNote={() => setShowCreateModal(true)}
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Note editor modal */}
      {editingNote !== null && (
        <NoteEditorModal
          note={editingNote}
          labels={labels}
          labelLinks={labelLinks}
          categories={categories}
          initialCategoryId={noteCategories[editingNote.id] ?? null}
          onSave={handleSaveEditor}
          onClose={() => {
            setEditingNote(null);
          }}
          onCreateLabel={handleCreateLabel}
        />
      )}

      {/* Nova nota creation modal */}
      {showCreateModal && (
        <NoteEditorModal
          note={{
            id: "__new__",
            user_id: "",
            company_id: "",
            title: "",
            content: "",
            checklist: [],
            is_checklist: false,
            color: "default",
            pinned: false,
            archived: false,
            trashed: false,
            trashed_at: null,
            created_at: "",
            updated_at: "",
            labelIds: [],
          }}
          labels={labels}
          labelLinks={[]}
          categories={categories}
          initialCategoryId={null}
          onSave={(patch) => {
            const {
              title = "",
              content = "",
              checklist = [],
              is_checklist = false,
              color = "default",
              labelIds = [],
              categoryId,
            } = patch;
            if (
              title.trim().length === 0 &&
              content.trim().length === 0 &&
              (checklist ?? []).length === 0
            )
              return;
            handleCreate(
              {
                title,
                content,
                checklist: checklist ?? [],
                is_checklist: is_checklist ?? false,
                color: (color ?? "default") as NoteColor,
                pinned: false,
                archived: false,
                trashed: false,
                labelIds: labelIds ?? [],
              },
              categoryId,
            );
            handleSectionClick("notes");
          }}
          onClose={() => setShowCreateModal(false)}
          onCreateLabel={handleCreateLabel}
        />
      )}

      {/* Category modal */}
      {categoryModal !== null && (
        <CategoryModal
          category={categoryModal === "new" ? null : categoryModal}
          onSave={saveCategory}
          onDelete={deleteCategory}
          onClose={() => setCategoryModal(null)}
        />
      )}

      {/* Delete confirm modal */}
      {deleteConfirmId !== null && (
        <DeleteConfirmModal
          onConfirm={() => handleDeletePermanent(deleteConfirmId)}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  section,
  search,
  onCreateNote,
}: {
  section: Section;
  search: string;
  onCreateNote?: () => void;
}) {
  const ACCENT = "#f59e0b";
  type Msg = {
    icon: React.ReactNode;
    title: string;
    body: string;
    cta?: string;
  };
  const msgs: Record<Section, Msg> = {
    notes: {
      icon: <StickyNote size={24} style={{ color: ACCENT }} />,
      title:
        search.length > 0 ? "Nenhuma nota encontrada" : "Nenhuma nota ainda",
      body:
        search.length > 0
          ? "Tente termos diferentes ou crie uma nova nota."
          : "Organize pensamentos, ideias e anotações em um só lugar.",
      ...(search.length === 0 ? { cta: "Nova nota" } : {}),
    },
    archive: {
      icon: <Archive size={24} style={{ color: ACCENT }} />,
      title: "Arquivo vazio",
      body: "Notas arquivadas aparecem aqui e podem ser restauradas a qualquer momento.",
    },
    trash: {
      icon: <Trash2 size={24} style={{ color: ACCENT }} />,
      title: "Lixeira vazia",
      body: "Notas excluídas ficam aqui por 30 dias antes de serem removidas permanentemente.",
    },
  };

  const msg = msgs[section];

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
          background: "rgba(245,158,11,0.10)",
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
      {msg.cta && onCreateNote && (
        <button
          type="button"
          onClick={onCreateNote}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: ACCENT,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 20px",
            cursor: "pointer",
          }}
        >
          <Plus size={14} /> {msg.cta}
        </button>
      )}
    </div>
  );
}
