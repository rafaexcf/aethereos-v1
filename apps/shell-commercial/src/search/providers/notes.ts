import type { SearchProvider, SearchResult } from "../types";

interface NoteRow {
  id: string;
  title: string;
  content: string;
  color: string;
  is_checklist: boolean;
  trashed: boolean;
}

export const notesProvider: SearchProvider = {
  id: "notes",
  label: "Notas",
  icon: "StickyNote",
  maxResults: 5,

  async search(query, ctx) {
    if (!ctx.drivers || !ctx.userId || !query.trim()) return [];
    try {
      const { data, error } = await (ctx.drivers.data
        .from("notes")
        .select(
          "id,title,content,color,is_checklist,trashed",
        ) as unknown as Promise<{ data: NoteRow[] | null; error: unknown }>);
      if (error || !data) return [];

      const q = query.toLowerCase();
      return data
        .filter(
          (n) =>
            !n.trashed &&
            (n.title.toLowerCase().includes(q) ||
              n.content.toLowerCase().includes(q)),
        )
        .slice(0, 5)
        .map<SearchResult>((n) => {
          const subtitle = n.is_checklist
            ? "Checklist"
            : n.content.slice(0, 60) || undefined;
          return {
            id: `note-${n.id}`,
            type: "note",
            title: n.title || "Nota sem título",
            ...(subtitle !== undefined ? { subtitle } : {}),
            icon: "StickyNote",
            iconColor: "#f59e0b",
            action: () => {
              ctx.openApp("bloco-de-notas", "Bloco de Notas");
              ctx.closeSearch();
            },
          };
        });
    } catch {
      return [];
    }
  },
};
