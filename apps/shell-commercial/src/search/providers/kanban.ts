import type { SearchProvider, SearchResult } from "../types";

interface KanbanCardRow {
  id: string;
  title: string;
  priority: string;
  status: string;
  board_id: string;
}

interface KanbanBoardRow {
  id: string;
  name: string;
  color: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#64748b",
};

export const kanbanProvider: SearchProvider = {
  id: "kanban",
  label: "Kanban",
  icon: "Kanban",
  maxResults: 5,

  async search(query, ctx) {
    if (!ctx.drivers || !ctx.userId || !query.trim()) return [];
    try {
      const [cardsRes, boardsRes] = await Promise.all([
        ctx.drivers.data
          .from("kanban_cards")
          .select("id,title,priority,status,board_id") as unknown as Promise<{
          data: KanbanCardRow[] | null;
          error: unknown;
        }>,
        ctx.drivers.data
          .from("kanban_boards")
          .select("id,name,color") as unknown as Promise<{
          data: KanbanBoardRow[] | null;
          error: unknown;
        }>,
      ]);

      if (!cardsRes.data) return [];

      const boardMap = new Map((boardsRes.data ?? []).map((b) => [b.id, b]));

      const q = query.toLowerCase();
      return cardsRes.data
        .filter(
          (c) => c.status !== "archived" && c.title.toLowerCase().includes(q),
        )
        .slice(0, 5)
        .map<SearchResult>((c) => {
          const board = boardMap.get(c.board_id);
          const subtitle = board?.name;
          const badgeColor = PRIORITY_COLORS[c.priority];
          return {
            id: `kanban-${c.id}`,
            type: "kanban",
            title: c.title,
            ...(subtitle !== undefined ? { subtitle } : {}),
            icon: "Kanban",
            iconColor: board?.color ?? "#6366f1",
            ...(badgeColor !== undefined ? { badgeColor } : {}),
            action: () => {
              ctx.openApp("kanban", "Kanban");
              ctx.closeSearch();
            },
          };
        });
    } catch {
      return [];
    }
  },
};
