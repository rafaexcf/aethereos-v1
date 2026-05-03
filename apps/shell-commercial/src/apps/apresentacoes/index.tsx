import { useState, useEffect, useRef, useCallback } from "react";
import {
  Presentation,
  Plus,
  Trash2,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Expand,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Image,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { moveToTrash } from "../../lib/trash";

// ─── Types ───────────────────────────────────────────────────────────────────

type ElementAlign = "left" | "center" | "right";
type ElementType = "title" | "text" | "image";

interface SlideElement {
  id: string;
  type: ElementType;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  bold: boolean;
  color: string;
  align: ElementAlign;
}

interface Slide {
  id: string;
  background: string;
  elements: SlideElement[];
}

interface Presentation {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  slides: Slide[];
  theme: string;
  created_at: string;
  updated_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SIDEBAR_W = 239;
const SIDEBAR_ICON_W = 48;
const ACCENT = "#f59e0b";
const ACCENT_HOVER = "#d97706";

const SLIDE_BG_COLORS = [
  "#1e2433",
  "#0f172a",
  "#1e1e2e",
  "#0d1117",
  "#1a1a2e",
  "#16213e",
  "#ffffff",
  "#f8fafc",
];

type SlideLayout = "title-content" | "title-only" | "blank";

function makeSlide(bg: string = "#1e2433"): Slide {
  return {
    id: crypto.randomUUID(),
    background: bg,
    elements: [
      {
        id: crypto.randomUUID(),
        type: "title",
        content: "Título do Slide",
        x: 10,
        y: 35,
        width: 80,
        height: 15,
        fontSize: 36,
        bold: true,
        color: "#ffffff",
        align: "center",
      },
      {
        id: crypto.randomUUID(),
        type: "text",
        content: "Subtítulo ou conteúdo aqui",
        x: 15,
        y: 55,
        width: 70,
        height: 10,
        fontSize: 18,
        bold: false,
        color: "rgba(255,255,255,0.7)",
        align: "center",
      },
    ],
  };
}

// ─── Slide Thumbnail ─────────────────────────────────────────────────────────

function SlideThumbnail({
  slide,
  index,
  selected,
  onSelect,
}: {
  slide: Slide;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={onSelect}
      aria-label={`Slide ${index + 1}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "8px 10px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        width: "100%",
      }}
    >
      <div
        style={{
          width: 130,
          aspectRatio: "16/9",
          background: slide.background,
          borderRadius: 4,
          border: selected
            ? `2px solid ${ACCENT}`
            : "2px solid rgba(255,255,255,0.12)",
          overflow: "hidden",
          position: "relative",
          flexShrink: 0,
          transition: "border-color 120ms",
        }}
      >
        {slide.elements.map((el) => (
          <div
            key={el.id}
            style={{
              position: "absolute",
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.width}%`,
              fontSize: el.fontSize * 0.18,
              fontWeight: el.bold ? 700 : 400,
              color: el.color,
              textAlign: el.align,
              lineHeight: 1.2,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {el.type === "image" ? (
              <img
                src={el.content}
                alt=""
                style={{ width: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              el.content
            )}
          </div>
        ))}
      </div>
      <span
        style={{
          fontSize: 10,
          color: selected ? ACCENT : "var(--text-tertiary)",
          transition: "color 120ms",
        }}
      >
        {index + 1}
      </span>
    </button>
  );
}

// ─── Presentation Mode ───────────────────────────────────────────────────────

function PresentationMode({
  slides,
  initialIndex,
  onExit,
}: {
  slides: Slide[];
  initialIndex: number;
  onExit: () => void;
}) {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setCurrent((p) => Math.min(p + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setCurrent((p) => Math.max(p - 1, 0));
      } else if (e.key === "Escape") {
        onExit();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [slides.length, onExit]);

  const slide = slides[current];
  if (!slide) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: slide.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={() => setCurrent((p) => Math.min(p + 1, slides.length - 1))}
    >
      {slide.elements.map((el) => (
        <div
          key={el.id}
          style={{
            position: "absolute",
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.width}%`,
            fontSize: el.fontSize,
            fontWeight: el.bold ? 700 : 400,
            color: el.color,
            textAlign: el.align,
            lineHeight: 1.3,
          }}
        >
          {el.type === "image" ? (
            <img
              src={el.content}
              alt=""
              style={{ width: "100%", objectFit: "contain" }}
            />
          ) : (
            el.content
          )}
        </div>
      ))}

      {/* Controls overlay */}
      <button
        type="button"
        aria-label="Sair da apresentação"
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <X size={16} />
      </button>

      <button
        type="button"
        aria-label="Slide anterior"
        onClick={(e) => {
          e.stopPropagation();
          setCurrent((p) => Math.max(p - 1, 0));
        }}
        style={{
          position: "absolute",
          left: 16,
          top: "50%",
          transform: "translateY(-50%)",
          width: 40,
          height: 40,
          borderRadius: 8,
          background: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: current === 0 ? "not-allowed" : "pointer",
          opacity: current === 0 ? 0.3 : 1,
        }}
        disabled={current === 0}
      >
        <ChevronLeft size={20} />
      </button>

      <button
        type="button"
        aria-label="Próximo slide"
        onClick={(e) => {
          e.stopPropagation();
          setCurrent((p) => Math.min(p + 1, slides.length - 1));
        }}
        style={{
          position: "absolute",
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
          width: 40,
          height: 40,
          borderRadius: 8,
          background: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: current === slides.length - 1 ? "not-allowed" : "pointer",
          opacity: current === slides.length - 1 ? 0.3 : 1,
        }}
        disabled={current === slides.length - 1}
      >
        <ChevronRight size={20} />
      </button>

      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 13,
          color: "rgba(255,255,255,0.6)",
          background: "rgba(0,0,0,0.5)",
          padding: "4px 12px",
          borderRadius: 20,
        }}
      >
        {current + 1} / {slides.length}
      </div>
    </div>
  );
}

// ─── Slide Editor ─────────────────────────────────────────────────────────────

function SlideEditor({
  slide,
  onChange,
}: {
  slide: Slide;
  onChange: (updated: Slide) => void;
}) {
  const [selectedEl, setSelectedEl] = useState<string | null>(null);

  function updateElement(id: string, patch: Partial<SlideElement>) {
    onChange({
      ...slide,
      elements: slide.elements.map((el) =>
        el.id === id ? { ...el, ...patch } : el,
      ),
    });
  }

  const sel = slide.elements.find((e) => e.id === selectedEl) ?? null;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Mini toolbar for selected element */}
      {sel !== null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 12px",
            background: "rgba(0,0,0,0.3)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginRight: 4,
            }}
          >
            Elemento:
          </span>

          {/* Bold */}
          <button
            type="button"
            aria-label="Negrito"
            aria-pressed={sel.bold}
            onClick={() => updateElement(sel.id, { bold: !sel.bold })}
            style={{
              width: 26,
              height: 26,
              borderRadius: 5,
              background: sel.bold ? "rgba(245,158,11,0.2)" : "transparent",
              border: sel.bold
                ? `1px solid ${ACCENT}`
                : "1px solid rgba(255,255,255,0.1)",
              color: sel.bold ? ACCENT : "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Bold size={12} />
          </button>

          {/* Align buttons */}
          {(["left", "center", "right"] as ElementAlign[]).map((a) => {
            const Icon =
              a === "left"
                ? AlignLeft
                : a === "center"
                  ? AlignCenter
                  : AlignRight;
            return (
              <button
                key={a}
                type="button"
                aria-label={`Alinhar ${a}`}
                aria-pressed={sel.align === a}
                onClick={() => updateElement(sel.id, { align: a })}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 5,
                  background:
                    sel.align === a ? "rgba(245,158,11,0.2)" : "transparent",
                  border:
                    sel.align === a
                      ? `1px solid ${ACCENT}`
                      : "1px solid rgba(255,255,255,0.1)",
                  color: sel.align === a ? ACCENT : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Icon size={12} />
              </button>
            );
          })}

          {/* Font size */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginLeft: 4,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Tamanho:
            </span>
            <button
              type="button"
              aria-label="Diminuir fonte"
              onClick={() =>
                updateElement(sel.id, {
                  fontSize: Math.max(10, sel.fontSize - 2),
                })
              }
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              −
            </button>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-primary)",
                minWidth: 24,
                textAlign: "center",
              }}
            >
              {sel.fontSize}
            </span>
            <button
              type="button"
              aria-label="Aumentar fonte"
              onClick={() =>
                updateElement(sel.id, {
                  fontSize: Math.min(120, sel.fontSize + 2),
                })
              }
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              +
            </button>
          </div>

          {/* Color */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginLeft: 4,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Cor:
            </span>
            <input
              type="color"
              value={sel.color.startsWith("rgba") ? "#ffffff" : sel.color}
              onChange={(e) => updateElement(sel.id, { color: e.target.value })}
              style={{
                width: 26,
                height: 26,
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                padding: 2,
                background: "transparent",
              }}
              aria-label="Cor do texto"
            />
          </div>

          {/* Deselect */}
          <button
            type="button"
            aria-label="Desselecionar elemento"
            onClick={() => setSelectedEl(null)}
            style={{
              marginLeft: "auto",
              width: 22,
              height: 22,
              borderRadius: 4,
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Slide canvas */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#0d1117",
          overflow: "auto",
        }}
        onClick={() => setSelectedEl(null)}
      >
        <div
          style={{
            width: "min(100%, calc((100vh - 200px) * 16 / 9))",
            aspectRatio: "16/9",
            background: slide.background,
            borderRadius: 8,
            position: "relative",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {slide.elements.map((el) => (
            <div
              key={el.id}
              role="button"
              tabIndex={0}
              aria-label={`Editar elemento ${el.type}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEl(el.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelectedEl(el.id);
              }}
              style={{
                position: "absolute",
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: `${el.width}%`,
                outline:
                  selectedEl === el.id
                    ? `2px solid ${ACCENT}`
                    : "2px solid transparent",
                borderRadius: 3,
                cursor: "text",
                padding: "2px 4px",
                boxSizing: "border-box",
              }}
            >
              {el.type === "image" ? (
                <img
                  src={el.content}
                  alt=""
                  style={{
                    width: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    updateElement(el.id, { content: e.currentTarget.innerText })
                  }
                  style={{
                    fontSize: el.fontSize,
                    fontWeight: el.bold ? 700 : 400,
                    color: el.color,
                    textAlign: el.align,
                    lineHeight: 1.3,
                    outline: "none",
                    minHeight: "1em",
                    wordBreak: "break-word",
                  }}
                >
                  {el.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function ApresentacoesApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [presenting, setPresenting] = useState(false);

  // Toolbar state
  const [slideBg, setSlideBg] = useState("#1e2433");
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentPresentation =
    presentations.find((p) => p.id === selectedId) ?? null;
  const currentSlide = currentPresentation?.slides[currentSlideIdx] ?? null;

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const d = drivers;
    const uid = userId;
    const cid = activeCompanyId;

    async function load() {
      setLoading(true);
      const res = await d.data
        .from("presentations")
        .select("*")
        .eq("user_id", uid)
        .eq("company_id", cid)
        .order("updated_at", { ascending: false });

      const rows = (res.data ?? []) as unknown[];
      setPresentations(
        rows.map((r) => {
          const row = r as Record<string, unknown>;
          return {
            id: String(row["id"] ?? ""),
            user_id: String(row["user_id"] ?? ""),
            company_id: String(row["company_id"] ?? ""),
            title: String(row["title"] ?? "Nova Apresentação"),
            slides: Array.isArray(row["slides"])
              ? (row["slides"] as Slide[])
              : [],
            theme: String(row["theme"] ?? "dark"),
            created_at: String(row["created_at"] ?? ""),
            updated_at: String(row["updated_at"] ?? ""),
          };
        }),
      );
      setLoading(false);
    }

    void load();
  }, [drivers, userId, activeCompanyId]);

  // ── Auto-save (debounced 1.5s) ────────────────────────────────────────────

  const scheduleSave = useCallback(
    (presentation: Presentation) => {
      if (drivers === null || userId === null || activeCompanyId === null)
        return;
      if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void drivers.data
          .from("presentations")
          .update({
            title: presentation.title,
            slides: presentation.slides as unknown as Record<string, unknown>[],
            updated_at: new Date().toISOString(),
          })
          .eq("id", presentation.id)
          .eq("user_id", userId)
          .eq("company_id", activeCompanyId);
      }, 1500);
    },
    [drivers, userId, activeCompanyId],
  );

  function updatePresentation(updated: Presentation) {
    setPresentations((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
    scheduleSave(updated);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const initialSlide = makeSlide();
    const res = await drivers.data
      .from("presentations")
      .insert({
        user_id: userId,
        company_id: activeCompanyId,
        title: "Nova Apresentação",
        slides: [initialSlide] as unknown as Record<string, unknown>[],
        theme: "dark",
      })
      .select("*")
      .single();

    if (res.data !== null) {
      const row = res.data as Record<string, unknown>;
      const newP: Presentation = {
        id: String(row["id"] ?? ""),
        user_id: String(row["user_id"] ?? ""),
        company_id: String(row["company_id"] ?? ""),
        title: String(row["title"] ?? "Nova Apresentação"),
        slides: Array.isArray(row["slides"])
          ? (row["slides"] as Slide[])
          : [initialSlide],
        theme: String(row["theme"] ?? "dark"),
        created_at: String(row["created_at"] ?? ""),
        updated_at: String(row["updated_at"] ?? ""),
      };
      setPresentations((prev) => [newP, ...prev]);
      setSelectedId(newP.id);
      setCurrentSlideIdx(0);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    const pres = presentations.find((p) => p.id === id);
    if (pres !== undefined) {
      await moveToTrash({
        drivers,
        userId,
        companyId: activeCompanyId,
        appId: "apresentacoes",
        itemType: "presentation",
        itemName: pres.title.trim() !== "" ? pres.title : "(Sem título)",
        itemData: pres as unknown as Record<string, unknown>,
        originalId: pres.id,
      });
    }
    await drivers.data
      .from("presentations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .eq("company_id", activeCompanyId);
    setPresentations((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setCurrentSlideIdx(0);
    }
  }

  // ── Slide management ──────────────────────────────────────────────────────

  function addSlide() {
    if (currentPresentation === null) return;
    const newSlide = makeSlide(slideBg);
    const updated: Presentation = {
      ...currentPresentation,
      slides: [...currentPresentation.slides, newSlide],
    };
    updatePresentation(updated);
    setCurrentSlideIdx(updated.slides.length - 1);
  }

  function deleteSlide(idx: number) {
    if (currentPresentation === null) return;
    if (currentPresentation.slides.length <= 1) return;
    const slides = currentPresentation.slides.filter((_, i) => i !== idx);
    updatePresentation({ ...currentPresentation, slides });
    setCurrentSlideIdx(Math.min(idx, slides.length - 1));
  }

  function updateCurrentSlide(updated: Slide) {
    if (currentPresentation === null) return;
    const slides = currentPresentation.slides.map((s, i) =>
      i === currentSlideIdx ? updated : s,
    );
    updatePresentation({ ...currentPresentation, slides });
  }

  // ── Layout presets ────────────────────────────────────────────────────────

  function applyLayout(layout: SlideLayout) {
    if (currentSlide === null || currentPresentation === null) return;
    const elements: SlideElement[] =
      layout === "title-content"
        ? [
            {
              id: crypto.randomUUID(),
              type: "title",
              content: "Título",
              x: 10,
              y: 20,
              width: 80,
              height: 15,
              fontSize: 36,
              bold: true,
              color: "#ffffff",
              align: "center",
            },
            {
              id: crypto.randomUUID(),
              type: "text",
              content: "Conteúdo aqui",
              x: 15,
              y: 45,
              width: 70,
              height: 10,
              fontSize: 18,
              bold: false,
              color: "rgba(255,255,255,0.7)",
              align: "center",
            },
          ]
        : layout === "title-only"
          ? [
              {
                id: crypto.randomUUID(),
                type: "title",
                content: "Título",
                x: 10,
                y: 40,
                width: 80,
                height: 20,
                fontSize: 48,
                bold: true,
                color: "#ffffff",
                align: "center",
              },
            ]
          : [];
    updateCurrentSlide({ ...currentSlide, elements });
  }

  function insertTextBox() {
    if (currentSlide === null || currentPresentation === null) return;
    const newEl: SlideElement = {
      id: crypto.randomUUID(),
      type: "text",
      content: "Texto",
      x: 20,
      y: 60,
      width: 60,
      height: 10,
      fontSize: 16,
      bold: false,
      color: "#ffffff",
      align: "left",
    };
    updateCurrentSlide({
      ...currentSlide,
      elements: [...currentSlide.elements, newEl],
    });
  }

  function insertImage() {
    if (currentSlide === null || !imageUrl.trim()) return;
    const newEl: SlideElement = {
      id: crypto.randomUUID(),
      type: "image",
      content: imageUrl.trim(),
      x: 25,
      y: 25,
      width: 50,
      height: 30,
      fontSize: 16,
      bold: false,
      color: "#ffffff",
      align: "center",
    };
    updateCurrentSlide({
      ...currentSlide,
      elements: [...currentSlide.elements, newEl],
    });
    setImageUrl("");
    setShowImageInput(false);
  }

  function applySlideBg(color: string) {
    if (currentSlide === null) return;
    setSlideBg(color);
    updateCurrentSlide({ ...currentSlide, background: color });
    setShowBgPicker(false);
  }

  // ── Title rename ──────────────────────────────────────────────────────────

  function startRenaming(p: Presentation) {
    setEditingTitle(p.id);
    setTitleDraft(p.title);
  }

  function commitRename(id: string) {
    const trimmed = titleDraft.trim();
    if (!trimmed) return;
    const p = presentations.find((x) => x.id === id);
    if (!p) return;
    updatePresentation({ ...p, title: trimmed });
    setEditingTitle(null);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function formatDate(iso: string): string {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

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
        display: "flex",
        height: "100%",
        width: "100%",
        background: "#191d21",
        color: "var(--text-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Presentation fullscreen mode ── */}
      {presenting && currentPresentation !== null && (
        <PresentationMode
          slides={currentPresentation.slides}
          initialIndex={currentSlideIdx}
          onExit={() => setPresenting(false)}
        />
      )}

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
        <aside
          style={{
            width: "100%",
            height: "100%",
            background: "rgba(15,21,27,0.82)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
            scrollbarWidth: "none",
          }}
        >
          {/* Header */}
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
            <Presentation
              size={18}
              strokeWidth={1.6}
              style={{ color: ACCENT, flexShrink: 0 }}
            />
            {!collapsed && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                Apresentações
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
                padding: "8px 0",
                gap: 4,
              }}
            >
              <button
                type="button"
                aria-label="Nova apresentação"
                onClick={() => void handleCreate()}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: ACCENT,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Plus size={16} color="#fff" />
              </button>
            </nav>
          ) : (
            /* Full sidebar */
            <>
              {/* Nova apresentação button */}
              <div style={{ padding: "10px 10px 4px" }}>
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: ACCENT,
                    border: "none",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                    transition: "background 120ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = ACCENT_HOVER;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = ACCENT;
                  }}
                >
                  <Plus size={13} />
                  Nova apresentação
                </button>
              </div>

              {/* List */}
              {loading ? (
                <div
                  style={{
                    padding: "20px 14px",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                  }}
                >
                  Carregando…
                </div>
              ) : presentations.length === 0 ? (
                <div
                  style={{
                    padding: "20px 14px",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    lineHeight: 1.5,
                  }}
                >
                  Nenhuma apresentação ainda.
                </div>
              ) : (
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "8px 8px 160px",
                    scrollbarWidth: "none",
                  }}
                >
                  {presentations.map((p) => {
                    const isActive = selectedId === p.id;
                    return (
                      <div
                        key={p.id}
                        style={{
                          borderRadius: isActive ? "8px 0 0 8px" : 8,
                          border: isActive
                            ? "1px solid rgba(255,255,255,0.08)"
                            : "1px solid transparent",
                          borderRight: isActive
                            ? "1px solid transparent"
                            : undefined,
                          background: isActive
                            ? "var(--bg-elevated)"
                            : "transparent",
                          marginBottom: 2,
                          marginRight: isActive ? 0 : 8,
                          cursor: "pointer",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(p.id);
                            setCurrentSlideIdx(0);
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            width: "100%",
                            padding: "6px 8px 4px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                            gap: 2,
                          }}
                        >
                          {editingTitle === p.id ? (
                            <input
                              autoFocus
                              value={titleDraft}
                              onChange={(e) => setTitleDraft(e.target.value)}
                              onBlur={() => commitRename(p.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename(p.id);
                                if (e.key === "Escape") setEditingTitle(null);
                                e.stopPropagation();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: "100%",
                                background: "rgba(255,255,255,0.08)",
                                border: `1px solid ${ACCENT}`,
                                borderRadius: 4,
                                color: "var(--text-primary)",
                                fontSize: 12,
                                padding: "2px 6px",
                                outline: "none",
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: isActive
                                  ? "var(--text-primary)"
                                  : "var(--text-secondary)",
                                lineHeight: 1.3,
                              }}
                            >
                              {p.title}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {p.slides.length} slide
                            {p.slides.length !== 1 ? "s" : ""} ·{" "}
                            {formatDate(p.updated_at)}
                          </span>
                        </button>

                        {/* Actions */}
                        <div
                          style={{
                            display: "flex",
                            gap: 2,
                            padding: "0 4px 4px",
                          }}
                        >
                          <button
                            type="button"
                            aria-label="Renomear"
                            onClick={(e) => {
                              e.stopPropagation();
                              startRenaming(p);
                            }}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              background: "transparent",
                              border: "none",
                              color: "var(--text-tertiary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            type="button"
                            aria-label="Excluir apresentação"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(p.id);
                            }}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              background: "transparent",
                              border: "none",
                              color: "var(--text-tertiary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {/* Floating collapse toggle */}
      <button
        type="button"
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        onClick={() => setCollapsed((p) => !p)}
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

      {/* ── Main content ── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
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
          <Monitor size={14} style={{ color: ACCENT, flexShrink: 0 }} />
          <h2
            style={{
              flex: 1,
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.75)",
              minWidth: 80,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {currentPresentation !== null
              ? currentPresentation.title
              : "Apresentações"}
          </h2>
          {currentPresentation !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                aria-label="Iniciar apresentação"
                onClick={() => setPresenting(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: 7,
                  background: ACCENT,
                  border: "none",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Expand size={12} />
                Apresentar
              </button>
              <button
                type="button"
                title="Excluir apresentação"
                aria-label="Excluir apresentação"
                onClick={() => {
                  if (
                    window.confirm(`Excluir "${currentPresentation.title}"?`)
                  ) {
                    void handleDelete(currentPresentation.id);
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(239,68,68,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                  borderRadius: 5,
                  transition: "color 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(239,68,68,0.6)";
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        {currentPresentation === null ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                background: "rgba(245,158,11,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Monitor size={24} style={{ color: ACCENT }} />
            </div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Nenhuma apresentação
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-tertiary)",
                margin: 0,
                textAlign: "center",
                maxWidth: 280,
                lineHeight: 1.6,
              }}
            >
              Crie uma apresentação para começar a montar seus slides.
            </p>
            <button
              type="button"
              onClick={() => void handleCreate()}
              style={{
                marginTop: 4,
                padding: "7px 18px",
                borderRadius: 8,
                background: ACCENT,
                border: "none",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Nova apresentação
            </button>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "row",
              overflow: "hidden",
            }}
          >
            {/* ── Painel de slides (thumbnails) ── */}
            <div
              style={{
                width: 160,
                flexShrink: 0,
                background: "rgba(0,0,0,0.2)",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  paddingBottom: 160,
                }}
              >
                {currentPresentation.slides.map((slide, i) => (
                  <div key={slide.id} style={{ position: "relative" }}>
                    <SlideThumbnail
                      slide={slide}
                      index={i}
                      selected={currentSlideIdx === i}
                      onSelect={() => setCurrentSlideIdx(i)}
                    />
                    {currentPresentation.slides.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Excluir slide ${i + 1}`}
                        onClick={() => deleteSlide(i)}
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 12,
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: "rgba(0,0,0,0.6)",
                          border: "none",
                          color: "rgba(255,255,255,0.5)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          opacity: 0,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "0";
                        }}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add slide button */}
              <div
                style={{
                  padding: "8px 10px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={addSlide}
                  aria-label="Adicionar slide"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    width: "100%",
                    padding: "5px 8px",
                    borderRadius: 6,
                    background: "rgba(245,158,11,0.1)",
                    border: `1px solid rgba(245,158,11,0.2)`,
                    color: ACCENT,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={12} />
                  Slide
                </button>
              </div>
            </div>

            {/* ── Editor area ── */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Toolbar */}
              <div
                style={{
                  background: "#11161c",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  padding: "5px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                  flexWrap: "wrap",
                }}
              >
                {/* Slide background picker */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    aria-label="Cor de fundo do slide"
                    onClick={() => setShowBgPicker((p) => !p)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: currentSlide?.background ?? slideBg,
                        border: "1px solid rgba(255,255,255,0.2)",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    Fundo
                  </button>

                  {showBgPicker && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        zIndex: 100,
                        background: "rgba(8,12,22,0.98)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 10,
                        padding: 8,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 5,
                        width: 160,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {SLIDE_BG_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-label={`Fundo ${c}`}
                          onClick={() => applySlideBg(c)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 5,
                            background: c,
                            border:
                              (currentSlide?.background ?? slideBg) === c
                                ? `2px solid ${ACCENT}`
                                : "2px solid rgba(255,255,255,0.2)",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Separator */}
                <div
                  style={{
                    width: 1,
                    height: 18,
                    background: "rgba(255,255,255,0.1)",
                  }}
                />

                {/* Layout presets */}
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  Layout:
                </span>
                {(
                  [
                    {
                      id: "title-content" as SlideLayout,
                      label: "Título + Conteúdo",
                    },
                    { id: "title-only" as SlideLayout, label: "Só Título" },
                    { id: "blank" as SlideLayout, label: "Em branco" },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => applyLayout(l.id)}
                    style={{
                      padding: "3px 8px",
                      borderRadius: 5,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {l.label}
                  </button>
                ))}

                {/* Separator */}
                <div
                  style={{
                    width: 1,
                    height: 18,
                    background: "rgba(255,255,255,0.1)",
                  }}
                />

                {/* Insert text */}
                <button
                  type="button"
                  aria-label="Inserir caixa de texto"
                  onClick={insertTextBox}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--text-secondary)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  <Type size={12} />
                  Texto
                </button>

                {/* Insert image */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    aria-label="Inserir imagem por URL"
                    onClick={() => setShowImageInput((p) => !p)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    <Image size={12} />
                    Imagem
                  </button>

                  {showImageInput && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        zIndex: 100,
                        background: "rgba(8,12,22,0.98)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 8,
                        padding: 8,
                        display: "flex",
                        gap: 4,
                        width: 280,
                      }}
                    >
                      <input
                        autoFocus
                        placeholder="URL da imagem…"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") insertImage();
                          if (e.key === "Escape") setShowImageInput(false);
                        }}
                        aria-label="URL da imagem"
                        style={{
                          flex: 1,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 5,
                          padding: "4px 8px",
                          fontSize: 12,
                          color: "var(--text-primary)",
                          outline: "none",
                        }}
                      />
                      <button
                        type="button"
                        onClick={insertImage}
                        disabled={!imageUrl.trim()}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 5,
                          background: ACCENT,
                          border: "none",
                          color: "#fff",
                          fontSize: 12,
                          cursor: imageUrl.trim() ? "pointer" : "not-allowed",
                          opacity: imageUrl.trim() ? 1 : 0.5,
                        }}
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Slide editor */}
              {currentSlide !== null ? (
                <SlideEditor
                  slide={currentSlide}
                  onChange={updateCurrentSlide}
                />
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-tertiary)",
                    fontSize: 13,
                  }}
                >
                  Sem slides. Adicione um slide.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Close pickers on outside click */}
      {(showBgPicker || showImageInput) && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => {
            setShowBgPicker(false);
            setShowImageInput(false);
          }}
        />
      )}
    </div>
  );
}
