import { useState, useCallback, useRef, useEffect } from "react";
import { AppShell } from "@aethereos/ui-shell";
import { useSessionStore } from "../../stores/session";
import { useDrivers } from "../../lib/drivers-context";

// ---------------------------------------------------------------------------
// Tipos de domínio (espelham kernel.files)
// ---------------------------------------------------------------------------

interface FileEntry {
  id: string;
  parentId: string | null;
  kind: "folder" | "file";
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  storagePath?: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(entry: FileEntry): string {
  if (entry.kind === "folder") return "📁";
  const mime = entry.mimeType ?? "";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime === "application/pdf") return "📄";
  if (mime.includes("text") || mime.includes("markdown")) return "📝";
  return "📎";
}

function mapRow(row: Record<string, unknown>): FileEntry {
  const entry: FileEntry = {
    id: row["id"] as string,
    parentId: (row["parent_id"] as string | null) ?? null,
    kind: row["kind"] as "folder" | "file",
    name: row["name"] as string,
    createdAt: new Date(row["created_at"] as string),
  };
  const mime = row["mime_type"];
  if (typeof mime === "string") entry.mimeType = mime;
  const size = row["size_bytes"];
  if (typeof size === "number") entry.sizeBytes = size;
  const path = row["storage_path"];
  if (typeof path === "string") entry.storagePath = path;
  return entry;
}

// ---------------------------------------------------------------------------
// Sub-componente: FolderTree
// ---------------------------------------------------------------------------

interface FolderTreeProps {
  files: FileEntry[];
  currentFolderId: string | null;
  onSelect: (folderId: string | null) => void;
}

function FolderTree({ files, currentFolderId, onSelect }: FolderTreeProps) {
  const folders = files.filter((f) => f.kind === "folder");

  return (
    <div className="flex flex-col gap-1 p-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={[
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
          currentFolderId === null
            ? "bg-violet-600/20 text-violet-300"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
        ].join(" ")}
      >
        <span>📂</span>
        <span>Raiz</span>
      </button>
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          onClick={() => onSelect(folder.id)}
          className={[
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
            currentFolderId === folder.id
              ? "bg-violet-600/20 text-violet-300"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
          ].join(" ")}
        >
          <span>📁</span>
          <span className="truncate">{folder.name}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componente: FileGrid
// ---------------------------------------------------------------------------

interface FileGridProps {
  entries: FileEntry[];
  onOpenFolder: (id: string) => void;
  onDelete: (id: string) => void;
}

function FileGrid({ entries, onOpenFolder, onDelete }: FileGridProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-600">
        <span className="text-4xl">📭</span>
        <p className="text-sm">Pasta vazia</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-zinc-800">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="group flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-900"
        >
          <span className="shrink-0 text-xl">{fileIcon(entry)}</span>
          <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                if (entry.kind === "folder") onOpenFolder(entry.id);
              }}
              className={[
                "truncate text-left text-sm",
                entry.kind === "folder"
                  ? "cursor-pointer font-medium text-zinc-100 hover:text-violet-300"
                  : "cursor-default text-zinc-200",
              ].join(" ")}
            >
              {entry.name}
            </button>
            <span className="text-xs text-zinc-600">
              {entry.kind === "file" && entry.sizeBytes !== undefined
                ? formatBytes(entry.sizeBytes)
                : "Pasta"}
              {" · "}
              {entry.createdAt.toLocaleDateString("pt-BR")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            title="Excluir"
            className="shrink-0 rounded p-1 text-xs text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DriveApp principal
// ---------------------------------------------------------------------------

export function DriveApp() {
  const { activeCompanyId, userId } = useSessionStore();
  const drivers = useDrivers();

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega arquivos do Supabase
  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    setLoading(true);
    setError(null);

    drivers.data
      .from("files")
      .select(
        "id,parent_id,kind,name,mime_type,size_bytes,storage_path,created_at",
      )
      .order("kind", { ascending: false })
      .order("name")
      .then(({ data, error: dbErr }) => {
        setLoading(false);
        if (dbErr !== null) {
          setError(dbErr.message);
          return;
        }
        setFiles(
          (data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
        );
      });
  }, [drivers, activeCompanyId]);

  const currentEntries = files.filter((f) => f.parentId === currentFolderId);

  const buildBreadcrumb = useCallback(
    (folderId: string | null): FileEntry[] => {
      if (folderId === null) return [];
      const folder = files.find((f) => f.id === folderId);
      if (folder === undefined) return [];
      return [...buildBreadcrumb(folder.parentId), folder];
    },
    [files],
  );
  const breadcrumb = buildBreadcrumb(currentFolderId);

  async function handleUpload(uploadedFiles: FileList) {
    if (drivers === null || activeCompanyId === null || userId === null) return;

    const client = drivers.data.getClient();

    for (const f of Array.from(uploadedFiles)) {
      const storagePath = `${activeCompanyId}/${currentFolderId ?? "root"}/${crypto.randomUUID()}-${f.name}`;

      // Upload físico para Supabase Storage
      const { error: uploadErr } = await client.storage
        .from("kernel-files")
        .upload(storagePath, f, { upsert: false });

      if (uploadErr !== null) {
        setError(`Upload falhou: ${uploadErr.message}`);
        continue;
      }

      // Registra metadados em kernel.files
      const { data: inserted, error: dbErr } = await drivers.data
        .from("files")
        .insert({
          parent_id: currentFolderId,
          kind: "file",
          name: f.name,
          mime_type: f.type.length > 0 ? f.type : null,
          size_bytes: f.size,
          storage_path: storagePath,
          created_by: userId,
        })
        .select(
          "id,parent_id,kind,name,mime_type,size_bytes,storage_path,created_at",
        )
        .single();

      if (dbErr !== null) {
        setError(`Erro ao registrar arquivo: ${dbErr.message}`);
        continue;
      }

      if (inserted !== null) {
        const entry = mapRow(inserted as Record<string, unknown>);
        setFiles((prev) => [...prev, entry]);
        void drivers.scp.publishEvent("platform.file.uploaded", {
          file_id: entry.id,
          company_id: activeCompanyId,
          parent_id: currentFolderId,
          name: f.name,
          mime_type: f.type.length > 0 ? f.type : undefined,
          size_bytes: f.size,
          storage_path: storagePath,
          uploaded_by: userId,
        });
      }
    }
  }

  async function handleCreateFolder() {
    if (drivers === null || activeCompanyId === null || userId === null) return;
    const name = newFolderName.trim();
    if (name.length === 0) return;

    const { data: inserted, error: dbErr } = await drivers.data
      .from("files")
      .insert({
        parent_id: currentFolderId,
        kind: "folder",
        name,
        created_by: userId,
      })
      .select(
        "id,parent_id,kind,name,mime_type,size_bytes,storage_path,created_at",
      )
      .single();

    if (dbErr !== null) {
      setError(`Erro ao criar pasta: ${dbErr.message}`);
      return;
    }

    if (inserted !== null) {
      const entry = mapRow(inserted as Record<string, unknown>);
      setFiles((prev) => [...prev, entry]);
      void drivers.scp.publishEvent("platform.folder.created", {
        folder_id: entry.id,
        company_id: activeCompanyId,
        parent_id: currentFolderId,
        name,
        created_by: userId,
      });
    }
    setNewFolderName("");
    setShowNewFolder(false);
  }

  async function handleDelete(id: string) {
    if (drivers === null) return;

    const toDelete = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const cur = queue.pop();
      if (cur === undefined) break;
      toDelete.add(cur);
      files
        .filter((f) => f.parentId === cur)
        .forEach((child) => queue.push(child.id));
    }

    const { error: dbErr } = await drivers.data
      .from("files")
      .delete()
      .in("id", Array.from(toDelete));

    if (dbErr !== null) {
      setError(`Erro ao excluir: ${dbErr.message}`);
      return;
    }

    const deletedEntry = files.find((f) => f.id === id);
    if (
      deletedEntry !== undefined &&
      activeCompanyId !== null &&
      userId !== null
    ) {
      void drivers.scp.publishEvent("platform.file.deleted", {
        file_id: id,
        company_id: activeCompanyId,
        name: deletedEntry.name,
        deleted_by: userId,
      });
    }

    setFiles((prev) => prev.filter((f) => !toDelete.has(f.id)));
  }

  const isConnected = drivers !== null && activeCompanyId !== null;
  const statusText = loading
    ? "Carregando…"
    : error !== null
      ? `Erro: ${error}`
      : isConnected
        ? `${currentEntries.length} item(s) · ${activeCompanyId.slice(0, 8)}…`
        : `${currentEntries.length} item(s) · aguardando sessão`;

  return (
    <AppShell
      title="Drive"
      subtitle={breadcrumb.map((b) => b.name).join(" › ") || "Raiz"}
      actions={
        <div className="flex items-center gap-2">
          {showNewFolder ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateFolder();
                  if (e.key === "Escape") setShowNewFolder(false);
                }}
                placeholder="Nome da pasta"
                autoFocus
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={() => void handleCreateFolder()}
                className="rounded-md bg-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-600"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => setShowNewFolder(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewFolder(true)}
              disabled={!isConnected}
              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
            >
              Nova pasta
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected}
            className="rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files !== null) void handleUpload(e.target.files);
            }}
          />
        </div>
      }
      sidebar={
        <FolderTree
          files={files}
          currentFolderId={currentFolderId}
          onSelect={setCurrentFolderId}
        />
      }
      statusBar={statusText}
    >
      {/* Breadcrumb */}
      <div className="flex shrink-0 items-center gap-1 border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500">
        <button
          type="button"
          onClick={() => setCurrentFolderId(null)}
          className="hover:text-zinc-300"
        >
          Drive
        </button>
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <span>/</span>
            <button
              type="button"
              onClick={() => setCurrentFolderId(crumb.id)}
              className={
                i === breadcrumb.length - 1
                  ? "text-zinc-300"
                  : "hover:text-zinc-300"
              }
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Drag-and-drop zone */}
      <div
        className={[
          "relative flex flex-1 flex-col overflow-y-auto",
          isDragging ? "ring-2 ring-inset ring-violet-500/50" : "",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) {
            void handleUpload(e.dataTransfer.files);
          }
        }}
      >
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950/80 text-sm text-violet-300">
            Solte para fazer upload
          </div>
        )}
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
            Carregando arquivos…
          </div>
        ) : (
          <FileGrid
            entries={currentEntries}
            onOpenFolder={setCurrentFolderId}
            onDelete={(id) => void handleDelete(id)}
          />
        )}
      </div>
    </AppShell>
  );
}
