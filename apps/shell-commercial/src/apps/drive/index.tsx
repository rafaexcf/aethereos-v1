import { useState, useCallback, useRef } from "react";
import { AppShell } from "@aethereos/ui-shell";
import { useSessionStore } from "../../stores/session.js";

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
// Estado demo (substitui por driver real quando Supabase local configurado)
// ---------------------------------------------------------------------------

const DEMO_FILES: FileEntry[] = [
  {
    id: "root-docs",
    parentId: null,
    kind: "folder",
    name: "Documentos",
    createdAt: new Date(Date.now() - 86_400_000 * 7),
  },
  {
    id: "root-imgs",
    parentId: null,
    kind: "folder",
    name: "Imagens",
    createdAt: new Date(Date.now() - 86_400_000 * 3),
  },
  {
    id: "readme",
    parentId: null,
    kind: "file",
    name: "README.md",
    mimeType: "text/markdown",
    sizeBytes: 2048,
    storagePath: "demo/readme.md",
    createdAt: new Date(Date.now() - 86_400_000),
  },
  {
    id: "ata-reuniao",
    parentId: "root-docs",
    kind: "file",
    name: "ata-reuniao-2026-04.md",
    mimeType: "text/markdown",
    sizeBytes: 4096,
    storagePath: "demo/ata.md",
    createdAt: new Date(Date.now() - 3_600_000),
  },
];

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
  const { activeCompanyId } = useSessionStore();

  const [files, setFiles] = useState<FileEntry[]>(DEMO_FILES);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentEntries = files.filter((f) => f.parentId === currentFolderId);

  // Breadcrumb path
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

  function handleUpload(uploadedFiles: FileList) {
    const newEntries: FileEntry[] = Array.from(uploadedFiles).map((f) => {
      const entry: FileEntry = {
        id: crypto.randomUUID(),
        parentId: currentFolderId,
        kind: "file",
        name: f.name,
        sizeBytes: f.size,
        storagePath: `${activeCompanyId ?? "demo"}/${f.name}`,
        createdAt: new Date(),
      };
      if (f.type.length > 0) entry.mimeType = f.type;
      return entry;
    });

    setFiles((prev) => [...prev, ...newEntries]);
    // TODO: chamar SupabaseStorageDriver.upload() + inserir em kernel.files
    // + emitir platform.file.uploaded via KernelPublisher
    // quando drivers disponíveis (activeCompanyId !== null && userId !== null)
  }

  function handleCreateFolder() {
    const name = newFolderName.trim();
    if (name.length === 0) return;
    const newFolder: FileEntry = {
      id: crypto.randomUUID(),
      parentId: currentFolderId,
      kind: "folder",
      name,
      createdAt: new Date(),
    };
    setFiles((prev) => [...prev, newFolder]);
    setNewFolderName("");
    setShowNewFolder(false);
    // TODO: inserir em kernel.files + emitir platform.folder.created
  }

  function handleDelete(id: string) {
    // Remove recursivamente pastas e conteúdo
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
    setFiles((prev) => prev.filter((f) => !toDelete.has(f.id)));
    // TODO: chamar SupabaseStorageDriver.delete() + emitir platform.file.deleted
  }

  const statusText =
    activeCompanyId !== null
      ? `${currentEntries.length} item(s) · ${activeCompanyId.slice(0, 8)}…`
      : `${currentEntries.length} item(s) · modo demo`;

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
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") setShowNewFolder(false);
                }}
                placeholder="Nome da pasta"
                autoFocus
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={handleCreateFolder}
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
              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
            >
              Nova pasta
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500"
          >
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files !== null) handleUpload(e.target.files);
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
              onClick={() =>
                setCurrentFolderId(
                  i === breadcrumb.length - 1 ? crumb.id : crumb.id,
                )
              }
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
            handleUpload(e.dataTransfer.files);
          }
        }}
      >
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950/80 text-sm text-violet-300">
            Solte para fazer upload
          </div>
        )}
        <FileGrid
          entries={currentEntries}
          onOpenFolder={setCurrentFolderId}
          onDelete={handleDelete}
        />
      </div>
    </AppShell>
  );
}
