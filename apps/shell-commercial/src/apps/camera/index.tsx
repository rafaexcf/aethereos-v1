import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Camera,
  CameraOff,
  Video,
  VideoOff,
  RefreshCw,
  FlipHorizontal,
  Download,
  Trash2,
  Play,
  Pause,
  Square,
  Circle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  ZapOff,
  FolderPlus,
  Folder,
  FolderOpen,
  Plus,
  X,
  Search,
  Check,
  Pencil,
  FolderInput,
  Image as ImageIcon,
  Film,
  MoreVertical,
  ArrowLeft,
  ImagePlus,
  AlertTriangle,
} from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useModalA11y } from "../../components/shared/useModalA11y";
import { DeleteConfirmModal } from "../../components/shared/DeleteConfirmModal";
import { EmptyState } from "../../components/shared/EmptyState";
import { useNotify } from "../../hooks/useNotify";
import { moveToTrash } from "../../lib/trash";

type PermState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "unsupported";
type RecordState = "idle" | "recording" | "paused";
type CaptureMode = "photo" | "video";
type ViewMode = "gallery" | "capture";

interface ResolutionOption {
  label: string;
  width: number;
  height: number;
}

interface MediaRow {
  id: string;
  type: "photo" | "video";
  file_name: string;
  mime_type: string;
  storage_path: string;
  size_bytes: number;
  duration_ms: number | null;
  created_at: string;
}

interface PendingCapture {
  id: string;
  type: "photo" | "video";
  url: string;
  blob: Blob;
  displayName: string;
  sizeBytes: number;
  durationMs: number | null;
  saving: boolean;
}

const DEFAULT_FOLDER = "Geral";
const STORAGE_BUCKET = "kernel-media";
const SIDEBAR_W = 220;

const RESOLUTIONS: ResolutionOption[] = [
  { label: "480p", width: 854, height: 480 },
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
];

const DEFAULT_RES = RESOLUTIONS[1] ??
  RESOLUTIONS[0] ?? { label: "720p", width: 1280, height: 720 };

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getBestVideoMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function mimeToExt(mime: string): string {
  if (mime.startsWith("video/mp4")) return "mp4";
  if (mime.startsWith("image/jpeg")) return "jpg";
  if (mime.startsWith("image/webp")) return "webp";
  if (mime.startsWith("image/png")) return "png";
  return "webm";
}

function isMediaDevicesSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined"
  );
}

function sanitizeFolder(name: string): string {
  const trimmed = name.trim().replace(/[/\\]/g, "-");
  return trimmed.length > 0 ? trimmed : DEFAULT_FOLDER;
}

function sanitizeDisplayName(name: string): string {
  return name.trim().replace(/[/\\]/g, "-");
}

function parseFileName(fileName: string): {
  folder: string;
  displayName: string;
} {
  const idx = fileName.indexOf("/");
  if (idx < 0) return { folder: DEFAULT_FOLDER, displayName: fileName };
  const folder = fileName.slice(0, idx);
  const displayName = fileName.slice(idx + 1);
  return {
    folder: folder.length > 0 ? folder : DEFAULT_FOLDER,
    displayName: displayName.length > 0 ? displayName : fileName,
  };
}

function buildFileName(folder: string, displayName: string): string {
  return `${sanitizeFolder(folder)}/${sanitizeDisplayName(displayName)}`;
}

function defaultDisplayName(
  type: "photo" | "video",
  ts: number,
  ext: string,
): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const prefix = type === "photo" ? "foto" : "video";
  return `${prefix}_${stamp}.${ext}`;
}

const APP: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  height: "100%",
  background: "#191d21",
  color: "var(--text-primary)",
  overflow: "hidden",
};

const ASIDE: React.CSSProperties = {
  width: SIDEBAR_W,
  flexShrink: 0,
  height: "100%",
  background: "#11161c",
  boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const BTN: React.CSSProperties = {
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  transition: "all 120ms ease",
  fontFamily: "inherit",
};

function PrivacyCard() {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        padding: "8px 14px",
        background: "rgba(34,197,94,0.06)",
        border: "1px solid rgba(34,197,94,0.15)",
        borderRadius: 8,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          ...BTN,
          width: "100%",
          justifyContent: "space-between",
          background: "none",
          padding: 0,
          color: "#86efac",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={13} /> Política de privacidade
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginTop: 10,
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: "0 0 6px" }}>
            <strong style={{ color: "#86efac" }}>
              Nada sai do seu dispositivo sem ação sua.
            </strong>{" "}
            A captura é local; o salvamento envia ao bucket privado da sua
            conta.
          </p>
          <p style={{ margin: 0 }}>
            A câmera é desligada ao fechar o app. Você controla download e
            exclusão.
          </p>
        </div>
      )}
    </div>
  );
}

interface PermScreenProps {
  permState: PermState;
  onRequest: () => void;
  onBack: () => void;
}

function PermScreen({ permState, onRequest, onBack }: PermScreenProps) {
  const SCREENS: Record<
    PermState,
    {
      icon: React.ReactNode;
      title: string;
      desc: string;
      action?: React.ReactNode;
    }
  > = {
    idle: {
      icon: <Camera size={44} style={{ opacity: 0.45 }} />,
      title: "Pronto para capturar",
      desc: "Ative a câmera para tirar fotos e gravar vídeos. Você precisará conceder permissão ao navegador.",
      action: (
        <button
          onClick={onRequest}
          style={{
            ...BTN,
            padding: "11px 24px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            background: "#6366f1",
            color: "#fff",
            marginTop: 20,
          }}
        >
          <Camera size={15} /> Ativar câmera
        </button>
      ),
    },
    requesting: {
      icon: (
        <Loader2
          size={44}
          style={{ opacity: 0.5, animation: "spin 1s linear infinite" }}
        />
      ),
      title: "Aguardando permissão…",
      desc: "Verifique o pop-up do navegador e clique em Permitir.",
    },
    denied: {
      icon: <CameraOff size={44} style={{ color: "#f87171" }} />,
      title: "Permissão negada",
      desc: "Para habilitar, clique no ícone de cadeado na barra de endereço, altere para Permitir e recarregue.",
      action: (
        <button
          onClick={onRequest}
          style={{
            ...BTN,
            padding: "9px 20px",
            borderRadius: 9,
            fontSize: 13,
            background: "rgba(239,68,68,0.15)",
            color: "#fca5a5",
            border: "1px solid rgba(239,68,68,0.25)",
            marginTop: 18,
          }}
        >
          <RefreshCw size={13} /> Tentar novamente
        </button>
      ),
    },
    unavailable: {
      icon: <VideoOff size={44} style={{ color: "#f59e0b" }} />,
      title: "Nenhuma câmera encontrada",
      desc: "Conecte uma webcam e tente novamente.",
      action: (
        <button
          onClick={onRequest}
          style={{
            ...BTN,
            padding: "9px 20px",
            borderRadius: 9,
            fontSize: 13,
            background: "rgba(245,158,11,0.12)",
            color: "#fbbf24",
            border: "1px solid rgba(245,158,11,0.2)",
            marginTop: 18,
          }}
        >
          <RefreshCw size={13} /> Tentar novamente
        </button>
      ),
    },
    unsupported: {
      icon: <ZapOff size={44} style={{ color: "#94a3b8" }} />,
      title: "Navegador incompatível",
      desc: "Use um navegador moderno como Chrome, Edge ou Firefox.",
    },
    granted: { icon: null, title: "", desc: "" },
  };

  const s = SCREENS[permState];
  if (permState === "granted") return null;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        textAlign: "center",
      }}
    >
      {s.icon}
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          marginTop: 16,
          marginBottom: 8,
          color: "var(--text-primary)",
        }}
      >
        {s.title}
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          maxWidth: 420,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {s.desc}
      </p>
      {s.action}
      <button
        type="button"
        onClick={onBack}
        style={{
          ...BTN,
          marginTop: 24,
          padding: "7px 14px",
          borderRadius: 8,
          fontSize: 12,
          background: "transparent",
          color: "var(--text-tertiary)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <ArrowLeft size={12} /> Voltar à galeria
      </button>
      <div style={{ marginTop: 28, maxWidth: 420, width: "100%" }}>
        <PrivacyCard />
      </div>
    </div>
  );
}

interface RenameModalProps {
  initial: string;
  title: string;
  onConfirm: (next: string) => void;
  onClose: () => void;
}

function RenameModal({ initial, title, onConfirm, onClose }: RenameModalProps) {
  const [value, setValue] = useState(initial);
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose });

  function submit() {
    const next = value.trim();
    if (next.length === 0) return;
    onConfirm(next);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#191d21",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: 22,
          width: 360,
          maxWidth: "90vw",
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            margin: "0 0 14px",
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h3>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          aria-label={title}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 8,
            padding: "9px 12px",
            fontSize: 13,
            color: "var(--text-primary)",
            outline: "none",
            fontFamily: "inherit",
            caretColor: "#6366f1",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            onClick={onClose}
            style={{
              ...BTN,
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 13,
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            style={{
              ...BTN,
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: "#6366f1",
              color: "#fff",
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

interface MovePickerProps {
  folders: string[];
  current: string;
  onPick: (folder: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

function MoveFolderModal({
  folders,
  current,
  onPick,
  onClose,
  onCreate,
}: MovePickerProps) {
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose });
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#191d21",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: 18,
          width: 320,
          maxWidth: "90vw",
        }}
      >
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            margin: "0 0 12px",
            color: "var(--text-primary)",
          }}
        >
          Mover para…
        </h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {folders.map((f) => {
            const active = f === current;
            return (
              <button
                key={f}
                onClick={() => onPick(f)}
                style={{
                  ...BTN,
                  justifyContent: "flex-start",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: active ? "rgba(99,102,241,0.15)" : "transparent",
                  color: active ? "#a5b4fc" : "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                }}
              >
                <Folder size={13} />
                <span style={{ flex: 1, textAlign: "left" }}>{f}</span>
                {active && <Check size={13} />}
              </button>
            );
          })}
        </div>
        <button
          onClick={onCreate}
          style={{
            ...BTN,
            marginTop: 10,
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-secondary)",
            border: "1px dashed rgba(255,255,255,0.12)",
            fontSize: 12,
          }}
        >
          <FolderPlus size={13} /> Nova pasta
        </button>
      </div>
    </div>
  );
}

interface ItemMenuProps {
  onRename: () => void;
  onMove: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function ItemMenu({
  onRename,
  onMove,
  onDownload,
  onDelete,
  onClose,
}: ItemMenuProps) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-item-menu]")) onClose();
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      data-item-menu="true"
      style={{
        position: "absolute",
        top: 30,
        right: 6,
        zIndex: 30,
        background: "#0f1318",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 10,
        padding: 4,
        minWidth: 160,
        boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
      }}
    >
      {[
        { icon: Pencil, label: "Renomear", action: onRename },
        { icon: FolderInput, label: "Mover para…", action: onMove },
        { icon: Download, label: "Baixar", action: onDownload },
      ].map(({ icon: Ic, label, action }) => (
        <button
          key={label}
          onClick={action}
          style={{
            ...BTN,
            width: "100%",
            justifyContent: "flex-start",
            gap: 8,
            padding: "7px 10px",
            borderRadius: 6,
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: 12,
          }}
        >
          <Ic size={12} /> {label}
        </button>
      ))}
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.06)",
          margin: "4px 0",
        }}
      />
      <button
        onClick={onDelete}
        style={{
          ...BTN,
          width: "100%",
          justifyContent: "flex-start",
          gap: 8,
          padding: "7px 10px",
          borderRadius: 6,
          background: "transparent",
          color: "#fca5a5",
          fontSize: 12,
        }}
      >
        <Trash2 size={12} /> Excluir
      </button>
    </div>
  );
}

interface SavedTileProps {
  row: MediaRow;
  signedUrl: string | null;
  loading: boolean;
  onOpen: () => void;
  onMenu: () => void;
  menuOpen: boolean;
  onCloseMenu: () => void;
  onRename: () => void;
  onMove: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

function SavedTile({
  row,
  signedUrl,
  loading,
  onOpen,
  onMenu,
  menuOpen,
  onCloseMenu,
  onRename,
  onMove,
  onDownload,
  onDelete,
}: SavedTileProps) {
  const { displayName } = parseFileName(row.file_name);
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        background: "#0f1318",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir ${displayName}`}
        style={{
          ...BTN,
          position: "relative",
          aspectRatio: "4/3",
          width: "100%",
          padding: 0,
          background: "#0a0d12",
        }}
      >
        {row.type === "photo" && signedUrl !== null && (
          <img
            src={signedUrl}
            alt={displayName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {row.type === "photo" && signedUrl === null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              color: "var(--text-tertiary)",
            }}
          >
            {loading ? (
              <Loader2
                size={18}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <ImageIcon size={20} />
            )}
          </div>
        )}
        {row.type === "video" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              color: "var(--text-tertiary)",
            }}
          >
            <Film size={26} style={{ color: "#a5b4fc" }} />
            <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
              {row.duration_ms !== null
                ? formatDuration(row.duration_ms)
                : "Vídeo"}
            </span>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            background:
              row.type === "photo"
                ? "rgba(99,102,241,0.85)"
                : "rgba(239,68,68,0.85)",
            borderRadius: 4,
            padding: "1px 6px",
            fontSize: 9,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "0.05em",
          }}
        >
          {row.type === "photo" ? "FOTO" : "VÍDEO"}
        </div>
      </button>
      <div
        style={{
          padding: "8px 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            {formatRelativeDate(row.created_at)} · {formatBytes(row.size_bytes)}
          </div>
        </div>
        <button
          type="button"
          aria-label="Mais ações"
          onClick={onMenu}
          style={{
            ...BTN,
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-secondary)",
            flexShrink: 0,
          }}
        >
          <MoreVertical size={13} />
        </button>
        {menuOpen && (
          <ItemMenu
            onRename={onRename}
            onMove={onMove}
            onDownload={onDownload}
            onDelete={onDelete}
            onClose={onCloseMenu}
          />
        )}
      </div>
    </div>
  );
}

interface PreviewModalProps {
  row: MediaRow;
  signedUrl: string | null;
  onClose: () => void;
}

function PreviewModal({ row, signedUrl, onClose }: PreviewModalProps) {
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose });
  const { displayName } = parseFileName(row.file_name);
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 12,
        }}
      >
        {signedUrl !== null ? (
          row.type === "photo" ? (
            <img
              src={signedUrl}
              alt={displayName}
              style={{
                maxWidth: "90vw",
                maxHeight: "78vh",
                objectFit: "contain",
                borderRadius: 10,
              }}
            />
          ) : (
            <video
              src={signedUrl}
              controls
              autoPlay
              style={{
                maxWidth: "90vw",
                maxHeight: "78vh",
                borderRadius: 10,
                background: "#000",
              }}
            />
          )
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 320,
              height: 240,
              color: "var(--text-tertiary)",
            }}
          >
            <Loader2
              size={22}
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {formatRelativeDate(row.created_at)} · {formatBytes(row.size_bytes)}
          </span>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              ...BTN,
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CameraApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId: companyId } = useSessionStore();
  const notify = useNotify();

  const [view, setView] = useState<ViewMode>("gallery");
  const [permState, setPermState] = useState<PermState>(
    isMediaDevicesSupported() ? "idle" : "unsupported",
  );
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [resolution, setResolution] = useState<ResolutionOption>(DEFAULT_RES);
  const [mirror, setMirror] = useState(true);
  const [mode, setMode] = useState<CaptureMode>("photo");
  const [recState, setRecState] = useState<RecordState>("idle");
  const [recMs, setRecMs] = useState(0);
  const [pending, setPending] = useState<PendingCapture[]>([]);
  const [flashActive, setFlashActive] = useState(false);

  const [rows, setRows] = useState<MediaRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>(DEFAULT_FOLDER);
  const [search, setSearch] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<MediaRow | null>(null);
  const [moveTarget, setMoveTarget] = useState<MediaRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaRow | null>(null);
  const [previewRow, setPreviewRow] = useState<MediaRow | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renamePending, setRenamePending] = useState<PendingCapture | null>(
    null,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef<number>(0);
  const recIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef<PendingCapture[]>([]);
  pendingRef.current = pending;

  const folders = useMemo(() => {
    const set = new Set<string>([DEFAULT_FOLDER, ...extraFolders]);
    rows.forEach((r) => set.add(parseFileName(r.file_name).folder));
    return Array.from(set).sort((a, b) => {
      if (a === DEFAULT_FOLDER) return -1;
      if (b === DEFAULT_FOLDER) return 1;
      return a.localeCompare(b, "pt-BR");
    });
  }, [rows, extraFolders]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      const f = parseFileName(r.file_name).folder;
      counts[f] = (counts[f] ?? 0) + 1;
    });
    return counts;
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const parsed = parseFileName(r.file_name);
      if (parsed.folder !== activeFolder) return false;
      if (q.length > 0 && !parsed.displayName.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [rows, activeFolder, search]);

  const loadRows = useCallback(async () => {
    if (drivers === null || userId === null || companyId === null) return;
    setLoadingRows(true);
    const { data } = await drivers.data
      .from("media_files")
      .select(
        "id,type,file_name,mime_type,storage_path,size_bytes,duration_ms,created_at",
      )
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (data !== null) {
      const next = (data as Record<string, unknown>[]).map<MediaRow>((r) => ({
        id: r["id"] as string,
        type: r["type"] as "photo" | "video",
        file_name: r["file_name"] as string,
        mime_type: r["mime_type"] as string,
        storage_path: r["storage_path"] as string,
        size_bytes: Number(r["size_bytes"] ?? 0),
        duration_ms:
          r["duration_ms"] === null || r["duration_ms"] === undefined
            ? null
            : Number(r["duration_ms"]),
        created_at: r["created_at"] as string,
      }));
      setRows(next);
    }
    setLoadingRows(false);
  }, [drivers, userId, companyId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (drivers === null) return;
    const targets = visibleRows.filter(
      (r) => r.type === "photo" && signedUrls[r.id] === undefined,
    );
    if (targets.length === 0) return;
    let cancelled = false;
    void (async () => {
      const client = drivers.data.getClient();
      const updates: Record<string, string> = {};
      for (const r of targets) {
        const { data } = await client.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(r.storage_path, 3600);
        if (data?.signedUrl !== undefined) updates[r.id] = data.signedUrl;
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visibleRows, drivers, signedUrls]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current !== null) videoRef.current.srcObject = null;
  }, []);

  const startStream = useCallback(
    async (deviceId: string, res: ResolutionOption) => {
      stopStream();
      const videoConstraints: MediaTrackConstraints =
        deviceId.length > 0
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: res.width },
              height: { ideal: res.height },
            }
          : { width: { ideal: res.width }, height: { ideal: res.height } };
      const constraints: MediaStreamConstraints = {
        video: videoConstraints,
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current !== null) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      }
    },
    [stopStream],
  );

  const enumerateDevices = useCallback(async () => {
    if (navigator.mediaDevices.enumerateDevices === undefined) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    const cams = all.filter((d) => d.kind === "videoinput");
    setDevices(cams);
    if (cams.length > 0 && selectedDeviceId.length === 0) {
      setSelectedDeviceId(cams[0]?.deviceId ?? "");
    }
  }, [selectedDeviceId]);

  const requestCamera = useCallback(async () => {
    if (!isMediaDevicesSupported()) {
      setPermState("unsupported");
      return;
    }
    setPermState("requesting");
    try {
      await startStream(selectedDeviceId, resolution);
      await enumerateDevices();
      setPermState("granted");
    } catch (err) {
      stopStream();
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError")
        setPermState("denied");
      else if (name === "NotFoundError" || name === "DevicesNotFoundError")
        setPermState("unavailable");
      else if (name === "NotReadableError") setPermState("unavailable");
      else setPermState("denied");
    }
  }, [selectedDeviceId, resolution, startStream, enumerateDevices, stopStream]);

  useEffect(() => {
    return () => {
      stopStream();
      if (recIntervalRef.current !== null)
        clearInterval(recIntervalRef.current);
      pendingRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [stopStream]);

  useEffect(() => {
    if (pending.length === 0) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "Você tem capturas não salvas. Sair agora vai perdê-las.";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [pending.length]);

  useEffect(() => {
    if (view !== "capture") {
      stopStream();
      return;
    }
    if (permState === "granted" && selectedDeviceId.length > 0) {
      void startStream(selectedDeviceId, resolution);
    }
  }, [view, selectedDeviceId, resolution, permState, startStream, stopStream]);

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video === null || canvas === null || permState !== "granted") return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    ctx.save();
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    ctx.restore();
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);
    canvas.toBlob(
      (blob) => {
        if (blob === null) return;
        const ts = Date.now();
        const displayName = defaultDisplayName("photo", ts, "jpg");
        const url = URL.createObjectURL(blob);
        const item: PendingCapture = {
          id: crypto.randomUUID(),
          type: "photo",
          url,
          blob,
          displayName,
          sizeBytes: blob.size,
          durationMs: null,
          saving: false,
        };
        setPending((prev) => [item, ...prev]);
      },
      "image/jpeg",
      0.92,
    );
  }

  function startRecording() {
    const stream = streamRef.current;
    if (stream === null || !isRecordingSupported()) return;
    const mimeType = getBestVideoMime();
    const recorder = new MediaRecorder(
      stream,
      mimeType.length > 0 ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const ms = Date.now() - recStartRef.current;
      const actualMime = mimeType.length > 0 ? mimeType : "video/webm";
      const blob = new Blob(chunksRef.current, { type: actualMime });
      const url = URL.createObjectURL(blob);
      const ext = mimeToExt(actualMime);
      const ts = Date.now();
      const displayName = defaultDisplayName("video", ts, ext);
      const item: PendingCapture = {
        id: crypto.randomUUID(),
        type: "video",
        url,
        blob,
        displayName,
        sizeBytes: blob.size,
        durationMs: ms,
        saving: false,
      };
      setPending((prev) => [item, ...prev]);
      if (recIntervalRef.current !== null)
        clearInterval(recIntervalRef.current);
      setRecMs(0);
      setRecState("idle");
    };
    recorder.start(1000);
    recStartRef.current = Date.now();
    recIntervalRef.current = setInterval(() => {
      setRecMs(Date.now() - recStartRef.current);
    }, 200);
    setRecState("recording");
  }

  function pauseRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause();
      if (recIntervalRef.current !== null)
        clearInterval(recIntervalRef.current);
      setRecState("paused");
    }
  }

  function resumeRecording() {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume();
      const pausedAt = Date.now() - recMs;
      recStartRef.current = pausedAt;
      recIntervalRef.current = setInterval(() => {
        setRecMs(Date.now() - recStartRef.current);
      }, 200);
      setRecState("recording");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function switchCamera() {
    if (devices.length < 2) return;
    const currentIdx = devices.findIndex(
      (d) => d.deviceId === selectedDeviceId,
    );
    const nextIdx = (currentIdx + 1) % devices.length;
    const nextDevice = devices[nextIdx];
    if (nextDevice !== undefined) setSelectedDeviceId(nextDevice.deviceId);
  }

  function downloadPending(item: PendingCapture) {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = item.displayName;
    a.click();
  }

  function discardPending(id: string) {
    setPending((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item !== undefined) URL.revokeObjectURL(item.url);
      return prev.filter((i) => i.id !== id);
    });
  }

  async function savePending(itemId: string, folderOverride?: string) {
    if (drivers === null || userId === null || companyId === null) return;
    const item = pendingRef.current.find((i) => i.id === itemId);
    if (item === undefined || item.saving) return;
    const folder = sanitizeFolder(folderOverride ?? activeFolder);
    setPending((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, saving: true } : i)),
    );
    const ext = mimeToExt(item.blob.type);
    const safeStem = item.displayName.replace(/[^a-z0-9._-]/gi, "_");
    const path = `${userId}/${companyId}/${crypto.randomUUID()}-${safeStem || `media.${ext}`}`;
    const client = drivers.data.getClient();
    const { error: uploadErr } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(path, item.blob, { contentType: item.blob.type, upsert: false });
    if (uploadErr !== null) {
      setPending((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, saving: false } : i)),
      );
      return;
    }
    await drivers.data.from("media_files").insert({
      user_id: userId,
      company_id: companyId,
      type: item.type,
      file_name: buildFileName(folder, item.displayName),
      mime_type: item.blob.type.length > 0 ? item.blob.type : `image/${ext}`,
      storage_path: path,
      size_bytes: item.sizeBytes,
      duration_ms: item.durationMs,
    });
    URL.revokeObjectURL(item.url);
    setPending((prev) => prev.filter((i) => i.id !== itemId));
    if (folder !== activeFolder) setActiveFolder(folder);
    void notify({
      type: "success",
      title: item.type === "photo" ? "Foto salva" : "Vídeo salvo",
      body: `${item.displayName} → ${folder}`,
      source_app: "camera",
    });
    await loadRows();
  }

  async function saveAllPending() {
    for (const item of pendingRef.current) {
      if (!item.saving) {
        await savePending(item.id);
      }
    }
  }

  async function downloadSaved(row: MediaRow) {
    if (drivers === null) return;
    const client = drivers.data.getClient();
    const { data } = await client.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(row.storage_path, 60);
    if (data?.signedUrl === undefined) return;
    const { displayName } = parseFileName(row.file_name);
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = displayName;
    a.click();
  }

  async function renameSaved(row: MediaRow, nextName: string) {
    if (drivers === null) return;
    const { folder } = parseFileName(row.file_name);
    const safe = sanitizeDisplayName(nextName);
    if (safe.length === 0) return;
    await drivers.data
      .from("media_files")
      .update({ file_name: buildFileName(folder, safe) })
      .eq("id", row.id);
    await loadRows();
  }

  async function moveSaved(row: MediaRow, nextFolder: string) {
    if (drivers === null) return;
    const folder = sanitizeFolder(nextFolder);
    const { displayName } = parseFileName(row.file_name);
    await drivers.data
      .from("media_files")
      .update({ file_name: buildFileName(folder, displayName) })
      .eq("id", row.id);
    setActiveFolder(folder);
    await loadRows();
  }

  async function deleteSaved(row: MediaRow) {
    if (drivers === null || userId === null || companyId === null) return;
    const url = signedUrls[row.id] ?? "";
    await moveToTrash({
      drivers,
      userId,
      companyId,
      appId: "camera",
      itemType: row.type,
      itemName: parseFileName(row.file_name).displayName,
      itemData: {
        ...(row as unknown as Record<string, unknown>),
        url,
        bucket: STORAGE_BUCKET,
      },
      originalId: row.id,
    });
    await drivers.data.from("media_files").delete().eq("id", row.id);
    setSignedUrls((prev) => {
      const copy = { ...prev };
      delete copy[row.id];
      return copy;
    });
    await loadRows();
  }

  function createFolder(name: string) {
    const folder = sanitizeFolder(name);
    if (!extraFolders.includes(folder) && folder !== DEFAULT_FOLDER) {
      setExtraFolders((prev) => [...prev, folder]);
    }
    setActiveFolder(folder);
    setShowNewFolder(false);
  }

  const canRecord = isRecordingSupported();
  const ActiveFolderIcon =
    activeFolder === DEFAULT_FOLDER ? FolderOpen : Folder;

  return (
    <div style={APP}>
      <aside style={ASIDE}>
        <div
          style={{
            padding: "14px 14px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Camera size={15} style={{ color: "#a5b4fc" }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Câmera
          </span>
        </div>

        <div style={{ padding: "0 10px 10px" }}>
          <button
            type="button"
            onClick={() => setView("capture")}
            style={{
              ...BTN,
              width: "100%",
              padding: "9px 12px",
              borderRadius: 9,
              background:
                view === "capture" ? "rgba(99,102,241,0.18)" : "#6366f1",
              color: view === "capture" ? "#a5b4fc" : "#fff",
              fontSize: 13,
              fontWeight: 600,
              border:
                view === "capture" ? "1px solid rgba(99,102,241,0.30)" : "none",
            }}
          >
            <Camera size={13} /> Nova captura
          </button>
        </div>

        <div
          style={{
            padding: "8px 14px 4px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Pastas
          </span>
          <button
            type="button"
            aria-label="Nova pasta"
            onClick={() => setShowNewFolder(true)}
            style={{
              ...BTN,
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "transparent",
              color: "var(--text-tertiary)",
            }}
          >
            <Plus size={12} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 8px 10px",
            scrollbarWidth: "none",
          }}
        >
          {folders.map((f) => {
            const active = f === activeFolder;
            const count = folderCounts[f] ?? 0;
            const Ic = f === DEFAULT_FOLDER ? FolderOpen : Folder;
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setActiveFolder(f);
                  setView("gallery");
                }}
                style={{
                  ...BTN,
                  width: "100%",
                  justifyContent: "flex-start",
                  padding: "7px 10px",
                  borderRadius: 7,
                  marginBottom: 2,
                  background: active ? "rgba(255,255,255,0.06)" : "transparent",
                  color: active
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  gap: 8,
                }}
              >
                <Ic
                  size={13}
                  style={{
                    color: active ? "#a5b4fc" : "var(--text-tertiary)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    textAlign: "left",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    background: "rgba(255,255,255,0.04)",
                    padding: "1px 6px",
                    borderRadius: 8,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            padding: "10px 12px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <PrivacyCard />
        </div>
      </aside>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {view === "gallery" && (
          <>
            {pending.length > 0 && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 20px",
                  background: "rgba(232,120,40,0.12)",
                  borderBottom: "1px solid rgba(232,120,40,0.35)",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle
                  size={14}
                  style={{ color: "#f59e0b", flexShrink: 0 }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.85)",
                    lineHeight: 1.4,
                  }}
                >
                  {pending.length}{" "}
                  {pending.length === 1
                    ? "captura não salva"
                    : "capturas não salvas"}{" "}
                  — fechar agora vai perdê-las
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void saveAllPending();
                  }}
                  style={{
                    ...BTN,
                    padding: "5px 10px",
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "rgba(34,197,94,0.15)",
                    color: "#86efac",
                    border: "1px solid rgba(34,197,94,0.25)",
                  }}
                >
                  <Check size={11} /> Salvar todas
                </button>
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
              }}
            >
              <ActiveFolderIcon
                size={14}
                style={{ color: "#a5b4fc", flexShrink: 0 }}
              />
              <h2
                style={{
                  margin: "0 12px 0 0",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.75)",
                  whiteSpace: "nowrap",
                  minWidth: 80,
                }}
              >
                {activeFolder}
              </h2>
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.35)",
                  fontWeight: 400,
                  whiteSpace: "nowrap",
                }}
              >
                {visibleRows.length}{" "}
                {visibleRows.length === 1 ? "item" : "itens"}
              </span>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: 8,
                  padding: "6px 10px",
                }}
              >
                <Search size={13} color="rgba(255,255,255,0.30)" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar fotos e vídeos..."
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.80)",
                    fontSize: 13,
                    outline: "none",
                    caretColor: "#6366f1",
                    fontFamily: "inherit",
                  }}
                />
                {search.length > 0 && (
                  <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={() => setSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.30)",
                      padding: 0,
                      display: "flex",
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setView("capture")}
                style={{
                  ...BTN,
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#6366f1",
                  color: "#fff",
                }}
              >
                <ImagePlus size={13} /> Capturar
              </button>
            </div>

            <div
              style={{ flex: 1, overflowY: "auto", padding: "16px 20px 160px" }}
            >
              {pending.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--text-tertiary)",
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        flex: 1,
                      }}
                    >
                      Pendentes ({pending.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void saveAllPending();
                      }}
                      style={{
                        ...BTN,
                        padding: "5px 10px",
                        borderRadius: 7,
                        fontSize: 11,
                        fontWeight: 600,
                        background: "rgba(34,197,94,0.15)",
                        color: "#86efac",
                        border: "1px solid rgba(34,197,94,0.25)",
                      }}
                    >
                      <Check size={11} /> Salvar todos
                    </button>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(180px, 1fr))",
                    }}
                  >
                    {pending.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          borderRadius: 10,
                          overflow: "hidden",
                          background: "#0f1318",
                          border: "1px dashed rgba(255,255,255,0.10)",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            aspectRatio: "4/3",
                            background: "#000",
                          }}
                        >
                          {item.type === "photo" ? (
                            <img
                              src={item.url}
                              alt={item.displayName}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <video
                              src={item.url}
                              controls
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                background: "#000",
                              }}
                            />
                          )}
                          <div
                            style={{
                              position: "absolute",
                              top: 6,
                              left: 6,
                              background: "rgba(0,0,0,0.65)",
                              borderRadius: 4,
                              padding: "1px 6px",
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#fff",
                              letterSpacing: "0.05em",
                            }}
                          >
                            NÃO SALVO
                          </div>
                        </div>
                        <div style={{ padding: "8px 10px" }}>
                          <button
                            type="button"
                            onClick={() => setRenamePending(item)}
                            style={{
                              ...BTN,
                              width: "100%",
                              justifyContent: "flex-start",
                              padding: 0,
                              background: "transparent",
                              color: "var(--text-secondary)",
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            <span
                              style={{
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                textAlign: "left",
                              }}
                            >
                              {item.displayName}
                            </span>
                            <Pencil
                              size={11}
                              style={{ color: "var(--text-tertiary)" }}
                            />
                          </button>
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--text-tertiary)",
                              marginTop: 2,
                            }}
                          >
                            {formatBytes(item.sizeBytes)}
                            {item.durationMs !== null
                              ? ` · ${formatDuration(item.durationMs)}`
                              : ""}
                          </div>
                          <div
                            style={{ display: "flex", gap: 6, marginTop: 8 }}
                          >
                            <button
                              type="button"
                              disabled={item.saving}
                              onClick={() => {
                                void savePending(item.id);
                              }}
                              style={{
                                ...BTN,
                                flex: 1,
                                padding: "6px 8px",
                                borderRadius: 7,
                                background: item.saving
                                  ? "rgba(34,197,94,0.18)"
                                  : "#22c55e",
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {item.saving ? (
                                <Loader2
                                  size={11}
                                  style={{
                                    animation: "spin 1s linear infinite",
                                  }}
                                />
                              ) : (
                                <Check size={11} />
                              )}
                              Salvar
                            </button>
                            <button
                              type="button"
                              aria-label="Baixar"
                              onClick={() => downloadPending(item)}
                              style={{
                                ...BTN,
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                background: "rgba(255,255,255,0.05)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              <Download size={12} />
                            </button>
                            <button
                              type="button"
                              aria-label="Descartar"
                              onClick={() => discardPending(item.id)}
                              style={{
                                ...BTN,
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                background: "rgba(239,68,68,0.12)",
                                color: "#fca5a5",
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loadingRows ? (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(180px, 1fr))",
                  }}
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="skeleton-pulse"
                      style={{
                        aspectRatio: "4/3",
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: 12,
                      }}
                    />
                  ))}
                </div>
              ) : visibleRows.length === 0 ? (
                <EmptyState
                  icon="ImageIcon"
                  title={search.length > 0 ? "Nenhum resultado" : "Pasta vazia"}
                  description={
                    search.length > 0
                      ? `Nada encontrado para "${search}".`
                      : `Capture fotos e vídeos para preencher a pasta ${activeFolder}.`
                  }
                  action={
                    search.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => setView("capture")}
                        style={{
                          ...BTN,
                          marginTop: 6,
                          padding: "8px 16px",
                          borderRadius: 8,
                          background: "#6366f1",
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        <Camera size={13} /> Abrir câmera
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(180px, 1fr))",
                  }}
                >
                  {visibleRows.map((r) => (
                    <SavedTile
                      key={r.id}
                      row={r}
                      signedUrl={signedUrls[r.id] ?? null}
                      loading={signedUrls[r.id] === undefined}
                      onOpen={() => setPreviewRow(r)}
                      onMenu={() =>
                        setOpenMenuId((prev) => (prev === r.id ? null : r.id))
                      }
                      menuOpen={openMenuId === r.id}
                      onCloseMenu={() => setOpenMenuId(null)}
                      onRename={() => {
                        setRenameTarget(r);
                        setOpenMenuId(null);
                      }}
                      onMove={() => {
                        setMoveTarget(r);
                        setOpenMenuId(null);
                      }}
                      onDownload={() => {
                        void downloadSaved(r);
                        setOpenMenuId(null);
                      }}
                      onDelete={() => {
                        setDeleteTarget(r);
                        setOpenMenuId(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {view === "capture" && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setView("gallery")}
                aria-label="Voltar à galeria"
                style={{
                  ...BTN,
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--text-secondary)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <ArrowLeft size={14} />
              </button>
              <Camera size={14} style={{ color: "#a5b4fc" }} />
              <h2
                style={{
                  margin: "0 6px 0 0",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.75)",
                  whiteSpace: "nowrap",
                }}
              >
                Captura
              </h2>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                Salvando em{" "}
                <strong
                  style={{ color: "var(--text-secondary)", fontWeight: 600 }}
                >
                  {activeFolder}
                </strong>
              </span>

              <div style={{ flex: 1 }} />

              {permState === "granted" && devices.length > 0 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  aria-label="Câmera"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    fontFamily: "inherit",
                    outline: "none",
                    maxWidth: 160,
                  }}
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label.length > 0
                        ? d.label
                        : `Câmera ${d.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              )}

              {permState === "granted" && (
                <select
                  value={resolution.label}
                  onChange={(e) => {
                    const r = RESOLUTIONS.find(
                      (x) => x.label === e.target.value,
                    );
                    if (r !== undefined) setResolution(r);
                  }}
                  aria-label="Resolução"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                >
                  {RESOLUTIONS.map((r) => (
                    <option key={r.label} value={r.label}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}

              {permState === "granted" && (
                <button
                  onClick={() => setMirror((m) => !m)}
                  title={mirror ? "Espelho ativo" : "Espelho desativado"}
                  aria-pressed={mirror}
                  style={{
                    ...BTN,
                    padding: "5px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    background: mirror
                      ? "rgba(99,102,241,0.18)"
                      : "rgba(255,255,255,0.05)",
                    color: mirror ? "#a5b4fc" : "var(--text-tertiary)",
                    border: mirror
                      ? "1px solid rgba(99,102,241,0.30)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <FlipHorizontal size={13} /> Espelhar
                </button>
              )}

              {permState === "granted" && devices.length > 1 && (
                <button
                  aria-label="Alternar câmera"
                  onClick={() => {
                    void switchCamera();
                  }}
                  style={{
                    ...BTN,
                    padding: "5px 8px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text-secondary)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <RefreshCw size={13} />
                </button>
              )}
            </div>

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {permState !== "granted" ? (
                <PermScreen
                  permState={permState}
                  onRequest={() => {
                    void requestCamera();
                  }}
                  onBack={() => setView("gallery")}
                />
              ) : (
                <>
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      background: "#000",
                      overflow: "hidden",
                    }}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        transform: mirror ? "scaleX(-1)" : "none",
                        transition: "transform 200ms ease",
                      }}
                    />
                    {recState !== "idle" && (
                      <div
                        style={{
                          position: "absolute",
                          top: 14,
                          left: 14,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          background: "rgba(0,0,0,0.7)",
                          borderRadius: 8,
                          padding: "6px 12px",
                        }}
                      >
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: "#ef4444",
                            opacity: recState === "paused" ? 0.4 : 1,
                            animation:
                              recState === "recording"
                                ? "pulse 1s infinite"
                                : "none",
                          }}
                        />
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                            color: "#fff",
                          }}
                        >
                          {formatDuration(recMs)}
                        </span>
                        {recState === "paused" && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "rgba(255,255,255,0.6)",
                            }}
                          >
                            Pausado
                          </span>
                        )}
                      </div>
                    )}
                    {flashActive && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "#fff",
                          opacity: 0.8,
                          pointerEvents: "none",
                          transition: "opacity 150ms",
                        }}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 16,
                      padding: "14px 20px",
                      background: "#0d1117",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      flexShrink: 0,
                    }}
                  >
                    {recState === "idle" && (
                      <div
                        style={{
                          display: "flex",
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: 20,
                          padding: 3,
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {(["photo", "video"] as CaptureMode[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => setMode(m)}
                            aria-pressed={mode === m}
                            style={{
                              ...BTN,
                              padding: "5px 14px",
                              borderRadius: 16,
                              fontSize: 12,
                              fontWeight: 500,
                              background:
                                mode === m
                                  ? m === "photo"
                                    ? "#6366f1"
                                    : "#ef4444"
                                  : "transparent",
                              color:
                                mode === m ? "#fff" : "var(--text-secondary)",
                            }}
                          >
                            {m === "photo" ? (
                              <>
                                <Camera size={12} /> Foto
                              </>
                            ) : (
                              <>
                                <Video size={12} /> Vídeo
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {mode === "photo" && recState === "idle" && (
                      <button
                        aria-label="Tirar foto"
                        onClick={capturePhoto}
                        style={{
                          ...BTN,
                          width: 64,
                          height: 64,
                          borderRadius: "50%",
                          background: "#fff",
                          border: "4px solid rgba(255,255,255,0.3)",
                          boxShadow: "0 0 0 2px rgba(255,255,255,0.1)",
                        }}
                      >
                        <Camera size={24} style={{ color: "#11161c" }} />
                      </button>
                    )}

                    {mode === "video" && (
                      <>
                        {recState === "idle" && (
                          <button
                            aria-label="Gravar vídeo"
                            onClick={startRecording}
                            disabled={!canRecord}
                            style={{
                              ...BTN,
                              width: 64,
                              height: 64,
                              borderRadius: "50%",
                              background: canRecord
                                ? "#ef4444"
                                : "rgba(255,255,255,0.1)",
                              border: "4px solid rgba(255,255,255,0.3)",
                            }}
                          >
                            <Circle
                              size={24}
                              fill="#fff"
                              style={{ color: "#fff" }}
                            />
                          </button>
                        )}
                        {recState === "recording" && (
                          <>
                            <button
                              aria-label="Pausar gravação"
                              onClick={pauseRecording}
                              style={{
                                ...BTN,
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.12)",
                                color: "#fff",
                              }}
                            >
                              <Pause size={18} />
                            </button>
                            <button
                              aria-label="Parar gravação"
                              onClick={stopRecording}
                              style={{
                                ...BTN,
                                width: 64,
                                height: 64,
                                borderRadius: "50%",
                                background: "#ef4444",
                                border: "4px solid rgba(255,255,255,0.3)",
                              }}
                            >
                              <Square
                                size={22}
                                fill="#fff"
                                style={{ color: "#fff" }}
                              />
                            </button>
                          </>
                        )}
                        {recState === "paused" && (
                          <>
                            <button
                              aria-label="Continuar gravação"
                              onClick={resumeRecording}
                              style={{
                                ...BTN,
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.12)",
                                color: "#fff",
                              }}
                            >
                              <Play size={18} />
                            </button>
                            <button
                              aria-label="Parar gravação"
                              onClick={stopRecording}
                              style={{
                                ...BTN,
                                width: 64,
                                height: 64,
                                borderRadius: "50%",
                                background: "#ef4444",
                                border: "4px solid rgba(255,255,255,0.3)",
                              }}
                            >
                              <Square
                                size={22}
                                fill="#fff"
                                style={{ color: "#fff" }}
                              />
                            </button>
                          </>
                        )}
                        {!canRecord && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-tertiary)",
                              maxWidth: 200,
                              textAlign: "center",
                            }}
                          >
                            Gravação não suportada neste navegador
                          </span>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setView("gallery")}
                      style={{
                        ...BTN,
                        padding: "8px 14px",
                        borderRadius: 8,
                        fontSize: 12,
                        background: "rgba(99,102,241,0.15)",
                        color: "#a5b4fc",
                        border: "1px solid rgba(99,102,241,0.25)",
                      }}
                    >
                      Galeria ({pending.length + rows.length})
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {previewRow !== null && (
        <PreviewModal
          row={previewRow}
          signedUrl={signedUrls[previewRow.id] ?? null}
          onClose={() => setPreviewRow(null)}
        />
      )}

      {renameTarget !== null && (
        <RenameModal
          title="Renomear arquivo"
          initial={parseFileName(renameTarget.file_name).displayName}
          onConfirm={async (next) => {
            const target = renameTarget;
            setRenameTarget(null);
            await renameSaved(target, next);
          }}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {renamePending !== null && (
        <RenameModal
          title="Renomear captura"
          initial={renamePending.displayName}
          onConfirm={(next) => {
            const target = renamePending;
            setRenamePending(null);
            const safe = sanitizeDisplayName(next);
            if (safe.length === 0) return;
            setPending((prev) =>
              prev.map((i) =>
                i.id === target.id ? { ...i, displayName: safe } : i,
              ),
            );
          }}
          onClose={() => setRenamePending(null)}
        />
      )}

      {moveTarget !== null && (
        <MoveFolderModal
          folders={folders}
          current={parseFileName(moveTarget.file_name).folder}
          onPick={async (folder) => {
            const target = moveTarget;
            setMoveTarget(null);
            await moveSaved(target, folder);
          }}
          onCreate={() => {
            setMoveTarget(null);
            setShowNewFolder(true);
          }}
          onClose={() => setMoveTarget(null)}
        />
      )}

      {showNewFolder && (
        <RenameModal
          title="Nova pasta"
          initial=""
          onConfirm={(next) => createFolder(next)}
          onClose={() => setShowNewFolder(false)}
        />
      )}

      <DeleteConfirmModal
        open={deleteTarget !== null}
        title="Excluir arquivo"
        message={
          deleteTarget !== null
            ? `Excluir "${parseFileName(deleteTarget.file_name).displayName}" permanentemente?`
            : ""
        }
        onConfirm={async () => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target !== null) await deleteSaved(target);
        }}
        onClose={() => setDeleteTarget(null)}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
