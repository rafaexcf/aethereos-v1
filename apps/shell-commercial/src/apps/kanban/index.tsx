import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Kanban,
  Plus,
  Pencil,
  Trash2,
  Archive,
  X,
  Check,
  AlertCircle,
  Clock,
  User,
  Search,
  LayoutGrid,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { BoardView } from "./BoardView";
import type { KanbanBoard, KanbanCard } from "./types";
import {
  BOARD_COLORS,
  isOverdue,
  isDueToday,
  formatDate,
  PRIORITY_COLORS,
} from "./types";

// ─── View state ───────────────────────────────────────────────────────────────

type View =
  | { kind: "list" }
  | { kind: "board"; boardId: string }
  | { kind: "filter"; filter: "my-cards" | "overdue" | "due-today" };

// ─── Board modal ──────────────────────────────────────────────────────────────

interface BoardModalProps {
  initial?: KanbanBoard;
  onSave: (name: string, description: string, color: string) => Promise<void>;
  onClose: () => void;
}

function BoardModal({ initial, onSave, onClose }: BoardModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim(), description.trim(), color);
    setSaving(false);
    onClose();
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#191d21",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.1)",
          padding: 24,
          width: 400,
          boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary, #e2e8f0)",
              margin: 0,
            }}
          >
            {initial ? "Editar quadro" : "Novo quadro"}
          </h2>
          <button
            aria-label="Fechar"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary, #64748b)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <Field label="Nome">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSave();
            }}
            placeholder="Nome do quadro…"
            style={{
              width: "100%",
              background: "#11161c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "var(--text-primary, #e2e8f0)",
              fontSize: 13,
              padding: "6px 10px",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#6366f1";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          />
        </Field>

        <Field label="Descrição">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            placeholder="Opcional…"
            rows={2}
            style={{
              width: "100%",
              background: "#11161c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "var(--text-primary, #e2e8f0)",
              fontSize: 13,
              padding: "6px 10px",
              outline: "none",
              resize: "none",
              boxSizing: "border-box",
            }}
          />
        </Field>

        <Field label="Cor">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {BOARD_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: c,
                  border: "none",
                  cursor: "pointer",
                  boxShadow:
                    color === c ? `0 0 0 2px #191d21, 0 0 0 4px ${c}` : "none",
                }}
              />
            ))}
          </div>
        </Field>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "var(--text-tertiary, #64748b)",
              fontSize: 13,
              padding: "6px 16px",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={!name.trim() || saving}
            style={{
              background: color,
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              padding: "6px 20px",
              cursor: "pointer",
              fontWeight: 500,
              opacity: !name.trim() || saving ? 0.6 : 1,
            }}
          >
            {saving ? "Salvando…" : initial ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Board card ───────────────────────────────────────────────────────────────

function BoardCard({
  board,
  cardCount,
  onOpen,
  onEdit,
  onDelete,
  onArchive,
}: {
  board: KanbanBoard;
  cardCount: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      style={{
        background: "#13181e",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.07)",
        borderTop: `4px solid ${board.color}`,
        cursor: "pointer",
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
    >
      <div onClick={onOpen} style={{ padding: "14px 14px 10px" }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary, #e2e8f0)",
            margin: "0 0 4px",
            lineHeight: 1.3,
          }}
        >
          {board.name}
        </p>
        {board.description && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary, #64748b)",
              margin: "0 0 8px",
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
            }}
          >
            {board.description}
          </p>
        )}
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary, #64748b)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <LayoutGrid size={11} /> {cardCount} cartão
          {cardCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "4px 8px 8px",
          position: "relative",
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((p) => !p);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary, #64748b)",
            padding: "2px 4px",
            borderRadius: 4,
          }}
        >
          ···
        </button>
        {showMenu && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              right: 8,
              zIndex: 10,
              background: "#0d1117",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: 4,
              minWidth: 140,
            }}
          >
            <MenuButton
              icon={<Pencil size={12} />}
              label="Editar"
              onClick={() => {
                setShowMenu(false);
                onEdit();
              }}
            />
            <MenuButton
              icon={<Archive size={12} />}
              label="Arquivar"
              onClick={() => {
                setShowMenu(false);
                onArchive();
              }}
            />
            {confirmDelete ? (
              <div style={{ padding: "4px 8px" }}>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary, #64748b)",
                    marginBottom: 4,
                  }}
                >
                  Confirmar?
                </p>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    style={{
                      flex: 1,
                      background: "#ef4444",
                      border: "none",
                      borderRadius: 4,
                      color: "#fff",
                      fontSize: 11,
                      padding: "3px 0",
                      cursor: "pointer",
                    }}
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 4,
                      color: "var(--text-tertiary, #64748b)",
                      fontSize: 11,
                      padding: "3px 0",
                      cursor: "pointer",
                    }}
                  >
                    Não
                  </button>
                </div>
              </div>
            ) : (
              <MenuButton
                icon={<Trash2 size={12} />}
                label="Excluir"
                danger
                onClick={() => setConfirmDelete(true)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Filtered card list ───────────────────────────────────────────────────────

function FilteredCardList({
  title,
  cards,
  boards,
  onCardClick,
}: {
  title: string;
  cards: KanbanCard[];
  boards: KanbanBoard[];
  onCardClick: (card: KanbanCard, boardId: string) => void;
}) {
  const boardMap = new Map(boards.map((b) => [b.id, b]));

  if (cards.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          color: "var(--text-tertiary, #64748b)",
        }}
      >
        <Check size={36} style={{ opacity: 0.4 }} />
        <p style={{ fontSize: 14 }}>Nenhum cartão em "{title}"</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 160px" }}>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary, #e2e8f0)",
          marginBottom: 12,
        }}
      >
        {title} — {cards.length} cartão{cards.length !== 1 ? "s" : ""}
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: 600,
        }}
      >
        {cards.map((card) => {
          const board = boardMap.get(card.board_id);
          const overdue = isOverdue(card.due_date);
          const dueToday = isDueToday(card.due_date);
          return (
            <div
              key={card.id}
              onClick={() => onCardClick(card, card.board_id)}
              style={{
                background: "#13181e",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.07)",
                borderLeft: `3px solid ${PRIORITY_COLORS[card.priority]}`,
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-primary, #e2e8f0)",
                      margin: "0 0 4px",
                      fontWeight: 500,
                    }}
                  >
                    {card.title}
                  </p>
                  {board && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary, #64748b)",
                        margin: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: board.color,
                          display: "inline-block",
                        }}
                      />
                      {board.name}
                    </p>
                  )}
                </div>
                {card.due_date && (
                  <span
                    style={{
                      fontSize: 11,
                      color: overdue
                        ? "#ef4444"
                        : dueToday
                          ? "#f59e0b"
                          : "var(--text-tertiary, #64748b)",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      flexShrink: 0,
                    }}
                  >
                    {overdue ? <AlertCircle size={11} /> : <Clock size={11} />}
                    {formatDate(card.due_date)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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

// ─── Main App ─────────────────────────────────────────────────────────────────

export function KanbanApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();

  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [allCards, setAllCards] = useState<KanbanCard[]>([]);
  const [cardCountByBoard, setCardCountByBoard] = useState<Map<string, number>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<KanbanBoard | null>(null);
  const [searchQ, setSearchQ] = useState("");
  // Load boards + card counts
  useEffect(() => {
    if (!drivers || !userId || !companyId) return;
    setLoading(true);
    void Promise.all([
      drivers.data
        .from("kanban_boards")
        .select("*")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .eq("is_archived", false)
        .order("created_at"),
      drivers.data
        .from("kanban_cards")
        .select(
          "id,board_id,title,priority,due_date,status,column_id,description,position,user_id,company_id,assignee_id,completed_at,created_at,updated_at",
        )
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .neq("status", "archived"),
    ]).then(([boardRes, cardRes]) => {
      const b = (boardRes.data ?? []) as KanbanBoard[];
      const c = (cardRes.data ?? []) as KanbanCard[];
      setBoards(b);
      setAllCards(c);
      const countMap = new Map<string, number>();
      for (const card of c) {
        countMap.set(card.board_id, (countMap.get(card.board_id) ?? 0) + 1);
      }
      setCardCountByBoard(countMap);
      setLoading(false);
    });
  }, [drivers, userId, companyId]);

  // ── Board CRUD ────────────────────────────────────────────────────────────────

  async function createBoard(name: string, description: string, color: string) {
    if (!drivers || !userId || !companyId) return;
    const { data } = await drivers.data
      .from("kanban_boards")
      .insert({
        user_id: userId,
        company_id: companyId,
        name,
        description,
        color,
        is_archived: false,
      })
      .select("*")
      .single();
    if (data) setBoards((p) => [...p, data as KanbanBoard]);
  }

  async function updateBoard(name: string, description: string, color: string) {
    if (!drivers || !editingBoard) return;
    await drivers.data
      .from("kanban_boards")
      .update({ name, description, color })
      .eq("id", editingBoard.id);
    setBoards((p) =>
      p.map((b) =>
        b.id === editingBoard.id ? { ...b, name, description, color } : b,
      ),
    );
    setEditingBoard(null);
  }

  async function deleteBoard(id: string) {
    if (!drivers) return;
    await drivers.data.from("kanban_boards").delete().eq("id", id);
    setBoards((p) => p.filter((b) => b.id !== id));
  }

  async function archiveBoard(id: string) {
    if (!drivers) return;
    await drivers.data
      .from("kanban_boards")
      .update({ is_archived: true })
      .eq("id", id);
    setBoards((p) => p.filter((b) => b.id !== id));
  }

  // ── Filtered views ────────────────────────────────────────────────────────────

  const myCards = useMemo(
    () =>
      allCards.filter((c) => c.user_id === userId && c.status !== "completed"),
    [allCards, userId],
  );
  const overdueCards = useMemo(
    () =>
      allCards.filter((c) => isOverdue(c.due_date) && c.status !== "completed"),
    [allCards],
  );
  const dueTodayCards = useMemo(
    () =>
      allCards.filter(
        (c) => isDueToday(c.due_date) && c.status !== "completed",
      ),
    [allCards],
  );

  const filteredBoards = useMemo(() => {
    if (!searchQ) return boards;
    return boards.filter((b) =>
      b.name.toLowerCase().includes(searchQ.toLowerCase()),
    );
  }, [boards, searchQ]);

  // ── Render ────────────────────────────────────────────────────────────────────

  // Board view
  if (view.kind === "board") {
    const board = boards.find((b) => b.id === view.boardId);
    if (!board) {
      setView({ kind: "list" });
      return null;
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: "#191d21",
        }}
      >
        <BoardView
          boardId={board.id}
          boardName={board.name}
          boardColor={board.color}
          onBack={() => setView({ kind: "list" })}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#191d21",
        fontSize: 13,
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      {/* Sidebar + content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Animated sidebar wrapper */}
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
              <Kanban
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
                  Kanban
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
                {[
                  { id: "list", label: "Todos os quadros", Icon: LayoutGrid },
                  { id: "my-cards", label: "Meus cartões", Icon: User },
                  { id: "overdue", label: "Atrasados", Icon: AlertCircle },
                  { id: "due-today", label: "Vencem hoje", Icon: Clock },
                ].map(({ id, label, Icon }) => {
                  const isActive =
                    view.kind === id ||
                    (view.kind === "filter" && view.filter === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      title={label}
                      onClick={() => {
                        if (id === "list") setView({ kind: "list" });
                        else
                          setView({
                            kind: "filter",
                            filter: id as "my-cards" | "overdue" | "due-today",
                          });
                      }}
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
              </nav>
            ) : (
              /* Expanded nav */
              <>
                {/* Novo quadro button — same pattern as bloco-de-notas "Nova nota" */}
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
                      background: "#6366f1",
                      border: "none",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                      transition: "background 120ms",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#4f46e5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#6366f1";
                    }}
                  >
                    <Plus size={13} />
                    Novo quadro
                  </button>
                </div>
                <nav style={{ flex: 1, padding: "4px 0 16px 8px" }}>
                  {[
                    {
                      id: "list",
                      label: "Todos os quadros",
                      Icon: LayoutGrid,
                      badge: 0,
                      danger: false,
                    },
                    {
                      id: "my-cards",
                      label: "Meus cartões",
                      Icon: User,
                      badge: myCards.length,
                      danger: false,
                    },
                    {
                      id: "overdue",
                      label: "Atrasados",
                      Icon: AlertCircle,
                      badge: overdueCards.length,
                      danger: true,
                    },
                    {
                      id: "due-today",
                      label: "Vencem hoje",
                      Icon: Clock,
                      badge: dueTodayCards.length,
                      danger: false,
                    },
                  ].map(({ id, label, Icon, badge, danger }) => {
                    const isActive =
                      view.kind === id ||
                      (view.kind === "filter" && view.filter === id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (id === "list") setView({ kind: "list" });
                          else
                            setView({
                              kind: "filter",
                              filter: id as
                                | "my-cards"
                                | "overdue"
                                | "due-today",
                            });
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
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
                            e.currentTarget.style.color = "var(--text-primary)";
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
                        <Icon size={15} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{label}</span>
                        {badge > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "1px 5px",
                              borderRadius: 8,
                              background: danger
                                ? "rgba(239,68,68,0.15)"
                                : "rgba(255,255,255,0.08)",
                              color: danger
                                ? "#ef4444"
                                : "var(--text-tertiary)",
                            }}
                          >
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
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

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Filtered views */}
          {view.kind === "filter" && (
            <FilteredCardList
              title={
                view.filter === "my-cards"
                  ? "Meus cartões"
                  : view.filter === "overdue"
                    ? "Atrasados"
                    : "Vencem hoje"
              }
              cards={
                view.filter === "my-cards"
                  ? myCards
                  : view.filter === "overdue"
                    ? overdueCards
                    : dueTodayCards
              }
              boards={boards}
              onCardClick={(card, _boardId) => {
                setView({ kind: "board", boardId: card.board_id });
              }}
            />
          )}

          {/* Board list */}
          {view.kind === "list" && (
            <>
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Kanban size={14} style={{ color: "#6366f1", flexShrink: 0 }} />
                <h2
                  style={{
                    margin: "0 12px 0 0",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.75)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Quadros
                </h2>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    padding: "6px 10px",
                  }}
                >
                  <Search
                    size={14}
                    style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
                  />
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.currentTarget.value)}
                    placeholder="Pesquisar quadros…"
                    style={{
                      background: "none",
                      border: "none",
                      outline: "none",
                      color: "var(--text-primary)",
                      fontSize: 13,
                      flex: 1,
                    }}
                  />
                  {searchQ && (
                    <button
                      type="button"
                      aria-label="Limpar busca"
                      onClick={() => setSearchQ("")}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-tertiary)",
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
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px 16px 160px",
                }}
              >
                {loading ? (
                  <div
                    className="skeleton-pulse"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {[3, 5, 2, 4].map((rows, i) => (
                      <div
                        key={i}
                        style={{
                          borderRadius: 10,
                          padding: 16,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div
                          style={{
                            height: 14,
                            width: "60%",
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.10)",
                            marginBottom: 10,
                          }}
                        />
                        <div
                          style={{
                            height: 10,
                            width: "35%",
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.06)",
                          }}
                        />
                        <div
                          style={{
                            marginTop: 16,
                            height: 1,
                            background: "rgba(255,255,255,0.06)",
                          }}
                        />
                        <div
                          style={{
                            marginTop: 12,
                            fontSize: 11,
                            color: "transparent",
                            background: "rgba(255,255,255,0.05)",
                            borderRadius: 4,
                            width: 40,
                            height: 10,
                          }}
                        >
                          {rows}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredBoards.length === 0 && !searchQ ? (
                  <EmptyBoards onCreateClick={() => setShowCreateModal(true)} />
                ) : filteredBoards.length === 0 ? (
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
                        background: "rgba(99,102,241,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Search size={24} style={{ color: "#6366f1" }} />
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
                        Nenhum quadro encontrado
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: "var(--text-tertiary)",
                          lineHeight: 1.6,
                        }}
                      >
                        Tente termos diferentes para encontrar o quadro
                        desejado.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {filteredBoards.map((b) => (
                      <BoardCard
                        key={b.id}
                        board={b}
                        cardCount={cardCountByBoard.get(b.id) ?? 0}
                        onOpen={() => setView({ kind: "board", boardId: b.id })}
                        onEdit={() => setEditingBoard(b)}
                        onDelete={() => void deleteBoard(b.id)}
                        onArchive={() => void archiveBoard(b.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <BoardModal
          onSave={createBoard}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      {editingBoard && (
        <BoardModal
          initial={editingBoard}
          onSave={updateBoard}
          onClose={() => setEditingBoard(null)}
        />
      )}
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          color: "var(--text-tertiary, #64748b)",
          marginBottom: 6,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        width: "100%",
        padding: "5px 8px",
        background: "none",
        border: "none",
        borderRadius: 5,
        cursor: "pointer",
        color: danger ? "#ef4444" : "var(--text-primary, #e2e8f0)",
        fontSize: 12,
        marginBottom: 2,
      }}
    >
      {icon} {label}
    </button>
  );
}

function EmptyBoards({ onCreateClick }: { onCreateClick: () => void }) {
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
          background: "rgba(99,102,241,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Kanban size={24} style={{ color: "#6366f1" }} />
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
          Nenhum quadro ainda
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--text-tertiary)",
            lineHeight: 1.6,
          }}
        >
          Crie quadros para organizar tarefas, projetos e fluxos de trabalho da
          equipe.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreateClick}
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
        <Plus size={14} /> Criar quadro
      </button>
    </div>
  );
}
