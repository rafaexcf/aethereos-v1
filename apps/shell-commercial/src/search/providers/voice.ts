import type { SearchProvider, SearchResult } from "../types";

interface VoiceRow {
  id: string;
  title: string;
  description: string;
  transcript: string | null;
}

export const voiceProvider: SearchProvider = {
  id: "voice",
  label: "Gravações de voz",
  icon: "Mic",
  maxResults: 5,

  async search(query, ctx) {
    if (!ctx.drivers || !ctx.userId || !query.trim()) return [];
    try {
      const { data, error } = await (ctx.drivers.data
        .from("voice_recordings")
        .select("id,title,description,transcript") as unknown as Promise<{
        data: VoiceRow[] | null;
        error: unknown;
      }>);
      if (error || !data) return [];

      const q = query.toLowerCase();
      return data
        .filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            (r.transcript ?? "").toLowerCase().includes(q),
        )
        .slice(0, 5)
        .map<SearchResult>((r) => {
          const subtitle =
            r.description.length > 0
              ? r.description.slice(0, 60)
              : r.transcript !== null && r.transcript.length > 0
                ? r.transcript.slice(0, 60)
                : undefined;
          return {
            id: `voice-${r.id}`,
            type: "file",
            title: r.title,
            ...(subtitle !== undefined ? { subtitle } : {}),
            icon: "Mic",
            iconColor: "#ef4444",
            action: () => {
              ctx.openApp("gravador-de-voz", "Gravador de Voz");
              ctx.closeSearch();
            },
          };
        });
    } catch {
      return [];
    }
  },
};
