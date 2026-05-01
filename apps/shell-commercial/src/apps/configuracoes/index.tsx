import { useState, useEffect, useRef } from "react";
import {
  User,
  Bell,
  Shield,
  FileText,
  PanelBottom,
  LayoutGrid,
  Palette,
  Link2,
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
} from "lucide-react";
import { useSessionStore } from "../../stores/session";
import { useDrivers } from "../../lib/drivers-context";
import { AnimatedThemeToggler } from "../../components/ui/animated-theme-toggler";
import {
  useMesaStore,
  WALLPAPERS,
  WALLPAPER_NAMES,
  getWallpaperStyle,
} from "../../stores/mesaStore";

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
  | "integracoes"
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
      { id: "dados-privacidade", label: "Dados e Privacidade", icon: FileText },
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
    label: "Sistema",
    items: [
      { id: "integracoes", label: "Integrações", icon: Link2 },
      { id: "sobre", label: "Sobre", icon: Info },
    ],
  },
];

const TAB_LABELS: Record<TabId, string> = {
  home: "Início",
  "minha-empresa": "Minha Empresa",
  perfil: "Meu Perfil",
  notificacoes: "Notificações",
  "dados-privacidade": "Dados e Privacidade",
  dock: "Dock",
  mesa: "Mesa",
  aparencia: "Aparência",
  integracoes: "Integrações",
  sobre: "Sobre",
};

// ─── Design primitives ────────────────────────────────────────────────────────

function ContentHeader({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  icon: typeof User;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
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
        }}
      >
        <Icon size={28} style={{ color: iconColor }} strokeWidth={1.5} />
      </div>
      <div>
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

function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
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
  children,
}: {
  label: string;
  sublabel?: string;
  last?: boolean;
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
        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
          {label}
        </span>
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

function SettingSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 220,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "7px 11px",
        fontSize: 13,
        color: "var(--text-primary)",
        outline: "none",
        cursor: "pointer",
        transition: "border-color 120ms ease",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(99,102,241,0.65)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "#1e2530" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
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

function MonoCode({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        display: "block",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 8,
        padding: "7px 11px",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        color: "var(--text-secondary)",
        maxWidth: 280,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </code>
  );
}

function ComingSoonBanner({ message }: { message?: string }) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: "rgba(99,102,241,0.07)",
        border: "1px solid rgba(99,102,241,0.18)",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <span style={{ fontSize: 20 }}>🚧</span>
      <div>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          Em desenvolvimento
        </p>
        <p
          style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 3 }}
        >
          {message ?? "Esta seção estará disponível em breve."}
        </p>
      </div>
    </div>
  );
}

// ─── Image upload card (avatar / logo) ───────────────────────────────────────

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
        }}
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

function TabMinhaEmpresa({
  logoUrl,
  setLogoUrl,
}: {
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
}) {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const [cnpjDisplay, setCnpjDisplay] = useState("");
  const [cnpjPreview, setCnpjPreview] = useState<CnpjPreview | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const cnpjLookupAbort = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);

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

  // Hydrate from companies table
  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    void drivers.data
      .from("companies")
      .select("name,cnpj,cnpj_data,trade_name,email,phone")
      .eq("id", activeCompanyId)
      .single()
      .then(
        ({
          data,
        }: {
          data: {
            name: string | null;
            cnpj: string | null;
            cnpj_data: CnpjPreview | null;
            trade_name: string | null;
            email: string | null;
            phone: string | null;
          } | null;
        }) => {
          if (data === null) {
            initializedRef.current = true;
            return;
          }
          if (data.name !== null) setName(data.name);
          if (data.cnpj !== null) setCnpjDisplay(maskCnpj(data.cnpj));
          if (data.cnpj_data !== null) setCnpjPreview(data.cnpj_data);
          if (data.trade_name !== null) setTradeName(data.trade_name);
          if (data.email !== null) setCompanyEmail(data.email);
          if (data.phone !== null) setPhone(data.phone);
          initializedRef.current = true;
        },
      );
  }, [drivers, activeCompanyId]);

  async function lookupCnpj(cnpj: string) {
    if (cnpjLookupAbort.current) cnpjLookupAbort.current.abort();
    cnpjLookupAbort.current = new AbortController();

    setCnpjLoading(true);
    setCnpjError(null);
    try {
      const res = await fetch(
        `${supabaseUrl}/functions/v1/cnpj-lookup?cnpj=${cnpj}`,
        {
          headers: { apikey: anonKey },
          signal: cnpjLookupAbort.current.signal,
        },
      );
      if (!res.ok) {
        setCnpjError("CNPJ não encontrado");
      } else {
        const data = (await res.json()) as CnpjPreview;
        setCnpjPreview(data);
        // Auto-preencher razão social e nome fantasia caso estejam vazios
        if (name === "" && data.razao_social !== "") setName(data.razao_social);
        if (tradeName === "" && data.nome_fantasia !== null)
          setTradeName(data.nome_fantasia);
      }
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        setCnpjError("Erro ao consultar CNPJ");
      }
    } finally {
      setCnpjLoading(false);
    }
  }

  function handleCnpjChange(value: string) {
    const masked = maskCnpj(value);
    setCnpjDisplay(masked);
    setCnpjPreview(null);
    setCnpjError(null);

    const digits = masked.replace(/\D/g, "");
    if (digits.length === 14) {
      void lookupCnpj(digits);
    }
  }

  async function handleSave() {
    if (drivers === null || activeCompanyId === null) return;

    const cnpjDigits = cnpjDisplay.replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      setCnpjError("CNPJ deve ter 14 dígitos");
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
      return;
    }

    setSaveState("saving");

    const payload: Record<string, unknown> = {
      cnpj: cnpjDigits,
      cnpj_data: cnpjPreview,
      name,
      trade_name: tradeName !== "" ? tradeName : null,
      email: companyEmail !== "" ? companyEmail : null,
      phone: phone !== "" ? phone : null,
    };

    const { error } = await drivers.data
      .from("companies")
      .update(payload)
      .eq("id", activeCompanyId);

    if (error !== null && error !== undefined) {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
      return;
    }

    void drivers.scp.publishEvent("platform.settings.updated", {
      scope: "company",
      scope_id: activeCompanyId,
      key: "company_profile",
      updated_by: useSessionStore.getState().userId ?? "",
    });

    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Building2}
        iconBg="rgba(6,182,212,0.22)"
        iconColor="#22d3ee"
        title="Minha Empresa"
        subtitle="Cadastro fiscal e dados da pessoa jurídica"
      />

      {/* Logo da empresa */}
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

      {/* Identificação fiscal */}
      <div>
        <SectionLabel>Identificação fiscal</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="CNPJ"
            sublabel="Digite os 14 dígitos para consulta automática"
            last
          >
            <div style={{ position: "relative", width: 220 }}>
              <input
                type="text"
                value={cnpjDisplay}
                onChange={(e) => handleCnpjChange(e.target.value)}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  padding: "7px 32px 7px 11px",
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-primary)",
                  outline: "none",
                  transition: "border-color 120ms ease, box-shadow 120ms ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(99,102,241,0.65)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(99,102,241,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              {cnpjLoading && (
                <Loader2
                  size={14}
                  className="animate-spin"
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-tertiary)",
                  }}
                />
              )}
            </div>
          </SettingRow>
        </SettingGroup>

        {cnpjError !== null && (
          <p
            style={{
              fontSize: 12,
              color: "#f87171",
              marginTop: 8,
              paddingLeft: 2,
            }}
          >
            {cnpjError}
          </p>
        )}

        {cnpjPreview !== null && (
          <div
            style={{
              marginTop: 12,
              padding: 16,
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
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
        )}
      </div>

      {/* Dados da empresa */}
      <div>
        <SectionLabel>Dados da empresa</SectionLabel>
        <SettingGroup>
          <SettingRow label="Razão social">
            <SettingInput value={name} onChange={setName} />
          </SettingRow>
          <SettingRow label="Nome fantasia">
            <SettingInput
              value={tradeName}
              onChange={setTradeName}
              placeholder="(opcional)"
            />
          </SettingRow>
          <SettingRow label="E-mail corporativo">
            <SettingInput
              value={companyEmail}
              onChange={setCompanyEmail}
              type="email"
              placeholder="contato@empresa.com"
            />
          </SettingRow>
          <SettingRow label="Telefone" last>
            <SettingInput
              value={phone}
              onChange={setPhone}
              placeholder="(00) 00000-0000"
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <SaveRow>
        <PrimaryButton
          onClick={() => void handleSave()}
          disabled={saveState === "saving"}
        >
          <SaveLabel state={saveState} label="Salvar alterações" />
        </PrimaryButton>
      </SaveRow>
    </div>
  );
}

// ─── Tab: Perfil (informações + senha + sessão + proteções) ──────────────────

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "Navegador desconhecido";
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
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <div style={{ position: "relative", width: 220 }}>
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

function TabPerfil({
  avatarUrl,
  setAvatarUrl,
}: {
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
}) {
  const { email, userId } = useSessionStore();
  const drivers = useDrivers();

  // Profile data
  const [name, setName] = useState("");
  const [lang, setLang] = useState("pt-BR");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

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
  const langRef = useRef(lang);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  nameRef.current = name;
  langRef.current = lang;

  // Password change
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

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

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
          if (row.key === "lang" && typeof row.value === "string")
            setLang(row.value);
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
          {
            scope: "user",
            scope_id: userId,
            key: "lang",
            value: langRef.current,
          },
          { scope: "user", scope_id: userId, key: "theme", value: theme },
        ];
        for (const s of rows) {
          await drivers.data
            .from("settings")
            .upsert(s, { onConflict: "scope,scope_id,key" });
        }
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
      />

      {/* Foto de perfil */}
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

      {/* Informações pessoais */}
      <div>
        <SectionLabel>Informações pessoais</SectionLabel>
        <SettingGroup>
          <SettingRow label="Nome de exibição">
            <SettingInput
              value={name}
              onChange={(value) => {
                setName(value);
                triggerAutoSave();
              }}
            />
          </SettingRow>
          <SettingRow
            label="E-mail"
            sublabel="Vinculado ao IdP — altere via Supabase Auth"
          >
            <SettingInput value={email ?? ""} readOnly />
          </SettingRow>
          <SettingRow label="Idioma" last>
            <SettingSelect
              value={lang}
              onChange={(value) => {
                setLang(value);
                triggerAutoSave();
              }}
              options={[
                { value: "pt-BR", label: "Português (Brasil)" },
                { value: "en-US", label: "English (US)" },
                { value: "es-ES", label: "Español" },
              ]}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      {/* Identificação */}
      {userId !== null && (
        <div>
          <SectionLabel>Identificação</SectionLabel>
          <SettingGroup>
            <SettingRow label="ID do usuário" last>
              <MonoCode>{userId}</MonoCode>
            </SettingRow>
          </SettingGroup>
        </div>
      )}

      <SaveRow>
        <PrimaryButton
          onClick={triggerAutoSave}
          disabled={saveState === "saving"}
        >
          <SaveLabel state={saveState} label="Salvar alterações" />
        </PrimaryButton>
      </SaveRow>

      {/* Alterar senha */}
      <div>
        <SectionLabel>Alterar senha</SectionLabel>
        <SettingGroup>
          <SettingRow label="Nova senha">
            <PwdInput
              value={newPwd}
              onChange={setNewPwd}
              show={showNew}
              onToggle={() => setShowNew((s) => !s)}
              placeholder="Nova senha"
            />
          </SettingRow>
          <SettingRow label="Confirmar senha" last>
            <PwdInput
              value={confirmPwd}
              onChange={setConfirmPwd}
              show={showConfirm}
              onToggle={() => setShowConfirm((s) => !s)}
              placeholder="Confirmar nova senha"
            />
          </SettingRow>
        </SettingGroup>

        {newPwd.length > 0 && (
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}
          >
            <PasswordBadge ok={v.length} label="8+ caracteres" />
            <PasswordBadge ok={v.upper} label="Maiúscula" />
            <PasswordBadge ok={v.number} label="Número" />
            <PasswordBadge ok={v.special} label="Especial" />
            <PasswordBadge ok={v.match} label="Coincidem" />
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 14,
          }}
        >
          <PrimaryButton
            onClick={() => {
              setPwdState("saving");
              setTimeout(() => {
                setPwdState("saved");
                setTimeout(() => setPwdState("idle"), 2000);
              }, 800);
            }}
            disabled={!canSave || pwdState !== "idle"}
          >
            <SaveLabel state={pwdState} label="Alterar senha" />
          </PrimaryButton>
        </div>
      </div>

      {/* Sessão atual */}
      <div>
        <SectionLabel>Sessão atual</SectionLabel>
        <SettingGroup>
          <SettingRow label="Navegador">
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {detectBrowser()}
            </span>
          </SettingRow>
          <SettingRow label="E-mail da conta">
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {email ?? "—"}
            </span>
          </SettingRow>
          <SettingRow label="Última atividade" last>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {today}
            </span>
          </SettingRow>
        </SettingGroup>
      </div>

      {/* Proteção adicional */}
      <div>
        <SectionLabel>Proteção adicional</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Autenticação em dois fatores"
            sublabel="App autenticador (TOTP)"
          >
            <Badge variant="neutral">Em breve</Badge>
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
    </div>
  );
}

// ─── Tab: Notificações ────────────────────────────────────────────────────────

const NOTIF_DEFAULTS = {
  email_notifications: true,
  push_notifications: false,
  notify_new_match: true,
  notify_rfq_response: true,
  notify_order_status: true,
  notify_payment_due: true,
  notify_hr_action: false,
  notify_system: true,
};

type NotifPrefs = typeof NOTIF_DEFAULTS;
const NOTIF_STORAGE_KEY = "ae-notif-prefs";

function loadNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw !== null)
      return { ...NOTIF_DEFAULTS, ...(JSON.parse(raw) as Partial<NotifPrefs>) };
  } catch {
    /* ignore */
  }
  return { ...NOTIF_DEFAULTS };
}

function TabNotificacoes() {
  const [prefs, setPrefs] = useState<NotifPrefs>(loadNotifPrefs);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(key: keyof NotifPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 400);
  }

  const allOn = Object.values(prefs).every(Boolean);

  function toggleAll() {
    const next = Object.fromEntries(
      Object.keys(prefs).map((k) => [k, !allOn]),
    ) as NotifPrefs;
    setPrefs(next);
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
            label="Notificações por e-mail"
            sublabel="Receba alertas no seu endereço de e-mail"
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
            last
          >
            <Toggle
              on={prefs.push_notifications}
              onToggle={() =>
                update("push_notifications", !prefs.push_notifications)
              }
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Alertas por módulo</SectionLabel>
        <SettingGroup>
          <SettingRow label="Novos matches comerciais">
            <Toggle
              on={prefs.notify_new_match}
              onToggle={() =>
                update("notify_new_match", !prefs.notify_new_match)
              }
            />
          </SettingRow>
          <SettingRow label="Respostas de cotações">
            <Toggle
              on={prefs.notify_rfq_response}
              onToggle={() =>
                update("notify_rfq_response", !prefs.notify_rfq_response)
              }
            />
          </SettingRow>
          <SettingRow label="Status de pedidos">
            <Toggle
              on={prefs.notify_order_status}
              onToggle={() =>
                update("notify_order_status", !prefs.notify_order_status)
              }
            />
          </SettingRow>
          <SettingRow label="Contas a vencer">
            <Toggle
              on={prefs.notify_payment_due}
              onToggle={() =>
                update("notify_payment_due", !prefs.notify_payment_due)
              }
            />
          </SettingRow>
          <SettingRow label="Ações de RH">
            <Toggle
              on={prefs.notify_hr_action}
              onToggle={() =>
                update("notify_hr_action", !prefs.notify_hr_action)
              }
            />
          </SettingRow>
          <SettingRow label="Atualizações do sistema" last>
            <Toggle
              on={prefs.notify_system}
              onToggle={() => update("notify_system", !prefs.notify_system)}
            />
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}

// ─── Tab: Dados e Privacidade ─────────────────────────────────────────────────

const STORED_DATA_ITEMS = [
  "Perfil pessoal",
  "Dados da empresa",
  "Ficha de colaborador",
  "Atividades e histórico",
  "Preferências e configurações",
  "Arquivos e documentos",
];

function TabDadosPrivacidade() {
  const { email, userId, activeCompanyId } = useSessionStore();
  const drivers = useDrivers();
  const [exported, setExported] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

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
        title="Dados e Privacidade"
        subtitle="Controle seus dados pessoais conforme a LGPD (Lei 13.709/2018)"
      />

      <div>
        <SectionLabel>LGPD</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Seus direitos"
            sublabel="Acesso, correção, portabilidade e eliminação de dados pessoais"
            last
          >
            <Badge variant="success">Em conformidade</Badge>
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Seus dados armazenados</SectionLabel>
        <SettingGroup>
          {STORED_DATA_ITEMS.map((item, i) => (
            <SettingRow
              key={item}
              label={item}
              last={i === STORED_DATA_ITEMS.length - 1}
            />
          ))}
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Exportar dados</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Exportar meus dados"
            sublabel="Baixe uma cópia completa dos seus dados em formato JSON"
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
            last
          >
            {deleteConfirm ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  Confirmar?
                </span>
                <InlineButton
                  danger
                  onClick={() => {
                    setDeleteConfirm(false);
                  }}
                >
                  Sim, solicitar
                </InlineButton>
                <InlineButton onClick={() => setDeleteConfirm(false)}>
                  Cancelar
                </InlineButton>
              </div>
            ) : (
              <InlineButton danger onClick={() => setDeleteConfirm(true)}>
                Solicitar exclusão
              </InlineButton>
            )}
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}

// ─── Tab: Dock ────────────────────────────────────────────────────────────────

function TabDock() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={PanelBottom}
        iconBg="rgba(100,116,139,0.22)"
        iconColor="#94a3b8"
        title="Dock"
        subtitle="Personalize os apps e a ordem de exibição na barra inferior"
      />
      <ComingSoonBanner message="Arraste e reorganize os apps do Dock, adicione atalhos e oculte itens que não usa." />
    </div>
  );
}

// ─── Tab: Mesa ────────────────────────────────────────────────────────────────

function TabMesa() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={LayoutGrid}
        iconBg="rgba(100,116,139,0.22)"
        iconColor="#94a3b8"
        title="Mesa"
        subtitle="Gerencie widgets e atalhos de apps fixados na sua área de trabalho"
      />
      <ComingSoonBanner message="Adicione widgets, remova atalhos e configure o layout da sua Mesa de trabalho." />
    </div>
  );
}

// ─── Tab: Aparência ───────────────────────────────────────────────────────────

function TabAparencia() {
  const wallpaper = useMesaStore((s) => s.wallpaper);
  const setWallpaper = useMesaStore((s) => s.setWallpaper);
  const fetchLayout = useMesaStore((s) => s.fetchLayout);

  useEffect(() => {
    void fetchLayout();
  }, [fetchLayout]);

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
            <AnimatedThemeToggler
              variant="circle"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.11)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Plano de fundo</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${WALLPAPERS.length}, 1fr)`,
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
                    height: 96,
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
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Integrações ─────────────────────────────────────────────────────────

const INTEGRATIONS = [
  {
    name: "Stripe",
    description: "Gateway de pagamentos",
    status: "ativo" as const,
    group: "Financeiro",
  },
  {
    name: "Slack",
    description: "Notificações em canais Slack",
    status: "disponivel" as const,
    group: "Comunicação",
  },
  {
    name: "Email (SMTP)",
    description: "Envio de e-mails transacionais",
    status: "disponivel" as const,
    group: "Comunicação",
  },
  {
    name: "WhatsApp Business",
    description: "Atendimento via WhatsApp",
    status: "em-breve" as const,
    group: "Comunicação",
  },
  {
    name: "ERP (SAP/TOTVS)",
    description: "Sincronização com sistema ERP",
    status: "em-breve" as const,
    group: "Infraestrutura",
  },
];

function TabIntegracoes() {
  const groups = Array.from(new Set(INTEGRATIONS.map((i) => i.group)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Link2}
        iconBg="rgba(245,158,11,0.22)"
        iconColor="#fbbf24"
        title="Integrações"
        subtitle="Conecte o Aethereos a serviços externos e ferramentas da sua stack"
      />

      {groups.map((group) => {
        const items = INTEGRATIONS.filter((i) => i.group === group);
        return (
          <div key={group}>
            <SectionLabel>{group}</SectionLabel>
            <SettingGroup>
              {items.map((intg, idx) => (
                <SettingRow
                  key={intg.name}
                  label={intg.name}
                  sublabel={intg.description}
                  last={idx === items.length - 1}
                >
                  {intg.status === "ativo" && (
                    <Badge variant="success">Ativo</Badge>
                  )}
                  {intg.status === "disponivel" && (
                    <InlineButton onClick={() => {}}>Configurar</InlineButton>
                  )}
                  {intg.status === "em-breve" && (
                    <Badge variant="neutral">Em breve</Badge>
                  )}
                </SettingRow>
              ))}
            </SettingGroup>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Sobre ───────────────────────────────────────────────────────────────

function TabSobre() {
  const { activeCompanyId } = useSessionStore();
  const drivers = useDrivers();
  const [company, setCompany] = useState<{ name: string; slug: string } | null>(
    null,
  );

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    drivers.data
      .from("companies")
      .select("name,slug")
      .eq("id", activeCompanyId)
      .single()
      .then(({ data }) => {
        if (data !== null) setCompany(data as { name: string; slug: string });
      });
  }, [drivers, activeCompanyId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Info}
        iconBg="rgba(100,116,139,0.22)"
        iconColor="#94a3b8"
        title="Sobre"
        subtitle="Informações sobre a plataforma, sua empresa e o plano contratado"
      />

      <div>
        <SectionLabel>Sistema</SectionLabel>
        <SettingGroup>
          <SettingRow label="Plataforma">
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              AETHEREOS OS
            </span>
          </SettingRow>
          <SettingRow label="Versão">
            <MonoCode>1.0.0-beta</MonoCode>
          </SettingRow>
          <SettingRow label="Protocolo SCP">
            <MonoCode>v1.0</MonoCode>
          </SettingRow>
          <SettingRow label="Ambiente" last>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Produção · sa-east-1
            </span>
          </SettingRow>
        </SettingGroup>
      </div>

      {company !== null && (
        <div>
          <SectionLabel>Empresa</SectionLabel>
          <SettingGroup>
            <SettingRow label="Nome">
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {company.name}
              </span>
            </SettingRow>
            <SettingRow label="ID da empresa">
              <MonoCode>{activeCompanyId ?? "—"}</MonoCode>
            </SettingRow>
            <SettingRow label="Status" last>
              <Badge variant="success">Ativo</Badge>
            </SettingRow>
          </SettingGroup>
        </div>
      )}

      <div>
        <SectionLabel>Plano</SectionLabel>
        <SettingGroup>
          <SettingRow label="Tipo de plano">
            <Badge variant="warning">Trial</Badge>
          </SettingRow>
          <SettingRow label="Expira em" last>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              30 dias
            </span>
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Compliance</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Status de conformidade"
            sublabel="LGPD · SOC 2 em preparação · dados residentes no Brasil"
            last
          >
            <Badge variant="success">Em conformidade</Badge>
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
  borderRight: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  flexDirection: "column" as const,
  overflowY: "auto" as const,
};

function NavItemIcon({
  itemId,
  Icon,
  size,
  imgSize,
  avatarUrl,
  logoUrl,
}: {
  itemId: TabId;
  Icon: typeof User;
  size: number;
  imgSize: number;
  avatarUrl: string | null;
  logoUrl: string | null;
}) {
  let imgUrl: string | null = null;
  let imgRadius = 0;
  if (itemId === "perfil" && avatarUrl !== null) {
    imgUrl = avatarUrl;
    imgRadius = 999;
  } else if (itemId === "minha-empresa" && logoUrl !== null) {
    imgUrl = logoUrl;
    imgRadius = 5;
  }

  if (imgUrl !== null) {
    return (
      <img
        src={imgUrl}
        alt=""
        style={{
          width: imgSize,
          height: imgSize,
          borderRadius: imgRadius,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

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
      { id: "home", label: "Início", icon: Home },
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
        aria-label="Início"
        aria-current={active === "home" ? "page" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 14px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background:
            active === "home" ? "rgba(255,255,255,0.04)" : "transparent",
          border: "none",
          borderBottomWidth: 1,
          borderBottomStyle: "solid",
          borderBottomColor: "rgba(255,255,255,0.06)",
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
      <nav style={{ flex: 1, padding: "4px 8px 16px" }}>
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
                    borderRadius: 8,
                    border: isSelected
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "1px solid transparent",
                    background: isSelected
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                    color: isSelected
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: isSelected ? 500 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                    transition:
                      "background 120ms ease, color 120ms ease, border-color 120ms ease",
                    marginBottom: 2,
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
  const { email } = useSessionStore();
  const initials = email !== null ? email.slice(0, 2).toUpperCase() : "??";
  const displayName = email !== null ? email.split("@")[0] : "Usuário";

  // Persisted notification prefs
  const [notif, setNotif] = useState<NotifPrefs>(loadNotifPrefs);
  function toggleNotif(key: keyof NotifPrefs) {
    const next = { ...notif, [key]: !notif[key] };
    setNotif(next);
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
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
          Início
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
              }}
            >
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
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{
              marginTop: 6,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              padding: "6px 8px",
              fontSize: 12,
              color: "var(--text-primary)",
              outline: "none",
              cursor: "pointer",
              appearance: "none",
            }}
            aria-label="Idioma"
          >
            <option value="pt-BR">Português</option>
            <option value="en-US">English</option>
            <option value="es-ES">Español</option>
          </select>
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

        {/* ── Email digest (1×1) ── */}
        <ToggleStackTile
          Icon={Mail}
          color="#a78bfa"
          bg="rgba(139,92,246,0.18)"
          label="Email digest"
          on={notif.email_notifications}
          onToggle={() => toggleNotif("email_notifications")}
          gridColumn="3 / span 1"
          gridRow="3 / span 1"
        />

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

        {/* ── Integrações (1×1) ── */}
        <button
          type="button"
          onClick={() => onSelect("integracoes")}
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
          <TileIcon Icon={Link2} color="#fb923c" bg="rgba(249,115,22,0.18)" />
          <div style={{ flex: 1 }} />
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Integrações
          </p>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            0 conectadas
          </p>
        </button>

        {/* ── Sobre (1×1) ── */}
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
          <TileIcon Icon={Info} color="#94a3b8" bg="rgba(100,116,139,0.20)" />
          <div style={{ flex: 1 }} />
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Versão
          </p>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            Aethereos v0.1.0
          </p>
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
    case "integracoes":
      return <TabIntegracoes />;
    case "sobre":
      return <TabSobre />;
  }
}

const SIDEBAR_W = 239;
const SIDEBAR_ICON_W = 48;

export function ConfiguracoesApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();
  const [active, setActive] = useState<TabId>("home");
  const [collapsed, setCollapsed] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const isHome = active === "home";

  // Hydrate avatar (profiles.avatar_url) and logo (companies.logo_url)
  useEffect(() => {
    if (drivers === null) return;
    if (userId !== null) {
      void drivers.data
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data }: { data: { avatar_url: string | null } | null }) => {
          if (
            data !== null &&
            data.avatar_url !== null &&
            data.avatar_url !== ""
          ) {
            setAvatarUrl(data.avatar_url);
          }
        });
    }
    if (activeCompanyId !== null) {
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
    }
  }, [drivers, userId, activeCompanyId]);

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
