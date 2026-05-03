import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Flag,
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  User,
  Tag,
  Activity,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useModalA11y } from "../../components/shared/useModalA11y";
import { moveToTrash } from "../../lib/trash";
import type {
  KanbanCard,
  KanbanLabel,
  KanbanChecklistItem,
  KanbanComment,
  KanbanActivity,
  Priority,
} from "./types";
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  isOverdue,
  isDueToday,
} from "./types";

// ─── Utility ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  card: KanbanCard;
  labels: KanbanLabel[];
  cardLabelIds: string[];
  onClose: () => void;
  onUpdate: (patch: Partial<KanbanCard>) => void;
  onDelete: () => void;
}

export function CardModal({
  card,
  labels,
  cardLabelIds,
  onClose,
  onUpdate,
  onDelete,
}: Props) {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [labelIds, setLabelIds] = useState<string[]>(cardLabelIds);

  const [checklistItems, setChecklistItems] = useState<KanbanChecklistItem[]>(
    [],
  );
  const [newCheckItem, setNewCheckItem] = useState("");
  const [addingCheckItem, setAddingCheckItem] = useState(false);

  const [comments, setComments] = useState<KanbanComment[]>([]);
  const [newComment, setNewComment] = useState("");

  const [activity, setActivity] = useState<KanbanActivity[]>([]);
  const [tab, setTab] = useState<"details" | "activity">("details");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useModalA11y<HTMLDivElement>({ open: true, onClose });

  // Load checklist, comments, activity
  useEffect(() => {
    if (!drivers) return;
    void Promise.all([
      drivers.data
        .from("kanban_checklist_items")
        .select("*")
        .eq("card_id", card.id)
        .order("position"),
      drivers.data
        .from("kanban_comments")
        .select("*")
        .eq("card_id", card.id)
        .order("created_at", { ascending: false }),
      drivers.data
        .from("kanban_activity")
        .select("*")
        .eq("card_id", card.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]).then(([cl, co, ac]) => {
      if (cl.data) setChecklistItems(cl.data as KanbanChecklistItem[]);
      if (co.data) setComments(co.data as KanbanComment[]);
      if (ac.data) setActivity(ac.data as KanbanActivity[]);
    });
  }, [drivers, card.id]);

  // ── Field saves ─────────────────────────────────────────────────────────────

  async function saveTitle() {
    if (!drivers || title.trim() === card.title) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(card.title);
      return;
    }
    await drivers.data
      .from("kanban_cards")
      .update({ title: trimmed })
      .eq("id", card.id);
    onUpdate({ title: trimmed });
    void logActivity("card.title_changed", { from: card.title, to: trimmed });
  }

  async function saveDesc() {
    if (!drivers || description === card.description) return;
    await drivers.data
      .from("kanban_cards")
      .update({ description })
      .eq("id", card.id);
    onUpdate({ description });
  }

  async function savePriority(p: Priority) {
    if (!drivers) return;
    setShowPriority(false);
    await drivers.data
      .from("kanban_cards")
      .update({ priority: p })
      .eq("id", card.id);
    onUpdate({ priority: p });
    void logActivity("card.priority_changed", { from: card.priority, to: p });
  }

  async function saveDueDate(d: string) {
    if (!drivers) return;
    const val = d || null;
    await drivers.data
      .from("kanban_cards")
      .update(val !== null ? { due_date: val } : { due_date: null })
      .eq("id", card.id);
    onUpdate({ due_date: val });
  }

  async function toggleComplete() {
    if (!drivers) return;
    const next = card.status === "completed" ? "active" : "completed";
    const completedAt = next === "completed" ? new Date().toISOString() : null;
    await drivers.data
      .from("kanban_cards")
      .update(
        completedAt !== null
          ? { status: next, completed_at: completedAt }
          : { status: next, completed_at: null },
      )
      .eq("id", card.id);
    onUpdate(
      completedAt !== null
        ? { status: next, completed_at: completedAt }
        : { status: next, completed_at: null },
    );
    void logActivity(
      next === "completed" ? "card.completed" : "card.reopened",
      {},
    );
  }

  // ── Labels ──────────────────────────────────────────────────────────────────

  async function toggleLabel(labelId: string) {
    if (!drivers || !userId) return;
    if (labelIds.includes(labelId)) {
      await drivers.data
        .from("kanban_card_labels")
        .delete()
        .eq("card_id", card.id)
        .eq("label_id", labelId);
      setLabelIds((p) => p.filter((id) => id !== labelId));
    } else {
      await drivers.data
        .from("kanban_card_labels")
        .insert({ card_id: card.id, label_id: labelId });
      setLabelIds((p) => [...p, labelId]);
    }
  }

  // ── Checklist ────────────────────────────────────────────────────────────────

  async function addCheckItem() {
    if (!drivers || !userId || !newCheckItem.trim()) return;
    const pos =
      (checklistItems[checklistItems.length - 1]?.position ?? 0) + 1000;
    const { data } = await drivers.data
      .from("kanban_checklist_items")
      .insert({
        card_id: card.id,
        user_id: userId,
        text: newCheckItem.trim(),
        position: pos,
      })
      .select("*")
      .single();
    if (data) setChecklistItems((p) => [...p, data as KanbanChecklistItem]);
    setNewCheckItem("");
    setAddingCheckItem(false);
  }

  async function toggleCheckItem(item: KanbanChecklistItem) {
    if (!drivers) return;
    const next = !item.is_completed;
    await drivers.data
      .from("kanban_checklist_items")
      .update({ is_completed: next })
      .eq("id", item.id);
    setChecklistItems((p) =>
      p.map((i) => (i.id === item.id ? { ...i, is_completed: next } : i)),
    );
  }

  async function deleteCheckItem(id: string) {
    if (!drivers) return;
    await drivers.data.from("kanban_checklist_items").delete().eq("id", id);
    setChecklistItems((p) => p.filter((i) => i.id !== id));
  }

  // ── Comments ─────────────────────────────────────────────────────────────────

  async function addComment() {
    if (!drivers || !userId || !newComment.trim()) return;
    setSaving(true);
    const { data } = await drivers.data
      .from("kanban_comments")
      .insert({ card_id: card.id, user_id: userId, content: newComment.trim() })
      .select("*")
      .single();
    if (data) setComments((p) => [data as KanbanComment, ...p]);
    setNewComment("");
    setSaving(false);
    void logActivity("card.commented", { preview: newComment.slice(0, 80) });
  }

  async function deleteComment(id: string) {
    if (!drivers) return;
    await drivers.data.from("kanban_comments").delete().eq("id", id);
    setComments((p) => p.filter((c) => c.id !== id));
  }

  // ── Activity ─────────────────────────────────────────────────────────────────

  async function logActivity(
    action: string,
    metadata: Record<string, unknown>,
  ) {
    if (!drivers || !userId) return;
    await drivers.data
      .from("kanban_activity")
      .insert({
        board_id: card.board_id,
        card_id: card.id,
        user_id: userId,
        action,
        metadata,
      });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function deleteCard() {
    if (!drivers || !userId || !activeCompanyId) return;
    await moveToTrash({
      drivers,
      userId,
      companyId: activeCompanyId,
      appId: "kanban",
      itemType: "card",
      itemName: card.title.trim() !== "" ? card.title : "(Sem título)",
      itemData: card as unknown as Record<string, unknown>,
      originalId: card.id,
    });
    await drivers.data.from("kanban_cards").delete().eq("id", card.id);
    onDelete();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const selectedLabels = labels.filter((l) => labelIds.includes(l.id));
  const doneItems = checklistItems.filter((i) => i.is_completed).length;
  const overdueFlag = isOverdue(card.due_date) && card.status !== "completed";
  const dueTodayFlag = isDueToday(card.due_date) && card.status !== "completed";

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
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
        aria-label="Detalhes do cartão"
        style={{
          width: 540,
          maxWidth: "100vw",
          height: "calc(100vh - 32px)",
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
        <div style={{ padding: "12px 14px 0", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 4,
                borderRadius: 2,
                alignSelf: "stretch",
                flexShrink: 0,
                background: PRIORITY_COLORS[card.priority],
              }}
            />
            {editingTitle ? (
              <input
                ref={titleRef}
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                onBlur={() => {
                  setEditingTitle(false);
                  void saveTitle();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingTitle(false);
                    void saveTitle();
                  }
                  if (e.key === "Escape") {
                    setTitle(card.title);
                    setEditingTitle(false);
                  }
                }}
                style={{
                  flex: 1,
                  background: "#11161c",
                  border: "1px solid #6366f1",
                  borderRadius: 6,
                  color: "var(--text-primary, #e2e8f0)",
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "4px 8px",
                  outline: "none",
                }}
              />
            ) : (
              <p
                onClick={() => setEditingTitle(true)}
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: 600,
                  lineHeight: 1.4,
                  color:
                    card.status === "completed"
                      ? "var(--text-tertiary, #64748b)"
                      : "var(--text-primary, #e2e8f0)",
                  cursor: "text",
                  textDecoration:
                    card.status === "completed" ? "line-through" : "none",
                }}
              >
                {card.title}
              </p>
            )}
            <button
              onClick={onClose}
              aria-label="Fechar"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary, #64748b)",
                padding: 2,
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Selected labels */}
          {selectedLabels.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                marginBottom: 8,
                paddingLeft: 12,
              }}
            >
              {selectedLabels.map((l) => (
                <span
                  key={l.id}
                  style={{
                    padding: "1px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 500,
                    background: l.color + "30",
                    color: l.color,
                    border: `1px solid ${l.color}50`,
                  }}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}

          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {(["details", "activity"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "6px 12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  color:
                    tab === t ? "#a5b4fc" : "var(--text-tertiary, #64748b)",
                  borderBottom:
                    tab === t ? "2px solid #6366f1" : "2px solid transparent",
                  fontWeight: tab === t ? 600 : 400,
                }}
              >
                {t === "details" ? "Detalhes" : "Atividade"}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          {tab === "details" && (
            <>
              {/* Quick actions row */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {/* Complete */}
                <QuickBtn
                  icon={
                    card.status === "completed" ? (
                      <Check size={12} />
                    ) : (
                      <CheckSquare size={12} />
                    )
                  }
                  label={card.status === "completed" ? "Reabrir" : "Concluir"}
                  active={card.status === "completed"}
                  onClick={toggleComplete}
                />

                {/* Priority */}
                <div style={{ position: "relative" }}>
                  <QuickBtn
                    icon={
                      <Flag size={12} color={PRIORITY_COLORS[card.priority]} />
                    }
                    label={PRIORITY_LABELS[card.priority]}
                    onClick={() => setShowPriority((p) => !p)}
                  />
                  {showPriority && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        zIndex: 10,
                        marginTop: 4,
                        background: "#11161c",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        padding: 4,
                        minWidth: 130,
                      }}
                    >
                      {(["low", "medium", "high", "urgent"] as Priority[]).map(
                        (p) => (
                          <button
                            key={p}
                            onClick={() => void savePriority(p)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              width: "100%",
                              padding: "5px 8px",
                              background:
                                card.priority === p
                                  ? "rgba(99,102,241,0.2)"
                                  : "none",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              color: "var(--text-primary, #e2e8f0)",
                              fontSize: 12,
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
                        ),
                      )}
                    </div>
                  )}
                </div>

                {/* Labels */}
                <div style={{ position: "relative" }}>
                  <QuickBtn
                    icon={<Tag size={12} />}
                    label="Etiquetas"
                    active={labelIds.length > 0}
                    onClick={() => setShowLabelPicker((p) => !p)}
                  />
                  {showLabelPicker && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        zIndex: 10,
                        marginTop: 4,
                        background: "#11161c",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        padding: 8,
                        minWidth: 200,
                      }}
                    >
                      {labels.length === 0 && (
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary, #64748b)",
                            padding: "2px 4px",
                          }}
                        >
                          Crie etiquetas no quadro primeiro.
                        </p>
                      )}
                      {labels.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => void toggleLabel(l.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "5px 8px",
                            background: "none",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            marginBottom: 2,
                          }}
                        >
                          <span
                            style={{
                              width: 32,
                              height: 12,
                              borderRadius: 6,
                              background: l.color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              fontSize: 12,
                              color: "var(--text-primary, #e2e8f0)",
                              textAlign: "left",
                            }}
                          >
                            {l.name}
                          </span>
                          {labelIds.includes(l.id) && (
                            <Check size={12} color="#6366f1" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Due date */}
              <FieldRow icon={<Calendar size={13} />} label="Vencimento">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="date"
                    value={card.due_date ?? ""}
                    onChange={(e) => void saveDueDate(e.currentTarget.value)}
                    style={{
                      background: "#11161c",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      color: overdueFlag
                        ? "#ef4444"
                        : dueTodayFlag
                          ? "#f59e0b"
                          : "var(--text-primary, #e2e8f0)",
                      padding: "3px 8px",
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                  {(overdueFlag || dueTodayFlag) && (
                    <span
                      style={{
                        fontSize: 11,
                        color: overdueFlag ? "#ef4444" : "#f59e0b",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <AlertCircle size={11} />
                      {overdueFlag ? "Atrasado" : "Vence hoje"}
                    </span>
                  )}
                </div>
              </FieldRow>

              {/* Description */}
              <div style={{ marginBottom: 14 }}>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary, #64748b)",
                    marginBottom: 4,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Descrição
                </p>
                {editingDesc ? (
                  <textarea
                    ref={descRef}
                    autoFocus
                    value={description}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                    onBlur={() => {
                      setEditingDesc(false);
                      void saveDesc();
                    }}
                    rows={4}
                    style={{
                      width: "100%",
                      background: "#11161c",
                      border: "1px solid #6366f1",
                      borderRadius: 8,
                      color: "var(--text-primary, #e2e8f0)",
                      fontSize: 13,
                      padding: "8px",
                      outline: "none",
                      resize: "vertical",
                      lineHeight: 1.5,
                      boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <p
                    onClick={() => setEditingDesc(true)}
                    style={{
                      fontSize: 13,
                      color: description
                        ? "var(--text-secondary, #94a3b8)"
                        : "var(--text-tertiary, #64748b)",
                      lineHeight: 1.6,
                      cursor: "text",
                      padding: "6px 8px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: 6,
                      minHeight: 40,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {description || "Clique para adicionar descrição…"}
                  </p>
                )}
              </div>

              {/* Checklist */}
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary, #64748b)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      margin: 0,
                    }}
                  >
                    <CheckSquare size={12} /> Checklist
                    {checklistItems.length > 0 && (
                      <span
                        style={{
                          color: "var(--text-tertiary, #64748b)",
                          fontWeight: 400,
                          textTransform: "none",
                          letterSpacing: 0,
                        }}
                      >
                        {doneItems}/{checklistItems.length}
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => setAddingCheckItem(true)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-tertiary, #64748b)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    <Plus size={11} /> Adicionar
                  </button>
                </div>

                {checklistItems.length > 0 && (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: 6,
                      overflow: "hidden",
                      marginBottom: 6,
                    }}
                  >
                    {/* Progress bar */}
                    <div
                      style={{
                        height: 3,
                        background: "rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background:
                            doneItems === checklistItems.length
                              ? "#10b981"
                              : "#6366f1",
                          width: `${checklistItems.length > 0 ? (doneItems / checklistItems.length) * 100 : 0}%`,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                )}

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  {checklistItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "3px 4px",
                        borderRadius: 4,
                      }}
                    >
                      <button
                        onClick={() => void toggleCheckItem(item)}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          border: "1.5px solid",
                          borderColor: item.is_completed
                            ? "#6366f1"
                            : "rgba(255,255,255,0.2)",
                          background: item.is_completed
                            ? "#6366f1"
                            : "transparent",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {item.is_completed && <Check size={10} color="#fff" />}
                      </button>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 12,
                          color: item.is_completed
                            ? "var(--text-tertiary, #64748b)"
                            : "var(--text-primary, #e2e8f0)",
                          textDecoration: item.is_completed
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {item.text}
                      </span>
                      <button
                        onClick={() => void deleteCheckItem(item.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-tertiary, #64748b)",
                          padding: 2,
                          opacity: 0.6,
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>

                {addingCheckItem && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <input
                      autoFocus
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void addCheckItem();
                        if (e.key === "Escape") {
                          setAddingCheckItem(false);
                          setNewCheckItem("");
                        }
                      }}
                      placeholder="Novo item…"
                      style={{
                        flex: 1,
                        background: "#11161c",
                        border: "1px solid #6366f1",
                        borderRadius: 6,
                        color: "var(--text-primary, #e2e8f0)",
                        fontSize: 12,
                        padding: "4px 8px",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={() => void addCheckItem()}
                      style={{
                        background: "#6366f1",
                        border: "none",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 12,
                        padding: "4px 10px",
                        cursor: "pointer",
                      }}
                    >
                      OK
                    </button>
                    <button
                      onClick={() => {
                        setAddingCheckItem(false);
                        setNewCheckItem("");
                      }}
                      style={{
                        background: "none",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "var(--text-tertiary, #64748b)",
                        fontSize: 12,
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div style={{ marginBottom: 14 }}>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary, #64748b)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <MessageSquare size={12} /> Comentários ({comments.length})
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.currentTarget.value)}
                    placeholder="Escreva um comentário…"
                    rows={2}
                    style={{
                      flex: 1,
                      background: "#11161c",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "var(--text-primary, #e2e8f0)",
                      fontSize: 12,
                      padding: "6px 8px",
                      outline: "none",
                      resize: "none",
                      lineHeight: 1.5,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#6366f1";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.1)";
                    }}
                  />
                  <button
                    onClick={() => void addComment()}
                    disabled={!newComment.trim() || saving}
                    style={{
                      background: "#6366f1",
                      border: "none",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 12,
                      padding: "0 12px",
                      cursor: "pointer",
                      alignSelf: "flex-end",
                      height: 32,
                      opacity: !newComment.trim() || saving ? 0.5 : 1,
                    }}
                  >
                    Enviar
                  </button>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        borderRadius: 8,
                        padding: "8px 10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
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
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "#6366f1",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <User size={11} color="#fff" />
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-tertiary, #64748b)",
                            }}
                          >
                            {timeAgo(c.created_at)}
                          </span>
                        </div>
                        {c.user_id === userId && (
                          <button
                            onClick={() => void deleteComment(c.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-tertiary, #64748b)",
                              padding: 2,
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary, #94a3b8)",
                          lineHeight: 1.5,
                          margin: 0,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {c.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments placeholder */}
              <div style={{ marginBottom: 14 }}>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary, #64748b)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <Paperclip size={12} /> Anexos
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary, #64748b)",
                    fontStyle: "italic",
                    padding: "6px 8px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 6,
                  }}
                >
                  Integração com Drive disponível em breve.
                </p>
              </div>

              {/* Delete */}
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: 12,
                  marginTop: 8,
                }}
              >
                {confirmDelete ? (
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary, #94a3b8)",
                        flex: 1,
                      }}
                    >
                      Confirmar exclusão?
                    </span>
                    <button
                      onClick={() => void deleteCard()}
                      style={{
                        background: "#ef4444",
                        border: "none",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 12,
                        padding: "4px 12px",
                        cursor: "pointer",
                      }}
                    >
                      Excluir
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      style={{
                        background: "none",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "var(--text-tertiary, #64748b)",
                        fontSize: 12,
                        padding: "4px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                      fontSize: 12,
                      padding: "4px 0",
                    }}
                  >
                    <Trash2 size={13} /> Excluir cartão
                  </button>
                )}
              </div>
            </>
          )}

          {tab === "activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activity.length === 0 ? (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary, #64748b)",
                    textAlign: "center",
                    padding: 20,
                  }}
                >
                  Sem atividade registrada
                </p>
              ) : (
                activity.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "6px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <Activity
                      size={13}
                      style={{ color: "#6366f1", flexShrink: 0, marginTop: 1 }}
                    />
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary, #94a3b8)",
                          margin: 0,
                        }}
                      >
                        {a.action.replace("card.", "").replace(/_/g, " ")}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--text-tertiary, #64748b)",
                          margin: 0,
                        }}
                      >
                        {timeAgo(a.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function QuickBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 6,
        border: "1px solid",
        borderColor: active ? "#6366f1" : "rgba(255,255,255,0.1)",
        background: active ? "rgba(99,102,241,0.15)" : "transparent",
        color: active ? "#a5b4fc" : "var(--text-secondary, #94a3b8)",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {icon} {label}
    </button>
  );
}

function FieldRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: 110,
          color: "var(--text-tertiary, #64748b)",
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {icon} {label}
      </div>
      {children}
    </div>
  );
}
