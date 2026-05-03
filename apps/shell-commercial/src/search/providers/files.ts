import type { SearchProvider, SearchResult } from "../types";

interface FileRow {
  id: string;
  file_name: string;
  mime_type: string;
  type: string;
}

function mimeIcon(mime: string): string {
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Music";
  if (mime.includes("pdf")) return "FileText";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "Table";
  return "File";
}

export const filesProvider: SearchProvider = {
  id: "files",
  label: "Arquivos",
  icon: "HardDrive",
  maxResults: 5,

  async search(query, ctx) {
    if (!ctx.drivers || !ctx.userId || !query.trim()) return [];
    try {
      const { data, error } = await (ctx.drivers.data
        .from("files")
        .select("id,file_name,mime_type,type") as unknown as Promise<{
        data: FileRow[] | null;
        error: unknown;
      }>);
      if (error || !data) return [];

      const q = query.toLowerCase();
      return data
        .filter((f) => f.file_name.toLowerCase().includes(q))
        .slice(0, 5)
        .map<SearchResult>((f) => ({
          id: `file-${f.id}`,
          type: "file",
          title: f.file_name,
          subtitle: f.type === "folder" ? "Pasta" : f.mime_type,
          icon: f.type === "folder" ? "Folder" : mimeIcon(f.mime_type),
          iconColor: "#06b6d4",
          action: () => {
            ctx.openApp("drive", "Drive");
            ctx.closeSearch();
          },
        }));
    } catch {
      return [];
    }
  },
};
