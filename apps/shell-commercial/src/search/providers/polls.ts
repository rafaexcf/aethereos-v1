import type { SearchProvider, SearchResult } from "../types";

interface PollRow {
  id: string;
  title: string;
  status: string;
  visibility: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativa",
  closed: "Encerrada",
};

export const pollsProvider: SearchProvider = {
  id: "polls",
  label: "Enquetes",
  icon: "Vote",
  maxResults: 5,

  async search(query, ctx) {
    if (!ctx.drivers || !ctx.userId || !query.trim()) return [];
    try {
      const { data, error } = await (ctx.drivers.data
        .from("polls")
        .select("id,title,status,visibility") as unknown as Promise<{
        data: PollRow[] | null;
        error: unknown;
      }>);
      if (error || !data) return [];

      const q = query.toLowerCase();
      return data
        .filter((p) => p.title.toLowerCase().includes(q))
        .slice(0, 5)
        .map<SearchResult>((p) => {
          const badge = p.visibility === "public" ? "Pública" : undefined;
          return {
            id: `poll-${p.id}`,
            type: "poll",
            title: p.title,
            subtitle: STATUS_LABELS[p.status] ?? p.status,
            icon: "Vote",
            iconColor: "#6366f1",
            ...(badge !== undefined ? { badge } : {}),
            action: () => {
              ctx.openApp("enquetes", "Enquetes");
              ctx.closeSearch();
            },
          };
        });
    } catch {
      return [];
    }
  },
};
