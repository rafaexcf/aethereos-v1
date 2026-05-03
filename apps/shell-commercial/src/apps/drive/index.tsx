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
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors"
        style={
          currentFolderId === null
            ? { background: "var(--accent-dim)", color: "var(--accent-hover)" }
            : { color: "var(--text-secondary)" }
        }
        onMouseEnter={(e) => {
          if (currentFolderId !== null) {
            e.currentTarget.style.background = "var(--glass-bg-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }
        }}
        onMouseLeave={(e) => {
          if (currentFolderId !== null) {
            e.currentTarget.style.background = "";
            e.currentTarget.style.color = "var(--text-secondary)";
          }
        }}
      >
        <span>📂</span>
        <span>Raiz</span>
      </button>
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          onClick={() => onSelect(folder.id)}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors"
          style={
            currentFolderId === folder.id
              ? {
                  background: "var(--accent-dim)",
                  color: "var(--accent-hover)",
                }
              : { color: "var(--text-secondary)" }
          }
          onMouseEnter={(e) => {
            if (currentFolderId !== folder.id) {
              e.currentTarget.style.background = "var(--glass-bg-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }
          }}
          onMouseLeave={(e) => {
            if (currentFolderId !== folder.id) {
              e.currentTarget.style.background = "";
              e.currentTarget.style.color = "var(--text-secondary)";
            }
          }}
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
      <div
        className="flex flex-1 flex-col items-center justify-center gap-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span className="text-4xl">📭</span>
        <p className="text-sm">Pasta vazia</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          className="group flex items-center gap-3 px-4 py-2.5"
          style={{
            borderTop: index === 0 ? "none" : "1px solid var(--border-subtle)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background =
              "var(--glass-bg)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "";
          }}
        >
          <span className="shrink-0 text-xl">{fileIcon(entry)}</span>
          <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                if (entry.kind === "folder") onOpenFolder(entry.id);
              }}
              className="truncate text-left text-sm"
              style={{
                cursor: entry.kind === "folder" ? "pointer" : "default",
                fontWeight: entry.kind === "folder" ? 500 : undefined,
                color: "var(--text-primary)",
              }}
              onMouseEnter={(e) => {
                if (entry.kind === "folder") {
                  e.currentTarget.style.color = "var(--accent-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (entry.kind === "folder") {
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
            >
              {entry.name}
            </button>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
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
            aria-label={`Excluir ${entry.name}`}
            className="shrink-0 rounded p-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
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
                className="focus:outline-none"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  padding: "4px 8px",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--accent-border)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border-default)")
                }
              />
              <button
                type="button"
                onClick={() => void handleCreateFolder()}
                style={{
                  background: "var(--glass-bg-hover)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "4px 12px",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--border-subtle)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--glass-bg-hover)")
                }
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => setShowNewFolder(false)}
                aria-label="Cancelar nova pasta"
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-secondary)")
                }
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewFolder(true)}
              disabled={!isConnected}
              className="disabled:opacity-40"
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 500,
                padding: "4px 12px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Nova pasta
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected}
            className="disabled:opacity-40"
            style={{
              background: "var(--accent)",
              color: "white",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              fontWeight: 500,
              padding: "4px 12px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--accent-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--accent)")
            }
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
      <div
        className="flex shrink-0 items-center gap-1 px-4 py-2 text-xs"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentFolderId(null)}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-secondary)")
          }
        >
          Drive
        </button>
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <span>/</span>
            <button
              type="button"
              onClick={() => setCurrentFolderId(crumb.id)}
              style={{
                color:
                  i === breadcrumb.length - 1
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-primary)")
              }
              onMouseLeave={(e) => {
                e.currentTarget.style.color =
                  i === breadcrumb.length - 1
                    ? "var(--text-primary)"
                    : "var(--text-secondary)";
              }}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Drag-and-drop zone */}
      <div
        className="relative flex flex-1 flex-col overflow-y-auto"
        style={
          isDragging
            ? {
                outline: "2px solid var(--accent-border)",
                outlineOffset: "-2px",
              }
            : undefined
        }
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
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm"
            style={{
              background: "var(--bg-base)",
              opacity: 0.9,
              color: "var(--accent-hover)",
            }}
          >
            Solte para fazer upload
          </div>
        )}
        {loading ? (
          <div
            className="flex flex-1 items-center justify-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
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
