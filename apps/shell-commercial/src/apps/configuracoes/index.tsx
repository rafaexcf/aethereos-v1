import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  User,
  Bell,
  Shield,
  FileText,
  PanelBottom,
  LayoutGrid,
  Palette,
  Info,
  ChevronRight,
  Settings,
  Search,
  Eye,
  EyeOff,
  Check,
  Download,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  Mail,
  Volume2,
  Globe,
  ArrowRight,
  Monitor,
  Building2,
  ImagePlus,
  Trash2,
  Plus,
  RotateCcw,
  Users,
  AlertTriangle,
  Sun,
  Moon,
  ChevronDown,
  Lock,
  Minus,
  HelpCircle,
  BookOpen,
  Lightbulb,
  MessageSquare,
  Rocket,
  ExternalLink,
  Phone,
  X,
  Clock,
  StickyNote,
  CloudSun,
  ListTodo,
  Store,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDockStore } from "../../stores/dockStore";
import { useOSStore } from "../../stores/osStore";
import { useUserPreference } from "../../hooks/useUserPreference";
import { useTheme } from "../../lib/theme/theme-provider";
import { useGestorStore } from "../../stores/gestorStore";
import { useRhStore } from "../../stores/rhStore";
import { useSettingsNavStore } from "../../stores/settingsNavStore";
import { TwoFactorAuth } from "../../components/shared/TwoFactorAuth";
import { APP_REGISTRY } from "../registry";
import { useSessionStore } from "../../stores/session";
import { useDrivers } from "../../lib/drivers-context";
import { AnimatedThemeToggler } from "../../components/ui/animated-theme-toggler";
import {
  useMesaStore,
  WALLPAPERS,
  WALLPAPER_NAMES,
  getWallpaperStyle,
  CUSTOM_WALLPAPER_ID,
  DEFAULT_LAYOUT,
} from "../../stores/mesaStore";
import type { MesaItem } from "../../types/os";
import { DDI_OPTIONS } from "../../data/ddi-options";
import { useModalA11y } from "../../components/shared/useModalA11y";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId =
  | "home"
  | "minha-empresa"
  | "perfil"
  | "notificacoes"
  | "dados-privacidade"
  | "dock"
  | "mesa"
  | "aparencia"
  | "sobre";

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof User;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// ─── Nav data ─────────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Conta",
    items: [
      { id: "minha-empresa", label: "Minha Empresa", icon: Building2 },
      { id: "perfil", label: "Meu Perfil", icon: User },
      { id: "notificacoes", label: "Notificações", icon: Bell },
      { id: "dados-privacidade", label: "Privacidade", icon: FileText },
    ],
  },
  {
    label: "Customização",
    items: [
      { id: "dock", label: "Dock", icon: PanelBottom },
      { id: "mesa", label: "Mesa", icon: LayoutGrid },
      { id: "aparencia", label: "Aparência", icon: Palette },
    ],
  },
  {
    label: "Avançado",
    items: [{ id: "sobre", label: "Sistema", icon: Info }],
  },
];

const TAB_LABELS: Record<TabId, string> = {
  home: "Painel de Configurações",
  "minha-empresa": "Minha Empresa",
  perfil: "Meu Perfil",
  notificacoes: "Notificações",
  "dados-privacidade": "Privacidade",
  dock: "Dock",
  mesa: "Mesa",
  aparencia: "Aparência",
  sobre: "Sistema",
};

// ─── Design primitives ────────────────────────────────────────────────────────

function ContentHeader({
  icon: Icon,
  iconBg,
  iconColor,
  iconUrl,
  noContainer,
  title,
  subtitle,
  right,
}: {
  icon: typeof User;
  iconBg: string;
  iconColor: string;
  iconUrl?: string | null;
  /** Quando true com iconUrl, exibe a imagem diretamente sem container/borda */
  noContainer?: boolean;
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
      {noContainer && iconUrl != null ? (
        <img
          src={iconUrl}
          alt=""
          style={{
            height: 56,
            width: "auto",
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: iconUrl != null ? "transparent" : iconBg,
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {iconUrl != null ? (
            <img
              src={iconUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Icon size={28} style={{ color: iconColor }} strokeWidth={1.5} />
          )}
        </div>
      )}
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

function SettingRow({
  label,
  sublabel,
  last,
  danger,
  icon,
  labelBadge,
  children,
}: {
  label: string;
  sublabel?: string;
  last?: boolean;
  danger?: boolean;
  icon?: React.ReactNode;
  labelBadge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "11px 16px",
        gap: 12,
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon !== undefined && icon}
          <span
            style={{
              fontSize: 13,
              color: danger ? "var(--status-error)" : "var(--text-primary)",
            }}
          >
            {label}
          </span>
          {labelBadge !== undefined && labelBadge}
        </div>
        {sublabel !== undefined && (
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {sublabel}
          </span>
        )}
      </div>
      {children !== undefined && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function SettingInput({
  value,
  onChange,
  readOnly,
  mono,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  mono?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      style={{
        width: 220,
        background: readOnly
          ? "rgba(255,255,255,0.03)"
          : "rgba(255,255,255,0.06)",
        border: readOnly
          ? "1px solid rgba(255,255,255,0.05)"
          : "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "7px 11px",
        fontSize: mono ? 12 : 13,
        fontFamily: mono ? "var(--font-mono)" : "inherit",
        color: readOnly ? "var(--text-secondary)" : "var(--text-primary)",
        cursor: readOnly ? "not-allowed" : "text",
        outline: "none",
        transition: "border-color 120ms ease, box-shadow 120ms ease",
      }}
      onFocus={(e) => {
        if (!readOnly) {
          e.currentTarget.style.borderColor = "rgba(99,102,241,0.65)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)";
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = readOnly
          ? "rgba(255,255,255,0.05)"
          : "rgba(255,255,255,0.10)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

// ─── SmartSelect — dropdown com busca, scroll e posicionamento inteligente ────

interface SmartSelectOption {
  value: string;
  label: string;
  /** Texto auxiliar de busca (ex: nome do país para o DDI) */
  name?: string;
  /** Ícone/imagem exibido antes do label no trigger e na lista */
  icon?: React.ReactNode;
}

interface SmartSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SmartSelectOption[];
  placeholder?: string;
  width?: number | string;
  /** Mostra campo de busca. Default true quando options.length > 5 */
  searchable?: boolean;
}

function SmartSelect({
  value,
  onChange,
  options,
  placeholder = "Selecionar",
  width = 220,
  searchable,
}: SmartSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const shouldSearch = searchable ?? options.length > 5;

  const selected = options.find((o) => o.value === value);
  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) => {
          const q = query.toLowerCase();
          return (
            o.label.toLowerCase().includes(q) ||
            (o.name ?? "").toLowerCase().includes(q)
          );
        });

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("[data-smart-select-portal]")
      )
        close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  function handleOpen() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dropW = typeof width === "number" ? width : rect.width;
    const dropH = Math.min(
      filtered.length * 36 + (shouldSearch ? 44 : 8) + 8,
      288,
    );
    const spaceBelow = vh - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openAbove = spaceBelow < dropH && spaceAbove > spaceBelow;
    const leftPos = rect.left + dropW > vw ? vw - dropW - 8 : rect.left;
    setDropStyle({
      position: "fixed",
      top: openAbove ? rect.top - dropH - 4 : rect.bottom + 4,
      left: leftPos,
      width: dropW,
      zIndex: 9999,
    });
    setOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : handleOpen())}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          width,
          background: open
            ? "rgba(255,255,255,0.08)"
            : "rgba(255,255,255,0.06)",
          border: open
            ? "1px solid rgba(99,102,241,0.65)"
            : "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          padding: "7px 10px 7px 11px",
          fontSize: 13,
          color: selected ? "var(--text-primary)" : "var(--text-tertiary)",
          cursor: "pointer",
          outline: "none",
          transition: "border-color 120ms ease, background 120ms ease",
          boxShadow: open ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {selected?.icon}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          style={{
            flexShrink: 0,
            color: "var(--text-tertiary)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 150ms ease",
          }}
        />
      </button>

      {open &&
        createPortal(
          <div
            data-smart-select-portal
            style={{
              ...dropStyle,
              background: "var(--bg-elevated)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10,
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {shouldSearch && (
              <div
                style={{
                  padding: "8px 8px 4px",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div style={{ position: "relative" }}>
                  <Search
                    size={12}
                    style={{
                      position: "absolute",
                      left: 9,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-tertiary)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar…"
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6,
                      padding: "5px 8px 5px 28px",
                      fontSize: 12,
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            )}
            <div
              style={{ overflowY: "auto", maxHeight: 240, padding: "4px 0" }}
            >
              {filtered.length === 0 ? (
                <div
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                  }}
                >
                  Nenhum resultado
                </div>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(o.value);
                      close();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: 13,
                      color:
                        o.value === value
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      background:
                        o.value === value
                          ? "rgba(99,102,241,0.14)"
                          : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 80ms ease",
                      fontWeight: o.value === value ? 500 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (o.value !== value)
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        o.value === value
                          ? "rgba(99,102,241,0.14)"
                          : "transparent";
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {o.icon}
                      <span>{o.label}</span>
                    </span>
                    {o.value === value && (
                      <Check
                        size={12}
                        strokeWidth={2.5}
                        style={{ color: "#818cf8", flexShrink: 0 }}
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Alias mantém compatibilidade com os usos existentes de SettingSelect */
function SettingSelect(props: SmartSelectProps) {
  return <SmartSelect {...props} />;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        padding: 0,
        cursor: "pointer",
        background: on ? "#63f27e" : "rgba(255,255,255,0.15)",
        transition: "background 200ms ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: 0,
          display: "block",
          width: 20,
          height: 20,
          borderRadius: 10,
          background: "#ffffff",
          transition: "transform 200ms ease",
          transform: on ? "translateX(22px)" : "translateX(2px)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
        }}
      />
    </button>
  );
}

function Badge({
  variant,
  children,
}: {
  variant: "success" | "warning" | "neutral";
  children: React.ReactNode;
}) {
  const styles = {
    success: { background: "rgba(16,185,129,0.14)", color: "#34d399" },
    warning: { background: "rgba(245,158,11,0.14)", color: "#fbbf24" },
    neutral: {
      background: "rgba(255,255,255,0.06)",
      color: "var(--text-tertiary)",
    },
  };
  return (
    <span
      style={{
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 500,
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}

function InlineButton({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
        border: danger
          ? "1px solid rgba(239,68,68,0.20)"
          : "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 500,
        color: danger ? "#f87171" : "var(--text-primary)",
        cursor: "pointer",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(239,68,68,0.20)"
          : "rgba(255,255,255,0.11)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(239,68,68,0.12)"
          : "rgba(255,255,255,0.06)";
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "rgba(99,102,241,0.88)",
        borderRadius: 8,
        padding: "8px 20px",
        fontSize: 13,
        fontWeight: 500,
        color: "#ffffff",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 120ms ease, opacity 120ms ease",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "#6366f1";
      }}
      onMouseLeave={(e) => {
        if (!disabled)
          e.currentTarget.style.background = "rgba(99,102,241,0.88)";
      }}
    >
      {children}
    </button>
  );
}

function SaveRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      {children}
    </div>
  );
}

function SaveLabel({
  state,
  label,
}: {
  state: "idle" | "saving" | "saved" | "error";
  label: string;
}) {
  if (state === "saving")
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Loader2 size={13} className="animate-spin" />
        Salvando…
      </span>
    );
  if (state === "saved")
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Check size={13} />
        Salvo!
      </span>
    );
  return <>{label}</>;
}

// ─── Image upload card (avatar / logo) ───────────────────────────────────────

/**
 * SupabaseBrowserAuthDriver e SupabaseBrowserDataDriver instanciam clients
 * separados — apesar de persistSession compartilhar o token via localStorage,
 * o data client nem sempre vê o JWT a tempo de operações de Storage.
 * Este helper força a sincronização do session no data client antes do upload.
 */
async function syncDataClientSession(
  drivers: NonNullable<ReturnType<typeof useDrivers>>,
): Promise<void> {
  const r = await drivers.auth.getSession();
  if (!r.ok || r.value === null) return;
  const session = r.value;
  if (session.refresh_token === undefined) return;
  const client = drivers.data.getClient();
  const current = await client.auth.getSession();
  if (current.data.session?.access_token === session.access_token) return;
  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

const MAX_IMG_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_IMG_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function ImageUploadCard({
  url,
  onUpload,
  onRemove,
  shape,
  fallback,
  title,
  helper,
  uploading,
  error,
}: {
  url: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  shape: "circle" | "square";
  fallback: React.ReactNode;
  title: string;
  helper: string;
  uploading: boolean;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [imgHovered, setImgHovered] = useState(false);
  const radius = shape === "circle" ? "50%" : 12;

  function pickFile() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file === undefined) return;
    onUpload(file);
    e.target.value = "";
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: 18,
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 72,
          height: 72,
          borderRadius: radius,
          overflow: "hidden",
          flexShrink: 0,
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(30,41,80,0.95))",
          border: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: url !== null ? "zoom-in" : "default",
        }}
        onClick={() => {
          if (url !== null && !uploading) setPreview(true);
        }}
        onMouseEnter={() => {
          if (url !== null && !uploading) setImgHovered(true);
        }}
        onMouseLeave={() => setImgHovered(false)}
        title={url !== null ? `Ver ${title}` : undefined}
      >
        {url !== null ? (
          <img
            src={url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          fallback
        )}
        {/* Hover overlay */}
        {url !== null && !uploading && imgHovered && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.38)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Eye
              size={18}
              strokeWidth={1.8}
              style={{ color: "rgba(255,255,255,0.9)" }}
            />
          </div>
        )}
        {uploading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(6,9,18,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(2px)",
            }}
          >
            <Loader2
              size={18}
              className="animate-spin"
              style={{ color: "rgba(255,255,255,0.9)" }}
            />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 3,
            lineHeight: 1.4,
          }}
        >
          {helper}
        </p>
        {error !== null && (
          <p
            style={{
              fontSize: 11,
              color: "#f87171",
              marginTop: 4,
            }}
          >
            {error}
          </p>
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button
            type="button"
            onClick={pickFile}
            disabled={uploading}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
              cursor: uploading ? "wait" : "pointer",
              opacity: uploading ? 0.6 : 1,
              transition: "background 120ms ease",
            }}
            onMouseEnter={(e) => {
              if (!uploading)
                e.currentTarget.style.background = "rgba(255,255,255,0.11)";
            }}
            onMouseLeave={(e) => {
              if (!uploading)
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
          >
            {url !== null ? "Trocar" : "Enviar arquivo"}
          </button>
          {url !== null && (
            <button
              type="button"
              onClick={onRemove}
              disabled={uploading}
              style={{
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.18)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 500,
                color: "#f87171",
                cursor: uploading ? "wait" : "pointer",
                opacity: uploading ? 0.6 : 1,
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => {
                if (!uploading)
                  e.currentTarget.style.background = "rgba(239,68,68,0.18)";
              }}
              onMouseLeave={(e) => {
                if (!uploading)
                  e.currentTarget.style.background = "rgba(239,68,68,0.10)";
              }}
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMG_TYPES.join(",")}
        onChange={handleChange}
        style={{ display: "none" }}
      />

      {/* Preview modal */}
      {preview &&
        url !== null &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
            onClick={() => setPreview(false)}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setPreview(false)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer",
                color: "rgba(255,255,255,0.85)",
                zIndex: 1,
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.10)";
              }}
            >
              <X size={16} strokeWidth={2} />
            </button>

            {/* Image */}
            <img
              src={url}
              alt={title}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "80vmin",
                maxHeight: "80vmin",
                width: "auto",
                height: "auto",
                borderRadius: shape === "circle" ? "50%" : 20,
                boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
                border: "2px solid rgba(255,255,255,0.12)",
                display: "block",
              }}
            />

            {/* Label */}
            <p
              style={{
                position: "absolute",
                bottom: 24,
                left: 0,
                right: 0,
                textAlign: "center",
                fontSize: 13,
                color: "rgba(255,255,255,0.5)",
                pointerEvents: "none",
              }}
            >
              {title}
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── Tab: Minha Empresa (CNPJ + dados PJ) ────────────────────────────────────

interface CnpjPreview {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: string;
  atividade_principal: string;
  municipio: string;
  uf: string;
}

function maskCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskCpf(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function TabMinhaEmpresa({
  logoUrl,
  setLogoUrl,
}: {
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
}) {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();
  const openApp = useOSStore((s) => s.openApp);
  const setPendingTab = useGestorStore((s) => s.setPendingTab);

  const [cnpjDisplay, setCnpjDisplay] = useState("");
  const [cnpjPreview, setCnpjPreview] = useState<CnpjPreview | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [founder, setFounder] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  async function handleLogoUpload(file: File) {
    if (drivers === null || activeCompanyId === null) return;
    setLogoError(null);
    if (!ACCEPTED_IMG_TYPES.includes(file.type)) {
      setLogoError("Formato inválido. Use JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > MAX_IMG_BYTES) {
      setLogoError("Arquivo maior que 2 MB.");
      return;
    }

    setLogoUploading(true);
    await syncDataClientSession(drivers);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${activeCompanyId}.${ext}`;
    const client = drivers.data.getClient();
    const { error: upErr } = await client.storage
      .from("company-logos")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr !== null) {
      setLogoError(upErr.message);
      setLogoUploading(false);
      return;
    }
    const { data: pub } = client.storage
      .from("company-logos")
      .getPublicUrl(path);
    const newUrl = `${pub.publicUrl}?v=${Date.now()}`;
    const { error: updErr } = await drivers.data
      .from("companies")
      .update({ logo_url: newUrl })
      .eq("id", activeCompanyId);
    if (updErr !== null && updErr !== undefined) {
      setLogoError(updErr.message);
      setLogoUploading(false);
      return;
    }
    setLogoUrl(newUrl);
    setLogoUploading(false);
  }

  async function handleLogoRemove() {
    if (drivers === null || activeCompanyId === null) return;
    setLogoError(null);
    setLogoUploading(true);
    const { error } = await drivers.data
      .from("companies")
      .update({ logo_url: null })
      .eq("id", activeCompanyId);
    if (error !== null && error !== undefined) {
      setLogoError(error.message);
      setLogoUploading(false);
      return;
    }
    setLogoUrl(null);
    setLogoUploading(false);
  }

  // Hydrate from companies table — CNPJ é read-only depois do cadastro
  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    void drivers.data
      .from("companies")
      .select("cnpj,cnpj_data,created_at")
      .eq("id", activeCompanyId)
      .single()
      .then(
        ({
          data,
        }: {
          data: {
            cnpj: string | null;
            cnpj_data: CnpjPreview | null;
            created_at: string | null;
          } | null;
        }) => {
          if (data === null) return;
          if (data.cnpj !== null) setCnpjDisplay(maskCnpj(data.cnpj));
          if (data.cnpj_data !== null) setCnpjPreview(data.cnpj_data);
          if (data.created_at !== null)
            setCreatedAt(
              new Date(data.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }),
            );
        },
      );
  }, [drivers, activeCompanyId]);

  // Busca o fundador (role='owner') para exibir no cadastro
  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    void (async () => {
      const { data: ownerRow } = await drivers.data
        .from("users")
        .select("id,email,display_name")
        .eq("company_id", activeCompanyId)
        .eq("role", "owner")
        .maybeSingle();
      if (ownerRow === null) return;
      const owner = ownerRow as {
        id: string;
        email: string;
        display_name: string | null;
      };
      let name = owner.display_name ?? "";
      const { data: profile } = await drivers.data
        .from("profiles")
        .select("full_name")
        .eq("id", owner.id)
        .maybeSingle();
      if (profile !== null) {
        const p = profile as { full_name: string | null };
        if (p.full_name !== null && p.full_name !== "") name = p.full_name;
      }
      setFounder({
        name: name !== "" ? name : owner.email,
        email: owner.email,
      });
    })();
  }, [drivers, activeCompanyId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Building2}
        iconBg="rgba(6,182,212,0.22)"
        iconColor="#22d3ee"
        title="Minha Empresa"
        subtitle="Dados cadastrais da pessoa jurídica"
        right={
          <button
            type="button"
            onClick={() => {
              setPendingTab("cadastros");
              openApp("gestor", "Gestor");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              borderRadius: 8,
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.18)",
              color: "#22d3ee",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 150ms ease, border-color 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(34,211,238,0.14)";
              e.currentTarget.style.borderColor = "rgba(34,211,238,0.30)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(34,211,238,0.08)";
              e.currentTarget.style.borderColor = "rgba(34,211,238,0.18)";
            }}
          >
            <FileText size={12} strokeWidth={1.8} />
            Cadastro Completo
            <ArrowRight size={12} strokeWidth={1.8} />
          </button>
        }
      />

      {/* Cadastro Empresarial */}
      <div>
        <SectionLabel>Cadastro Empresarial</SectionLabel>

        <ImageUploadCard
          url={logoUrl}
          onUpload={(f) => void handleLogoUpload(f)}
          onRemove={() => void handleLogoRemove()}
          shape="square"
          fallback={
            <Building2
              size={32}
              style={{ color: "rgba(255,255,255,0.6)" }}
              strokeWidth={1.5}
            />
          }
          title="Logo da empresa"
          helper="JPG, PNG, WebP ou GIF até 2 MB"
          uploading={logoUploading}
          error={logoError}
        />

        <div style={{ marginTop: 12 }}>
          <SettingGroup>
            <SettingRow
              label="CNPJ"
              sublabel="Não é possível alterar após o cadastro"
              last
            >
              <input
                type="text"
                value={cnpjDisplay}
                readOnly
                data-1p-ignore="true"
                data-lpignore="true"
                style={{
                  width: 220,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 8,
                  padding: "7px 11px",
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-secondary)",
                  cursor: "not-allowed",
                  outline: "none",
                }}
              />
            </SettingRow>
          </SettingGroup>
        </div>

        {cnpjPreview !== null && (
          <div
            style={{
              marginTop: 12,
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            {/* Card body */}
            <div style={{ padding: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {cnpjPreview.razao_social}
                  </p>
                  {cnpjPreview.nome_fantasia !== null && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {cnpjPreview.nome_fantasia}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    cnpjPreview.situacao.toUpperCase() === "ATIVA"
                      ? "success"
                      : "neutral"
                  }
                >
                  {cnpjPreview.situacao}
                </Badge>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  marginTop: 6,
                  lineHeight: 1.5,
                }}
              >
                {cnpjPreview.atividade_principal}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginTop: 4,
                }}
              >
                {cnpjPreview.municipio} – {cnpjPreview.uf}
              </p>
            </div>

            {/* Footer strip */}
            {(createdAt !== null || founder !== null) && (
              <div
                style={{
                  padding: "8px 16px",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                  background: "rgba(0,0,0,0.10)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    lineHeight: 1.5,
                    textAlign: "right",
                  }}
                >
                  {"Cadastrado"}
                  {createdAt !== null ? ` em ${createdAt}` : ""}
                  {founder !== null ? ` por ${founder.name}` : ""}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Perfil (informações + senha + sessão + proteções) ──────────────────

function ChangePasswordDialog({
  open,
  onClose,
  drivers,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  drivers: ReturnType<typeof useDrivers>;
  userId: string | null;
}) {
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdState, setPwdState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const v = {
    length: newPwd.length >= 8,
    upper: /[A-Z]/.test(newPwd),
    number: /[0-9]/.test(newPwd),
    special: /[^A-Za-z0-9]/.test(newPwd),
    match: newPwd.length > 0 && newPwd === confirmPwd,
  };
  const canSave = v.length && v.upper && v.number && v.special && v.match;

  function handleClose() {
    setNewPwd("");
    setConfirmPwd("");
    setShowNew(false);
    setShowConfirm(false);
    setPwdState("idle");
    onClose();
  }

  async function handleSave() {
    if (!canSave || drivers === null || userId === null) return;
    setPwdState("saving");
    const client = drivers.data.getClient();
    const { error } = await client.auth.updateUser({ password: newPwd });
    if (error !== null && error !== undefined) {
      setPwdState("error");
      setTimeout(() => setPwdState("idle"), 2500);
      return;
    }
    setPwdState("saved");
    setTimeout(() => {
      handleClose();
    }, 1200);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          margin: "0 16px",
          background: "var(--bg-elevated)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 16,
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.12)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "24px 24px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(99,102,241,0.14)",
              border: "1px solid rgba(99,102,241,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Lock size={18} style={{ color: "#818cf8" }} strokeWidth={1.8} />
          </div>
          <div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 4,
                fontFamily: "var(--font-display)",
              }}
            >
              Alterar senha
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                lineHeight: 1.5,
              }}
            >
              A nova senha será aplicada imediatamente à sua conta.
            </p>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              Nova senha
            </label>
            <PwdInput
              value={newPwd}
              onChange={setNewPwd}
              show={showNew}
              onToggle={() => setShowNew((s) => !s)}
              placeholder="Digite a nova senha"
              width="100%"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              Confirmar nova senha
            </label>
            <PwdInput
              value={confirmPwd}
              onChange={setConfirmPwd}
              show={showConfirm}
              onToggle={() => setShowConfirm((s) => !s)}
              placeholder="Repita a nova senha"
              width="100%"
            />
          </div>

          {newPwd.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                paddingTop: 2,
              }}
            >
              <PasswordBadge ok={v.length} label="8+ caracteres" />
              <PasswordBadge ok={v.upper} label="Maiúscula" />
              <PasswordBadge ok={v.number} label="Número" />
              <PasswordBadge ok={v.special} label="Especial" />
              <PasswordBadge ok={v.match} label="Coincidem" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Error feedback — lado esquerdo */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {pwdState === "error" && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--status-error)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <AlertTriangle size={12} strokeWidth={2} />
                Erro ao alterar a senha. Tente novamente.
              </span>
            )}
          </div>

          {/* Botões — lado direito */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 120ms ease, color 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave || pwdState !== "idle"}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid rgba(99,102,241,0.4)",
                background:
                  !canSave || pwdState !== "idle"
                    ? "rgba(99,102,241,0.08)"
                    : "rgba(99,102,241,0.18)",
                color:
                  !canSave || pwdState !== "idle"
                    ? "rgba(129,140,248,0.45)"
                    : "#818cf8",
                fontSize: 13,
                fontWeight: 500,
                cursor: !canSave || pwdState !== "idle" ? "default" : "pointer",
                transition: "background 120ms ease, color 120ms ease",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onMouseEnter={(e) => {
                if (canSave && pwdState === "idle")
                  e.currentTarget.style.background = "rgba(99,102,241,0.28)";
              }}
              onMouseLeave={(e) => {
                if (canSave && pwdState === "idle")
                  e.currentTarget.style.background = "rgba(99,102,241,0.18)";
              }}
            >
              <SaveLabel state={pwdState} label="Alterar senha" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 500,
        background: ok ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.05)",
        color: ok ? "#34d399" : "var(--text-tertiary)",
        transition: "background 200ms ease, color 200ms ease",
      }}
    >
      {ok && <Check size={9} strokeWidth={2.5} />}
      {label}
    </span>
  );
}

function PwdInput({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  width = 220,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  width?: number | string;
}) {
  return (
    <div style={{ position: "relative", width }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        data-1p-ignore="true"
        data-lpignore="true"
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          padding: "7px 36px 7px 11px",
          fontSize: 13,
          color: "var(--text-primary)",
          outline: "none",
          transition: "border-color 120ms ease, box-shadow 120ms ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(99,102,241,0.65)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      <button
        type="button"
        onClick={onToggle}
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-tertiary)",
          padding: 0,
          display: "flex",
        }}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// ─── Cargos / Áreas / Tags — domínio profissional ─────────────────────────
//
// Cargos top-exec dispensam Área e Departamento; cargos admin marcam
// `grants_tenant_admin = true` (intencao apenas — autorizacao real continua via
// tenant_memberships.role + JWT claims).

const ADMIN_CARGOS = new Set<string>([
  "conselho_adm",
  "presidencia",
  "vice_presidencia",
]);
const TOP_EXEC_CARGOS = new Set<string>(["conselho_adm", "presidencia"]);

const CARGO_OPTIONS: { value: string; label: string }[] = [
  { value: "conselho_adm", label: "Conselho de Administração" },
  { value: "presidencia", label: "Presidência" },
  { value: "vice_presidencia", label: "Vice-Presidência" },
  { value: "diretoria", label: "Diretoria" },
  { value: "vice_diretoria", label: "Vice-Diretoria" },
  { value: "gerencia", label: "Gerência" },
  { value: "coordenacao", label: "Coordenação" },
  { value: "supervisao", label: "Supervisão" },
  { value: "encarregado", label: "Encarregado" },
  { value: "analista", label: "Analista" },
  { value: "auxiliar", label: "Auxiliar" },
  { value: "trainee", label: "Trainee" },
  { value: "estagio", label: "Estágio" },
  { value: "menor_aprendiz", label: "Menor Aprendiz" },
  { value: "consultoria_externa", label: "Consultoria Externa" },
  {
    value: "representante_terceirizado",
    label: "Representante Terceirizado",
  },
];

interface AreaOption {
  value: string;
  label: string;
}
interface AreaGroup {
  label: string;
  options: AreaOption[];
}

const AREA_TRABALHO_GROUPS: AreaGroup[] = [
  {
    label: "Administrativo",
    options: [{ value: "administrativo", label: "Administrativo" }],
  },
  {
    label: "Comercial",
    options: [
      { value: "comercial_compras", label: "Comercial (Compras)" },
      { value: "comercial_vendas", label: "Comercial (Vendas)" },
    ],
  },
  {
    label: "Financeiro e Contábil",
    options: [
      { value: "financeiro", label: "Financeiro" },
      { value: "fiscal", label: "Fiscal" },
      { value: "contabil", label: "Contábil" },
    ],
  },
  {
    label: "Tecnologia",
    options: [
      {
        value: "tecnologia_informacao",
        label: "Tecnologia da Informação",
      },
    ],
  },
  {
    label: "Comunicação e Marketing",
    options: [
      { value: "comunicacao", label: "Comunicação" },
      { value: "marketing", label: "Marketing" },
      { value: "imprensa", label: "Imprensa" },
    ],
  },
  {
    label: "ESG e Sustentabilidade",
    options: [{ value: "esg", label: "ESG" }],
  },
  {
    label: "Operações",
    options: [
      { value: "operacional", label: "Operacional" },
      { value: "producao", label: "Produção" },
      { value: "estoque", label: "Estoque" },
      { value: "logistica", label: "Logística" },
    ],
  },
  {
    label: "Pessoas",
    options: [{ value: "recursos_humanos", label: "Recursos Humanos" }],
  },
  {
    label: "Jurídico e Compliance",
    options: [{ value: "juridico_compliance", label: "Jurídico e Compliance" }],
  },
  {
    label: "Inovação e Desenvolvimento",
    options: [
      { value: "pesquisa_desenvolvimento", label: "P&D" },
      { value: "qualidade", label: "Qualidade" },
      { value: "inovacao", label: "Inovação" },
    ],
  },
  {
    label: "Engenharia e Manutenção",
    options: [
      { value: "engenharia", label: "Engenharia" },
      { value: "manutencao", label: "Manutenção" },
    ],
  },
  {
    label: "Segurança",
    options: [{ value: "seguranca", label: "Segurança" }],
  },
  {
    label: "Atendimento",
    options: [{ value: "atendimento_sac", label: "Atendimento SAC" }],
  },
  {
    label: "Relações",
    options: [
      {
        value: "relacoes_institucionais",
        label: "Relações Institucionais",
      },
      {
        value: "relacoes_internacionais",
        label: "Relações Internacionais",
      },
    ],
  },
  {
    label: "Outras Áreas Empresariais",
    options: [
      { value: "auditoria_interna", label: "Auditoria Interna" },
      { value: "controladoria", label: "Controladoria" },
      {
        value: "planejamento_estrategico",
        label: "Planejamento Estratégico",
      },
      { value: "gestao_projetos", label: "Gestão de Projetos" },
      { value: "supply_chain", label: "Supply Chain" },
      { value: "facilities", label: "Facilities" },
      { value: "procurement", label: "Procurement" },
      { value: "exportacao", label: "Exportação" },
      { value: "importacao", label: "Importação" },
      { value: "trade_marketing", label: "Trade Marketing" },
      { value: "inteligencia_mercado", label: "Inteligência de Mercado" },
      { value: "customer_success", label: "Customer Success" },
      { value: "pos_vendas", label: "Pós-Vendas" },
      {
        value: "treinamento_desenvolvimento",
        label: "Treinamento e Desenvolvimento",
      },
    ],
  },
];

function getAreaLabel(slug: string): string {
  for (const group of AREA_TRABALHO_GROUPS) {
    for (const opt of group.options) {
      if (opt.value === slug) return opt.label;
    }
  }
  return "";
}

function GroupedSelect({
  value,
  onChange,
  groups,
  placeholder = "Selecionar",
  width = 220,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  groups: AreaGroup[];
  placeholder?: string;
  width?: number | string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedLabel = getAreaLabel(value);

  const filteredGroups = (() => {
    const q = query.trim().toLowerCase();
    if (q === "") return groups;
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            g.label.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.options.length > 0);
  })();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("[data-grouped-select-portal]")
      )
        close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  function handleOpen() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dropW = typeof width === "number" ? width : rect.width;
    const dropH = 320;
    const spaceBelow = vh - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openAbove = spaceBelow < dropH && spaceAbove > spaceBelow;
    const leftPos = rect.left + dropW > vw ? vw - dropW - 8 : rect.left;
    setDropStyle({
      position: "fixed",
      top: openAbove ? rect.top - dropH - 4 : rect.bottom + 4,
      left: leftPos,
      width: dropW,
      zIndex: 9999,
    });
    setOpen(true);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : handleOpen())}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          width,
          background: disabled
            ? "rgba(255,255,255,0.025)"
            : open
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.06)",
          border: open
            ? "1px solid rgba(99,102,241,0.65)"
            : "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          padding: "7px 10px 7px 11px",
          fontSize: 13,
          color: disabled
            ? "rgba(255,255,255,0.28)"
            : selectedLabel !== ""
              ? "var(--text-primary)"
              : "var(--text-tertiary)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          outline: "none",
          transition: "border-color 120ms ease, background 120ms ease",
          boxShadow: open ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedLabel !== "" ? selectedLabel : placeholder}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          style={{
            flexShrink: 0,
            color: "var(--text-tertiary)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 150ms ease",
          }}
        />
      </button>

      {open &&
        createPortal(
          <div
            data-grouped-select-portal
            style={{
              ...dropStyle,
              background: "var(--bg-elevated)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10,
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "8px 8px 4px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div style={{ position: "relative" }}>
                <Search
                  size={12}
                  style={{
                    position: "absolute",
                    left: 9,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-tertiary)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar área…"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    padding: "5px 8px 5px 28px",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>
            </div>
            <div
              style={{ overflowY: "auto", maxHeight: 280, padding: "4px 0" }}
            >
              {filteredGroups.length === 0 ? (
                <div
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                  }}
                >
                  Nenhum resultado
                </div>
              ) : (
                filteredGroups.map((g) => (
                  <div
                    key={g.label}
                    style={{ paddingTop: 4, paddingBottom: 4 }}
                  >
                    <div
                      style={{
                        padding: "5px 12px 3px",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--text-tertiary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {g.label}
                    </div>
                    {g.options.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onChange(o.value);
                          close();
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "7px 12px 7px 16px",
                          fontSize: 13,
                          color:
                            o.value === value
                              ? "var(--text-primary)"
                              : "var(--text-secondary)",
                          background:
                            o.value === value
                              ? "rgba(99,102,241,0.14)"
                              : "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 80ms ease",
                          fontWeight: o.value === value ? 500 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (o.value !== value)
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            o.value === value
                              ? "rgba(99,102,241,0.14)"
                              : "transparent";
                        }}
                      >
                        <span>{o.label}</span>
                        {o.value === value && (
                          <Check
                            size={12}
                            strokeWidth={2.5}
                            style={{ color: "#818cf8", flexShrink: 0 }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function TagInput({
  tags,
  onChange,
  placeholder = "Digite e pressione Enter…",
  disabled = false,
  width = 280,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: number | string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const value = raw.trim();
    if (value === "") return;
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...tags, value]);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
      return;
    }
    if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      e.preventDefault();
      onChange(tags.slice(0, -1));
    }
  }

  function removeAt(idx: number) {
    if (disabled) return;
    onChange(tags.filter((_, i) => i !== idx));
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 5,
        width,
        minHeight: 34,
        background: disabled
          ? "rgba(255,255,255,0.025)"
          : "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "4px 6px",
        cursor: disabled ? "not-allowed" : "text",
        opacity: disabled ? 0.6 : 1,
      }}
      onClick={(e) => {
        if (disabled) return;
        const input = (e.currentTarget as HTMLDivElement).querySelector(
          "input",
        );
        input?.focus();
      }}
    >
      {tags.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 4px 2px 8px",
            background: "rgba(99,102,241,0.18)",
            border: "1px solid rgba(99,102,241,0.32)",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            color: "#c7d2fe",
            maxWidth: 180,
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tag}
          </span>
          {!disabled && (
            <button
              type="button"
              aria-label={`Remover ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                removeAt(idx);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                background: "transparent",
                border: "none",
                color: "rgba(199,210,254,0.7)",
                cursor: "pointer",
                padding: 0,
                borderRadius: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(99,102,241,0.32)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(199,210,254,0.7)";
              }}
            >
              <X size={10} strokeWidth={2.4} />
            </button>
          )}
        </span>
      ))}
      <input
        type="text"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (draft.trim() !== "") commit(draft);
        }}
        placeholder={tags.length === 0 ? placeholder : ""}
        style={{
          flex: 1,
          minWidth: 90,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text-primary)",
          fontSize: 13,
          padding: "4px 4px",
        }}
      />
    </div>
  );
}

function TabPerfil({
  avatarUrl,
  setAvatarUrl,
}: {
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
}) {
  const { email, userId } = useSessionStore();
  const drivers = useDrivers();
  const openApp = useOSStore((s) => s.openApp);
  const setPendingUserId = useRhStore((s) => s.setPendingUserId);

  // Profile data
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cargo, setCargo] = useState("");
  const [areaTrabalho, setAreaTrabalho] = useState("");
  const [departmentTags, setDepartmentTags] = useState<string[]>([]);
  const [sexo, setSexo] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [ddi, setDdi] = useState("+55");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showPwdDialog, setShowPwdDialog] = useState(false);

  async function handleAvatarUpload(file: File) {
    if (drivers === null || userId === null) return;
    setAvatarError(null);
    if (!ACCEPTED_IMG_TYPES.includes(file.type)) {
      setAvatarError("Formato inválido. Use JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > MAX_IMG_BYTES) {
      setAvatarError("Arquivo maior que 2 MB.");
      return;
    }

    setAvatarUploading(true);
    await syncDataClientSession(drivers);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}.${ext}`;
    const client = drivers.data.getClient();
    const { error: upErr } = await client.storage
      .from("user-avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr !== null) {
      setAvatarError(upErr.message);
      setAvatarUploading(false);
      return;
    }
    const { data: pub } = client.storage
      .from("user-avatars")
      .getPublicUrl(path);
    const newUrl = `${pub.publicUrl}?v=${Date.now()}`;
    const { error: updErr } = await drivers.data
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("id", userId);
    if (updErr !== null && updErr !== undefined) {
      setAvatarError(updErr.message);
      setAvatarUploading(false);
      return;
    }
    setAvatarUrl(newUrl);
    setAvatarUploading(false);
  }

  async function handleAvatarRemove() {
    if (drivers === null || userId === null) return;
    setAvatarError(null);
    setAvatarUploading(true);
    const { error } = await drivers.data
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);
    if (error !== null && error !== undefined) {
      setAvatarError(error.message);
      setAvatarUploading(false);
      return;
    }
    setAvatarUrl(null);
    setAvatarUploading(false);
  }

  // Refs so debounce callback always reads latest values
  const nameRef = useRef(name);
  const phoneRef = useRef(phone);
  const cargoRef = useRef(cargo);
  const areaTrabalhoRef = useRef(areaTrabalho);
  const departmentTagsRef = useRef<string[]>(departmentTags);
  const sexoRef = useRef(sexo);
  const cpfRef = useRef(cpf);
  const birthDateRef = useRef(birthDate);
  const ddiRef = useRef(ddi);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  nameRef.current = name;
  phoneRef.current = phone;
  cargoRef.current = cargo;
  areaTrabalhoRef.current = areaTrabalho;
  departmentTagsRef.current = departmentTags;
  sexoRef.current = sexo;
  cpfRef.current = cpf;
  birthDateRef.current = birthDate;
  ddiRef.current = ddi;

  useEffect(() => {
    if (drivers === null || userId === null) return;
    drivers.data
      .from("settings")
      .select("key,value")
      .eq("scope", "user")
      .eq("scope_id", userId)
      .then(({ data }) => {
        if (data === null) return;
        for (const row of data as { key: string; value: unknown }[]) {
          if (row.key === "display_name" && typeof row.value === "string")
            setName(row.value);
          if (
            row.key === "theme" &&
            (row.value === "dark" || row.value === "light")
          ) {
            if (row.value === "light")
              document.documentElement.classList.remove("dark");
            else document.documentElement.classList.add("dark");
          }
        }
        initializedRef.current = true;
      });

    void drivers.data
      .from("profiles")
      .select("phone,full_name,position,area_trabalho,department,data")
      .eq("id", userId)
      .maybeSingle()
      .then(
        ({
          data,
        }: {
          data: {
            phone: string | null;
            full_name: string | null;
            position: string | null;
            area_trabalho: string | null;
            department: string | null;
            data: Record<string, unknown> | null;
          } | null;
        }) => {
          if (data === null) return;
          if (data.phone !== null) setPhone(data.phone);
          if (data.position !== null) setCargo(data.position);
          if (data.area_trabalho !== null) setAreaTrabalho(data.area_trabalho);
          if (data.department !== null) {
            const parsed = data.department
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t !== "");
            setDepartmentTags(parsed);
          }
          if (data.full_name !== null) {
            setName((prev) => (prev === "" ? (data.full_name ?? "") : prev));
          }
          if (data.data !== null && data.data !== undefined) {
            if (typeof data.data["sexo"] === "string")
              setSexo(data.data["sexo"]);
            if (typeof data.data["cpf"] === "string") setCpf(data.data["cpf"]);
            if (typeof data.data["birth_date"] === "string")
              setBirthDate(data.data["birth_date"]);
            if (typeof data.data["ddi"] === "string") setDdi(data.data["ddi"]);
          }
        },
      );
  }, [drivers, userId]);

  function triggerAutoSave() {
    if (!initializedRef.current) return;
    setSaveState("saving");
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (drivers !== null && userId !== null) {
        const theme = document.documentElement.classList.contains("dark")
          ? "dark"
          : "light";
        const rows = [
          {
            scope: "user",
            scope_id: userId,
            key: "display_name",
            value: nameRef.current,
          },
          { scope: "user", scope_id: userId, key: "theme", value: theme },
        ];
        for (const s of rows) {
          await drivers.data
            .from("settings")
            .upsert(s, { onConflict: "scope,scope_id,key" });
        }
        const extraData: Record<string, string> = {};
        if (sexoRef.current !== "") extraData["sexo"] = sexoRef.current;
        if (cpfRef.current !== "") extraData["cpf"] = cpfRef.current;
        if (birthDateRef.current !== "")
          extraData["birth_date"] = birthDateRef.current;
        extraData["ddi"] = ddiRef.current;
        const cargoSlug = cargoRef.current;
        const isTopExec = TOP_EXEC_CARGOS.has(cargoSlug);
        // Top-exec dispensa Area e Departamento — limpa colunas pra evitar
        // residuo se usuario alternar de cargo nao-exec → exec.
        const areaToSave =
          isTopExec || areaTrabalhoRef.current === ""
            ? null
            : areaTrabalhoRef.current;
        const departmentJoined = isTopExec
          ? null
          : departmentTagsRef.current.length > 0
            ? departmentTagsRef.current.join(", ")
            : null;
        await drivers.data
          .from("profiles")
          .update({
            phone: phoneRef.current !== "" ? phoneRef.current : null,
            position: cargoSlug !== "" ? cargoSlug : null,
            area_trabalho: areaToSave,
            department: departmentJoined,
            grants_tenant_admin: ADMIN_CARGOS.has(cargoSlug),
            data: Object.keys(extraData).length > 0 ? extraData : null,
          })
          .eq("id", userId);
        void drivers.scp.publishEvent("platform.settings.updated", {
          scope: "user",
          scope_id: userId,
          key: "profile",
          updated_by: userId,
        });
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    }, 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={User}
        iconBg="rgba(99,102,241,0.22)"
        iconColor="#818cf8"
        title="Meu Perfil"
        subtitle="Informações pessoais, senha e proteções da conta"
        right={
          <button
            type="button"
            onClick={() => {
              if (userId !== null) setPendingUserId(userId);
              openApp("rh", "RH");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              borderRadius: 8,
              background: "rgba(139,92,246,0.10)",
              border: "1px solid rgba(139,92,246,0.25)",
              color: "#a78bfa",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 150ms ease, border-color 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(139,92,246,0.18)";
              e.currentTarget.style.borderColor = "rgba(139,92,246,0.40)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(139,92,246,0.10)";
              e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)";
            }}
          >
            <Users size={12} strokeWidth={1.8} />
            Perfil Completo
            <ArrowRight size={12} strokeWidth={1.8} />
          </button>
        }
      />

      {/* Informações pessoais */}
      <div>
        <SectionLabel>Informações pessoais</SectionLabel>

        {/* Foto de perfil dentro da seção */}
        <ImageUploadCard
          url={avatarUrl}
          onUpload={(f) => void handleAvatarUpload(f)}
          onRemove={() => void handleAvatarRemove()}
          shape="circle"
          fallback={
            <span
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {email !== null ? email.slice(0, 2).toUpperCase() : "??"}
            </span>
          }
          title="Foto de perfil"
          helper="JPG, PNG, WebP ou GIF até 2 MB"
          uploading={avatarUploading}
          error={avatarError}
        />

        <div style={{ marginTop: 12 }}>
          <SettingGroup>
            <SettingRow label="Nome Completo">
              <SettingInput
                value={name}
                onChange={(value) => {
                  setName(value);
                  triggerAutoSave();
                }}
              />
            </SettingRow>
            <SettingRow label="Email Corporativo">
              <SettingInput value={email ?? ""} readOnly />
            </SettingRow>
            <SettingRow label="Celular Corporativo">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <SmartSelect
                  value={ddi}
                  onChange={(v) => {
                    setDdi(v);
                    triggerAutoSave();
                  }}
                  width={110}
                  options={DDI_OPTIONS}
                />
                <SettingInput
                  value={phone}
                  onChange={(value) => {
                    setPhone(value);
                    triggerAutoSave();
                  }}
                  type="tel"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </SettingRow>
            <SettingRow label="Sexo">
              <div style={{ display: "flex", gap: 4 }}>
                {(
                  [
                    {
                      value: "masculino",
                      activeBorder: "rgba(99,102,241,0.5)",
                      activeBg: "rgba(99,102,241,0.18)",
                      activeColor: "#a5b4fc",
                      hoverBorder: "rgba(99,102,241,0.25)",
                      hoverBg: "rgba(99,102,241,0.08)",
                    },
                    {
                      value: "feminino",
                      activeBorder: "rgba(244,63,94,0.5)",
                      activeBg: "rgba(244,63,94,0.18)",
                      activeColor: "#fda4af",
                      hoverBorder: "rgba(244,63,94,0.30)",
                      hoverBg: "rgba(244,63,94,0.10)",
                    },
                  ] as const
                ).map(
                  ({
                    value: opt,
                    activeBorder,
                    activeBg,
                    activeColor,
                    hoverBorder,
                    hoverBg,
                  }) => {
                    const selected = sexo === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSexo(sexo === opt ? "" : opt);
                          triggerAutoSave();
                        }}
                        onMouseEnter={(e) => {
                          if (selected) return;
                          e.currentTarget.style.background = hoverBg;
                          e.currentTarget.style.borderColor = hoverBorder;
                        }}
                        onMouseLeave={(e) => {
                          if (selected) return;
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.04)";
                          e.currentTarget.style.borderColor =
                            "rgba(255,255,255,0.10)";
                        }}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          fontSize: 13,
                          cursor: "pointer",
                          transition:
                            "background 120ms ease, border-color 120ms ease, color 120ms ease",
                          border: selected
                            ? `1px solid ${activeBorder}`
                            : "1px solid rgba(255,255,255,0.10)",
                          background: selected
                            ? activeBg
                            : "rgba(255,255,255,0.04)",
                          color: selected
                            ? activeColor
                            : "var(--text-secondary)",
                          fontWeight: selected ? 500 : 400,
                        }}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    );
                  },
                )}
              </div>
            </SettingRow>
            <SettingRow label="CPF">
              <SettingInput
                value={cpf}
                onChange={(value) => {
                  setCpf(maskCpf(value));
                  triggerAutoSave();
                }}
                placeholder="000.000.000-00"
              />
            </SettingRow>
            <SettingRow label="Data de nascimento" last>
              <SettingInput
                value={birthDate}
                onChange={(value) => {
                  setBirthDate(value);
                  triggerAutoSave();
                }}
                type="date"
                placeholder="dd/mm/aaaa"
              />
            </SettingRow>
          </SettingGroup>
        </div>
      </div>

      {/* Informações profissionais */}
      <div>
        <SectionLabel>Informações profissionais</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Cargo"
            sublabel="Selecione seu nível hierárquico na empresa"
            last={TOP_EXEC_CARGOS.has(cargo)}
          >
            <SmartSelect
              value={cargo}
              onChange={(value) => {
                // Top-exec novo: limpa Área e Departamento.
                if (TOP_EXEC_CARGOS.has(value)) {
                  setAreaTrabalho("");
                  setDepartmentTags([]);
                }
                setCargo(value);
                triggerAutoSave();
              }}
              options={CARGO_OPTIONS}
              placeholder="Selecionar cargo"
              width={260}
            />
          </SettingRow>
          {!TOP_EXEC_CARGOS.has(cargo) && (
            <>
              <SettingRow
                label="Área de Trabalho"
                sublabel={
                  cargo === ""
                    ? "Selecione o cargo primeiro"
                    : "Categoria de atuação"
                }
              >
                <GroupedSelect
                  value={areaTrabalho}
                  onChange={(value) => {
                    setAreaTrabalho(value);
                    triggerAutoSave();
                  }}
                  groups={AREA_TRABALHO_GROUPS}
                  placeholder="Selecionar área"
                  width={260}
                  disabled={cargo === ""}
                />
              </SettingRow>
              <SettingRow
                label="Departamento(s)"
                sublabel={
                  cargo === "" || areaTrabalho === ""
                    ? "Preencha Cargo e Área primeiro"
                    : "Adicione tags com Enter ou vírgula"
                }
                last
              >
                <TagInput
                  tags={departmentTags}
                  onChange={(next) => {
                    setDepartmentTags(next);
                    triggerAutoSave();
                  }}
                  placeholder="Ex: RH, Comercial, TI"
                  width={280}
                  disabled={cargo === "" || areaTrabalho === ""}
                />
              </SettingRow>
            </>
          )}
        </SettingGroup>
      </div>

      {/* Assinatura digital */}
      <div>
        <SectionLabel>Mais recursos</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Assinatura digital"
            sublabel="Assine documentos com validade jurídica diretamente do OS"
            last
          >
            <Badge variant="neutral">Em breve</Badge>
          </SettingRow>
        </SettingGroup>
      </div>

      {/* Proteção adicional */}
      <div>
        <SectionLabel>Proteção adicional</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Autenticação em dois fatores"
            sublabel="App autenticador (TOTP) — Google Authenticator, Authy, 1Password"
          >
            <TwoFactorAuth />
          </SettingRow>
          <SettingRow
            label="Tokens de API"
            sublabel="Acesso programático à plataforma"
            last
          >
            <Badge variant="neutral">Em breve</Badge>
          </SettingRow>
        </SettingGroup>
      </div>

      {/* Alterar senha */}
      <div>
        <SectionLabel>Alterar senha</SectionLabel>
        <SettingGroup
          style={{
            border: "1px solid rgba(234,179,8,0.35)",
            background: "rgba(234,179,8,0.04)",
          }}
        >
          <SettingRow
            label="Senha"
            sublabel="Defina uma nova senha para sua conta"
            last
          >
            <button
              type="button"
              onClick={() => setShowPwdDialog(true)}
              style={{
                background: "rgba(234,179,8,0.10)",
                border: "1px solid rgba(234,179,8,0.30)",
                borderRadius: 8,
                padding: "7px 16px",
                fontSize: 13,
                color: "#fbbf24",
                cursor: "pointer",
                transition: "background 120ms ease, border-color 120ms ease",
                whiteSpace: "nowrap",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(234,179,8,0.18)";
                e.currentTarget.style.borderColor = "rgba(234,179,8,0.50)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(234,179,8,0.10)";
                e.currentTarget.style.borderColor = "rgba(234,179,8,0.30)";
              }}
            >
              Alterar senha
            </button>
          </SettingRow>
        </SettingGroup>
      </div>

      <ChangePasswordDialog
        open={showPwdDialog}
        onClose={() => setShowPwdDialog(false)}
        drivers={drivers}
        userId={userId}
      />

      {/* Salvar — fim da tela */}
      <SaveRow>
        <PrimaryButton
          onClick={triggerAutoSave}
          disabled={saveState === "saving"}
        >
          <SaveLabel state={saveState} label="Salvar alterações" />
        </PrimaryButton>
      </SaveRow>
    </div>
  );
}

// ─── Tab: Notificações ────────────────────────────────────────────────────────

const NOTIF_DEFAULTS = {
  email_notifications: true,
  push_notifications: false,
  app_notifications: true,
  whatsapp_notifications: false,
  telegram_notifications: false,
  sms_notifications: false,
  notify_new_match: true,
  notify_rfq_response: true,
  notify_order_status: true,
  notify_payment_due: true,
  notify_hr_action: false,
  notify_system: true,
};

type NotifPrefs = typeof NOTIF_DEFAULTS;

function TabNotificacoes() {
  const remote = useUserPreference<NotifPrefs>(
    "notification_prefs",
    NOTIF_DEFAULTS,
  );
  const prefs: NotifPrefs = { ...NOTIF_DEFAULTS, ...remote.value };
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashSaved() {
    setSaved(true);
    if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }

  function update(key: keyof NotifPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    remote.set(next);
    flashSaved();
  }

  const allOn = Object.values(prefs).every(Boolean);

  function toggleAll() {
    const next = Object.fromEntries(
      Object.keys(prefs).map((k) => [k, !allOn]),
    ) as NotifPrefs;
    remote.set(next);
    flashSaved();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <ContentHeader
          icon={Bell}
          iconBg="rgba(99,102,241,0.22)"
          iconColor="#818cf8"
          title="Notificações"
          subtitle="Configure como e quando você recebe alertas da plataforma"
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          marginTop: -16,
          marginBottom: 4,
        }}
      >
        {saved && (
          <span
            style={{
              fontSize: 12,
              color: "#34d399",
              marginRight: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Check size={12} /> Salvo
          </span>
        )}
        <InlineButton onClick={toggleAll}>
          {allOn ? "Desativar tudo" : "Ativar tudo"}
        </InlineButton>
      </div>

      <div>
        <SectionLabel>Canais de entrega</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Notificações no App"
            sublabel="Alertas dentro da plataforma Aethereos"
            icon={
              <Bell
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <Toggle
              on={prefs.app_notifications}
              onToggle={() =>
                update("app_notifications", !prefs.app_notifications)
              }
            />
          </SettingRow>
          <SettingRow
            label="Notificações por e-mail"
            sublabel="Receba alertas no seu endereço de e-mail"
            icon={
              <Mail
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <Toggle
              on={prefs.email_notifications}
              onToggle={() =>
                update("email_notifications", !prefs.email_notifications)
              }
            />
          </SettingRow>
          <SettingRow
            label="Notificações push"
            sublabel="Alertas em tempo real no navegador"
            icon={
              <Monitor
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <Toggle
              on={prefs.push_notifications}
              onToggle={() =>
                update("push_notifications", !prefs.push_notifications)
              }
            />
          </SettingRow>
          <SettingRow
            label="Notificações no WhatsApp"
            sublabel="Receba mensagens no WhatsApp vinculado à conta"
            icon={
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: "#25D366",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <img
                  src="/integrations/whatsapp.svg"
                  alt="WhatsApp"
                  style={{ width: 9, height: 9, objectFit: "contain" }}
                />
              </div>
            }
          >
            <Toggle
              on={prefs.whatsapp_notifications}
              onToggle={() =>
                update("whatsapp_notifications", !prefs.whatsapp_notifications)
              }
            />
          </SettingRow>
          <SettingRow
            label="Notificações no Telegram"
            sublabel="Receba mensagens via bot do Telegram"
            icon={
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: "#229ED9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="white"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M9.417 15.181l-.397 5.584c.568 0 .814-.244 1.109-.537l2.663-2.545 5.518 4.041c1.012.564 1.725.267 1.998-.931L23.93 3.821c.33-1.536-.561-2.132-1.554-1.754L1.122 9.332C-.271 9.869-.254 10.648.76 10.966l5.318 1.647 12.37-7.757c.582-.387 1.114-.172.676.215L9.417 15.181z" />
                </svg>
              </div>
            }
          >
            <Toggle
              on={prefs.telegram_notifications}
              onToggle={() =>
                update("telegram_notifications", !prefs.telegram_notifications)
              }
            />
          </SettingRow>
          <SettingRow
            label="Notificações SMS"
            sublabel="Receba alertas por SMS no celular cadastrado"
            icon={
              <Phone
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
            last
          >
            <Toggle
              on={prefs.sms_notifications}
              onToggle={() =>
                update("sms_notifications", !prefs.sms_notifications)
              }
            />
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}

// ─── Tab: Privacidade ─────────────────────────────────────────────────

function DeleteAccountDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [requested, setRequested] = useState(false);
  const modalRef = useModalA11y<HTMLDivElement>({ open, onClose });

  function handleConfirm() {
    setRequested(true);
    setTimeout(() => {
      setRequested(false);
      onClose();
    }, 1800);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Excluir conta"
        style={{
          width: "100%",
          maxWidth: 440,
          margin: "0 16px",
          background: "var(--bg-elevated)",
          border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 16,
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.12)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            padding: "24px 24px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(239,68,68,0.14)",
              border: "1px solid rgba(239,68,68,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle
              size={20}
              style={{ color: "#ef4444" }}
              strokeWidth={1.8}
            />
          </div>
          <div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 4,
                fontFamily: "var(--font-display)",
              }}
            >
              Solicitar exclusão de conta
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                lineHeight: 1.5,
              }}
            >
              Leia atentamente antes de continuar.
            </p>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.65,
            }}
          >
            Tem certeza que deseja solicitar a exclusão da sua conta? Esta ação
            irá{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              deletar todos os seus dados e registros
            </strong>{" "}
            na plataforma.
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.65,
            }}
          >
            <strong style={{ color: "#ef4444" }}>
              Esta ação não pode ser desfeita.
            </strong>{" "}
            Seus dados serão perdidos permanentemente e não poderão ser
            recuperados.
          </p>

          {/* Disclaimer */}
          <div
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 10,
              padding: "12px 14px",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle
              size={14}
              style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }}
              strokeWidth={1.8}
            />
            <p
              style={{
                fontSize: 12,
                color: "rgba(245,158,11,0.9)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Esta solicitação necessita de{" "}
              <strong>aprovação do gestor da empresa</strong> em que você está
              cadastrado. Apenas após a aprovação do gestor a exclusão será
              processada.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 120ms ease, color 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={requested}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.4)",
              background: requested
                ? "rgba(239,68,68,0.25)"
                : "rgba(239,68,68,0.14)",
              color: requested ? "rgba(239,68,68,0.6)" : "#ef4444",
              fontSize: 13,
              fontWeight: 500,
              cursor: requested ? "default" : "pointer",
              transition: "background 120ms ease, color 120ms ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) => {
              if (!requested)
                e.currentTarget.style.background = "rgba(239,68,68,0.22)";
            }}
            onMouseLeave={(e) => {
              if (!requested)
                e.currentTarget.style.background = "rgba(239,68,68,0.14)";
            }}
          >
            {requested ? (
              <>
                <Check size={13} strokeWidth={2} />
                Solicitado
              </>
            ) : (
              "Sim, solicitar exclusão"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TermosModal({
  open,
  onClose,
  variant,
}: {
  open: boolean;
  onClose: () => void;
  variant: "termos" | "dados";
}) {
  const modalRef = useModalA11y<HTMLDivElement>({ open, onClose });
  if (!open) return null;

  const isTermos = variant === "termos";

  const content = isTermos ? (
    <>
      <Section title="1. Aceitação dos termos">
        Ao acessar ou usar a plataforma Aethereos, você concorda com estes
        Termos de Uso e com nossa Política de Privacidade. Se você não concordar
        com qualquer parte destes termos, não use a plataforma.
      </Section>
      <Section title="2. Uso da plataforma">
        Você concorda em usar o Aethereos exclusivamente para fins lícitos e de
        acordo com estes termos. É proibido usar a plataforma para atividades
        ilegais, fraudulentas ou que violem direitos de terceiros.
      </Section>
      <Section title="3. Propriedade intelectual">
        Todo o conteúdo, interfaces, código-fonte e materiais da plataforma são
        de propriedade da Aethereos ou de seus licenciantes. É vedada a
        reprodução, distribuição ou modificação sem autorização expressa.
      </Section>
      <Section title="4. Conta e segurança">
        Você é responsável por manter a confidencialidade das suas credenciais
        de acesso. Notifique-nos imediatamente em caso de acesso não autorizado
        à sua conta.
      </Section>
      <Section title="5. Limitação de responsabilidade">
        A Aethereos não será responsável por danos indiretos, incidentais ou
        consequentes decorrentes do uso ou impossibilidade de uso da plataforma,
        salvo nas hipóteses previstas em lei.
      </Section>
      <Section title="6. Alterações nos termos">
        Reservamo-nos o direito de modificar estes termos a qualquer momento.
        Alterações significativas serão comunicadas com antecedência mínima de
        30 dias via e-mail ou notificação na plataforma.
      </Section>
      <Section title="7. Lei aplicável" last>
        Estes termos são regidos pelas leis da República Federativa do Brasil.
        Fica eleito o foro da comarca de São Paulo/SP para resolução de
        disputas.
      </Section>
    </>
  ) : (
    <>
      <Section title="Dados que coletamos">
        Coletamos dados fornecidos por você (perfil, empresa, documentos) e
        dados gerados pelo uso da plataforma (logs de atividade, preferências,
        metadados de operação).
      </Section>
      <Section title="Finalidade do tratamento">
        Os dados são utilizados exclusivamente para: prestação dos serviços
        contratados, cumprimento de obrigações legais, melhoria da plataforma e
        comunicações operacionais.
      </Section>
      <Section title="Seus direitos — LGPD (Lei 13.709/2018)">
        Como titular dos dados você tem direito a: acesso · confirmação de
        tratamento · correção · portabilidade · anonimização ou eliminação ·
        revogação do consentimento · oposição ao tratamento. Para exercer estes
        direitos, entre em contato com nosso DPO.
      </Section>
      <Section title="Armazenamento e segurança">
        Todos os dados são armazenados em servidores localizados no Brasil
        (região sa-east-1), protegidos por criptografia em trânsito (TLS 1.3) e
        em repouso (AES-256). Backups diários com retenção de 30 dias.
      </Section>
      <Section title="Compartilhamento">
        Não compartilhamos seus dados com terceiros, exceto: subprocessadores
        necessários à operação do serviço (listados em nossa política completa)
        e quando exigido por lei ou ordem judicial.
      </Section>
      <Section title="Contato — DPO" last>
        Encarregado de Proteção de Dados: dpo@aethereos.io · Resposta em até 15
        dias úteis conforme exigido pela LGPD.
      </Section>
    </>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={isTermos ? "Termos de uso" : "Política de privacidade"}
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "80vh",
          margin: "0 16px",
          background: "var(--bg-elevated)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
              }}
            >
              {isTermos ? "Termos de uso" : "Dados e informações"}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              {isTermos
                ? "Última atualização: 1º de janeiro de 2025"
                : "Conforme LGPD — Lei 13.709/2018"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid transparent",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              transition: "background 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div
          style={{
            overflowY: "auto",
            padding: "20px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            scrollbarWidth: "none",
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        paddingBottom: last ? 0 : 16,
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 6,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.65,
        }}
      >
        {children}
      </p>
    </div>
  );
}

const LOCK_TIMEOUT_OPTIONS: SmartSelectOption[] = [
  { value: "5", label: "5 minutos" },
  { value: "10", label: "10 minutos" },
  { value: "15", label: "15 minutos" },
  { value: "30", label: "30 minutos" },
  { value: "60", label: "1 hora" },
  { value: "0", label: "Nunca" },
];

const DEFAULT_LOCK_TIMEOUT_MINUTES = 15;

function TabDadosPrivacidade() {
  const { email, userId, activeCompanyId } = useSessionStore();
  const drivers = useDrivers();
  const [exported, setExported] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [infoModal, setInfoModal] = useState<"termos" | "dados" | null>(null);
  const lockTimeoutPref = useUserPreference<number>(
    "lock_timeout_minutes",
    DEFAULT_LOCK_TIMEOUT_MINUTES,
  );
  const lockTimeoutValue =
    typeof lockTimeoutPref.value === "number"
      ? lockTimeoutPref.value
      : DEFAULT_LOCK_TIMEOUT_MINUTES;

  async function handleExport() {
    const payload: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      user: { id: userId, email },
      company: { id: activeCompanyId },
    };

    if (drivers !== null && activeCompanyId !== null) {
      const { data } = await drivers.data
        .from("companies")
        .select("name,slug")
        .eq("id", activeCompanyId)
        .single();
      if (data !== null)
        payload["company"] = { id: activeCompanyId, ...(data as object) };
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aethereos-dados-${(userId ?? "user").slice(0, 8)}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={FileText}
        iconBg="rgba(6,182,212,0.22)"
        iconColor="#22d3ee"
        title="Privacidade"
        subtitle="Controle seus dados pessoais conforme a LGPD (Lei 13.709/2018)"
      />

      <div>
        <SectionLabel>Segurança da sessão</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Bloquear automaticamente após…"
            sublabel="Tempo de inatividade até a tela de bloqueio aparecer"
            icon={
              <Lock
                size={15}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
            last
          >
            <SmartSelect
              value={String(lockTimeoutValue)}
              onChange={(v) => {
                const parsed = Number.parseInt(v, 10);
                lockTimeoutPref.set(
                  Number.isFinite(parsed)
                    ? parsed
                    : DEFAULT_LOCK_TIMEOUT_MINUTES,
                );
              }}
              options={LOCK_TIMEOUT_OPTIONS}
              width={180}
              searchable={false}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>LGPD &amp; Compliance</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Dados e informações"
            sublabel="LGPD · SOC 2 em preparação · dados residentes no Brasil"
            icon={
              <Shield
                size={15}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
            labelBadge={<Badge variant="success">Em conformidade</Badge>}
          >
            <InlineButton onClick={() => setInfoModal("dados")}>
              Ver mais
            </InlineButton>
          </SettingRow>
          <SettingRow
            label="Termos de uso"
            sublabel="Última atualização: 1º de janeiro de 2025"
            icon={
              <FileText
                size={15}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
            last
          >
            <InlineButton onClick={() => setInfoModal("termos")}>
              Ver mais
            </InlineButton>
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Exportar dados</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Exportar meus dados"
            sublabel="Baixe uma cópia completa dos seus dados em formato JSON"
            icon={
              <Download
                size={15}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
            last
          >
            <InlineButton onClick={() => void handleExport()}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {exported ? <Check size={12} /> : <Download size={12} />}
                {exported ? "Exportado!" : "Exportar JSON"}
              </span>
            </InlineButton>
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Zona de perigo</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Solicitar exclusão de conta"
            sublabel="Um administrador será notificado para processar a solicitação"
            icon={
              <Trash2
                size={15}
                style={{ color: "var(--status-error)", flexShrink: 0 }}
              />
            }
            danger
            last
          >
            <InlineButton danger onClick={() => setShowDeleteDialog(true)}>
              Solicitar exclusão
            </InlineButton>
          </SettingRow>
        </SettingGroup>
      </div>

      <DeleteAccountDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      />
      <TermosModal
        open={infoModal !== null}
        onClose={() => setInfoModal(null)}
        variant={infoModal ?? "termos"}
      />
    </div>
  );
}

// ─── Tab: Dock ────────────────────────────────────────────────────────────────

function DockAppIcon({
  iconName,
  color,
  size = 32,
}: {
  iconName: string;
  color: string;
  size?: number;
}) {
  const Icon =
    (
      LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>
    )[iconName] ?? LucideIcons.Box;
  const iconPx = Math.round(size * 0.44);
  const radius = Math.round(size * 0.28);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `${color}20`,
        border: `1px solid ${color}38`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={iconPx} style={{ color }} strokeWidth={1.7} />
    </div>
  );
}

function SortableDockCard({
  appId,
  onRemove,
}: {
  appId: string;
  onRemove: (id: string) => void;
}) {
  const app = APP_REGISTRY.find((a) => a.id === appId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: appId });

  if (app === undefined) return null;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "10px 6px 8px",
        width: 72,
        borderRadius: 12,
        background: isDragging
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }}
      {...attributes}
      {...listeners}
    >
      <DockAppIcon iconName={app.icon} color={app.color} size={44} />
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: "var(--text-secondary)",
          textAlign: "center",
          maxWidth: 60,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {app.name}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(appId);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`Remover ${app.name} do dock`}
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: 5,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.10)",
          cursor: "pointer",
          color: "var(--text-tertiary)",
          padding: 0,
          transition:
            "background 120ms ease, border-color 120ms ease, color 120ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(239,68,68,0.20)";
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)";
          e.currentTarget.style.color = "#f87171";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          e.currentTarget.style.color = "var(--text-tertiary)";
        }}
      >
        <Minus size={9} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function TabDock() {
  const order = useDockStore((s) => s.order);
  const addApp = useDockStore((s) => s.addApp);
  const removeApp = useDockStore((s) => s.removeApp);
  const reorder = useDockStore((s) => s.reorder);
  const reset = useDockStore((s) => s.reset);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as string);
    const newIndex = order.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    reorder(oldIndex, newIndex);
  }

  // Apps disponíveis para adicionar: tudo exceto Mesa, admin-only e os já no dock.
  const available = APP_REGISTRY.filter(
    (a) => a.id !== "mesa" && a.requiresAdmin !== true && !order.includes(a.id),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={PanelBottom}
        iconBg="rgba(100,116,139,0.22)"
        iconColor="#94a3b8"
        title="Dock"
        subtitle="Reordene, adicione e remova apps da barra inferior"
      />

      <div>
        <SectionLabel>Apps na dock ({order.length})</SectionLabel>
        <SettingGroup>
          {order.length === 0 ? (
            <div
              style={{
                padding: "20px 16px",
                fontSize: 12,
                color: "var(--text-tertiary)",
                textAlign: "center",
              }}
            >
              Nenhum app na dock. Adicione abaixo.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={order}
                strategy={horizontalListSortingStrategy}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: 12,
                  }}
                >
                  {order.map((id) => (
                    <SortableDockCard
                      key={id}
                      appId={id}
                      onRemove={removeApp}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </SettingGroup>
      </div>

      {available.length > 0 && (
        <div>
          <SectionLabel>Apps fora da dock ({available.length})</SectionLabel>
          <SettingGroup>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                padding: 12,
              }}
            >
              {available.map((app) => (
                <div
                  key={app.id}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 6px 8px",
                    width: 72,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    opacity: 0.75,
                  }}
                >
                  <DockAppIcon
                    iconName={app.icon}
                    color={app.color}
                    size={44}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: "var(--text-tertiary)",
                      textAlign: "center",
                      maxWidth: 60,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {app.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => addApp(app.id)}
                    aria-label={`Adicionar ${app.name} à dock`}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      cursor: "pointer",
                      color: "var(--text-tertiary)",
                      padding: 0,
                      transition:
                        "background 120ms ease, border-color 120ms ease, color 120ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(99,102,241,0.20)";
                      e.currentTarget.style.borderColor =
                        "rgba(99,102,241,0.35)";
                      e.currentTarget.style.color = "#a5b4fc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.08)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.10)";
                      e.currentTarget.style.color = "var(--text-tertiary)";
                    }}
                  >
                    <Plus size={9} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          </SettingGroup>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={reset}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "background 120ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.11)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          }}
        >
          <RotateCcw size={12} strokeWidth={2} />
          Restaurar padrão
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Mesa ────────────────────────────────────────────────────────────────

const MESA_WIDGET_CATALOG: {
  id: string;
  label: string;
  icon: typeof LayoutGrid;
  description: string;
}[] = [
  {
    id: "clock",
    label: "Relógio",
    icon: Clock,
    description: "Relógio digital com data e fuso horário configurável",
  },
  {
    id: "notes",
    label: "Notas Rápidas",
    icon: StickyNote,
    description: "Bloco de anotações flutuante na área de trabalho",
  },
  {
    id: "weather",
    label: "Clima",
    icon: CloudSun,
    description: "Condições climáticas em tempo real da sua localidade",
  },
  {
    id: "tasks",
    label: "Tarefas",
    icon: ListTodo,
    description: "Lista de tarefas e checklist diário",
  },
];

function TabMesa() {
  const layout = useMesaStore((s) => s.layout);
  const updateLayout = useMesaStore((s) => s.updateLayout);
  const openApp = useOSStore((s) => s.openApp);

  const mesaIcons = layout.filter((item) => item.type === "icon");
  const mesaAppIds = new Set(mesaIcons.map((item) => item.appId));

  const available = APP_REGISTRY.filter(
    (a) => a.id !== "mesa" && a.requiresAdmin !== true && !mesaAppIds.has(a.id),
  );

  function addToMesa(appId: string, appName: string) {
    const col = mesaIcons.length % 6;
    const row = Math.floor(mesaIcons.length / 6);
    const newItem: MesaItem = {
      id: `icon-${appId}-${Date.now()}`,
      type: "icon",
      appId,
      position: { x: 20 + col * 100, y: 20 + row * 100 },
      size: { w: 80, h: 80 },
      config: { name: appName },
      zIndex: 0,
    };
    updateLayout([...layout, newItem]);
  }

  function removeFromMesa(itemId: string) {
    updateLayout(layout.filter((item) => item.id !== itemId));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={LayoutGrid}
        iconBg="rgba(100,116,139,0.22)"
        iconColor="#94a3b8"
        title="Mesa"
        subtitle="Gerencie ícones de apps e widgets da sua área de trabalho"
        right={
          <button
            type="button"
            onClick={() => openApp("magic-store", "Magic Store")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(99,102,241,0.14)",
              border: "1px solid rgba(99,102,241,0.28)",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 500,
              color: "#a5b4fc",
              cursor: "pointer",
              transition: "background 140ms ease, border-color 140ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,0.26)";
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,0.14)";
              e.currentTarget.style.borderColor = "rgba(99,102,241,0.28)";
            }}
          >
            <Store size={13} strokeWidth={1.8} />
            Baixar na Magic Store
          </button>
        }
      />

      {/* ── Ícones na Mesa ── */}
      <div>
        <SectionLabel>Ícones na Mesa ({mesaIcons.length})</SectionLabel>
        <SettingGroup>
          {mesaIcons.length === 0 ? (
            <div
              style={{
                padding: "20px 16px",
                fontSize: 12,
                color: "var(--text-tertiary)",
                textAlign: "center",
              }}
            >
              Nenhum ícone fixado na Mesa. Adicione apps abaixo.
            </div>
          ) : (
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12 }}
            >
              {mesaIcons.map((item) => {
                const app = APP_REGISTRY.find((a) => a.id === item.appId);
                if (app === undefined) return null;
                return (
                  <div
                    key={item.id}
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 6px 8px",
                      width: 72,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    <DockAppIcon
                      iconName={app.icon}
                      color={app.color}
                      size={44}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                        textAlign: "center",
                        maxWidth: 60,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {app.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromMesa(item.id)}
                      aria-label={`Remover ${app.name} da mesa`}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        cursor: "pointer",
                        color: "var(--text-tertiary)",
                        padding: 0,
                        transition:
                          "background 120ms ease, border-color 120ms ease, color 120ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(239,68,68,0.18)";
                        e.currentTarget.style.borderColor =
                          "rgba(239,68,68,0.30)";
                        e.currentTarget.style.color = "#f87171";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.08)";
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.10)";
                        e.currentTarget.style.color = "var(--text-tertiary)";
                      }}
                    >
                      <X size={9} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SettingGroup>
      </div>

      {/* ── Apps disponíveis para adicionar ── */}
      {available.length > 0 && (
        <div>
          <SectionLabel>Apps para adicionar ({available.length})</SectionLabel>
          <SettingGroup>
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12 }}
            >
              {available.map((app) => (
                <div
                  key={app.id}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 6px 8px",
                    width: 72,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    opacity: 0.75,
                  }}
                >
                  <DockAppIcon
                    iconName={app.icon}
                    color={app.color}
                    size={44}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: "var(--text-tertiary)",
                      textAlign: "center",
                      maxWidth: 60,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {app.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => addToMesa(app.id, app.name)}
                    aria-label={`Adicionar ${app.name} à mesa`}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      cursor: "pointer",
                      color: "var(--text-tertiary)",
                      padding: 0,
                      transition:
                        "background 120ms ease, border-color 120ms ease, color 120ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(99,102,241,0.20)";
                      e.currentTarget.style.borderColor =
                        "rgba(99,102,241,0.35)";
                      e.currentTarget.style.color = "#a5b4fc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.08)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.10)";
                      e.currentTarget.style.color = "var(--text-tertiary)";
                    }}
                  >
                    <Plus size={9} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          </SettingGroup>
        </div>
      )}

      {/* ── Widgets ── */}
      <div>
        <SectionLabel>Widgets</SectionLabel>
        <SettingGroup>
          {MESA_WIDGET_CATALOG.map((w, i) => {
            const Icon = w.icon;
            return (
              <SettingRow
                key={w.id}
                label={w.label}
                sublabel={w.description}
                last={i === MESA_WIDGET_CATALOG.length - 1}
                icon={
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      size={14}
                      strokeWidth={1.7}
                      style={{ color: "var(--text-secondary)" }}
                    />
                  </div>
                }
                labelBadge={<Badge variant="neutral">Em breve</Badge>}
              />
            );
          })}
        </SettingGroup>
      </div>

      {/* ── Restaurar padrão ── */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => updateLayout(DEFAULT_LAYOUT)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "background 120ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.11)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          }}
        >
          <RotateCcw size={12} strokeWidth={2} />
          Restaurar padrão
        </button>
      </div>
    </div>
  );
}

// ─── Theme mode selector (pill toggle: Sol / Lua) ────────────────────────────

function ThemeModeSelector() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const toggleRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    const toDark = !isDark;

    const applyTheme = () => {
      setTheme(toDark ? "dark" : "light");
    };

    if (typeof document.startViewTransition !== "function") {
      applyTheme();
      return;
    }

    const root = document.documentElement;
    root.dataset["magicuiThemeVt"] = "active";
    root.style.setProperty("--magicui-theme-toggle-vt-duration", "400ms");
    const cleanup = () => {
      delete root.dataset["magicuiThemeVt"];
      root.style.removeProperty("--magicui-theme-toggle-vt-duration");
    };

    const transition = document.startViewTransition(applyTheme);
    if (typeof transition?.finished?.finally === "function") {
      transition.finished.finally(cleanup);
    } else {
      cleanup();
    }

    const ready = transition?.ready;
    if (
      ready &&
      typeof ready.then === "function" &&
      toggleRef.current !== null
    ) {
      const { top, left, width, height } =
        toggleRef.current.getBoundingClientRect();
      const cx = left + width / 2;
      const cy = top + height / 2;
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const r = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));
      ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${cx}px ${cy}px)`,
              `circle(${r}px at ${cx}px ${cy}px)`,
            ],
          },
          {
            duration: 400,
            easing: "ease-in-out",
            fill: "forwards",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      });
    }
  }

  const TRACK_W = 72;
  const TRACK_H = 32;
  const THUMB_SIZE = 24;
  const THUMB_TRAVEL = TRACK_W - THUMB_SIZE - 8;

  return (
    <button
      ref={toggleRef}
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      style={{
        position: "relative",
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        border: "1px solid rgba(255,255,255,0.12)",
        background: isDark
          ? "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)"
          : "linear-gradient(135deg, #fde68a 0%, #fbbf24 100%)",
        cursor: "pointer",
        transition: "background 350ms ease, border-color 350ms ease",
        padding: 0,
        outline: "none",
        flexShrink: 0,
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.35)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Sun icon — left side */}
      <Sun
        size={13}
        strokeWidth={2}
        style={{
          position: "absolute",
          left: 8,
          top: "50%",
          transform: "translateY(-50%)",
          color: isDark ? "rgba(255,255,255,0.25)" : "rgba(120,60,0,0.7)",
          transition: "color 350ms ease, opacity 350ms ease",
          pointerEvents: "none",
        }}
      />
      {/* Moon icon — right side */}
      <Moon
        size={12}
        strokeWidth={2}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          color: isDark ? "rgba(199,210,254,0.8)" : "rgba(255,255,255,0.3)",
          transition: "color 350ms ease, opacity 350ms ease",
          pointerEvents: "none",
        }}
      />
      {/* Thumb */}
      <span
        style={{
          position: "absolute",
          top: (TRACK_H - THUMB_SIZE) / 2 - 1,
          left: isDark ? THUMB_TRAVEL + 4 : 4,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: "50%",
          background: isDark
            ? "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)",
          boxShadow: isDark
            ? "0 2px 8px rgba(99,102,241,0.5)"
            : "0 2px 8px rgba(0,0,0,0.18)",
          transition:
            "left 350ms cubic-bezier(0.34,1.56,0.64,1), background 350ms ease, box-shadow 350ms ease",
          pointerEvents: "none",
        }}
      />
    </button>
  );
}

// ─── Tab: Aparência ───────────────────────────────────────────────────────────

function TabAparencia() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();
  const wallpaper = useMesaStore((s) => s.wallpaper);
  const wallpaperUrl = useMesaStore((s) => s.wallpaperUrl);
  const setWallpaper = useMesaStore((s) => s.setWallpaper);
  const setCustomWallpaper = useMesaStore((s) => s.setCustomWallpaper);
  const clearCustomWallpaper = useMesaStore((s) => s.clearCustomWallpaper);
  const fetchLayout = useMesaStore((s) => s.fetchLayout);

  const [customUploading, setCustomUploading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchLayout();
  }, [fetchLayout]);

  const isCustomActive = wallpaper === CUSTOM_WALLPAPER_ID;
  const hasCustomImage = wallpaperUrl !== null && wallpaperUrl !== "";

  async function handleCustomUpload(file: File) {
    if (drivers === null || userId === null || activeCompanyId === null) return;
    setCustomError(null);
    if (!ACCEPTED_IMG_TYPES.includes(file.type)) {
      setCustomError("Formato inválido. Use JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCustomError("Arquivo maior que 5 MB.");
      return;
    }

    setCustomUploading(true);
    await syncDataClientSession(drivers);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}-${activeCompanyId}.${ext}`;
    const client = drivers.data.getClient();
    const { error: upErr } = await client.storage
      .from("user-wallpapers")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr !== null) {
      setCustomError(upErr.message);
      setCustomUploading(false);
      return;
    }
    const { data: pub } = client.storage
      .from("user-wallpapers")
      .getPublicUrl(path);
    setCustomWallpaper(`${pub.publicUrl}?v=${Date.now()}`);
    setCustomUploading(false);
  }

  function pickCustomFile() {
    customInputRef.current?.click();
  }

  function handleCustomFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file === undefined) return;
    void handleCustomUpload(file);
    e.target.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Palette}
        iconBg="rgba(139,92,246,0.22)"
        iconColor="#a78bfa"
        title="Aparência"
        subtitle="Personalize o tema e o plano de fundo da Mesa"
      />

      <div>
        <SectionLabel>Tema</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Modo claro / escuro"
            sublabel="Alterna com animação entre os modos"
            last
          >
            <ThemeModeSelector />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Plano de fundo</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 10,
          }}
        >
          {WALLPAPERS.map((id) => {
            const isActive = wallpaper === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setWallpaper(id)}
                aria-label={WALLPAPER_NAMES[id]}
                style={{
                  borderRadius: 12,
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  transition: "transform 120ms ease",
                }}
              >
                <div
                  style={{
                    height: 84,
                    borderRadius: 12,
                    ...getWallpaperStyle(id),
                    border: isActive
                      ? "2px solid #818cf8"
                      : "1px solid rgba(255,255,255,0.10)",
                    boxShadow: isActive
                      ? "0 0 0 3px rgba(99,102,241,0.20)"
                      : "none",
                    transition:
                      "border-color 120ms ease, box-shadow 120ms ease",
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    textAlign: "center",
                  }}
                >
                  {WALLPAPER_NAMES[id]}
                </span>
              </button>
            );
          })}

          {/* Tile custom — upload de foto própria */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (hasCustomImage) {
                  setCustomWallpaper(wallpaperUrl ?? "");
                } else {
                  pickCustomFile();
                }
              }}
              aria-label={
                hasCustomImage
                  ? "Plano de fundo personalizado"
                  : "Adicionar foto"
              }
              disabled={customUploading}
              style={{
                position: "relative",
                height: 84,
                borderRadius: 12,
                border: hasCustomImage
                  ? isCustomActive
                    ? "2px solid #818cf8"
                    : "1px solid rgba(255,255,255,0.10)"
                  : "1px dashed rgba(255,255,255,0.20)",
                background: hasCustomImage
                  ? `url("${wallpaperUrl}") center/cover no-repeat`
                  : "rgba(255,255,255,0.04)",
                boxShadow:
                  isCustomActive && hasCustomImage
                    ? "0 0 0 3px rgba(99,102,241,0.20)"
                    : "none",
                cursor: customUploading ? "wait" : "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-tertiary)",
                transition:
                  "border-color 120ms ease, box-shadow 120ms ease, background 120ms ease",
              }}
              onMouseEnter={(e) => {
                if (!hasCustomImage && !customUploading)
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
              }}
              onMouseLeave={(e) => {
                if (!hasCustomImage && !customUploading)
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
            >
              {customUploading ? (
                <Loader2
                  size={20}
                  className="animate-spin"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                />
              ) : hasCustomImage ? null : (
                <ImagePlus size={20} strokeWidth={1.6} />
              )}
            </button>
            <span
              style={{
                fontSize: 12,
                fontWeight: isCustomActive ? 500 : 400,
                color: isCustomActive
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
                textAlign: "center",
              }}
            >
              {hasCustomImage ? "Personalizado" : "Adicionar"}
            </span>
            {hasCustomImage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearCustomWallpaper();
                }}
                aria-label="Remover wallpaper personalizado"
                title="Remover"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(6,9,18,0.85)",
                  border: "1px solid rgba(255,255,255,0.20)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.85)",
                  padding: 0,
                  backdropFilter: "blur(6px)",
                  transition: "background 120ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.85)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(6,9,18,0.85)";
                }}
              >
                <Trash2 size={11} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {customError !== null && (
          <p
            style={{
              fontSize: 11,
              color: "#f87171",
              marginTop: 8,
              paddingLeft: 2,
            }}
          >
            {customError}
          </p>
        )}

        {hasCustomImage && (
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 8,
              paddingLeft: 2,
            }}
          >
            Para trocar a foto personalizada, clique em remover (ícone na tile)
            e envie outra.
          </p>
        )}

        <input
          ref={customInputRef}
          type="file"
          accept={ACCEPTED_IMG_TYPES.join(",")}
          onChange={handleCustomFileChange}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}

// ─── VersionCard (shared — usado em TabSobre e no tile Home) ─────────────────

interface VersionCardData {
  /** caminho para imagem (ex: /aethereos-logo.png) */
  logoSrc?: string;
  /** ícone lucide quando não há logo */
  icon?: typeof User;
  iconBg?: string;
  iconColor?: string;
  /** ex: "ÆTHEREOS OS" */
  name: string;
  /** codinome da release, ex: "Armstrong" */
  codename?: string;
  /** ex: "1.0.0-beta" */
  version: string;
  /** ex: "Produção · sa-east-1" */
  env?: string;
  /** cor de destaque para a pill do codinome */
  accent?: string;
}

function VersionCardInner({
  name,
  codename,
  version,
  env,
  accent = "#6366f1",
}: VersionCardData) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "space-between",
      }}
    >
      {/* Badge — canto superior direito */}
      {codename !== undefined && (
        <span
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            padding: "2px 8px",
            borderRadius: 999,
            background: `${accent}22`,
            border: `1px solid ${accent}44`,
            fontSize: 10,
            fontWeight: 700,
            color: accent,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          {codename}
        </span>
      )}

      {/* Topo — nome */}
      <p
        style={{
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          margin: 0,
          paddingRight: codename !== undefined ? 80 : 0,
        }}
      >
        {name}
      </p>

      {/* Rodapé — versão + ambiente */}
      <div>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-secondary)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {version}
        </p>
        {env !== undefined && (
          <p
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              margin: "3px 0 0",
            }}
          >
            {env}
          </p>
        )}
      </div>
    </div>
  );
}

function VersionCard(props: VersionCardData) {
  return (
    <div
      style={{
        ...TILE_BASE,
        display: "flex",
        flexDirection: "column",
        minHeight: 160,
      }}
    >
      <VersionCardInner {...props} />
    </div>
  );
}

// ─── Tab: Sobre ───────────────────────────────────────────────────────────────

function TabSobre() {
  const { userId } = useSessionStore();
  const drivers = useDrivers();

  // Language preference (movido de Meu Perfil)
  const [lang, setLang] = useState("pt-BR");
  const [langSaveState, setLangSaveState] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const langInitializedRef = useRef(false);
  const langTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (drivers === null || userId === null) return;
    drivers.data
      .from("settings")
      .select("key,value")
      .eq("scope", "user")
      .eq("scope_id", userId)
      .eq("key", "lang")
      .maybeSingle()
      .then(({ data }: { data: { value: unknown } | null }) => {
        if (data !== null && typeof data.value === "string") {
          setLang(data.value);
        }
        langInitializedRef.current = true;
      });
  }, [drivers, userId]);

  function handleLangChange(value: string) {
    setLang(value);
    if (!langInitializedRef.current) return;
    if (drivers === null || userId === null) return;
    setLangSaveState("saving");
    if (langTimerRef.current !== null) clearTimeout(langTimerRef.current);
    langTimerRef.current = setTimeout(async () => {
      await drivers.data
        .from("settings")
        .upsert(
          { scope: "user", scope_id: userId, key: "lang", value },
          { onConflict: "scope,scope_id,key" },
        );
      void drivers.scp.publishEvent("platform.settings.updated", {
        scope: "user",
        scope_id: userId,
        key: "lang",
        updated_by: userId,
      });
      setLangSaveState("saved");
      setTimeout(() => setLangSaveState("idle"), 2000);
    }, 800);
  }

  const [betaEnrolled, setBetaEnrolled] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Info}
        iconBg="rgba(100,116,139,0.22)"
        iconColor="#94a3b8"
        iconUrl="/sistema-logo.png"
        noContainer
        title="Sistema ÆTHEREOS"
        subtitle={
          <>
            Enterprise OS 1.0.0-beta{" "}
            <span
              style={{
                display: "inline-block",
                padding: "1px 8px",
                borderRadius: 999,
                background: "#6366f122",
                border: "1px solid #6366f144",
                fontSize: 10,
                fontWeight: 700,
                color: "#6366f1",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                verticalAlign: "middle",
                marginLeft: 4,
              }}
            >
              Armstrong
            </span>
          </>
        }
      />

      {/* Versões — primeiro */}
      <div>
        <SectionLabel>Versões</SectionLabel>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <VersionCard
            name="ÆTHEREOS OS"
            codename="Armstrong"
            version="1.0.0-beta"
            env="Produção · sa-east-1"
            accent="#6366f1"
          />
          <VersionCard
            name="Software Context Protocol (SCP)"
            codename="Protocolo"
            version="v1.0"
            env="Online · sa-east-1"
            accent="#06b6d4"
          />
        </div>
      </div>

      {/* Idioma — segundo */}
      <div>
        <SectionLabel>Idioma</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Idioma da interface"
            sublabel={
              langSaveState === "saving"
                ? "Salvando…"
                : langSaveState === "saved"
                  ? "Salvo!"
                  : "Aplicado em todo o OS"
            }
            icon={
              <Globe
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
            last
          >
            <SettingSelect
              value={lang}
              onChange={handleLangChange}
              options={[
                { value: "pt-BR", label: "Português (Brasil)" },
                { value: "en-US", label: "English (US)" },
                { value: "es-ES", label: "Español" },
              ]}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      {/* Projeto */}
      <div>
        <SectionLabel>Projeto</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="GitHub"
            sublabel="Código-fonte aberto, issues e contribuições"
            icon={
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "#181717",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <img
                  src="/integrations/github.svg"
                  alt="GitHub"
                  style={{ width: 13, height: 13, objectFit: "contain" }}
                />
              </div>
            }
            last
          >
            <InlineButton
              onClick={() =>
                window.open(
                  "https://github.com/aethereos",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              Abrir
              <ExternalLink size={11} />
            </InlineButton>
          </SettingRow>
        </SettingGroup>
      </div>

      {/* Ajuda */}
      <div>
        <SectionLabel>Ajuda</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="FAQ"
            sublabel="Perguntas frequentes sobre o Aethereos"
            icon={
              <HelpCircle
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <InlineButton onClick={() => {}}>Ver</InlineButton>
          </SettingRow>
          <SettingRow
            label="Tutoriais"
            sublabel="Guias passo a passo para cada módulo"
            icon={
              <BookOpen
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <InlineButton onClick={() => {}}>Ver</InlineButton>
          </SettingRow>
          <SettingRow
            label="Dicas"
            sublabel="Atalhos, recursos ocultos e boas práticas"
            icon={
              <Lightbulb
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
            last
          >
            <InlineButton onClick={() => {}}>Ver</InlineButton>
          </SettingRow>
        </SettingGroup>
      </div>

      {/* Comunidade */}
      <div>
        <SectionLabel>Comunidade</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Fale conosco"
            sublabel="Envie uma mensagem direto ao time de desenvolvedores"
            icon={
              <MessageSquare
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <InlineButton onClick={() => {}}>Enviar</InlineButton>
          </SettingRow>
          <SettingRow
            label="Programa de desenvolvedores beta"
            sublabel={
              betaEnrolled
                ? "Inscrito — você recebe atualizações antecipadas"
                : "Acesse funcionalidades antes do lançamento oficial"
            }
            icon={
              <Rocket
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
            last
          >
            <Toggle
              on={betaEnrolled}
              onToggle={() => setBetaEnrolled((v) => !v)}
            />
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const ASIDE_STYLE = {
  width: "100%",
  height: "100%",
  background: "rgba(15,21,27,0.82)",
  display: "flex",
  flexDirection: "column" as const,
  overflowY: "auto" as const,
  boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
};

function NavItemIcon({
  Icon,
  size,
}: {
  itemId: TabId;
  Icon: typeof User;
  size: number;
  imgSize: number;
  avatarUrl: string | null;
  logoUrl: string | null;
}) {
  return (
    <Icon
      size={size}
      style={{ color: "currentColor", flexShrink: 0 }}
      strokeWidth={1.8}
    />
  );
}

function Sidebar({
  active,
  onSelect,
  collapsed,
  avatarUrl,
  logoUrl,
}: {
  active: TabId;
  onSelect: (id: TabId) => void;
  collapsed: boolean;
  avatarUrl: string | null;
  logoUrl: string | null;
}) {
  const [query, setQuery] = useState("");

  const filtered = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter((section) => section.items.length > 0);

  if (collapsed) {
    const allItems: { id: TabId; label: string; icon: typeof User }[] = [
      { id: "home", label: "Painel de Configurações", icon: Home },
      ...NAV_SECTIONS.flatMap((s) => s.items),
    ];
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
          {allItems.map((item) => {
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
                <NavItemIcon
                  itemId={item.id}
                  Icon={item.icon}
                  size={16}
                  imgSize={22}
                  avatarUrl={avatarUrl}
                  logoUrl={logoUrl}
                />
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside style={ASIDE_STYLE}>
      {/* App identity — clickable, navigates to home */}
      <button
        type="button"
        onClick={() => onSelect("home")}
        aria-label="Painel de Configurações"
        aria-current={active === "home" ? "page" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 14px 12px",
          background:
            active === "home" ? "rgba(255,255,255,0.04)" : "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
          transition: "background 120ms ease",
        }}
        onMouseEnter={(e) => {
          if (active !== "home")
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        }}
        onMouseLeave={(e) => {
          if (active !== "home")
            e.currentTarget.style.background = "transparent";
        }}
      >
        <Settings
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
          Configurações
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
            name="ae-config-nav-filter"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
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
        {filtered.map((section, sectionIdx) => (
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
              const isSelected = active === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  style={{
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
                  }}
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
                  <NavItemIcon
                    itemId={item.id}
                    Icon={item.icon}
                    size={15}
                    imgSize={20}
                    avatarUrl={avatarUrl}
                    logoUrl={logoUrl}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}

        {filtered.length === 0 && (
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

// ─── Home (true bento) ────────────────────────────────────────────────────────

const TILE_BASE: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
};

function TileIcon({
  Icon,
  color,
  bg,
  size = 30,
}: {
  Icon: typeof User;
  color: string;
  bg: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: bg,
        border: `1px solid ${color}38`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon
        size={Math.round(size * 0.55)}
        style={{ color }}
        strokeWidth={1.8}
      />
    </div>
  );
}

function ToggleRowTile({
  Icon,
  color,
  bg,
  label,
  sublabel,
  on,
  onToggle,
  gridColumn,
  gridRow,
}: {
  Icon: typeof User;
  color: string;
  bg: string;
  label: string;
  sublabel: string;
  on: boolean;
  onToggle: () => void;
  gridColumn: string;
  gridRow: string;
}) {
  return (
    <div style={{ ...TILE_BASE, gridColumn, gridRow, padding: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
          }}
        >
          <TileIcon Icon={Icon} color={color} bg={bg} size={36} />
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 2,
                lineHeight: 1.4,
              }}
            >
              {sublabel}
            </p>
          </div>
        </div>
        <Toggle on={on} onToggle={onToggle} />
      </div>
    </div>
  );
}

function ToggleStackTile({
  Icon,
  color,
  bg,
  label,
  on,
  onToggle,
  gridColumn,
  gridRow,
}: {
  Icon: typeof User;
  color: string;
  bg: string;
  label: string;
  on: boolean;
  onToggle: () => void;
  gridColumn: string;
  gridRow: string;
}) {
  return (
    <div style={{ ...TILE_BASE, gridColumn, gridRow }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TileIcon Icon={Icon} color={color} bg={bg} />
        <Toggle on={on} onToggle={onToggle} />
      </div>
      <div style={{ flex: 1 }} />
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 11,
          color: on ? color : "var(--text-tertiary)",
          marginTop: 2,
          fontWeight: 500,
        }}
      >
        {on ? "Ativado" : "Desativado"}
      </p>
    </div>
  );
}

function TabHome({ onSelect }: { onSelect: (id: TabId) => void }) {
  const { email, avatarUrl } = useSessionStore();
  const initials = email !== null ? email.slice(0, 2).toUpperCase() : "??";
  const displayName = email !== null ? email.split("@")[0] : "Usuário";

  const notifRemote = useUserPreference<NotifPrefs>(
    "notification_prefs",
    NOTIF_DEFAULTS,
  );
  const notif: NotifPrefs = { ...NOTIF_DEFAULTS, ...notifRemote.value };
  function toggleNotif(key: keyof NotifPrefs) {
    const next = { ...notif, [key]: !notif[key] };
    notifRemote.set(next);
  }

  // Local-only state (visual)
  const [twoFA, setTwoFA] = useState(false);
  const [sound, setSound] = useState(true);
  const [lang, setLang] = useState("pt-BR");

  // Real wallpaper from Mesa store
  const wallpaper = useMesaStore((s) => s.wallpaper);
  const setWallpaper = useMesaStore((s) => s.setWallpaper);
  const fetchLayout = useMesaStore((s) => s.fetchLayout);
  useEffect(() => {
    void fetchLayout();
  }, [fetchLayout]);

  const langLabel =
    lang === "pt-BR" ? "Português" : lang === "en-US" ? "English" : "Español";

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          marginBottom: 24,
          padding: "24px 28px",
          borderRadius: 16,
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(139,92,246,0.06))",
          border: "1px solid rgba(99,102,241,0.20)",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            fontFamily: "var(--font-display)",
            marginBottom: 6,
            lineHeight: 1.2,
          }}
        >
          Painel de Configurações
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            maxWidth: 620,
          }}
        >
          Acesse rapidamente os controles mais usados do seu workspace.
        </p>
      </div>

      {/* Bento grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridAutoRows: "minmax(132px, auto)",
          gap: 14,
        }}
      >
        {/* ── Profile (2×2) ── */}
        <div
          style={{
            ...TILE_BASE,
            gridColumn: "1 / span 2",
            gridRow: "1 / span 2",
            padding: 20,
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(255,255,255,0.04))",
            borderColor: "rgba(99,102,241,0.20)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(30,41,80,0.95))",
                border: "1px solid rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {avatarUrl !== null ? (
                <img
                  src={avatarUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    color: "rgba(255,255,255,0.94)",
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                  }}
                >
                  {initials}
                </span>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                  textTransform: "capitalize",
                }}
              >
                {displayName}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  marginTop: 3,
                  wordBreak: "break-word",
                }}
              >
                {email ?? "—"}
              </p>
            </div>
          </div>

          <p
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              marginTop: 16,
            }}
          >
            Gerencie suas informações pessoais, foto, idioma e preferências da
            conta.
          </p>

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => onSelect("perfil")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(99,102,241,0.18)",
                border: "1px solid rgba(99,102,241,0.32)",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 500,
                color: "#a5b4fc",
                cursor: "pointer",
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(99,102,241,0.28)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(99,102,241,0.18)";
              }}
            >
              Editar perfil
              <ArrowRight size={12} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Tema (1×1) ── */}
        <div
          style={{
            ...TILE_BASE,
            gridColumn: "3 / span 1",
            gridRow: "1 / span 1",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TileIcon
              Icon={Palette}
              color="#f472b6"
              bg="rgba(236,72,153,0.18)"
            />
            <AnimatedThemeToggler
              variant="circle"
              fromCenter
              className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-white/[0.06] border border-white/10 cursor-pointer text-[var(--text-primary)] transition-colors hover:bg-white/[0.12] [&>svg]:w-4 [&>svg]:h-4"
            />
          </div>
          <div style={{ flex: 1 }} />
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Tema
          </p>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            Claro / Escuro
          </p>
        </div>

        {/* ── Idioma (1×1) ── */}
        <div
          style={{
            ...TILE_BASE,
            gridColumn: "4 / span 1",
            gridRow: "1 / span 1",
          }}
        >
          <TileIcon Icon={Globe} color="#22d3ee" bg="rgba(6,182,212,0.18)" />
          <div style={{ flex: 1 }} />
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Idioma
          </p>
          <div style={{ marginTop: 6 }}>
            <SmartSelect
              value={lang}
              onChange={setLang}
              searchable={false}
              options={[
                { value: "pt-BR", label: "Português (Brasil)" },
                { value: "en-US", label: "English (US)" },
                { value: "es-ES", label: "Español" },
              ]}
            />
          </div>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 4,
            }}
          >
            Atual: {langLabel}
          </p>
        </div>

        {/* ── Notificações push (2×1) ── */}
        <ToggleRowTile
          Icon={Bell}
          color="#fbbf24"
          bg="rgba(245,158,11,0.18)"
          label="Notificações push"
          sublabel="Receba alertas em tempo real no seu navegador"
          on={notif.push_notifications}
          onToggle={() => toggleNotif("push_notifications")}
          gridColumn="3 / span 2"
          gridRow="2 / span 1"
        />

        {/* ── 2FA (2×1) ── */}
        <div
          style={{
            ...TILE_BASE,
            gridColumn: "1 / span 2",
            gridRow: "3 / span 1",
            padding: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
              }}
            >
              <TileIcon
                Icon={Shield}
                color="#34d399"
                bg="rgba(16,185,129,0.18)"
                size={36}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Autenticação 2FA
                  </p>
                  <Badge variant={twoFA ? "success" : "neutral"}>
                    {twoFA ? "Ativada" : "Desativada"}
                  </Badge>
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  Camada extra de proteção via app autenticador
                </p>
              </div>
            </div>
            <Toggle on={twoFA} onToggle={() => setTwoFA((v) => !v)} />
          </div>
        </div>

        {/* ── Notificações (1×1) — espelho do item de menu ── */}
        <button
          type="button"
          onClick={() => onSelect("notificacoes")}
          style={{
            ...TILE_BASE,
            gridColumn: "3 / span 1",
            gridRow: "3 / span 1",
            cursor: "pointer",
            textAlign: "left",
            transition: "background 160ms ease, border-color 160ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          }}
        >
          <TileIcon Icon={Bell} color="#a78bfa" bg="rgba(139,92,246,0.18)" />
          <div style={{ flex: 1 }} />
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Notificações
          </p>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            Push, email e canais
          </p>
        </button>

        {/* ── Sons (1×1) ── */}
        <ToggleStackTile
          Icon={Volume2}
          color="#fb923c"
          bg="rgba(249,115,22,0.18)"
          label="Sons"
          on={sound}
          onToggle={() => setSound((v) => !v)}
          gridColumn="4 / span 1"
          gridRow="3 / span 1"
        />

        {/* ── Wallpaper (2×1) ── */}
        <div
          style={{
            ...TILE_BASE,
            gridColumn: "1 / span 2",
            gridRow: "4 / span 1",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <TileIcon
                Icon={LayoutGrid}
                color="#fb7185"
                bg="rgba(244,63,94,0.18)"
              />
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Plano de fundo
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 1,
                  }}
                >
                  Selecione o wallpaper da Mesa
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flex: 1 }}>
            {WALLPAPERS.map((id) => {
              const isActive = wallpaper === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setWallpaper(id)}
                  aria-label={WALLPAPER_NAMES[id]}
                  title={WALLPAPER_NAMES[id]}
                  style={{
                    flex: 1,
                    minHeight: 56,
                    borderRadius: 10,
                    ...getWallpaperStyle(id),
                    border: isActive
                      ? "2px solid #818cf8"
                      : "1px solid rgba(255,255,255,0.10)",
                    cursor: "pointer",
                    transition: "border-color 120ms ease, transform 120ms ease",
                    boxShadow: isActive
                      ? "0 0 0 3px rgba(99,102,241,0.20)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.10)";
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* ── Privacidade & LGPD (2×1) ── */}
        <button
          type="button"
          onClick={() => onSelect("dados-privacidade")}
          style={{
            ...TILE_BASE,
            gridColumn: "3 / span 2",
            gridRow: "4 / span 1",
            padding: 18,
            cursor: "pointer",
            textAlign: "left",
            transition: "background 160ms ease, border-color 160ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <TileIcon
              Icon={FileText}
              color="#22d3ee"
              bg="rgba(6,182,212,0.18)"
            />
            <Badge variant="success">Em conformidade</Badge>
          </div>
          <div style={{ flex: 1 }} />
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Privacidade & LGPD
          </p>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            Exporte ou solicite exclusão dos seus dados conforme a Lei
            13.709/2018
          </p>
        </button>

        {/* ── Sessões ativas (2×1) ── */}
        <button
          type="button"
          onClick={() => onSelect("perfil")}
          style={{
            ...TILE_BASE,
            gridColumn: "1 / span 2",
            gridRow: "5 / span 1",
            padding: 18,
            cursor: "pointer",
            textAlign: "left",
            transition: "background 160ms ease, border-color 160ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <TileIcon
                Icon={Monitor}
                color="#34d399"
                bg="rgba(16,185,129,0.18)"
                size={36}
              />
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Sessões ativas
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  1 dispositivo conectado agora
                </p>
              </div>
            </div>
            <ArrowRight
              size={14}
              style={{ color: "var(--text-tertiary)" }}
              strokeWidth={1.8}
            />
          </div>
        </button>

        {/* ── Minha Empresa (1×1) — espelho do item de menu ── */}
        <button
          type="button"
          onClick={() => onSelect("minha-empresa")}
          style={{
            ...TILE_BASE,
            gridColumn: "3 / span 1",
            gridRow: "5 / span 1",
            cursor: "pointer",
            textAlign: "left",
            transition: "background 160ms ease, border-color 160ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          }}
        >
          <TileIcon
            Icon={Building2}
            color="#fb923c"
            bg="rgba(249,115,22,0.18)"
          />
          <div style={{ flex: 1 }} />
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Minha Empresa
          </p>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            CNPJ, dados e logo
          </p>
        </button>

        {/* ── Sobre / Versão (1×1) — espelho do VersionCard ── */}
        <button
          type="button"
          onClick={() => onSelect("sobre")}
          style={{
            ...TILE_BASE,
            gridColumn: "4 / span 1",
            gridRow: "5 / span 1",
            cursor: "pointer",
            textAlign: "left",
            transition: "background 160ms ease, border-color 160ms ease",
            display: "flex",
            flexDirection: "column",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          }}
        >
          <VersionCardInner
            name="ÆTHEREOS OS"
            codename="Armstrong"
            version="1.0.0-beta"
            env="Produção · sa-east-1"
            accent="#6366f1"
          />
        </button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function TabContent({
  id,
  onSelect,
  avatarUrl,
  setAvatarUrl,
  logoUrl,
  setLogoUrl,
}: {
  id: TabId;
  onSelect: (id: TabId) => void;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
}) {
  switch (id) {
    case "home":
      return <TabHome onSelect={onSelect} />;
    case "minha-empresa":
      return <TabMinhaEmpresa logoUrl={logoUrl} setLogoUrl={setLogoUrl} />;
    case "perfil":
      return <TabPerfil avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl} />;
    case "notificacoes":
      return <TabNotificacoes />;
    case "dados-privacidade":
      return <TabDadosPrivacidade />;
    case "dock":
      return <TabDock />;
    case "mesa":
      return <TabMesa />;
    case "aparencia":
      return <TabAparencia />;
    case "sobre":
      return <TabSobre />;
  }
}

const SIDEBAR_W = 239;
const SIDEBAR_ICON_W = 48;

export function ConfiguracoesApp() {
  const drivers = useDrivers();
  const { activeCompanyId, avatarUrl, setAvatarUrl } = useSessionStore();
  const pendingTab = useSettingsNavStore((s) => s.pendingTab);
  const clearPendingTab = useSettingsNavStore((s) => s.clearPendingTab);
  const [active, setActive] = useState<TabId>(pendingTab ?? "home");
  const [collapsed, setCollapsed] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const isHome = active === "home";

  // Consome pending tab vindo de outros apps (ex.: context menu da Mesa
  // pedindo "Papel de Parede" → tab "mesa").
  useEffect(() => {
    if (pendingTab !== null) {
      setActive(pendingTab);
      clearPendingTab();
    }
  }, [pendingTab, clearPendingTab]);

  // Hidrata logo da empresa (avatar do user já é hidratado em OSDesktop e
  // vive no session store)
  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    void drivers.data
      .from("companies")
      .select("logo_url")
      .eq("id", activeCompanyId)
      .maybeSingle()
      .then(({ data }: { data: { logo_url: string | null } | null }) => {
        if (data !== null && data.logo_url !== null && data.logo_url !== "") {
          setLogoUrl(data.logo_url);
        }
      });
  }, [drivers, activeCompanyId]);

  return (
    <div
      data-ae="configuracoes-app"
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "var(--bg-elevated)",
        position: "relative",
      }}
    >
      {/* Animated sidebar wrapper */}
      <div
        style={{
          width: collapsed ? SIDEBAR_ICON_W : SIDEBAR_W,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 250ms ease",
        }}
      >
        <Sidebar
          active={active}
          onSelect={setActive}
          collapsed={collapsed}
          avatarUrl={avatarUrl}
          logoUrl={logoUrl}
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

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 28px 160px",
        }}
      >
        <div style={{ maxWidth: 1095, margin: "0 auto" }}>
          {/* Breadcrumb */}
          <nav
            aria-label="breadcrumb"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              onClick={() => setActive("home")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: 0,
                background: "transparent",
                border: "none",
                cursor: isHome ? "default" : "pointer",
                color: "var(--text-tertiary)",
                transition: "color 120ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isHome)
                  e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                if (!isHome)
                  e.currentTarget.style.color = "var(--text-tertiary)";
              }}
              disabled={isHome}
              aria-current={isHome ? "page" : undefined}
            >
              <Settings
                size={13}
                style={{ color: "currentColor", flexShrink: 0 }}
                strokeWidth={1.6}
              />
              <span style={{ fontSize: 12, color: "currentColor" }}>
                Configurações
              </span>
            </button>
            {!isHome && (
              <>
                <ChevronRight
                  size={12}
                  style={{
                    color: "var(--text-tertiary)",
                    flexShrink: 0,
                    opacity: 0.6,
                  }}
                  strokeWidth={1.8}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  {TAB_LABELS[active]}
                </span>
              </>
            )}
          </nav>

          <TabContent
            id={active}
            onSelect={setActive}
            avatarUrl={avatarUrl}
            setAvatarUrl={setAvatarUrl}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
          />
        </div>
      </main>
    </div>
  );
}

export { TAB_LABELS };
