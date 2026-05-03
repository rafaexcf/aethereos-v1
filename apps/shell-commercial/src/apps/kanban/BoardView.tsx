import { useState, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  X,
  Calendar,
  AlertCircle,
  MoreHorizontal,
  GripVertical,
  Pencil,
  Trash2,
  Tag,
  Check,
  Search,
  Filter,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { CardModal } from "./CardModal";
import type { KanbanColumn, KanbanCard, KanbanLabel, Priority } from "./types";
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  calcMidPos,
  isOverdue,
  isDueToday,
  formatDate,
} from "./types";

// ─── Column DnD item ──────────────────────────────────────────────────────────

interface SortableColumnProps {
  column: KanbanColumn;
  cards: KanbanCard[];
  labels: KanbanLabel[];
  cardLabelMap: Map<string, string[]>;
  userId: string | null;
  companyId: string | null;
  isOver?: boolean;
  onEditColumn: (col: KanbanColumn) => void;
  onDeleteColumn: (colId: string) => void;
  onCardClick: (card: KanbanCard) => void;
  onCardAdded: (card: KanbanCard) => void;
  drivers: ReturnType<typeof useDrivers>;
  boardId: string;
}

function SortableColumn({
  column,
  cards,
  labels,
  cardLabelMap,
  userId,
  companyId,
  onEditColumn,
  onDeleteColumn,
  onCardClick,
  onCardAdded,
  drivers,
  boardId,
}: SortableColumnProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column" },
  });

  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [colName, setColName] = useState(column.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeCards = cards
    .filter((c) => c.status !== "archived")
    .sort((a, b) => a.position - b.position);
  const completedCards = cards.filter((c) => c.status === "completed");

  async function addCard() {
    if (!drivers || !userId || !companyId || !newCardTitle.trim()) return;
    const pos = (activeCards[activeCards.length - 1]?.position ?? 0) + 1000;
    const { data } = await drivers.data
      .from("kanban_cards")
      .insert({
        board_id: boardId,
        column_id: column.id,
        user_id: userId,
        company_id: companyId,
        title: newCardTitle.trim(),
        description: "",
        priority: "medium",
        status: "active",
        position: pos,
      })
      .select("*")
      .single();
    if (data) onCardAdded(data as KanbanCard);
    setNewCardTitle("");
    setAddingCard(false);
    if (drivers && userId) {
      void drivers.data.from("kanban_activity").insert({
        board_id: boardId,
        card_id: (data as KanbanCard | null)?.id ?? null,
        user_id: userId,
        action: "card.created",
        metadata: { title: newCardTitle.trim() },
      });
    }
  }

  async function saveName() {
    if (!drivers || !colName.trim() || colName.trim() === column.name) {
      setColName(column.name);
      setEditingName(false);
      return;
    }
    await drivers.data
      .from("kanban_columns")
      .update({ name: colName.trim() })
      .eq("id", column.id);
    onEditColumn({ ...column, name: colName.trim() });
    setEditingName(false);
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    display: "flex",
    flexDirection: "column",
    width: 280,
    flexShrink: 0,
    background: "#13181e",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.07)",
    maxHeight: "100%",
    overflow: "hidden",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Column header */}
      <div
        style={{
          padding: "10px 12px 8px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          ...(column.color ? { borderTop: `3px solid ${column.color}` } : {}),
        }}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          style={{
            cursor: "grab",
            color: "var(--text-tertiary, #64748b)",
            flexShrink: 0,
            padding: "2px 0",
          }}
        >
          <GripVertical size={14} />
        </span>

        {editingName ? (
          <input
            autoFocus
            value={colName}
            onChange={(e) => setColName(e.currentTarget.value)}
            onBlur={() => void saveName()}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveName();
              if (e.key === "Escape") {
                setColName(column.name);
                setEditingName(false);
              }
            }}
            style={{
              flex: 1,
              background: "#191d21",
              border: "1px solid #6366f1",
              borderRadius: 5,
              color: "var(--text-primary, #e2e8f0)",
              fontSize: 13,
              fontWeight: 600,
              padding: "2px 6px",
              outline: "none",
            }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary, #e2e8f0)",
            }}
            onDoubleClick={() => setEditingName(true)}
          >
            {column.name}
          </span>
        )}

        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary, #64748b)",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 4,
            padding: "1px 6px",
          }}
        >
          {activeCards.length}
        </span>

        <div style={{ position: "relative" }}>
          <button
            aria-label="Opções da coluna"
            onClick={() => setShowMenu((p) => !p)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary, #64748b)",
              padding: 2,
              borderRadius: 4,
            }}
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                zIndex: 20,
                marginTop: 4,
                background: "#11161c",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: 4,
                minWidth: 140,
              }}
            >
              <MenuBtn
                icon={<Pencil size={12} />}
                label="Renomear"
                onClick={() => {
                  setEditingName(true);
                  setShowMenu(false);
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
                        onDeleteColumn(column.id);
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
                <MenuBtn
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
          items={activeCards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {activeCards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              labels={labels}
              labelIds={cardLabelMap.get(card.id) ?? []}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>

        {/* Completed section */}
        {completedCards.length > 0 && (
          <CompletedSection
            cards={completedCards}
            labels={labels}
            cardLabelMap={cardLabelMap}
            onCardClick={onCardClick}
          />
        )}

        {/* Add card inline */}
        {addingCard ? (
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
              ref={inputRef}
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addCard();
                if (e.key === "Escape") {
                  setAddingCard(false);
                  setNewCardTitle("");
                }
              }}
              placeholder="Título do cartão…"
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary, #e2e8f0)",
                fontSize: 13,
                marginBottom: 6,
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => void addCard()}
                style={{
                  background: "#6366f1",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 12,
                  padding: "4px 12px",
                  cursor: "pointer",
                }}
              >
                Adicionar
              </button>
              <button
                aria-label="Cancelar"
                onClick={() => {
                  setAddingCard(false);
                  setNewCardTitle("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary, #64748b)",
                  padding: 4,
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              padding: "6px 8px",
              background: "transparent",
              border: "1px dashed rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: "var(--text-tertiary, #64748b)",
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

// ─── Card DnD item ────────────────────────────────────────────────────────────

interface SortableCardProps {
  card: KanbanCard;
  labels: KanbanLabel[];
  labelIds: string[];
  onClick: () => void;
  isOverlay?: boolean;
}

function SortableCard({
  card,
  labels,
  labelIds,
  onClick,
  isOverlay,
}: SortableCardProps) {
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
    opacity: isDragging && !isOverlay ? 0 : 1,
    ...(isOverlay
      ? { boxShadow: "0 8px 24px rgba(0,0,0,0.4)", cursor: "grabbing" }
      : {}),
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardCompact
        card={card}
        labels={labels}
        labelIds={labelIds}
        onClick={onClick}
      />
    </div>
  );
}

function CardCompact({
  card,
  labels,
  labelIds,
  onClick,
}: Omit<SortableCardProps, "isOverlay">) {
  const overdue = isOverdue(card.due_date) && card.status !== "completed";
  const dueToday = isDueToday(card.due_date) && card.status !== "completed";
  const cardLabels = labels.filter((l) => labelIds.includes(l.id));

  return (
    <div
      onClick={onClick}
      style={{
        background: "#191d21",
        borderRadius: 8,
        padding: "8px 10px",
        border: "1px solid",
        borderColor: overdue ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)",
        cursor: "pointer",
        userSelect: "none",
        borderLeft: `3px solid ${PRIORITY_COLORS[card.priority]}`,
      }}
    >
      {/* Labels */}
      {cardLabels.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 5 }}
        >
          {cardLabels.map((l) => (
            <span
              key={l.id}
              style={{
                height: 6,
                width: 28,
                borderRadius: 3,
                background: l.color,
              }}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <p
        style={{
          fontSize: 13,
          color:
            card.status === "completed"
              ? "var(--text-tertiary, #64748b)"
              : "var(--text-primary, #e2e8f0)",
          lineHeight: 1.4,
          margin: "0 0 6px",
          textDecoration: card.status === "completed" ? "line-through" : "none",
        }}
      >
        {card.title}
      </p>

      {/* Footer row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {card.due_date && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontSize: 10,
              color: overdue
                ? "#ef4444"
                : dueToday
                  ? "#f59e0b"
                  : "var(--text-tertiary, #64748b)",
              background: overdue
                ? "rgba(239,68,68,0.1)"
                : dueToday
                  ? "rgba(245,158,11,0.1)"
                  : "transparent",
              padding: "1px 5px",
              borderRadius: 4,
            }}
          >
            {overdue ? <AlertCircle size={9} /> : <Calendar size={9} />}
            {formatDate(card.due_date)}
          </span>
        )}
      </div>
    </div>
  );
}

function CompletedSection({
  cards,
  labels,
  cardLabelMap,
  onCardClick,
}: {
  cards: KanbanCard[];
  labels: KanbanLabel[];
  cardLabelMap: Map<string, string[]>;
  onCardClick: (card: KanbanCard) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        paddingTop: 6,
        marginTop: 2,
      }}
    >
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          color: "var(--text-tertiary, #64748b)",
          cursor: "pointer",
          fontSize: 11,
          padding: "2px 0",
          marginBottom: 4,
        }}
      >
        <Check size={11} /> {cards.length} concluído
        {cards.length !== 1 ? "s" : ""} {open ? "▲" : "▼"}
      </button>
      {open &&
        cards.map((c) => (
          <div
            key={c.id}
            onClick={() => onCardClick(c)}
            style={{ marginBottom: 4, opacity: 0.6 }}
          >
            <CardCompact
              card={c}
              labels={labels}
              labelIds={cardLabelMap.get(c.id) ?? []}
              onClick={() => onCardClick(c)}
            />
          </div>
        ))}
    </div>
  );
}

// ─── Board View ───────────────────────────────────────────────────────────────

interface BoardViewProps {
  boardId: string;
  boardName: string;
  boardColor: string;
  onBack: () => void;
}

export function BoardView({
  boardId,
  boardName,
  boardColor,
  onBack,
}: BoardViewProps) {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();

  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [labels, setLabels] = useState<KanbanLabel[]>([]);
  const [cardLabelMap, setCardLabelMap] = useState<Map<string, string[]>>(
    new Map(),
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const dragOriginColRef = useRef<string | null>(null);
  const [selectedCardLabelIds, setSelectedCardLabelIds] = useState<string[]>(
    [],
  );

  const [searchQ, setSearchQ] = useState("");
  const [filterPriority, setFilterPriority] = useState<Priority | "">("");
  const [showFilter, setShowFilter] = useState(false);

  const [addingColumn, setAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState("");

  const [showLabelManager, setShowLabelManager] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6366f1");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Load board data
  useEffect(() => {
    if (!drivers) return;
    setLoading(true);
    void Promise.all([
      drivers.data
        .from("kanban_columns")
        .select("*")
        .eq("board_id", boardId)
        .order("position"),
      drivers.data
        .from("kanban_cards")
        .select("*")
        .eq("board_id", boardId)
        .neq("status", "archived")
        .order("position"),
      drivers.data.from("kanban_labels").select("*").eq("board_id", boardId),
      drivers.data
        .from("kanban_card_labels")
        .select("*")
        .in("card_id", ["placeholder"]), // populated below after cards load
    ]).then(([colRes, cardRes, labelRes]) => {
      const cols = (colRes.data ?? []) as KanbanColumn[];
      const cds = (cardRes.data ?? []) as KanbanCard[];
      const lbls = (labelRes.data ?? []) as KanbanLabel[];

      setColumns(cols);
      setCards(cds);
      setLabels(lbls);

      if (cds.length > 0) {
        void drivers.data
          .from("kanban_card_labels")
          .select("*")
          .in(
            "card_id",
            cds.map((c) => c.id),
          )
          .then(({ data }) => {
            const map = new Map<string, string[]>();
            for (const cl of (data ?? []) as {
              card_id: string;
              label_id: string;
            }[]) {
              const arr = map.get(cl.card_id) ?? [];
              arr.push(cl.label_id);
              map.set(cl.card_id, arr);
            }
            setCardLabelMap(map);
          });
      }

      if (colRes.error || cardRes.error) setError("Erro ao carregar quadro");
      setLoading(false);
    });
  }, [drivers, boardId]);

  // ── Columns ──────────────────────────────────────────────────────────────────

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns],
  );

  async function addColumn() {
    if (!drivers || !userId || !companyId || !newColName.trim()) return;
    const pos = (sortedColumns[sortedColumns.length - 1]?.position ?? 0) + 1000;
    const { data } = await drivers.data
      .from("kanban_columns")
      .insert({
        board_id: boardId,
        user_id: userId,
        company_id: companyId,
        name: newColName.trim(),
        position: pos,
      })
      .select("*")
      .single();
    if (data) setColumns((p) => [...p, data as KanbanColumn]);
    setNewColName("");
    setAddingColumn(false);
  }

  function handleEditColumn(col: KanbanColumn) {
    setColumns((p) => p.map((c) => (c.id === col.id ? col : c)));
  }

  async function handleDeleteColumn(colId: string) {
    if (!drivers) return;
    await drivers.data.from("kanban_columns").delete().eq("id", colId);
    setColumns((p) => p.filter((c) => c.id !== colId));
    setCards((p) => p.filter((c) => c.column_id !== colId));
  }

  // ── Cards ────────────────────────────────────────────────────────────────────

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, KanbanCard[]>();
    for (const col of sortedColumns) map.set(col.id, []);
    for (const card of cards) {
      const list = map.get(card.column_id);
      if (list) list.push(card);
    }
    return map;
  }, [sortedColumns, cards]);

  function handleCardAdded(card: KanbanCard) {
    setCards((p) => [...p, card]);
  }

  function handleCardUpdate(patch: Partial<KanbanCard>) {
    if (!selectedCard) return;
    const updated = { ...selectedCard, ...patch };
    setSelectedCard(updated);
    setCards((p) => p.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function handleCardDelete() {
    if (!selectedCard) return;
    setCards((p) => p.filter((c) => c.id !== selectedCard.id));
    setSelectedCard(null);
  }

  function handleCardClick(card: KanbanCard) {
    setSelectedCard(card);
    setSelectedCardLabelIds(cardLabelMap.get(card.id) ?? []);
  }

  // ── Labels ───────────────────────────────────────────────────────────────────

  async function addLabel() {
    if (!drivers || !userId || !companyId || !newLabelName.trim()) return;
    const { data } = await drivers.data
      .from("kanban_labels")
      .insert({
        board_id: boardId,
        user_id: userId,
        company_id: companyId,
        name: newLabelName.trim(),
        color: newLabelColor,
      })
      .select("*")
      .single();
    if (data) setLabels((p) => [...p, data as KanbanLabel]);
    setNewLabelName("");
  }

  async function deleteLabel(id: string) {
    if (!drivers) return;
    await drivers.data.from("kanban_labels").delete().eq("id", id);
    setLabels((p) => p.filter((l) => l.id !== id));
  }

  // ── DnD ─────────────────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    if (active.data.current?.["type"] === "card") {
      const card = cards.find((c) => c.id === active.id);
      if (card) {
        setActiveCard(card);
        dragOriginColRef.current = card.column_id;
      }
    }
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;
    if (active.data.current?.["type"] !== "card") return;

    const dragCard = cards.find((c) => c.id === active.id);
    if (!dragCard) return;

    const overType = over.data.current?.["type"];
    const targetColId =
      overType === "card"
        ? (over.data.current?.["columnId"] as string | undefined)
        : overType === "column"
          ? (over.id as string)
          : null;

    if (!targetColId || dragCard.column_id === targetColId) return;

    // Optimistic cross-column move
    setCards((prev) =>
      prev.map((c) =>
        c.id === dragCard.id ? { ...c, column_id: targetColId } : c,
      ),
    );
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null);
    if (!over) {
      // Revert optimistic cross-column move if dropped outside any droppable
      const origColId = dragOriginColRef.current;
      if (origColId) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === active.id ? { ...c, column_id: origColId } : c,
          ),
        );
      }
      dragOriginColRef.current = null;
      return;
    }
    dragOriginColRef.current = null;

    if (active.data.current?.["type"] === "column") {
      const oldIdx = sortedColumns.findIndex((c) => c.id === active.id);
      const newIdx = sortedColumns.findIndex((c) => c.id === over.id);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

      const reordered = arrayMove(sortedColumns, oldIdx, newIdx);
      setColumns(
        reordered.map((col, i) => ({ ...col, position: (i + 1) * 1000 })),
      );

      void Promise.all(
        reordered.map((col, i) =>
          drivers?.data
            .from("kanban_columns")
            .update({ position: (i + 1) * 1000 })
            .eq("id", col.id),
        ),
      );
      return;
    }

    if (active.data.current?.["type"] === "card") {
      const dragCard = cards.find((c) => c.id === active.id);
      if (!dragCard) return;

      const targetColId = dragCard.column_id;
      const colCards = cards
        .filter(
          (c) =>
            c.column_id === targetColId &&
            c.id !== dragCard.id &&
            c.status !== "archived",
        )
        .sort((a, b) => a.position - b.position);

      let newPos: number;

      if (over.data.current?.["type"] === "card" && over.id !== active.id) {
        const overCard = cards.find((c) => c.id === over.id);
        if (overCard) {
          const overIdx = colCards.findIndex((c) => c.id === over.id);
          const before = colCards[overIdx - 1]?.position ?? null;
          const after = overCard.position;
          newPos = calcMidPos(before, after);
        } else {
          newPos = (colCards[colCards.length - 1]?.position ?? 0) + 1000;
        }
      } else {
        newPos = (colCards[colCards.length - 1]?.position ?? 0) + 1000;
      }

      // Check if positions have converged and renormalization is needed
      const fullColSorted = [
        ...colCards,
        { ...dragCard, position: newPos },
      ].sort((a, b) => a.position - b.position);
      const needsRenorm = fullColSorted.some(
        (c, i) =>
          i > 0 && c.position - (fullColSorted[i - 1]?.position ?? 0) < 1,
      );

      if (needsRenorm) {
        const renormed = fullColSorted.map((c, i) => ({
          ...c,
          position: (i + 1) * 1000,
        }));
        const posMap = new Map(renormed.map((c) => [c.id, c.position]));
        setCards((prev) =>
          prev.map((c) => {
            const p = posMap.get(c.id);
            return p !== undefined
              ? { ...c, column_id: targetColId, position: p }
              : c;
          }),
        );
        void Promise.all(
          renormed.map((c) =>
            drivers?.data
              .from("kanban_cards")
              .update({ column_id: targetColId, position: c.position })
              .eq("id", c.id),
          ),
        );
      } else {
        setCards((prev) =>
          prev.map((c) =>
            c.id === dragCard.id ? { ...c, position: newPos } : c,
          ),
        );
        void drivers?.data
          .from("kanban_cards")
          .update({ column_id: targetColId, position: newPos })
          .eq("id", dragCard.id);
      }
    }
  }

  // ── Search / filter ──────────────────────────────────────────────────────────

  const filteredCards = useMemo(() => {
    if (!searchQ && !filterPriority) return null;
    return cards.filter((c) => {
      if (filterPriority && c.priority !== filterPriority) return false;
      if (searchQ) {
        const q = searchQ.toLowerCase();
        if (
          !c.title.toLowerCase().includes(q) &&
          !c.description.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [cards, searchQ, filterPriority]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="skeleton-pulse"
        style={{
          flex: 1,
          display: "flex",
          gap: 12,
          padding: 16,
          overflowX: "auto",
          alignItems: "flex-start",
        }}
      >
        {[4, 2, 5, 3].map((cardCount, ci) => (
          <div
            key={ci}
            style={{
              width: 272,
              flexShrink: 0,
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: 12,
            }}
          >
            <div
              style={{
                height: 14,
                width: "55%",
                borderRadius: 4,
                background: "rgba(255,255,255,0.10)",
                marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Array.from({ length: cardCount }).map((_, ri) => (
                <div
                  key={ri}
                  style={{
                    borderRadius: 8,
                    padding: 12,
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      height: 12,
                      width: `${50 + ((ri * 17) % 35)}%`,
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.10)",
                      marginBottom: ri % 2 === 0 ? 6 : 0,
                    }}
                  />
                  {ri % 2 === 0 && (
                    <div
                      style={{
                        height: 10,
                        width: "30%",
                        borderRadius: 4,
                        background: "rgba(255,255,255,0.06)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Board toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          background: "#11161c",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-tertiary, #64748b)",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ← Quadros
        </button>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: boardColor,
            marginLeft: 4,
          }}
        />
        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: "var(--text-primary, #e2e8f0)",
          }}
        >
          {boardName}
        </span>
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#191d21",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6,
            padding: "4px 8px",
          }}
        >
          <Search size={12} color="var(--text-tertiary, #64748b)" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.currentTarget.value)}
            placeholder="Pesquisar cartões…"
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary, #e2e8f0)",
              fontSize: 12,
              width: 140,
            }}
          />
          {searchQ && (
            <button
              aria-label="Limpar busca"
              onClick={() => setSearchQ("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary, #64748b)",
                padding: 0,
              }}
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Filter */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowFilter((p) => !p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: filterPriority
                ? "rgba(99,102,241,0.15)"
                : "transparent",
              border: "1px solid",
              borderColor: filterPriority
                ? "#6366f1"
                : "rgba(255,255,255,0.08)",
              borderRadius: 6,
              color: filterPriority
                ? "#a5b4fc"
                : "var(--text-tertiary, #64748b)",
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <Filter size={12} /> Filtrar
          </button>
          {showFilter && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                zIndex: 20,
                marginTop: 4,
                background: "#11161c",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: 8,
                minWidth: 150,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: "var(--text-tertiary, #64748b)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Prioridade
              </p>
              <button
                onClick={() => {
                  setFilterPriority("");
                  setShowFilter(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  padding: "4px 6px",
                  background: !filterPriority
                    ? "rgba(99,102,241,0.15)"
                    : "none",
                  border: "none",
                  borderRadius: 5,
                  color: "var(--text-primary, #e2e8f0)",
                  cursor: "pointer",
                  fontSize: 12,
                  marginBottom: 2,
                }}
              >
                Todas
              </button>
              {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setFilterPriority(p);
                    setShowFilter(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    width: "100%",
                    padding: "4px 6px",
                    background:
                      filterPriority === p ? "rgba(99,102,241,0.15)" : "none",
                    border: "none",
                    borderRadius: 5,
                    color: "var(--text-primary, #e2e8f0)",
                    cursor: "pointer",
                    fontSize: 12,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: PRIORITY_COLORS[p],
                      flexShrink: 0,
                    }}
                  />
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Labels manager */}
        <button
          onClick={() => setShowLabelManager((p) => !p)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6,
            color: "var(--text-tertiary, #64748b)",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          <Tag size={12} /> Etiquetas
        </button>
      </div>

      {/* Label manager panel */}
      {showLabelManager && (
        <div
          style={{
            background: "#11161c",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            padding: "10px 14px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {labels.map((l) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: l.color + "22",
                  border: `1px solid ${l.color}55`,
                  borderRadius: 16,
                  padding: "2px 10px",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: l.color,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary, #e2e8f0)",
                  }}
                >
                  {l.name}
                </span>
                <button
                  aria-label={`Remover etiqueta ${l.name}`}
                  onClick={() => void deleteLabel(l.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-tertiary, #64748b)",
                    padding: 0,
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="color"
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.currentTarget.value)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
              <input
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addLabel();
                }}
                placeholder="Nova etiqueta…"
                style={{
                  background: "#191d21",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  color: "var(--text-primary, #e2e8f0)",
                  fontSize: 12,
                  padding: "3px 8px",
                  outline: "none",
                  width: 130,
                }}
              />
              <button
                aria-label="Adicionar etiqueta"
                onClick={() => void addLabel()}
                style={{
                  background: "#6366f1",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 12,
                  padding: "3px 10px",
                  cursor: "pointer",
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search results overlay */}
      {filteredCards && (
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary, #64748b)",
              marginBottom: 10,
            }}
          >
            {filteredCards.length} resultado
            {filteredCards.length !== 1 ? "s" : ""}
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxWidth: 500,
            }}
          >
            {filteredCards.map((card) => (
              <CardCompact
                key={card.id}
                card={card}
                labels={labels}
                labelIds={cardLabelMap.get(card.id) ?? []}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Kanban board */}
      {!filteredCards && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                padding: "14px",
                height: "100%",
                boxSizing: "border-box",
                alignItems: "flex-start",
              }}
            >
              <SortableContext
                items={sortedColumns.map((c) => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                {sortedColumns.map((col) => (
                  <SortableColumn
                    key={col.id}
                    column={col}
                    cards={cardsByColumn.get(col.id) ?? []}
                    labels={labels}
                    cardLabelMap={cardLabelMap}
                    userId={userId}
                    companyId={companyId}
                    onEditColumn={handleEditColumn}
                    onDeleteColumn={handleDeleteColumn}
                    onCardClick={handleCardClick}
                    onCardAdded={handleCardAdded}
                    drivers={drivers}
                    boardId={boardId}
                  />
                ))}
              </SortableContext>

              {/* Add column */}
              {addingColumn ? (
                <div
                  style={{
                    width: 280,
                    flexShrink: 0,
                    background: "#13181e",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: 10,
                  }}
                >
                  <input
                    autoFocus
                    value={newColName}
                    onChange={(e) => setNewColName(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void addColumn();
                      if (e.key === "Escape") {
                        setAddingColumn(false);
                        setNewColName("");
                      }
                    }}
                    placeholder="Nome da coluna…"
                    style={{
                      width: "100%",
                      background: "#191d21",
                      border: "1px solid #6366f1",
                      borderRadius: 6,
                      color: "var(--text-primary, #e2e8f0)",
                      fontSize: 13,
                      padding: "5px 8px",
                      outline: "none",
                      boxSizing: "border-box",
                      marginBottom: 8,
                    }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => void addColumn()}
                      style={{
                        background: "#6366f1",
                        border: "none",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 12,
                        padding: "4px 12px",
                        cursor: "pointer",
                      }}
                    >
                      Criar
                    </button>
                    <button
                      aria-label="Cancelar"
                      onClick={() => {
                        setAddingColumn(false);
                        setNewColName("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-tertiary, #64748b)",
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  style={{
                    width: 280,
                    flexShrink: 0,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px dashed rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: 12,
                    cursor: "pointer",
                    color: "var(--text-tertiary, #64748b)",
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

          {/* Drag overlay */}
          <DragOverlay>
            {activeCard && (
              <CardCompact
                card={activeCard}
                labels={labels}
                labelIds={cardLabelMap.get(activeCard.id) ?? []}
                onClick={() => {}}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Card modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          labels={labels}
          cardLabelIds={selectedCardLabelIds}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleCardUpdate}
          onDelete={handleCardDelete}
        />
      )}
    </div>
  );
}

// ─── Small helper ─────────────────────────────────────────────────────────────

function MenuBtn({
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
