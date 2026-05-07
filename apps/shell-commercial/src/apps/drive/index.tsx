import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  HardDrive,
  Folder,
  FolderOpen,
  FileText,
  FileImage,
  FileType,
  Search,
  Upload,
  FolderPlus,
  Trash2,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  Share2,
  Clock,
  Plus,
  X,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { useSessionStore } from "../../stores/session";
import { useDrivers } from "../../lib/drivers-context";
import { createBrowserQuotaEnforcer } from "../../lib/quota";

// ─── Domain ──────────────────────────────────────────────────────────────────

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

type DriveTabId =
  | "todos"
  | "recentes"
  | "favoritos"
  | "compartilhados"
  | "lixeira";

interface NavItem {
  id: DriveTabId;
  label: string;
  icon: ComponentType<LucideProps>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Biblioteca",
    items: [
      { id: "todos", label: "Todos os arquivos", icon: HardDrive },
      { id: "recentes", label: "Recentes", icon: Clock },
      { id: "favoritos", label: "Favoritos", icon: Star },
    ],
  },
  {
    label: "Outros",
    items: [
      { id: "compartilhados", label: "Compartilhados", icon: Share2 },
      { id: "lixeira", label: "Lixeira", icon: Trash2 },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

const TAB_LABELS: Record<DriveTabId, string> = {
  todos: "Todos os arquivos",
  recentes: "Recentes",
  favoritos: "Favoritos",
  compartilhados: "Compartilhados",
  lixeira: "Lixeira",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fileIcon(entry: FileEntry): ComponentType<LucideProps> {
  if (entry.kind === "folder") return Folder;
  const mime = entry.mimeType ?? "";
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/pdf") return FileType;
  return FileText;
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

// ─── Sidebar (mirror Configurações) ──────────────────────────────────────────

const ASIDE_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  background: "rgba(15,21,27,0.82)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
  boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
};

const SIDEBAR_W = 239;
const SIDEBAR_ICON_W = 48;

function DriveSidebar({
  active,
  onSelect,
  collapsed,
  folders,
  currentFolderId,
  onSelectFolder,
}: {
  active: DriveTabId;
  onSelect: (id: DriveTabId) => void;
  collapsed: boolean;
  folders: FileEntry[];
  currentFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");

  const filteredNav = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter((section) => section.items.length > 0);

  const filteredFolders =
    query.trim() === ""
      ? folders
      : folders.filter((f) =>
          f.name.toLowerCase().includes(query.toLowerCase()),
        );

  if (collapsed) {
    return (
      <aside style={ASIDE_STYLE}>
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "12px 0",
            gap: 2,
            flex: 1,
          }}
        >
          {ALL_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isSelected = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                title={item.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: isSelected
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid transparent",
                  background: isSelected
                    ? "rgba(255,255,255,0.08)"
                    : "transparent",
                  color: isSelected
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "background 120ms ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                <Icon size={16} strokeWidth={1.8} />
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside style={ASIDE_STYLE}>
      {/* App identity */}
      <button
        type="button"
        onClick={() => onSelect("todos")}
        aria-label="Æ Drive"
        aria-current={active === "todos" ? "page" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 14px 12px",
          background:
            active === "todos" ? "rgba(255,255,255,0.04)" : "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
          transition: "background 120ms ease",
        }}
        onMouseEnter={(e) => {
          if (active !== "todos")
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        }}
        onMouseLeave={(e) => {
          if (active !== "todos")
            e.currentTarget.style.background = "transparent";
        }}
      >
        <HardDrive
          size={18}
          style={{ color: "var(--text-primary)", flexShrink: 0 }}
          strokeWidth={1.6}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            fontFamily: "var(--font-display)",
          }}
        >
          Æ Drive
        </span>
      </button>

      {/* Search */}
      <div style={{ padding: "10px 10px 4px" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 9,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
              pointerEvents: "none",
            }}
            strokeWidth={1.8}
          />
          <input
            type="search"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "6px 10px 6px 28px",
              fontSize: 12,
              color: "var(--text-primary)",
              outline: "none",
              transition: "border-color 120ms ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.50)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "4px 0 16px 8px" }}>
        {filteredNav.map((section, sectionIdx) => (
          <div
            key={section.label}
            style={{ marginTop: sectionIdx === 0 ? 4 : 8 }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                padding: "10px 8px 4px",
              }}
            >
              {section.label}
            </p>

            {section.items.map((item) => {
              const Icon = item.icon;
              const isSelected = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  style={navItemStyle(isSelected)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <Icon
                    size={15}
                    strokeWidth={1.8}
                    style={{ color: "currentColor", flexShrink: 0 }}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}

        {/* Pastas dinamicas */}
        {filteredFolders.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                padding: "10px 8px 4px",
              }}
            >
              Pastas
            </p>
            {filteredFolders.map((folder) => {
              const isSelected = currentFolderId === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => onSelectFolder(folder.id)}
                  style={navItemStyle(isSelected)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  {isSelected ? (
                    <FolderOpen
                      size={15}
                      strokeWidth={1.8}
                      style={{ color: "currentColor", flexShrink: 0 }}
                    />
                  ) : (
                    <Folder
                      size={15}
                      strokeWidth={1.8}
                      style={{ color: "currentColor", flexShrink: 0 }}
                    />
                  )}
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {folder.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {filteredNav.length === 0 && filteredFolders.length === 0 && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              padding: "16px 8px",
              textAlign: "center",
            }}
          >
            Nenhum resultado para "{query}"
          </p>
        )}
      </nav>
    </aside>
  );
}

function navItemStyle(isSelected: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "6px 8px",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
    transition:
      "background 120ms ease, color 120ms ease, border-color 120ms ease, margin 120ms ease",
    marginBottom: 2,
    ...(isSelected
      ? {
          borderRadius: "8px 0 0 8px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          borderRight: "1px solid transparent",
          background: "var(--bg-elevated)",
          color: "var(--text-primary)",
          fontWeight: 500,
          marginRight: 0,
        }
      : {
          borderRadius: 8,
          border: "1px solid transparent",
          background: "transparent",
          color: "var(--text-secondary)",
          fontWeight: 400,
          marginRight: 8,
        }),
  };
}

// ─── Content primitives (mirror Configurações) ──────────────────────────────

function ContentHeader({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  right,
}: {
  icon: ComponentType<LucideProps>;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        marginBottom: 28,
        paddingBottom: 24,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: iconBg,
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <Icon size={28} style={{ color: iconColor }} strokeWidth={1.5} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            fontFamily: "var(--font-display)",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      </div>
      {right !== undefined && right !== null && (
        <div style={{ flexShrink: 0 }}>{right}</div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {children}
    </p>
  );
}

function SettingGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function FileRow({
  entry,
  last,
  onOpen,
  onDelete,
}: {
  entry: FileEntry;
  last: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const Icon = fileIcon(entry);
  const isFolder = entry.kind === "folder";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: isFolder
            ? "rgba(99,102,241,0.18)"
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${
            isFolder ? "rgba(99,102,241,0.32)" : "rgba(255,255,255,0.08)"
          }`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon
          size={16}
          strokeWidth={1.8}
          style={{
            color: isFolder ? "#a5b4fc" : "var(--text-secondary)",
          }}
        />
      </div>
      <button
        type="button"
        onClick={onOpen}
        disabled={!isFolder}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: isFolder ? "pointer" : "default",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 2,
          }}
        >
          {isFolder
            ? "Pasta"
            : entry.sizeBytes !== undefined
              ? formatBytes(entry.sizeBytes)
              : "Arquivo"}
          {" · "}
          {entry.createdAt.toLocaleDateString("pt-BR")}
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Excluir ${entry.name}`}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: "transparent",
          border: "none",
          color: "var(--text-tertiary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 120ms ease, color 120ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(239,68,68,0.10)";
          e.currentTarget.style.color = "#fca5a5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-tertiary)";
        }}
      >
        <Trash2 size={14} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
  icon: Icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  icon: ComponentType<LucideProps>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(99,102,241,0.88)",
        border: "none",
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 12,
        fontWeight: 500,
        color: "#ffffff",
        cursor: disabled === true ? "not-allowed" : "pointer",
        opacity: disabled === true ? 0.45 : 1,
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        if (disabled !== true) e.currentTarget.style.background = "#6366f1";
      }}
      onMouseLeave={(e) => {
        if (disabled !== true)
          e.currentTarget.style.background = "rgba(99,102,241,0.88)";
      }}
    >
      <Icon size={13} strokeWidth={1.8} />
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  disabled,
  children,
  icon: Icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  icon: ComponentType<LucideProps>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "7px 13px",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--text-primary)",
        cursor: disabled === true ? "not-allowed" : "pointer",
        opacity: disabled === true ? 0.45 : 1,
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        if (disabled !== true)
          e.currentTarget.style.background = "rgba(255,255,255,0.11)";
      }}
      onMouseLeave={(e) => {
        if (disabled !== true)
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
      }}
    >
      <Icon size={13} strokeWidth={1.8} />
      {children}
    </button>
  );
}

// ─── Drive root ──────────────────────────────────────────────────────────────

export function DriveApp() {
  const { activeCompanyId, userId } = useSessionStore();
  const drivers = useDrivers();

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [active, setActive] = useState<DriveTabId>("todos");
  const [collapsed, setCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const folders = useMemo(
    () => files.filter((f) => f.kind === "folder"),
    [files],
  );

  const currentEntries = files.filter((f) => f.parentId === currentFolderId);
  const currentFolders = currentEntries.filter((e) => e.kind === "folder");
  const currentFiles = currentEntries.filter((e) => e.kind === "file");

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

  function handleSelectNav(id: DriveTabId) {
    setActive(id);
    if (id === "todos") setCurrentFolderId(null);
  }

  function handleSelectFolder(id: string | null) {
    setCurrentFolderId(id);
    setActive("todos");
  }

  async function handleUpload(uploadedFiles: FileList) {
    if (drivers === null || activeCompanyId === null || userId === null) return;
    const client = drivers.data.getClient();
    const quotaEnforcer = createBrowserQuotaEnforcer(
      drivers.data,
      activeCompanyId,
    );

    for (const f of Array.from(uploadedFiles)) {
      // HOTFIX — Quota check antes do upload. Free: 500 MB.
      const quotaCheck = await quotaEnforcer.checkFileUpload(
        activeCompanyId,
        f.size,
      );
      if (!quotaCheck.allowed) {
        setError(
          quotaCheck.reason ??
            "Limite de armazenamento atingido. Faça upgrade do plano em Admin Console > Plano & Assinatura.",
        );
        break;
      }

      const storagePath = `${activeCompanyId}/${currentFolderId ?? "root"}/${crypto.randomUUID()}-${f.name}`;
      const { error: uploadErr } = await client.storage
        .from("kernel-files")
        .upload(storagePath, f, { upsert: false });
      if (uploadErr !== null) {
        setError(`Upload falhou: ${uploadErr.message}`);
        continue;
      }

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

  const subtitle =
    breadcrumb.length > 0
      ? `Raiz / ${breadcrumb.map((b) => b.name).join(" / ")}`
      : `${currentEntries.length} item(s) na raiz`;

  const showFiles = active === "todos";
  const showComingSoon = active !== "todos";

  return (
    <div
      data-ae="drive-app"
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "var(--bg-elevated)",
        position: "relative",
      }}
    >
      {/* Sidebar wrapper */}
      <div
        style={{
          width: collapsed ? SIDEBAR_ICON_W : SIDEBAR_W,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 250ms ease",
        }}
      >
        <DriveSidebar
          active={active}
          onSelect={handleSelectNav}
          collapsed={collapsed}
          folders={folders}
          currentFolderId={currentFolderId}
          onSelectFolder={handleSelectFolder}
        />
      </div>

      {/* Collapse/expand toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        style={{
          position: "absolute",
          left: (collapsed ? SIDEBAR_ICON_W : SIDEBAR_W) - 14,
          top: "50%",
          transform: "translateY(-50%)",
          transition: "left 250ms ease",
          zIndex: 10,
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(15,21,27,0.95)",
          border: "1px solid rgba(255,255,255,0.10)",
          cursor: "pointer",
          color: "var(--text-tertiary)",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(40,55,80,0.95)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)";
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(15,21,27,0.95)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--text-tertiary)";
        }}
      >
        {collapsed ? (
          <PanelLeftOpen size={16} strokeWidth={1.8} />
        ) : (
          <PanelLeftClose size={16} strokeWidth={1.8} />
        )}
      </button>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 28px 160px",
          position: "relative",
        }}
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
            style={{
              position: "absolute",
              inset: 16,
              borderRadius: 16,
              border: "2px dashed rgba(99,102,241,0.55)",
              background: "rgba(99,102,241,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 500,
              color: "#c7d2fe",
              zIndex: 20,
              pointerEvents: "none",
            }}
          >
            Solte para fazer upload
          </div>
        )}

        <div style={{ maxWidth: 1095, margin: "0 auto" }}>
          <ContentHeader
            icon={HardDrive}
            iconBg="rgba(6,182,212,0.22)"
            iconColor="#22d3ee"
            title={showFiles ? "Æ Drive" : TAB_LABELS[active]}
            subtitle={showFiles ? subtitle : "Em breve"}
            right={
              showFiles ? (
                <div style={{ display: "flex", gap: 8 }}>
                  {showNewFolder ? (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(99,102,241,0.45)",
                        borderRadius: 8,
                        padding: "4px 6px 4px 10px",
                      }}
                    >
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
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          fontSize: 12,
                          color: "var(--text-primary)",
                          width: 140,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateFolder()}
                        style={{
                          background: "rgba(99,102,241,0.85)",
                          border: "none",
                          borderRadius: 6,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        Criar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewFolder(false)}
                        aria-label="Cancelar"
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: 4,
                          color: "var(--text-tertiary)",
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <SecondaryButton
                      onClick={() => setShowNewFolder(true)}
                      disabled={!isConnected}
                      icon={FolderPlus}
                    >
                      Nova pasta
                    </SecondaryButton>
                  )}
                  <PrimaryButton
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isConnected}
                    icon={Upload}
                  >
                    Upload
                  </PrimaryButton>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files !== null)
                        void handleUpload(e.target.files);
                    }}
                  />
                </div>
              ) : null
            }
          />

          {/* Breadcrumb (apenas em "Todos os arquivos") */}
          {showFiles && (
            <nav
              aria-label="breadcrumb"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexWrap: "wrap",
                marginBottom: 20,
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentFolderId(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  fontSize: 12,
                  color:
                    breadcrumb.length === 0
                      ? "var(--text-secondary)"
                      : "var(--text-tertiary)",
                  cursor: "pointer",
                  fontWeight: breadcrumb.length === 0 ? 500 : 400,
                  transition: "color 120ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color =
                    breadcrumb.length === 0
                      ? "var(--text-secondary)"
                      : "var(--text-tertiary)";
                }}
              >
                Raiz
              </button>
              {breadcrumb.map((crumb, i) => (
                <span
                  key={crumb.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <ChevronRight
                    size={11}
                    strokeWidth={1.8}
                    style={{ color: "var(--text-tertiary)", opacity: 0.6 }}
                  />
                  <button
                    type="button"
                    onClick={() => setCurrentFolderId(crumb.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      fontSize: 12,
                      color:
                        i === breadcrumb.length - 1
                          ? "var(--text-secondary)"
                          : "var(--text-tertiary)",
                      cursor: "pointer",
                      fontWeight: i === breadcrumb.length - 1 ? 500 : 400,
                      transition: "color 120ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color =
                        i === breadcrumb.length - 1
                          ? "var(--text-secondary)"
                          : "var(--text-tertiary)";
                    }}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </nav>
          )}

          {error !== null && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.32)",
                color: "#fca5a5",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          {showFiles && loading && (
            <div
              style={{
                padding: "32px 0",
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 13,
              }}
            >
              Carregando arquivos…
            </div>
          )}

          {showFiles && !loading && currentFolders.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Pastas</SectionLabel>
              <SettingGroup>
                {currentFolders.map((entry, idx) => (
                  <FileRow
                    key={entry.id}
                    entry={entry}
                    last={idx === currentFolders.length - 1}
                    onOpen={() => setCurrentFolderId(entry.id)}
                    onDelete={() => void handleDelete(entry.id)}
                  />
                ))}
              </SettingGroup>
            </div>
          )}

          {showFiles && !loading && currentFiles.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Arquivos</SectionLabel>
              <SettingGroup>
                {currentFiles.map((entry, idx) => (
                  <FileRow
                    key={entry.id}
                    entry={entry}
                    last={idx === currentFiles.length - 1}
                    onOpen={() => {}}
                    onDelete={() => void handleDelete(entry.id)}
                  />
                ))}
              </SettingGroup>
            </div>
          )}

          {showFiles && !loading && currentEntries.length === 0 && (
            <div
              style={{
                padding: "48px 16px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.025)",
                border: "1px dashed rgba(255,255,255,0.10)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(99,102,241,0.14)",
                  border: "1px solid rgba(99,102,241,0.28)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Plus
                  size={20}
                  strokeWidth={1.6}
                  style={{ color: "#a5b4fc" }}
                />
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 4,
                }}
              >
                {breadcrumb.length === 0
                  ? "Drive vazio"
                  : "Esta pasta está vazia"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  lineHeight: 1.5,
                }}
              >
                Arraste arquivos para esta área ou use o botão{" "}
                <strong style={{ color: "var(--text-secondary)" }}>
                  Upload
                </strong>{" "}
                no topo.
              </div>
            </div>
          )}

          {showComingSoon && (
            <div
              style={{
                padding: "48px 16px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.025)",
                border: "1px dashed rgba(255,255,255,0.10)",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-tertiary)",
              }}
            >
              {TAB_LABELS[active]} estará disponível em uma próxima sprint.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
