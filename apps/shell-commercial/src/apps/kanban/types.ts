export type Priority = "low" | "medium" | "high" | "urgent";
export type CardStatus = "active" | "completed" | "archived";

export interface KanbanBoard {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  description: string;
  color: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: string;
  board_id: string;
  user_id: string;
  company_id: string;
  name: string;
  position: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanCard {
  id: string;
  board_id: string;
  column_id: string;
  user_id: string;
  company_id: string;
  assignee_id: string | null;
  title: string;
  description: string;
  priority: Priority;
  due_date: string | null;
  status: CardStatus;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanLabel {
  id: string;
  board_id: string;
  name: string;
  color: string;
}

export interface KanbanCardLabel {
  id: string;
  card_id: string;
  label_id: string;
}

export interface KanbanChecklistItem {
  id: string;
  card_id: string;
  text: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface KanbanComment {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface KanbanActivity {
  id: string;
  board_id: string;
  card_id: string | null;
  user_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface KanbanAttachment {
  id: string;
  card_id: string;
  file_name: string;
  file_url: string | null;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#64748b",
  medium: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
};

export const BOARD_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#64748b",
  "#0ea5e9",
];

/** Floating-point midpoint position for DnD reordering. */
export function calcMidPos(
  before: number | null,
  after: number | null,
): number {
  if (before === null && after === null) return 1000;
  if (before === null) return (after ?? 1000) / 2;
  if (after === null) return before + 1000;
  return (before + after) / 2;
}

export function isOverdue(due_date: string | null): boolean {
  if (!due_date) return false;
  return new Date(due_date) < new Date(new Date().toDateString());
}

export function isDueToday(due_date: string | null): boolean {
  if (!due_date) return false;
  return due_date === new Date().toISOString().slice(0, 10);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
