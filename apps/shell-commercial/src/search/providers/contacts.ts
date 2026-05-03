import type { SearchProvider, SearchResult } from "../types";

interface ContactRow {
  id: string;
  full_name: string;
  nickname: string | null;
  company_name: string | null;
}

export const contactsProvider: SearchProvider = {
  id: "contacts",
  label: "Contatos",
  icon: "BookUser",
  maxResults: 5,

  async search(query, ctx) {
    if (!ctx.drivers || !ctx.userId || !query.trim()) return [];
    try {
      const { data, error } = await (ctx.drivers.data
        .from("contacts")
        .select("id,full_name,nickname,company_name") as unknown as Promise<{
        data: ContactRow[] | null;
        error: unknown;
      }>);
      if (error || !data) return [];

      const q = query.toLowerCase();
      return data
        .filter(
          (c) =>
            c.full_name.toLowerCase().includes(q) ||
            (c.nickname ?? "").toLowerCase().includes(q) ||
            (c.company_name ?? "").toLowerCase().includes(q),
        )
        .slice(0, 5)
        .map<SearchResult>((c) => {
          const subtitle = c.company_name ?? c.nickname ?? undefined;
          return {
            id: `contact-${c.id}`,
            type: "contact",
            title: c.full_name,
            ...(subtitle !== undefined ? { subtitle } : {}),
            icon: "User",
            iconColor: "#10b981",
            action: () => {
              ctx.openApp("agenda-telefonica", "Agenda Telefônica");
              ctx.closeSearch();
            },
          };
        });
    } catch {
      return [];
    }
  },
};
