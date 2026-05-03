import type { SearchProvider, SearchResult } from "../types";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#64748b",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export const tasksProvider: SearchProvider = {
  id: "tasks",
  label: "Tarefas",
  icon: "ListChecks",
  maxResults: 5,

  async search(query, ctx) {
    if (!ctx.drivers || !ctx.userId || !query.trim()) return [];
    try {
      const { data, error } = await (ctx.drivers.data
        .from("tasks")
        .select("id,title,status,priority,due_date") as unknown as Promise<{
        data: TaskRow[] | null;
        error: unknown;
      }>);
      if (error || !data) return [];

      const q = query.toLowerCase();
      return data
        .filter(
          (t) => t.status !== "completed" && t.title.toLowerCase().includes(q),
        )
        .slice(0, 5)
        .map<SearchResult>((t) => {
          const subtitle = t.due_date
            ? `Vence ${new Date(t.due_date).toLocaleDateString("pt-BR")}`
            : undefined;
          const badge = PRIORITY_LABELS[t.priority];
          const badgeColor = PRIORITY_COLORS[t.priority];
          return {
            id: `task-${t.id}`,
            type: "task",
            title: t.title,
            ...(subtitle !== undefined ? { subtitle } : {}),
            icon: "Circle",
            iconColor: PRIORITY_COLORS[t.priority] ?? "#64748b",
            ...(badge !== undefined ? { badge } : {}),
            ...(badgeColor !== undefined ? { badgeColor } : {}),
            action: () => {
              ctx.openApp("tarefas", "Tarefas");
              ctx.closeSearch();
            },
          };
        });
    } catch {
      return [];
    }
  },
};
