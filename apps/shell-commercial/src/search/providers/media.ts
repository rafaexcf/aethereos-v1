import type { SearchProvider, SearchResult } from "../types";

interface MediaRow {
  id: string;
  type: "photo" | "video";
  file_name: string;
  mime_type: string;
}

export const mediaProvider: SearchProvider = {
  id: "media",
  label: "Câmera",
  icon: "Camera",
  maxResults: 5,

  async search(query, ctx) {
    if (!ctx.drivers || !ctx.userId || !query.trim()) return [];
    try {
      const { data, error } = await (ctx.drivers.data
        .from("media_files")
        .select("id,type,file_name,mime_type") as unknown as Promise<{
        data: MediaRow[] | null;
        error: unknown;
      }>);
      if (error || !data) return [];

      const q = query.toLowerCase();
      return data
        .filter((m) => m.file_name.toLowerCase().includes(q))
        .slice(0, 5)
        .map<SearchResult>((m) => ({
          id: `media-${m.id}`,
          type: "file",
          title: m.file_name,
          subtitle: m.type === "photo" ? "Foto" : "Vídeo",
          icon: m.type === "photo" ? "Image" : "Video",
          iconColor: "#1a1a2e",
          action: () => {
            ctx.openApp("camera", "Câmera");
            ctx.closeSearch();
          },
        }));
    } catch {
      return [];
    }
  },
};
