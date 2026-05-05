import { useState, useEffect } from "react";
import {
  BriefcaseBusiness,
  Link2,
  CreditCard,
  ClipboardList,
  Users,
  Building2,
  Check,
  FileText,
  RotateCcw,
  MapPin,
  Network,
  Cpu,
  HardDrive,
  ChevronRight,
  Phone,
  BadgeCheck,
  Settings2,
  UserCheck,
  Package,
  Calendar,
  ChevronDown,
  Search,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Bot,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { useUserPreference } from "../../hooks/useUserPreference";
import {
  PROVIDER_PRESETS,
  validateConfig,
  fetchAvailableModels,
  type ProviderId,
  type ProviderPreset,
} from "@aethereos/drivers-byok";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { APP_REGISTRY } from "../registry";
import { GlareHover } from "../../components/ui/glare-hover";
import { useGestorStore } from "../../stores/gestorStore";
import type { GestorTabId } from "../../stores/gestorStore";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
// Sprint 26 — redesign do Gestor: tabs novos do plano completo (paralelo).
import { TabPainelGeral } from "./tabs/PainelGeral";
import { TabColaboradores } from "./tabs/Colaboradores";
import { TabCargosHierarquia } from "./tabs/CargosHierarquia";
import { TabDepartamentos } from "./tabs/Departamentos";
import { TabGrupos } from "./tabs/Grupos";
import { TabPerfisAcesso } from "./tabs/PerfisAcesso";
import { TabRegrasApp } from "./tabs/RegrasApp";
import { TabHorariosAcesso } from "./tabs/HorariosAcesso";
import { TabRegrasDistribuicao } from "./tabs/RegrasDistribuicao";
import { TabConfigPorApp } from "./tabs/ConfigPorApp";
import { TabLimitesUsoIA } from "./tabs/LimitesUsoIA";
import { TabPermissoesIA } from "./tabs/PermissoesIA";
import { TabHistoricoIA } from "./tabs/HistoricoIA";
import { TabWebhooks } from "./tabs/Webhooks";
import { TabApisExternas } from "./tabs/ApisExternas";
import { TabConsumoLimites } from "./tabs/ConsumoLimites";
import { TabHistoricoPagamentos } from "./tabs/HistoricoPagamentos";
import { TabAutenticacao2FA } from "./tabs/Autenticacao2FA";
import { TabSessoesAtivas } from "./tabs/SessoesAtivas";
import { TabDispositivos } from "./tabs/Dispositivos";
import { TabAlertasRisco } from "./tabs/AlertasRisco";
import { TabAuditoriaLog } from "./tabs/AuditoriaLog";
import { TabTrilhaAlteracoes } from "./tabs/TrilhaAlteracoes";
import { TabExportarRelatorio } from "./tabs/ExportarRelatorio";
import { TabLogoBranding } from "./tabs/LogoBranding";
import { TabFusoIdioma } from "./tabs/FusoIdioma";
import { TabLGPD } from "./tabs/LGPD";

// ─── Types ───────────────────────────────────────────────────────────────────

type CadastroSubId =
  | "ficha-empresa"
  | "socios"
  | "enderecos"
  | "contatos"
  | "documentos"
  | "certificados";

interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: string;
  atividade_principal: string;
  municipio: string;
  uf: string;
}

// ─── Nav data ─────────────────────────────────────────────────────────────────

const NAV_SECTIONS: {
  label: string;
  items: { id: GestorTabId; label: string; icon: typeof BriefcaseBusiness }[];
}[] = [
  {
    label: "Painel",
    items: [{ id: "visao-geral", label: "Painel Geral", icon: LayoutGrid }],
  },
  {
    label: "Pessoas & Equipe",
    items: [
      { id: "colaboradores", label: "Colaboradores", icon: Users },
      { id: "cargos-hierarquia", label: "Cargos & Hierarquia", icon: Network },
      { id: "departamentos", label: "Departamentos", icon: Building2 },
      { id: "grupos", label: "Grupos", icon: UserCheck },
    ],
  },
  {
    label: "Permissões & Acessos",
    items: [
      { id: "perfis-acesso", label: "Perfis de Acesso", icon: BadgeCheck },
      { id: "regras-app", label: "Regras por App", icon: Settings2 },
      { id: "horarios-acesso", label: "Horários de Acesso", icon: Calendar },
    ],
  },
  {
    label: "Aplicativos",
    items: [
      { id: "aplicativos", label: "Apps Instalados", icon: Package },
      {
        id: "regras-distribuicao",
        label: "Regras de Distribuição",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Inteligência Artificial",
    items: [
      { id: "ia", label: "Provedor & Modelo", icon: Bot },
      { id: "limites-uso-ia", label: "Limites de Uso", icon: Cpu },
      { id: "permissoes-ia", label: "Permissões de IA", icon: BadgeCheck },
      { id: "historico-ia", label: "Histórico & Custos", icon: HardDrive },
    ],
  },
  {
    label: "Integrações",
    items: [
      { id: "integracoes", label: "Conectores Ativos", icon: Link2 },
      { id: "webhooks", label: "Webhooks", icon: Network },
      { id: "apis-externas", label: "APIs Externas", icon: Settings2 },
    ],
  },
  {
    label: "Plano & Assinatura",
    items: [
      { id: "planos", label: "Plano Atual", icon: CreditCard },
      { id: "consumo-limites", label: "Consumo & Limites", icon: Cpu },
      {
        id: "historico-pagamentos",
        label: "Histórico de Pagamentos",
        icon: FileText,
      },
    ],
  },
  {
    label: "Segurança",
    items: [
      { id: "autenticacao-2fa", label: "Autenticação 2FA", icon: BadgeCheck },
      { id: "sessoes-ativas", label: "Sessões Ativas", icon: Network },
      { id: "dispositivos", label: "Dispositivos", icon: HardDrive },
      { id: "alertas-risco", label: "Alertas de Risco", icon: Settings2 },
    ],
  },
  {
    label: "Auditoria",
    items: [
      { id: "auditoria-log", label: "Log de Ações", icon: ClipboardList },
      {
        id: "trilha-alteracoes",
        label: "Trilha de Alterações",
        icon: FileText,
      },
      {
        id: "exportar-relatorio",
        label: "Exportar Relatório",
        icon: FileText,
      },
    ],
  },
  {
    label: "Configurações Gerais",
    items: [
      { id: "cadastros", label: "Dados da Empresa", icon: Building2 },
      { id: "logo-branding", label: "Logo & Branding", icon: Building2 },
      { id: "fuso-idioma", label: "Fuso Horário & Idioma", icon: Calendar },
      { id: "lgpd", label: "LGPD & Privacidade", icon: BadgeCheck },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

const TAB_LABELS: Record<GestorTabId, string> = {
  "visao-geral": "Painel Geral",
  colaboradores: "Colaboradores",
  "cargos-hierarquia": "Cargos & Hierarquia",
  departamentos: "Departamentos",
  grupos: "Grupos",
  "perfis-acesso": "Perfis de Acesso",
  "regras-cargo": "Regras por Cargo",
  "regras-app": "Regras por App",
  "horarios-acesso": "Horários de Acesso",
  aplicativos: "Apps Instalados",
  "regras-distribuicao": "Regras de Distribuição",
  "config-por-app": "Configurações por App",
  ia: "Provedor & Modelo",
  "limites-uso-ia": "Limites de Uso de IA",
  "permissoes-ia": "Permissões de IA",
  "historico-ia": "Histórico & Custos",
  integracoes: "Conectores Ativos",
  webhooks: "Webhooks",
  "apis-externas": "APIs Externas",
  planos: "Plano Atual",
  "consumo-limites": "Consumo & Limites",
  "historico-pagamentos": "Histórico de Pagamentos",
  "autenticacao-2fa": "Autenticação 2FA",
  "sessoes-ativas": "Sessões Ativas",
  dispositivos: "Dispositivos",
  "alertas-risco": "Alertas de Risco",
  "auditoria-log": "Log de Ações",
  "trilha-alteracoes": "Trilha de Alterações",
  "exportar-relatorio": "Exportar Relatório",
  cadastros: "Dados da Empresa",
  "logo-branding": "Logo & Branding",
  "fuso-idioma": "Fuso Horário & Idioma",
  lgpd: "LGPD & Privacidade",
  usuarios: "Colaboradores",
};

const CADASTRO_ITEMS: {
  id: CadastroSubId;
  label: string;
  icon: typeof Building2;
}[] = [
  { id: "ficha-empresa", label: "Ficha Cadastral", icon: Building2 },
  { id: "socios", label: "Sócios", icon: UserCheck },
  { id: "enderecos", label: "Endereços", icon: MapPin },
  { id: "contatos", label: "Contatos", icon: Phone },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "certificados", label: "Certificados Digitais", icon: BadgeCheck },
];

// ─── Data ────────────────────────────────────────────────────────────────────

const LLM_MODELS = [
  { value: "claude-opus-4-7", label: "Claude Opus 4.7", provider: "Anthropic" },
  {
    value: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
  },
  {
    value: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "Anthropic",
  },
  { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { value: "llama-3.3-70b", label: "Llama 3.3 70B", provider: "Meta" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", provider: "Google" },
  { value: "deepseek-v3", label: "DeepSeek V3", provider: "DeepSeek" },
];

const INTEGRATIONS = [
  {
    id: "stripe",
    name: "Stripe",
    logo: "/integrations/stripe.svg",
    logoBg: "#635BFF",
    group: "Financeiro",
    comingSoon: false,
    defaultEnabled: true,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    logo: "/integrations/hubspot.svg",
    logoBg: "#FF7A59",
    group: "Financeiro",
    comingSoon: false,
    defaultEnabled: false,
  },
  {
    id: "shopify",
    name: "Shopify",
    logo: "/integrations/shopify.svg",
    logoBg: "#96BF48",
    group: "Financeiro",
    comingSoon: true,
    defaultEnabled: false,
  },
  {
    id: "slack",
    name: "Slack",
    logo: "/integrations/slack.svg",
    logoBg: "#4A154B",
    group: "Comunicação",
    comingSoon: false,
    defaultEnabled: false,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    logo: "/integrations/whatsapp.svg",
    logoBg: "#25D366",
    group: "Comunicação",
    comingSoon: false,
    defaultEnabled: false,
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    logo: "/integrations/mailchimp.svg",
    logoBg: "#241c15",
    group: "Comunicação",
    comingSoon: false,
    defaultEnabled: false,
  },
  {
    id: "discord",
    name: "Discord",
    logo: "/integrations/discord.svg",
    logoBg: "#5865F2",
    group: "Comunicação",
    comingSoon: true,
    defaultEnabled: false,
  },
  {
    id: "zapier",
    name: "Zapier",
    logo: "/integrations/zapier.svg",
    logoBg: "#FF4A00",
    group: "Automação",
    comingSoon: false,
    defaultEnabled: false,
  },
  {
    id: "notion",
    name: "Notion",
    logo: "/integrations/notion.svg",
    logoBg: "#191919",
    group: "Automação",
    comingSoon: false,
    defaultEnabled: false,
  },
  {
    id: "github",
    name: "GitHub",
    logo: "/integrations/github.svg",
    logoBg: "#181717",
    group: "Automação",
    comingSoon: false,
    defaultEnabled: false,
  },
  {
    id: "linear",
    name: "Linear",
    logo: "/integrations/linear.svg",
    logoBg: "#5E6AD2",
    group: "Automação",
    comingSoon: true,
    defaultEnabled: false,
  },
  {
    id: "google-workspace",
    name: "Google",
    logo: "/integrations/google-workspace.svg",
    logoBg: "#202124",
    group: "Produtividade",
    comingSoon: true,
    defaultEnabled: false,
  },
  {
    id: "figma",
    name: "Figma",
    logo: "/integrations/figma.svg",
    logoBg: "#F24E1E",
    group: "Produtividade",
    comingSoon: true,
    defaultEnabled: false,
  },
  {
    id: "zoom",
    name: "Zoom",
    logo: "/integrations/zoom.svg",
    logoBg: "#2D8CFF",
    group: "Produtividade",
    comingSoon: true,
    defaultEnabled: false,
  },
  {
    id: "totvs",
    name: "TOTVS",
    logo: "/integrations/totvs.svg",
    logoBg: "#E30613",
    group: "Produtividade",
    comingSoon: true,
    defaultEnabled: false,
  },
] as const;

const PLANS = [
  {
    id: "gratuito",
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    color: "#64748b",
    accentBg: "rgba(100,116,139,0.12)",
    accentBorder: "rgba(100,116,139,0.28)",
    features: [
      "1 usuário",
      "1 GB armazenamento",
      "10 mil chamadas API/mês",
      "Apps básicos",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "R$ 49",
    period: "/mês",
    color: "#0ea5e9",
    accentBg: "rgba(14,165,233,0.10)",
    accentBorder: "rgba(14,165,233,0.25)",
    features: [
      "5 usuários",
      "10 GB armazenamento",
      "100 mil chamadas API/mês",
      "Apps essenciais",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 149",
    period: "/mês",
    color: "#6366f1",
    accentBg: "rgba(99,102,241,0.12)",
    accentBorder: "rgba(99,102,241,0.40)",
    features: [
      "15 usuários",
      "25 GB armazenamento",
      "500 mil chamadas API/mês",
      "AI Copilot incluso",
    ],
    trial: true,
    trialDays: 30,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    color: "#10b981",
    accentBg: "rgba(16,185,129,0.10)",
    accentBorder: "rgba(16,185,129,0.25)",
    features: [
      "Usuários ilimitados",
      "Storage ilimitado",
      "API ilimitada",
      "SLA dedicado",
    ],
  },
] as const;

const CURRENT_PLAN_ID = "pro";

// ─── Design primitives ────────────────────────────────────────────────────────

function ContentHeader({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  right,
}: {
  icon: typeof BriefcaseBusiness;
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
  icon,
  children,
}: {
  label: string;
  sublabel?: string;
  last?: boolean;
  icon?: React.ReactNode;
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
          <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
            {label}
          </span>
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
  variant: "success" | "warning" | "neutral" | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    success: { background: "rgba(16,185,129,0.14)", color: "#34d399" },
    warning: { background: "rgba(245,158,11,0.14)", color: "#fbbf24" },
    neutral: {
      background: "rgba(255,255,255,0.06)",
      color: "var(--text-tertiary)",
    },
    danger: { background: "rgba(239,68,68,0.12)", color: "#f87171" },
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
  children,
}: {
  onClick: () => void;
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
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 500,
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
    >
      {children}
    </button>
  );
}

function UsageBar({
  used,
  limit,
  color,
}: {
  used: number;
  limit: number;
  color: string;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <div
      style={{
        width: 140,
        height: 5,
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width 400ms ease",
        }}
      />
    </div>
  );
}

function UsageRow({
  icon: Icon,
  iconColor,
  label,
  used,
  limit,
  unit,
  last,
}: {
  icon: typeof CreditCard;
  iconColor: string;
  label: string;
  used: number;
  limit: number;
  unit: string;
  last?: boolean;
}) {
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)}K`
        : n.toLocaleString("pt-BR");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 56,
        padding: "12px 16px",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${iconColor}20`,
          border: `1px solid ${iconColor}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={15} style={{ color: iconColor }} strokeWidth={1.7} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
          {label}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <UsageBar used={used} limit={limit} color={iconColor} />
        <span
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {fmt(used)} / {fmt(limit)} {unit}
        </span>
      </div>
    </div>
  );
}

function ComingSoonSection({
  icon: Icon,
  label,
}: {
  icon: typeof Building2;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "60px 20px",
        borderRadius: 16,
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(255,255,255,0.08)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          size={24}
          style={{ color: "var(--text-tertiary)" }}
          strokeWidth={1.5}
        />
      </div>
      <div>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          {label}
        </p>
        <p
          style={{ fontSize: 12, color: "var(--text-tertiary)", maxWidth: 280 }}
        >
          Esta seção está em desenvolvimento e estará disponível em breve.
        </p>
      </div>
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Em breve
      </span>
    </div>
  );
}

// ─── Tab: Aplicativos ─────────────────────────────────────────────────────────

function TabAplicativos() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [llmModel, setLlmModel] = useState("claude-sonnet-4-6");

  const apps = APP_REGISTRY.filter((a) => a.id !== "mesa");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={LayoutGrid}
        iconBg="rgba(99,102,241,0.22)"
        iconColor="#818cf8"
        title="Aplicativos"
        subtitle="Gerencie os apps instalados e configure cada módulo do sistema"
      />

      <div>
        <SectionLabel>Apps instalados ({apps.length})</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {apps.map((app) => {
            const Icon =
              (
                LucideIcons as unknown as Record<
                  string,
                  ComponentType<LucideProps>
                >
              )[app.icon] ?? LucideIcons.Box;
            const isExpanded = expanded === app.id;

            return (
              <div
                key={app.id}
                style={{
                  borderRadius: 12,
                  background: isExpanded
                    ? "rgba(255,255,255,0.055)"
                    : "rgba(255,255,255,0.03)",
                  border: isExpanded
                    ? "1px solid rgba(255,255,255,0.10)"
                    : "1px solid rgba(255,255,255,0.07)",
                  overflow: "hidden",
                  transition: "background 150ms ease, border-color 150ms ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: `${app.color}22`,
                      border: `1px solid ${app.color}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      size={18}
                      style={{ color: app.color }}
                      strokeWidth={1.7}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                        }}
                      >
                        {app.name}
                      </span>
                      {app.showInDock && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 999,
                            background: "rgba(99,102,241,0.15)",
                            color: "#818cf8",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          Dock
                        </span>
                      )}
                      {app.requiresAdmin === true && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 999,
                            background: "rgba(239,68,68,0.12)",
                            color: "#f87171",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : app.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 10px",
                      borderRadius: 7,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "background 120ms ease",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.10)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                    }}
                  >
                    <Settings2 size={12} strokeWidth={1.8} />
                    Configurar
                    <ChevronDown
                      size={11}
                      strokeWidth={2}
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "none",
                        transition: "transform 200ms ease",
                      }}
                    />
                  </button>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      padding: "0 14px 14px",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {app.id === "ae-ai" ? (
                      <div style={{ paddingTop: 14 }}>
                        <SettingGroup>
                          <SettingRow
                            label="Modelo LLM principal"
                            sublabel="Modelo usado pelo Aether AI nas conversas"
                          >
                            <select
                              value={llmModel}
                              onChange={(e) => setLlmModel(e.target.value)}
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.10)",
                                borderRadius: 8,
                                padding: "7px 11px",
                                fontSize: 13,
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                outline: "none",
                                minWidth: 200,
                              }}
                            >
                              {LLM_MODELS.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label} — {m.provider}
                                </option>
                              ))}
                            </select>
                          </SettingRow>
                          <SettingRow
                            label="Histórico de conversas"
                            sublabel="Manter contexto entre sessões"
                            last
                          >
                            <Toggle on={true} onToggle={() => {}} />
                          </SettingRow>
                        </SettingGroup>
                      </div>
                    ) : (
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text-tertiary)",
                          paddingTop: 12,
                          fontStyle: "italic",
                        }}
                      >
                        Sem configurações específicas para este app.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Integrações ─────────────────────────────────────────────────────────

function TabIntegracoes() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(INTEGRATIONS.map((i) => [i.id, i.defaultEnabled])),
  );

  const groups = Array.from(new Set(INTEGRATIONS.map((i) => i.group)));

  function toggle(id: string) {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: 8,
              }}
            >
              {items.map((intg) => {
                const isOn = enabled[intg.id] ?? false;
                const soon = intg.comingSoon;
                return (
                  <div
                    key={intg.id}
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 10px 12px",
                      borderRadius: 12,
                      aspectRatio: "1",
                      background: isOn
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,255,255,0.03)",
                      border: isOn
                        ? "1px solid rgba(255,255,255,0.12)"
                        : "1px solid rgba(255,255,255,0.07)",
                      opacity: soon ? 0.55 : 1,
                      gap: 6,
                      transition:
                        "background 150ms ease, border-color 150ms ease",
                    }}
                  >
                    {soon && (
                      <div
                        style={{
                          position: "absolute",
                          top: 5,
                          right: 5,
                          padding: "1px 4px",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.10)",
                          fontSize: 7,
                          fontWeight: 600,
                          color: "var(--text-tertiary)",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Em breve
                      </div>
                    )}
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 11,
                        background: intg.logoBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={intg.logo}
                        alt={intg.name}
                        style={{ width: 28, height: 28, objectFit: "contain" }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        textAlign: "center",
                        lineHeight: 1.2,
                        margin: 0,
                      }}
                    >
                      {intg.name}
                    </p>
                    <Toggle
                      on={isOn}
                      onToggle={() => {
                        if (!soon) toggle(intg.id);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab IA — BYOK LLM config (Sprint 15 MX74) ────────────────────────────────

interface LLMConfigPref {
  provider: ProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_LLM_CONFIG: LLMConfigPref = {
  provider: "openai",
  baseUrl: "",
  apiKey: "",
  model: "",
};

function TabIA() {
  const llmConfigPref = useUserPreference<LLMConfigPref>(
    "llm_config",
    DEFAULT_LLM_CONFIG,
  );
  const cfg = llmConfigPref.value;
  const setCfg = (next: LLMConfigPref) => {
    llmConfigPref.set(next);
  };

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);

  const preset = PROVIDER_PRESETS[cfg.provider];
  const requiresKey = preset.requiresKey;
  const isCustom = cfg.provider === "custom";
  const isLocal = cfg.provider === "lmstudio" || cfg.provider === "ollama";

  function handleProviderChange(id: ProviderId) {
    const newPreset = PROVIDER_PRESETS[id];
    setCfg({
      provider: id,
      baseUrl: newPreset.baseUrl,
      apiKey: cfg.apiKey,
      model: newPreset.models[0] ?? "",
    });
    setTestResult(null);
    setDetectedModels([]);
  }

  async function handleDetectModels() {
    setDetecting(true);
    try {
      const list = await fetchAvailableModels(cfg.baseUrl);
      setDetectedModels(list);
      if (list.length > 0 && !list.includes(cfg.model)) {
        setCfg({ ...cfg, model: list[0] ?? "" });
      }
    } finally {
      setDetecting(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await validateConfig({
        format: preset.format,
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model,
      });
      if (result.ok) {
        setTestResult({ ok: true, message: "Conexão OK." });
      } else {
        setTestResult({
          ok: false,
          message: result.error ?? "Erro desconhecido",
        });
      }
    } finally {
      setTesting(false);
    }
  }

  const availableModels =
    detectedModels.length > 0 ? detectedModels : preset.models;
  const isConfigured =
    cfg.baseUrl.length > 0 &&
    cfg.model.length > 0 &&
    (!requiresKey || cfg.apiKey.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Bot}
        iconBg="rgba(99,102,241,0.22)"
        iconColor="#818cf8"
        title="Inteligência Artificial"
        subtitle="Configure seu provedor de IA (BYOK) para ativar o Aether AI Copilot"
      />

      {!isConfigured && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(99, 102, 241, 0.06)",
            border: "1px solid rgba(99, 102, 241, 0.18)",
            marginBottom: 18,
            fontSize: 12,
            color: "var(--text-secondary)",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <Bot size={14} color="rgb(99, 102, 241)" style={{ marginTop: 2 }} />
          <div>
            <div
              style={{
                color: "var(--text-primary)",
                fontWeight: 500,
                marginBottom: 2,
              }}
            >
              Configure seu provedor de IA
            </div>
            Escolha um provedor abaixo, cole sua chave de API (ou use um modelo
            local com LM Studio/Ollama), selecione o modelo e teste a conexão.
          </div>
        </div>
      )}

      {isConfigured && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(34, 197, 94, 0.06)",
            border: "1px solid rgba(34, 197, 94, 0.18)",
            marginBottom: 18,
            fontSize: 12,
            color: "var(--text-secondary)",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <Check size={14} color="rgb(34, 197, 94)" />
          <div>
            Provedor:{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {preset.label}
            </strong>
            {" · "}Modelo:{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {cfg.model}
            </strong>
          </div>
        </div>
      )}

      <div>
        <SectionLabel>Provedor</SectionLabel>
        <select
          value={cfg.provider}
          onChange={(e) => handleProviderChange(e.target.value as ProviderId)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-primary)",
            fontSize: 13,
          }}
        >
          {(Object.values(PROVIDER_PRESETS) as ProviderPreset[]).map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {preset.hint !== undefined && (
          <p
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 8,
              lineHeight: 1.5,
            }}
          >
            {preset.hint}
          </p>
        )}
      </div>

      {requiresKey && (
        <div>
          <SectionLabel>Chave de API</SectionLabel>
          <div style={{ position: "relative" }}>
            <input
              type={showKey ? "text" : "password"}
              value={cfg.apiKey}
              onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              style={{
                width: "100%",
                padding: "8px 36px 8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontFamily: "var(--font-mono, monospace)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? "Ocultar chave" : "Mostrar chave"}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {preset.docsUrl !== undefined && (
            <a
              href={preset.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                color: "rgb(99, 102, 241)",
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Obter chave <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}

      <div>
        <SectionLabel>Endpoint (Base URL)</SectionLabel>
        <input
          type="text"
          value={cfg.baseUrl}
          onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })}
          disabled={!isCustom}
          placeholder="https://api.exemplo.com/v1"
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.10)",
            background: isCustom
              ? "rgba(255,255,255,0.04)"
              : "rgba(255,255,255,0.02)",
            color: isCustom ? "var(--text-primary)" : "var(--text-tertiary)",
            fontSize: 13,
            fontFamily: "var(--font-mono, monospace)",
          }}
        />
      </div>

      <div>
        <SectionLabel>Modelo</SectionLabel>
        <div style={{ display: "flex", gap: 8 }}>
          {availableModels.length > 0 ? (
            <select
              value={cfg.model}
              onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
                fontSize: 13,
              }}
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={cfg.model}
              onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
              placeholder={
                isLocal ? "Detectar modelos para listar" : "nome-do-modelo"
              }
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontFamily: "var(--font-mono, monospace)",
              }}
            />
          )}
          {isLocal && (
            <button
              type="button"
              onClick={handleDetectModels}
              disabled={detecting}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-secondary)",
                fontSize: 12,
                cursor: detecting ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {detecting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Zap size={12} />
              )}
              {detecting ? "Detectando..." : "Detectar modelos"}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !isConfigured}
          style={{
            padding: "9px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-primary)",
            fontSize: 13,
            cursor: testing || !isConfigured ? "not-allowed" : "pointer",
            opacity: !isConfigured ? 0.5 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {testing && <Loader2 size={12} className="animate-spin" />}
          Testar conexão
        </button>
      </div>

      {testResult !== null && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 8,
            background: testResult.ok
              ? "rgba(34, 197, 94, 0.08)"
              : "rgba(239, 68, 68, 0.08)",
            border: `1px solid ${testResult.ok ? "rgba(34, 197, 94, 0.20)" : "rgba(239, 68, 68, 0.20)"}`,
            color: testResult.ok ? "rgb(134, 239, 172)" : "rgb(252, 165, 165)",
            fontSize: 12,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          {testResult.ok ? <Check size={14} /> : <AlertTriangle size={14} />}
          <div>{testResult.message}</div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Planos ──────────────────────────────────────────────────────────────

function TabPlanos() {
  const [autoRenew, setAutoRenew] = useState(true);
  const usage = {
    apiCalls: { used: 24_350, limit: 100_000, unit: "chamadas" },
    llmTokens: { used: 1_240_000, limit: 5_000_000, unit: "tokens" },
    storage: { used: 4.2, limit: 25, unit: "GB" },
    bandwidth: { used: 18.6, limit: 100, unit: "GB" },
    users: { used: 3, limit: 15, unit: "usuários" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={CreditCard}
        iconBg="rgba(16,185,129,0.22)"
        iconColor="#34d399"
        title="Planos"
        subtitle="Plano contratado, consumo do ciclo atual e limites"
        right={<Badge variant="success">Ativo</Badge>}
      />

      <div>
        <SectionLabel>Escolha seu plano</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {PLANS.map((plan) => {
            const isCurrent = plan.id === CURRENT_PLAN_ID;
            return (
              <GlareHover
                key={plan.id}
                background={
                  isCurrent ? plan.accentBg : "rgba(255,255,255,0.03)"
                }
                color={plan.color as `#${string}`}
                opacity={isCurrent ? 0.25 : 0.15}
                duration={500}
                playOnce
                style={{
                  borderRadius: 10,
                  padding: "12px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  width: "100%",
                  border: isCurrent
                    ? `1px solid ${plan.accentBorder}`
                    : "1px solid rgba(255,255,255,0.07)",
                  boxShadow: isCurrent
                    ? `0 0 0 1px ${plan.accentBorder}, 0 4px 16px rgba(0,0,0,0.25)`
                    : "none",
                  position: "relative",
                }}
              >
                {isCurrent && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: plan.color,
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#fff",
                      letterSpacing: "0.05em",
                      zIndex: 20,
                    }}
                  >
                    {(plan as { trial?: boolean }).trial === true
                      ? "TRIAL"
                      : "ATUAL"}
                  </div>
                )}
                <div style={{ width: "100%" }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isCurrent ? plan.color : "var(--text-secondary)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    {plan.name}
                  </p>
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 2 }}
                  >
                    <span
                      style={{
                        fontSize: plan.price === "Custom" ? 23 : 29,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-display)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {plan.price}
                    </span>
                    {plan.period !== "" && (
                      <span
                        style={{ fontSize: 14, color: "var(--text-tertiary)" }}
                      >
                        {plan.period}
                      </span>
                    )}
                  </div>
                  {(plan as { trialDays?: number }).trialDays !== undefined && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-tertiary)",
                        marginTop: 2,
                      }}
                    >
                      Expira em {(plan as { trialDays?: number }).trialDays}{" "}
                      dias
                    </p>
                  )}
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    flex: 1,
                    width: "100%",
                  }}
                >
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 5,
                        fontSize: 14,
                        color: "var(--text-secondary)",
                        lineHeight: 1.4,
                      }}
                    >
                      <Check
                        size={13}
                        strokeWidth={2.5}
                        style={{
                          color: isCurrent
                            ? plan.color
                            : "var(--text-tertiary)",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div
                    style={{
                      width: "100%",
                      fontSize: 14,
                      color: plan.color,
                      fontWeight: 600,
                      textAlign: "center",
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: `1px solid ${plan.accentBorder}`,
                      background: "transparent",
                    }}
                  >
                    Plano ativo
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {}}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      textAlign: "center",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "var(--text-secondary)",
                      transition:
                        "background 140ms ease, border-color 140ms ease, color 140ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = plan.accentBg;
                      e.currentTarget.style.borderColor = plan.accentBorder;
                      e.currentTarget.style.color = plan.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.06)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.10)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    {plan.id === "enterprise" ? "Falar c/ vendas" : "Contratar"}
                  </button>
                )}
              </GlareHover>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Consumo este mês</SectionLabel>
        <SettingGroup>
          <UsageRow
            icon={Network}
            iconColor="#22d3ee"
            label="Chamadas de API"
            used={usage.apiCalls.used}
            limit={usage.apiCalls.limit}
            unit={usage.apiCalls.unit}
          />
          <UsageRow
            icon={Cpu}
            iconColor="#a78bfa"
            label="Tokens LLM"
            used={usage.llmTokens.used}
            limit={usage.llmTokens.limit}
            unit={usage.llmTokens.unit}
          />
          <UsageRow
            icon={HardDrive}
            iconColor="#fb923c"
            label="Armazenamento"
            used={usage.storage.used}
            limit={usage.storage.limit}
            unit={usage.storage.unit}
          />
          <UsageRow
            icon={Network}
            iconColor="#fbbf24"
            label="Bandwidth"
            used={usage.bandwidth.used}
            limit={usage.bandwidth.limit}
            unit={usage.bandwidth.unit}
          />
          <UsageRow
            icon={Users}
            iconColor="#818cf8"
            label="Usuários ativos"
            used={usage.users.used}
            limit={usage.users.limit}
            unit={usage.users.unit}
            last
          />
        </SettingGroup>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 8,
            paddingLeft: 2,
          }}
        >
          Ciclo reinicia no dia 1º de cada mês. Limites podem ser alterados ao
          mudar de plano.
        </p>
      </div>

      <div>
        <SectionLabel>Faturamento</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Histórico de faturas"
            sublabel="Veja todas as cobranças e baixe NFs"
            icon={
              <FileText
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <InlineButton onClick={() => {}}>Ver histórico</InlineButton>
          </SettingRow>
          <SettingRow
            label="Forma de pagamento"
            sublabel="Cartão, boleto ou Pix"
            icon={
              <CreditCard
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <Badge variant="neutral">Não configurado</Badge>
          </SettingRow>
          <SettingRow
            label="Endereço de cobrança"
            sublabel="Usado nas notas fiscais"
            icon={
              <MapPin
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <InlineButton onClick={() => {}}>Configurar</InlineButton>
          </SettingRow>
          <SettingRow
            label="Recorrência automática"
            sublabel={
              autoRenew
                ? "Renovação automática está ativada"
                : "Renovação automática está desativada"
            }
            icon={
              <RotateCcw
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
            last
          >
            <Toggle on={autoRenew} onToggle={() => setAutoRenew((v) => !v)} />
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}

// ─── Cadastros: Ficha Cadastral ───────────────────────────────────────────────

function CadastroFichaEmpresa() {
  const drivers = useDrivers();
  const { activeCompanyId } = useSessionStore();
  const [cnpj, setCnpj] = useState<string | null>(null);
  const [cnpjData, setCnpjData] = useState<CnpjData | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    void drivers.data
      .from("companies")
      .select("cnpj,cnpj_data,created_at,logo_url")
      .eq("id", activeCompanyId)
      .single()
      .then(
        ({
          data,
        }: {
          data: {
            cnpj: string | null;
            cnpj_data: CnpjData | null;
            created_at: string | null;
            logo_url: string | null;
          } | null;
        }) => {
          if (data === null) return;
          if (data.cnpj !== null) setCnpj(data.cnpj);
          if (data.cnpj_data !== null) setCnpjData(data.cnpj_data);
          if (data.created_at !== null) setCreatedAt(data.created_at);
          if (data.logo_url !== null) setLogoUrl(data.logo_url);
        },
      );
  }, [drivers, activeCompanyId]);

  function maskCnpj(raw: string): string {
    const d = raw.replace(/\D/g, "").slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "20px 22px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "rgba(6,182,212,0.14)",
            border: "1px solid rgba(6,182,212,0.20)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {logoUrl !== null ? (
            <img
              src={logoUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Building2
              size={32}
              style={{ color: "#22d3ee" }}
              strokeWidth={1.5}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {cnpjData?.razao_social ?? "—"}
          </p>
          {cnpjData?.nome_fantasia != null && cnpjData.nome_fantasia !== "" && (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                marginTop: 3,
              }}
            >
              {cnpjData.nome_fantasia}
            </p>
          )}
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginTop: 5,
              fontFamily: "var(--font-mono)",
            }}
          >
            CNPJ {cnpj !== null ? maskCnpj(cnpj) : "—"}
          </p>
        </div>
        {cnpjData !== null && (
          <Badge
            variant={
              cnpjData.situacao.toUpperCase() === "ATIVA"
                ? "success"
                : "neutral"
            }
          >
            {cnpjData.situacao}
          </Badge>
        )}
      </div>

      <div>
        <SectionLabel>Dados cadastrais</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="Atividade principal (CNAE)"
            icon={
              <Package
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                maxWidth: 260,
                textAlign: "right",
              }}
            >
              {cnpjData?.atividade_principal ?? "—"}
            </span>
          </SettingRow>
          <SettingRow
            label="Município / UF"
            icon={
              <MapPin
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {cnpjData !== null
                ? `${cnpjData.municipio} – ${cnpjData.uf}`
                : "—"}
            </span>
          </SettingRow>
          <SettingRow
            label="Cliente desde"
            icon={
              <Calendar
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
            last
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {createdAt !== null
                ? new Date(createdAt).toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </span>
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionLabel>Identificação</SectionLabel>
        <SettingGroup>
          <SettingRow
            label="ID do workspace"
            icon={
              <Package
                size={14}
                strokeWidth={1.8}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
            }
          >
            <span
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {activeCompanyId ?? "—"}
            </span>
          </SettingRow>
          <SettingRow label="Situação cadastral" last>
            <Badge
              variant={
                cnpjData?.situacao.toUpperCase() === "ATIVA"
                  ? "success"
                  : "neutral"
              }
            >
              {cnpjData?.situacao ?? "Não informado"}
            </Badge>
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}

// ─── Tab: Cadastros ───────────────────────────────────────────────────────────

const SUB_SIDEBAR_W = 200;

function TabCadastros({
  initialSub = "ficha-empresa",
}: {
  initialSub?: CadastroSubId;
}) {
  const [sub, setSub] = useState<CadastroSubId>(initialSub);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Sub-sidebar */}
      <div
        style={{
          width: SUB_SIDEBAR_W,
          flexShrink: 0,
          background: "rgba(255,255,255,0.025)",
          boxShadow: "inset -1px 0 0 rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 8px",
          gap: 2,
          overflowY: "auto",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            padding: "0 8px",
            marginBottom: 8,
          }}
        >
          Tipo
        </p>
        {CADASTRO_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = sub === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSub(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: isActive ? "8px 0 0 8px" : 8,
                background: isActive ? "var(--bg-elevated)" : "transparent",
                border: isActive
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid transparent",
                borderRight: isActive ? "1px solid transparent" : undefined,
                marginRight: isActive ? 0 : 8,
                color: isActive
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                width: isActive ? "calc(100% + 0px)" : "calc(100% - 8px)",
                transition:
                  "background 120ms ease, margin 120ms ease, color 120ms ease",
                fontWeight: isActive ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon
                size={14}
                strokeWidth={1.8}
                style={{ color: "currentColor", flexShrink: 0 }}
              />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Sub-content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 160px" }}>
        <div style={{ maxWidth: 720 }}>
          {sub === "ficha-empresa" && <CadastroFichaEmpresa />}
          {sub === "socios" && (
            <ComingSoonSection
              icon={UserCheck}
              label="Sócios e Representantes"
            />
          )}
          {sub === "enderecos" && (
            <ComingSoonSection icon={MapPin} label="Endereços" />
          )}
          {sub === "contatos" && (
            <ComingSoonSection icon={Phone} label="Contatos" />
          )}
          {sub === "documentos" && (
            <ComingSoonSection icon={FileText} label="Documentos Legais" />
          )}
          {sub === "certificados" && (
            <ComingSoonSection
              icon={BadgeCheck}
              label="Certificados Digitais"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

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

function GestorSidebar({
  active,
  onSelect,
  collapsed,
}: {
  active: GestorTabId;
  onSelect: (id: GestorTabId) => void;
  collapsed: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter((section) => section.items.length > 0);

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
          {/* Home icon */}
          <button
            type="button"
            onClick={() => onSelect("visao-geral")}
            title="Visão Geral"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border:
                active === "visao-geral"
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid transparent",
              background:
                active === "visao-geral"
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
              color:
                active === "visao-geral"
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
              cursor: "pointer",
              transition: "background 120ms ease",
            }}
            onMouseEnter={(e) => {
              if (active !== "visao-geral")
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              if (active !== "visao-geral")
                e.currentTarget.style.background = "transparent";
            }}
          >
            <BriefcaseBusiness
              size={16}
              strokeWidth={1.8}
              style={{ color: "currentColor" }}
            />
          </button>

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
                }}
                onMouseEnter={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <Icon
                  size={16}
                  strokeWidth={1.8}
                  style={{ color: "currentColor", flexShrink: 0 }}
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
      {/* App identity — clickable, navigates to visão geral */}
      <button
        type="button"
        onClick={() => onSelect("visao-geral")}
        aria-label="Painel do Gestor"
        aria-current={active === "visao-geral" ? "page" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 14px 12px",
          background:
            active === "visao-geral" ? "rgba(255,255,255,0.04)" : "transparent",
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
          if (active !== "visao-geral")
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        }}
        onMouseLeave={(e) => {
          if (active !== "visao-geral")
            e.currentTarget.style.background = "transparent";
        }}
      >
        <BriefcaseBusiness
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
          Gestor
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
            name="ae-gestor-nav-filter"
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

      {/* Navigation — sectioned */}
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
              const Icon = item.icon;
              const isActive = active === item.id;
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
                    ...(isActive
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
                    if (!isActive) {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
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

        {filtered.length === 0 && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              padding: "16px 8px",
            }}
          >
            Nenhum resultado
          </p>
        )}
      </nav>
    </aside>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function GestorApp() {
  const { pendingTab, clearPendingTab } = useGestorStore();
  const [active, setActive] = useState<GestorTabId>(
    pendingTab ?? "visao-geral",
  );
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (pendingTab !== null) {
      setActive(pendingTab);
      clearPendingTab();
    }
  }, [pendingTab, clearPendingTab]);

  const isCadastros = active === "cadastros";

  return (
    <div
      data-ae="gestor-app"
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
        <GestorSidebar
          active={active}
          onSelect={setActive}
          collapsed={collapsed}
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
      {isCadastros ? (
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          <TabCadastros />
        </div>
      ) : (
        <main
          style={{ flex: 1, overflowY: "auto", padding: "28px 28px 160px" }}
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
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <BriefcaseBusiness
                  size={13}
                  strokeWidth={1.6}
                  style={{ color: "currentColor", flexShrink: 0 }}
                />
                Gestor
              </span>
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
            </nav>

            {/* Painel */}
            {active === "visao-geral" && <TabPainelGeral />}
            {/* Pessoas & Equipe */}
            {active === "colaboradores" && <TabColaboradores />}
            {active === "usuarios" && <TabColaboradores />}
            {active === "cargos-hierarquia" && <TabCargosHierarquia />}
            {active === "departamentos" && <TabDepartamentos />}
            {active === "grupos" && <TabGrupos />}
            {/* Permissões & Acessos */}
            {active === "perfis-acesso" && <TabPerfisAcesso />}
            {active === "regras-cargo" && <TabPerfisAcesso />}
            {active === "regras-app" && <TabRegrasApp />}
            {active === "horarios-acesso" && <TabHorariosAcesso />}
            {/* Aplicativos */}
            {active === "aplicativos" && <TabAplicativos />}
            {active === "regras-distribuicao" && <TabRegrasDistribuicao />}
            {active === "config-por-app" && <TabConfigPorApp />}
            {/* Inteligência Artificial */}
            {active === "ia" && <TabIA />}
            {active === "limites-uso-ia" && <TabLimitesUsoIA />}
            {active === "permissoes-ia" && <TabPermissoesIA />}
            {active === "historico-ia" && <TabHistoricoIA />}
            {/* Integrações */}
            {active === "integracoes" && <TabIntegracoes />}
            {active === "webhooks" && <TabWebhooks />}
            {active === "apis-externas" && <TabApisExternas />}
            {/* Plano & Assinatura */}
            {active === "planos" && <TabPlanos />}
            {active === "consumo-limites" && <TabConsumoLimites />}
            {active === "historico-pagamentos" && <TabHistoricoPagamentos />}
            {/* Segurança */}
            {active === "autenticacao-2fa" && <TabAutenticacao2FA />}
            {active === "sessoes-ativas" && <TabSessoesAtivas />}
            {active === "dispositivos" && <TabDispositivos />}
            {active === "alertas-risco" && <TabAlertasRisco />}
            {/* Auditoria */}
            {active === "auditoria-log" && <TabAuditoriaLog />}
            {active === "trilha-alteracoes" && <TabTrilhaAlteracoes />}
            {active === "exportar-relatorio" && <TabExportarRelatorio />}
            {/* Configurações Gerais */}
            {active === "logo-branding" && <TabLogoBranding />}
            {active === "fuso-idioma" && <TabFusoIdioma />}
            {active === "lgpd" && <TabLGPD />}
          </div>
        </main>
      )}
    </div>
  );
}
