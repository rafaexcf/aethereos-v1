import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  X,
  Calendar,
  Pencil,
  Trash2,
  MoreHorizontal,
  Kanban as KanbanIcon,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useModalA11y } from "../../components/shared/useModalA11y";

// ─── Types (match migration 20260507000002_kernel_kanban.sql) ────────────────

interface KanbanBoard {
  id: string;
  company_id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface KanbanColumn {
  id: string;
  board_id: string;
  company_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
}

interface KanbanCard {
  id: string;
  column_id: string;
  company_id: string;
  title: string;
  description: string;
  color: string | null;
  assigned_to: string | null;
  due_date: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_COLUMNS: ReadonlyArray<{ name: string; color: string }> = [
  { name: "A Fazer", color: "#94a3b8" },
  { name: "Em Progresso", color: "#3b82f6" },
  { name: "Concluído", color: "#22c55e" },
];

const CARD_COLORS: ReadonlyArray<string> = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#64748b",
];

function formatDueDate(iso: string | null): string {
  if (iso === null || iso === "") return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function KanbanApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [activeDragCard, setActiveDragCard] = useState<KanbanCard | null>(null);
  const [addingColumn, setAddingColumn] = useState<boolean>(false);
  const [newColumnName, setNewColumnName] = useState<string>("");
  const [confirmColumnId, setConfirmColumnId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);

  const dragOriginColRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // ── Boot: load or create default board + columns + cards ───────────────────

  useEffect(() => {
    if (drivers === null || userId === null || activeCompanyId === null) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        // 1. Try to load first board for this company
        const boardRes = await drivers.data
          .from("kanban_boards")
          .select("*")
          .eq("company_id", activeCompanyId)
          .order("created_at", { ascending: true })
          .limit(1);

        if (boardRes.error) {
          throw new Error(boardRes.error.message);
        }

        let currentBoard = (boardRes.data ?? [])[0] as KanbanBoard | undefined;

        // 2. If none, create default board + 3 default columns
        if (currentBoard === undefined) {
          const insertBoardRes = await drivers.data
            .from("kanban_boards")
            .insert({
              company_id: activeCompanyId,
              name: "Meu Board",
              created_by: userId,
            })
            .select("*")
            .single();
          if (insertBoardRes.error || insertBoardRes.data === null) {
            throw new Error(
              insertBoardRes.error?.message ?? "Falha ao criar quadro",
            );
          }
          const newBoard = insertBoardRes.data as KanbanBoard;
          currentBoard = newBoard;

          const colsToInsert = DEFAULT_COLUMNS.map((c, i) => ({
            board_id: newBoard.id,
            company_id: activeCompanyId,
            name: c.name,
            color: c.color,
            sort_order: i,
          }));
          const insertColsRes = await drivers.data
            .from("kanban_columns")
            .insert(colsToInsert)
            .select("*");
          if (insertColsRes.error) {
            throw new Error(insertColsRes.error.message);
          }
          if (cancelled) return;
          setBoard(currentBoard);
          setColumns(((insertColsRes.data ?? []) as KanbanColumn[]).slice());
          setCards([]);
          setLoading(false);
          return;
        }

        // 3. Load columns + cards for the board
        const [colsRes, cardsRes] = await Promise.all([
          drivers.data
            .from("kanban_columns")
            .select("*")
            .eq("board_id", currentBoard.id)
            .order("sort_order", { ascending: true }),
          drivers.data
            .from("kanban_cards")
            .select("*")
            .eq("company_id", activeCompanyId)
            .order("sort_order", { ascending: true }),
        ]);
        if (colsRes.error) throw new Error(colsRes.error.message);
        if (cardsRes.error) throw new Error(cardsRes.error.message);
        if (cancelled) return;

        const loadedCols = (colsRes.data ?? []) as KanbanColumn[];
        const colIds = new Set(loadedCols.map((c) => c.id));
        const loadedCards = ((cardsRes.data ?? []) as KanbanCard[]).filter(
          (c) => colIds.has(c.column_id),
        );

        setBoard(currentBoard);
        setColumns(loadedCols);
        setCards(loadedCards);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Erro ao carregar quadro";
        setError(msg);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [drivers, userId, activeCompanyId]);

  // ── Cards by column (sorted) ───────────────────────────────────────────────

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, KanbanCard[]>();
    for (const col of columns) map.set(col.id, []);
    for (const card of cards) {
      const list = map.get(card.column_id);
      if (list !== undefined) list.push(card);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [columns, cards]);

  // ── Card CRUD ──────────────────────────────────────────────────────────────

  async function createCard(columnId: string, title: string): Promise<void> {
    if (
      drivers === null ||
      userId === null ||
      activeCompanyId === null ||
      title.trim() === ""
    ) {
      return;
    }
    const colCards = cardsByColumn.get(columnId) ?? [];
    const lastOrder = colCards[colCards.length - 1]?.sort_order ?? -1;
    const insertRes = await drivers.data
      .from("kanban_cards")
      .insert({
        column_id: columnId,
        company_id: activeCompanyId,
        title: title.trim(),
        description: "",
        sort_order: lastOrder + 1,
        created_by: userId,
      })
      .select("*")
      .single();
    if (insertRes.error || insertRes.data === null) return;
    setCards((prev) => [...prev, insertRes.data as KanbanCard]);
  }

  async function updateCard(
    cardId: string,
    patch: Partial<
      Pick<
        KanbanCard,
        "title" | "description" | "color" | "assigned_to" | "due_date"
      >
    >,
  ): Promise<void> {
    if (drivers === null) return;
    const res = await drivers.data
      .from("kanban_cards")
      .update(patch)
      .eq("id", cardId)
      .select("*")
      .single();
    if (res.error || res.data === null) return;
    const next = res.data as KanbanCard;
    setCards((prev) => prev.map((c) => (c.id === cardId ? next : c)));
    setEditingCard((curr) =>
      curr !== null && curr.id === cardId ? next : curr,
    );
  }

  async function deleteCard(cardId: string): Promise<void> {
    if (drivers === null) return;
    if (!window.confirm("Excluir este cartão?")) return;
    const res = await drivers.data
      .from("kanban_cards")
      .delete()
      .eq("id", cardId);
    if (res.error) return;
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setEditingCard((curr) =>
      curr !== null && curr.id === cardId ? null : curr,
    );
  }

  // ── Column CRUD ────────────────────────────────────────────────────────────

  async function createColumn(name: string): Promise<void> {
    if (
      drivers === null ||
      activeCompanyId === null ||
      board === null ||
      name.trim() === ""
    ) {
      return;
    }
    const maxOrder = columns.reduce(
      (acc, c) => (c.sort_order > acc ? c.sort_order : acc),
      -1,
    );
    const insertRes = await drivers.data
      .from("kanban_columns")
      .insert({
        board_id: board.id,
        company_id: activeCompanyId,
        name: name.trim(),
        color: "#94a3b8",
        sort_order: maxOrder + 1,
      })
      .select("*")
      .single();
    if (insertRes.error || insertRes.data === null) return;
    setColumns((prev) => [...prev, insertRes.data as KanbanColumn]);
  }

  async function renameColumn(columnId: string, name: string): Promise<void> {
    if (drivers === null || name.trim() === "") return;
    const res = await drivers.data
      .from("kanban_columns")
      .update({ name: name.trim() })
      .eq("id", columnId)
      .select("*")
      .single();
    if (res.error || res.data === null) return;
    const next = res.data as KanbanColumn;
    setColumns((prev) => prev.map((c) => (c.id === columnId ? next : c)));
  }

  async function deleteColumn(columnId: string): Promise<void> {
    if (drivers === null) return;
    const res = await drivers.data
      .from("kanban_columns")
      .delete()
      .eq("id", columnId);
    if (res.error) return;
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    setCards((prev) => prev.filter((c) => c.column_id !== columnId));
    setConfirmColumnId(null);
  }

  // ── DnD ───────────────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent): void {
    const cardId = String(event.active.id);
    const card = cards.find((c) => c.id === cardId);
    if (card !== undefined) {
      setActiveDragCard(card);
      dragOriginColRef.current = card.column_id;
    }
  }

  function handleDragOver(event: DragOverEvent): void {
    const { active, over } = event;
    if (over === null) return;
    if (active.id === over.id) return;

    const activeCard = cards.find((c) => c.id === String(active.id));
    if (activeCard === undefined) return;

    const overData = over.data.current as
      | { type?: string; columnId?: string }
      | undefined;
    let targetColId: string | null = null;
    if (overData?.type === "column") {
      targetColId = String(over.id);
    } else if (overData?.type === "card") {
      targetColId = overData.columnId ?? null;
    }
    if (targetColId === null) return;
    if (activeCard.column_id === targetColId) return;

    // Optimistic cross-column update — final sort_order is computed on drag-end
    setCards((prev) =>
      prev.map((c) =>
        c.id === activeCard.id ? { ...c, column_id: targetColId } : c,
      ),
    );
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    setActiveDragCard(null);

    if (drivers === null) {
      dragOriginColRef.current = null;
      return;
    }

    if (over === null) {
      // Revert if dropped outside any droppable
      const origin = dragOriginColRef.current;
      if (origin !== null) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === String(active.id) ? { ...c, column_id: origin } : c,
          ),
        );
      }
      dragOriginColRef.current = null;
      return;
    }
    dragOriginColRef.current = null;

    const draggedId = String(active.id);
    const dragged = cards.find((c) => c.id === draggedId);
    if (dragged === undefined) return;

    const overData = over.data.current as
      | { type?: string; columnId?: string }
      | undefined;

    let targetColId: string;
    let dropOnCardId: string | null = null;
    if (overData?.type === "column") {
      targetColId = String(over.id);
    } else if (overData?.type === "card" && overData.columnId !== undefined) {
      targetColId = overData.columnId;
      dropOnCardId = String(over.id);
    } else {
      targetColId = dragged.column_id;
    }

    // Build the new ordered list for the target column
    const others = cards.filter(
      (c) => c.column_id === targetColId && c.id !== dragged.id,
    );
    others.sort((a, b) => a.sort_order - b.sort_order);

    let insertIdx = others.length;
    if (dropOnCardId !== null) {
      const idx = others.findIndex((c) => c.id === dropOnCardId);
      if (idx !== -1) insertIdx = idx;
    }

    const newOrder: KanbanCard[] = [
      ...others.slice(0, insertIdx),
      { ...dragged, column_id: targetColId },
      ...others.slice(insertIdx),
    ];

    // Renumber sort_order sequentially
    const renumbered = newOrder.map((c, i) => ({ ...c, sort_order: i }));

    // Optimistic local update
    const renumberedById = new Map(renumbered.map((c) => [c.id, c]));
    setCards((prev) =>
      prev.map((c) => {
        const updated = renumberedById.get(c.id);
        return updated !== undefined ? updated : c;
      }),
    );

    // Persist batch updates
    void Promise.all(
      renumbered.map((c) =>
        drivers.data
          .from("kanban_cards")
          .update({ column_id: c.column_id, sort_order: c.sort_order })
          .eq("id", c.id),
      ),
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (drivers === null || userId === null || activeCompanyId === null) {
    return (
      <ShellRoot>
        <CenterMessage>Carregando sessão…</CenterMessage>
      </ShellRoot>
    );
  }

  if (loading) {
    return (
      <ShellRoot>
        <CenterMessage>Carregando quadro…</CenterMessage>
      </ShellRoot>
    );
  }

  if (error !== null) {
    return (
      <ShellRoot>
        <CenterMessage tone="error">{error}</CenterMessage>
      </ShellRoot>
    );
  }

  const sortedColumns = [...columns].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <ShellRoot>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "#11161c",
          flexShrink: 0,
        }}
      >
        <KanbanIcon size={16} style={{ color: "#6366f1" }} />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          {board?.name ?? "Kanban"}
        </span>
      </div>

      {/* Board */}
      {sortedColumns.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
          }}
        >
          <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
            Nenhuma coluna ainda.
          </p>
          <button
            type="button"
            onClick={() => setAddingColumn(true)}
            style={primaryButtonStyle}
          >
            <Plus size={14} /> Adicionar coluna
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            style={{
              flex: 1,
              overflowX: "auto",
              overflowY: "hidden",
              padding: "14px 14px 160px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                height: "100%",
                minWidth: "fit-content",
              }}
            >
              {sortedColumns.map((col) => (
                <ColumnView
                  key={col.id}
                  column={col}
                  cards={cardsByColumn.get(col.id) ?? []}
                  isEditingName={editingColumnId === col.id}
                  isConfirmingDelete={confirmColumnId === col.id}
                  onStartEditName={() => setEditingColumnId(col.id)}
                  onCommitEditName={(name) => {
                    setEditingColumnId(null);
                    if (name !== col.name) {
                      void renameColumn(col.id, name);
                    }
                  }}
                  onCancelEditName={() => setEditingColumnId(null)}
                  onAskDelete={() => setConfirmColumnId(col.id)}
                  onCancelDelete={() => setConfirmColumnId(null)}
                  onConfirmDelete={() => void deleteColumn(col.id)}
                  onAddCard={(title) => void createCard(col.id, title)}
                  onCardClick={(card) => setEditingCard(card)}
                />
              ))}

              {/* Add column */}
              {addingColumn ? (
                <div
                  style={{
                    width: 280,
                    flexShrink: 0,
                    background: "#13181e",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.10)",
                    padding: 10,
                  }}
                >
                  <input
                    autoFocus
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void createColumn(newColumnName);
                        setNewColumnName("");
                        setAddingColumn(false);
                      }
                      if (e.key === "Escape") {
                        setAddingColumn(false);
                        setNewColumnName("");
                      }
                    }}
                    placeholder="Nome da coluna…"
                    aria-label="Nome da coluna"
                    style={{
                      width: "100%",
                      background: "#191d21",
                      border: "1px solid #6366f1",
                      borderRadius: 6,
                      color: "var(--text-primary)",
                      fontSize: 13,
                      padding: "5px 8px",
                      outline: "none",
                      boxSizing: "border-box",
                      marginBottom: 8,
                    }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        void createColumn(newColumnName);
                        setNewColumnName("");
                        setAddingColumn(false);
                      }}
                      style={primaryButtonStyle}
                    >
                      Criar
                    </button>
                    <button
                      type="button"
                      aria-label="Cancelar"
                      onClick={() => {
                        setAddingColumn(false);
                        setNewColumnName("");
                      }}
                      style={iconButtonStyle}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingColumn(true)}
                  style={{
                    width: 280,
                    flexShrink: 0,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px dashed rgba(255,255,255,0.10)",
                    borderRadius: 10,
                    padding: 12,
                    cursor: "pointer",
                    color: "var(--text-tertiary)",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    justifyContent: "center",
                  }}
                >
                  <Plus size={14} /> Adicionar coluna
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeDragCard !== null ? (
              <CardChip card={activeDragCard} isOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Card editor modal */}
      {editingCard !== null ? (
        <CardEditModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={(patch) => updateCard(editingCard.id, patch)}
          onDelete={() => deleteCard(editingCard.id)}
        />
      ) : null}
    </ShellRoot>
  );
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function ShellRoot({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#191d21",
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function CenterMessage({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "error";
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: tone === "error" ? "#ef4444" : "var(--text-tertiary)",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColumnViewProps {
  column: KanbanColumn;
  cards: KanbanCard[];
  isEditingName: boolean;
  isConfirmingDelete: boolean;
  onStartEditName: () => void;
  onCommitEditName: (name: string) => void;
  onCancelEditName: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onAddCard: (title: string) => void;
  onCardClick: (card: KanbanCard) => void;
}

function ColumnView({
  column,
  cards,
  isEditingName,
  isConfirmingDelete,
  onStartEditName,
  onCommitEditName,
  onCancelEditName,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onAddCard,
  onCardClick,
}: ColumnViewProps) {
  const { setNodeRef, isOver } = useDroppableColumn(column.id);

  const [name, setName] = useState<string>(column.name);
  const [adding, setAdding] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [showMenu, setShowMenu] = useState<boolean>(false);

  useEffect(() => {
    setName(column.name);
  }, [column.name]);

  const cardCount = cards.length;
  const accentColor = column.color ?? "#94a3b8";

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        flexDirection: "column",
        width: 280,
        flexShrink: 0,
        maxHeight: "100%",
        background: "#13181e",
        borderRadius: 10,
        border: "1px solid",
        borderColor: isOver ? "#6366f1" : "rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px 8px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          borderTop: `3px solid ${accentColor}`,
        }}
      >
        {isEditingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onBlur={() => onCommitEditName(name)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitEditName(name);
              if (e.key === "Escape") {
                setName(column.name);
                onCancelEditName();
              }
            }}
            aria-label="Renomear coluna"
            style={{
              flex: 1,
              background: "#191d21",
              border: "1px solid #6366f1",
              borderRadius: 5,
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: 600,
              padding: "2px 6px",
              outline: "none",
            }}
          />
        ) : (
          <span
            role="button"
            tabIndex={0}
            onDoubleClick={onStartEditName}
            onKeyDown={(e) => {
              if (e.key === "Enter") onStartEditName();
            }}
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              cursor: "text",
            }}
          >
            {column.name}
          </span>
        )}

        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 4,
            padding: "1px 6px",
          }}
        >
          {cardCount}
        </span>

        <div style={{ position: "relative" }}>
          <button
            type="button"
            aria-label="Opções da coluna"
            onClick={() => setShowMenu((prev) => !prev)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              padding: 2,
              borderRadius: 4,
              display: "flex",
            }}
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu ? (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                zIndex: 20,
                marginTop: 4,
                background: "#11161c",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 8,
                padding: 4,
                minWidth: 160,
              }}
            >
              <MenuButton
                icon={<Pencil size={12} />}
                label="Renomear"
                onClick={() => {
                  onStartEditName();
                  setShowMenu(false);
                }}
              />
              {isConfirmingDelete ? (
                <div style={{ padding: "4px 8px" }}>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      margin: "0 0 4px",
                    }}
                  >
                    {cardCount} cartão{cardCount !== 1 ? "s" : ""}{" "}
                    {cardCount === 1 ? "será excluído" : "serão excluídos"}.
                    Confirmar?
                  </p>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        onConfirmDelete();
                        setShowMenu(false);
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
                      type="button"
                      onClick={() => {
                        onCancelDelete();
                      }}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: 4,
                        color: "var(--text-tertiary)",
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
                  onClick={() => {
                    onAskDelete();
                  }}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Cards */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 8px 0",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>

        {adding ? (
          <div
            style={{
              background: "#191d21",
              borderRadius: 8,
              border: "1px solid #6366f1",
              padding: 8,
              marginBottom: 8,
            }}
          >
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (newTitle.trim() !== "") {
                    onAddCard(newTitle);
                    setNewTitle("");
                    setAdding(false);
                  }
                }
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewTitle("");
                }
              }}
              placeholder="Título do cartão…"
              aria-label="Título do cartão"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: 13,
                marginBottom: 6,
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  if (newTitle.trim() !== "") {
                    onAddCard(newTitle);
                    setNewTitle("");
                    setAdding(false);
                  }
                }}
                style={primaryButtonStyle}
              >
                Adicionar
              </button>
              <button
                type="button"
                aria-label="Cancelar"
                onClick={() => {
                  setAdding(false);
                  setNewTitle("");
                }}
                style={iconButtonStyle}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              padding: "6px 8px",
              background: "transparent",
              border: "1px dashed rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: "var(--text-tertiary)",
              cursor: "pointer",
              fontSize: 12,
              marginBottom: 8,
            }}
          >
            <Plus size={12} /> Adicionar cartão
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function SortableCard({
  card,
  onClick,
}: {
  card: KanbanCard;
  onClick: () => void;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", columnId: card.column_id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardChip card={card} onClick={onClick} />
    </div>
  );
}

function CardChip({
  card,
  onClick,
  isOverlay,
}: {
  card: KanbanCard;
  onClick?: () => void;
  isOverlay?: boolean;
}) {
  const accent = card.color ?? "#475569";
  return (
    <div
      onClick={onClick}
      style={{
        background: "#191d21",
        borderRadius: 8,
        padding: "8px 10px",
        border: "1px solid rgba(255,255,255,0.07)",
        borderLeft: `3px solid ${accent}`,
        cursor: onClick !== undefined ? "pointer" : "grabbing",
        userSelect: "none",
        ...(isOverlay === true
          ? { boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }
          : {}),
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "var(--text-primary)",
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        {card.title}
      </p>
      {card.description !== "" ? (
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            margin: "4px 0 0",
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
          }}
        >
          {card.description}
        </p>
      ) : null}
      {card.due_date !== null && card.due_date !== "" ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 6,
            fontSize: 10,
            color: "var(--text-tertiary)",
          }}
        >
          <Calendar size={10} />
          {formatDueDate(card.due_date)}
        </div>
      ) : null}
    </div>
  );
}

// ─── Card edit modal ──────────────────────────────────────────────────────────

interface CardEditModalProps {
  card: KanbanCard;
  onClose: () => void;
  onSave: (
    patch: Partial<
      Pick<
        KanbanCard,
        "title" | "description" | "color" | "assigned_to" | "due_date"
      >
    >,
  ) => Promise<void>;
  onDelete: () => Promise<void>;
}

function CardEditModal({
  card,
  onClose,
  onSave,
  onDelete,
}: CardEditModalProps) {
  const [title, setTitle] = useState<string>(card.title);
  const [description, setDescription] = useState<string>(card.description);
  const [color, setColor] = useState<string | null>(card.color);
  const [assignedTo, setAssignedTo] = useState<string>(card.assigned_to ?? "");
  const [dueDate, setDueDate] = useState<string>(card.due_date ?? "");
  const [saving, setSaving] = useState<boolean>(false);

  const modalRef = useModalA11y<HTMLDivElement>({ open: true, onClose });

  async function handleSave(): Promise<void> {
    if (title.trim() === "") return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description,
      color,
      assigned_to: assignedTo.trim() === "" ? null : assignedTo.trim(),
      due_date: dueDate === "" ? null : dueDate,
    });
    setSaving(false);
    onClose();
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Editar cartão"
        style={{
          width: 480,
          maxWidth: "100vw",
          maxHeight: "calc(100vh - 32px)",
          background: "#191d21",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Editar cartão
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              padding: 2,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Field label="Título">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              aria-label="Título"
              style={inputStyle}
            />
          </Field>

          <Field label="Descrição">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              rows={4}
              aria-label="Descrição"
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.5,
                fontFamily: "inherit",
              }}
            />
          </Field>

          <Field label="Cor">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                aria-label="Sem cor"
                onClick={() => setColor(null)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "transparent",
                  border: "1px dashed rgba(255,255,255,0.20)",
                  cursor: "pointer",
                  boxShadow:
                    color === null
                      ? "0 0 0 2px #191d21, 0 0 0 4px #6366f1"
                      : "none",
                }}
              />
              {CARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => setColor(c)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: c,
                    border: "none",
                    cursor: "pointer",
                    boxShadow:
                      color === c
                        ? `0 0 0 2px #191d21, 0 0 0 4px ${c}`
                        : "none",
                  }}
                />
              ))}
            </div>
          </Field>

          <Field label="Responsável (UUID)">
            <input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.currentTarget.value)}
              placeholder="UUID do usuário (opcional)"
              aria-label="Responsável"
              style={inputStyle}
            />
          </Field>

          <Field label="Vencimento">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.currentTarget.value)}
              aria-label="Vencimento"
              style={inputStyle}
            />
          </Field>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            type="button"
            onClick={() => void onDelete()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#ef4444",
              fontSize: 12,
              padding: "4px 8px",
            }}
          >
            <Trash2 size={13} /> Excluir
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              color: "var(--text-tertiary)",
              fontSize: 13,
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={title.trim() === "" || saving}
            style={{
              ...primaryButtonStyle,
              padding: "6px 16px",
              opacity: title.trim() === "" || saving ? 0.6 : 1,
            }}
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Droppable column hook ────────────────────────────────────────────────────

function useDroppableColumn(columnId: string): {
  setNodeRef: (node: HTMLElement | null) => void;
  isOver: boolean;
} {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: { type: "column" },
  });
  return { setNodeRef, isOver };
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

const primaryButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#6366f1",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 500,
  padding: "6px 14px",
  cursor: "pointer",
};

const iconButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--text-tertiary)",
  padding: 4,
  display: "flex",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#11161c",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  padding: "6px 10px",
  outline: "none",
  boxSizing: "border-box",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 11,
          color: "var(--text-tertiary)",
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
      type="button"
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
        color: danger === true ? "#ef4444" : "var(--text-primary)",
        fontSize: 12,
        marginBottom: 2,
      }}
    >
      {icon} {label}
    </button>
  );
}
