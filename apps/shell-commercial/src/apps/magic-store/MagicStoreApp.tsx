import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Truck,
  BarChart3,
  TrendingUp,
  Zap,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Store,
  Sparkles,
  Building2,
  Clock,
  Search,
  Tag,
  Layers,
  Package,
  ArrowLeft,
  Check,
  Puzzle,
  Workflow,
  LayoutGrid,
  MessageSquare,
  Bell,
  Globe,
  PieChart,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Calculator,
  StickyNote,
  Kanban,
  CalendarDays,
  CloudSun,
  Bot,
  Trash2,
  Download,
  CheckCircle2,
  Code,
  Palette,
  Gamepad2,
} from "lucide-react";
import { type MagicStoreApp as CatalogApp } from "../../data/magic-store-catalog";
import { useMagicStoreCatalog } from "./catalog-adapter";
import { useAppRegistryStore } from "../../stores/appRegistryStore";
import { isSensitiveScope } from "@aethereos/client";
import { PermissionConsentModal } from "../../components/shared/PermissionConsentModal";
import { PermissionsSection } from "./PermissionsSection";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useOSStore } from "../../stores/osStore";
import {
  useInstalledModulesStore,
  isProtectedModule,
} from "../../stores/installedModulesStore";
import { getApp } from "../registry";

/* ─── Types & Constants ───────────────────────────────────────────────────── */

type NavTab = "apps" | "plugins" | "widgets" | "integracoes" | "distros";
type ActivePage = NavTab | null;

const NAV_TABS: { id: NavTab; label: string }[] = [
  { id: "apps", label: "Aplicativos" },
  { id: "plugins", label: "Plugins" },
  { id: "widgets", label: "Widgets" },
  { id: "integracoes", label: "Integrações" },
  { id: "distros", label: "Distros" },
];

const CONTENT_MAX_W = 1080;
const STORE_SIDEBAR_W = 239;
const STORE_SIDEBAR_ICON_W = 48;

type Status = "available" | "beta" | "coming_soon";

const ICON_MAP: Record<
  string,
  React.FC<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>
> = {
  ShoppingCart,
  Truck,
  BarChart3,
  TrendingUp,
  Zap,
  Store,
  Sparkles,
  MessageSquare,
  Search,
  Bot,
  Globe,
  Calculator,
  StickyNote,
  Kanban,
  CalendarDays,
  CloudSun,
  Grid3x3: LayoutGrid,
  Layers,
  LayoutGrid,
  Tag,
  Building2,
  Package,
  Puzzle,
};

type SidebarIcon = React.FC<{
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}>;
interface SidebarItem {
  id: string;
  label: string;
  icon: SidebarIcon;
}
interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

const SIDEBAR_CONFIGS: Record<NavTab, SidebarSection[]> = {
  apps: [
    {
      title: "Biblioteca",
      items: [
        { id: "all", label: "Todos os apps", icon: Store },
        { id: "installed", label: "Instalados", icon: Check },
      ],
    },
    {
      title: "Categorias",
      items: [
        { id: "vertical", label: "Verticais B2B", icon: Building2 },
        { id: "ai", label: "Inteligência Artificial", icon: Bot },
        { id: "productivity", label: "Produtividade", icon: TrendingUp },
        { id: "dev-tools", label: "Dev Tools", icon: Code },
        { id: "design", label: "Design & Mídia", icon: Palette },
        { id: "data", label: "Dados & BI", icon: BarChart3 },
        { id: "games", label: "Jogos", icon: Gamepad2 },
        { id: "utilities", label: "Utilitários", icon: Workflow },
        { id: "puter", label: "Puter & OS abertos", icon: Globe },
      ],
    },
    {
      title: "Status",
      items: [
        { id: "beta", label: "Em beta", icon: Zap },
        { id: "coming_soon", label: "Em breve", icon: Clock },
      ],
    },
  ],
  plugins: [
    {
      title: "Tipo",
      items: [
        { id: "all", label: "Todos os plugins", icon: Puzzle },
        { id: "bi", label: "Relatórios & BI", icon: BarChart3 },
        { id: "automation", label: "Automação", icon: Zap },
        { id: "communication", label: "Comunicação", icon: MessageSquare },
        { id: "productivity", label: "Produtividade", icon: TrendingUp },
      ],
    },
  ],
  widgets: [
    {
      title: "Tipo",
      items: [
        { id: "all", label: "Todos os widgets", icon: LayoutGrid },
        { id: "workspace", label: "Mesa de trabalho", icon: Monitor },
        { id: "metrics", label: "Métricas", icon: BarChart3 },
        { id: "calendar", label: "Tempo & Calendário", icon: Clock },
        { id: "productivity", label: "Produtividade", icon: TrendingUp },
      ],
    },
  ],
  integracoes: [
    {
      title: "Tipo",
      items: [
        { id: "all", label: "Todas as Integrações", icon: Globe },
        { id: "erp", label: "ERP & Financeiro", icon: Building2 },
        { id: "crm", label: "CRM & Vendas", icon: ShoppingCart },
        { id: "ecommerce", label: "E-commerce", icon: Tag },
        { id: "api", label: "APIs & Webhooks", icon: Workflow },
      ],
    },
  ],
  distros: [
    {
      title: "Segmento",
      items: [
        { id: "all", label: "Todas as Distros", icon: Package },
        { id: "b2b", label: "B2B & Empresarial", icon: Building2 },
        { id: "vertical", label: "Verticais Setoriais", icon: Layers },
        { id: "regional", label: "Regionais", icon: Globe },
      ],
    },
    {
      title: "Status",
      items: [
        { id: "available", label: "Disponíveis", icon: Check },
        { id: "coming_soon", label: "Em breve", icon: Clock },
      ],
    },
  ],
};

interface TeaserItem {
  id: string;
  name: string;
  description: string;
  Icon: React.FC<{
    size?: number;
    strokeWidth?: number;
    style?: React.CSSProperties;
  }>;
  color: string;
  category: string;
}

const PLUGINS_TEASER: TeaserItem[] = [
  {
    id: "p1",
    name: "Relatórios Premium",
    description: "Dashboards interativos e exportação em BI",
    Icon: BarChart3,
    color: "#06b6d4",
    category: "bi",
  },
  {
    id: "p2",
    name: "Análise Preditiva",
    description: "Machine learning aplicado aos seus dados",
    Icon: PieChart,
    color: "#06b6d4",
    category: "bi",
  },
  {
    id: "p3",
    name: "Bot de Alertas",
    description: "Notificações automáticas por regras de negócio",
    Icon: Bell,
    color: "#06b6d4",
    category: "automation",
  },
  {
    id: "p4",
    name: "Automação de Tarefas",
    description: "Triggers e ações com base em eventos do sistema",
    Icon: Zap,
    color: "#0284c7",
    category: "automation",
  },
  {
    id: "p5",
    name: "Integração Mensageria",
    description: "Notificações e comandos via chat corporativo",
    Icon: MessageSquare,
    color: "#0ea5e9",
    category: "communication",
  },
  {
    id: "p6",
    name: "Gestão de Documentos",
    description: "Upload, versionamento e assinatura digital",
    Icon: Package,
    color: "#0369a1",
    category: "productivity",
  },
];

const WIDGETS_TEASER: TeaserItem[] = [
  {
    id: "w1",
    name: "Painel de KPIs",
    description: "Indicadores em tempo real na sua Mesa",
    Icon: BarChart3,
    color: "#8b5cf6",
    category: "metrics",
  },
  {
    id: "w2",
    name: "Resumo Financeiro",
    description: "Fluxo de caixa e saldo direto no workspace",
    Icon: TrendingUp,
    color: "#7c3aed",
    category: "metrics",
  },
  {
    id: "w3",
    name: "Widget de Tempo",
    description: "Previsão do tempo integrada ao desktop",
    Icon: Globe,
    color: "#6d28d9",
    category: "calendar",
  },
  {
    id: "w4",
    name: "Agenda Integrada",
    description: "Próximos compromissos na mesa de trabalho",
    Icon: Clock,
    color: "#7c3aed",
    category: "calendar",
  },
  {
    id: "w5",
    name: "Atalhos Rápidos",
    description: "Acesso rápido às suas principais ferramentas",
    Icon: LayoutGrid,
    color: "#8b5cf6",
    category: "workspace",
  },
  {
    id: "w6",
    name: "Feed de Atividades",
    description: "Acompanhe ações da equipe em tempo real",
    Icon: Layers,
    color: "#6d28d9",
    category: "workspace",
  },
];

const INTEGRACOES_TEASER: TeaserItem[] = [
  {
    id: "i1",
    name: "TOTVS Protheus",
    description: "Sincronização bidirecional de dados financeiros",
    Icon: Building2,
    color: "#f59e0b",
    category: "erp",
  },
  {
    id: "i2",
    name: "SAP Business One",
    description: "Integração nativa com SAP B1 via API",
    Icon: Building2,
    color: "#d97706",
    category: "erp",
  },
  {
    id: "i3",
    name: "Pipedrive CRM",
    description: "Sincronize oportunidades e negociações",
    Icon: TrendingUp,
    color: "#f59e0b",
    category: "crm",
  },
  {
    id: "i4",
    name: "Salesforce",
    description: "Conector para Salesforce Sales Cloud",
    Icon: TrendingUp,
    color: "#b45309",
    category: "crm",
  },
  {
    id: "i5",
    name: "Shopify B2B",
    description: "Integração com catálogo e pedidos Shopify",
    Icon: Store,
    color: "#f59e0b",
    category: "ecommerce",
  },
  {
    id: "i6",
    name: "API Gateway",
    description: "REST & Webhook para sistemas externos",
    Icon: Workflow,
    color: "#d97706",
    category: "api",
  },
];

const DISTROS_TEASER: TeaserItem[] = [
  {
    id: "d1",
    name: "B2B AI OS Brazil",
    description:
      "Distribuição nacional com SaaS pré-instalados para empresas brasileiras",
    Icon: Globe,
    color: "#10b981",
    category: "b2b",
  },
  {
    id: "d2",
    name: "Aethereos Agro",
    description:
      "OS vertical para o agronegócio brasileiro com módulos fiscais e rastreamento",
    Icon: Layers,
    color: "#16a34a",
    category: "vertical",
  },
  {
    id: "d3",
    name: "Aethereos Saúde",
    description:
      "Distribuição para clínicas e operadoras com compliance LGPD e ANVISA",
    Icon: Building2,
    color: "#0ea5e9",
    category: "vertical",
  },
  {
    id: "d4",
    name: "Aethereos Varejo",
    description:
      "OS para redes de varejo com PDV integrado e gestão de estoque",
    Icon: ShoppingCart,
    color: "#f59e0b",
    category: "vertical",
  },
  {
    id: "d5",
    name: "Aethereos Latam",
    description:
      "Distribuição para o mercado latino-americano com multi-moeda e NF-e regional",
    Icon: Globe,
    color: "#8b5cf6",
    category: "regional",
  },
  {
    id: "d6",
    name: "Aethereos Gov",
    description:
      "Versão para órgãos públicos com auditoria, conformidade e integração SEFAZ",
    Icon: Building2,
    color: "#64748b",
    category: "b2b",
  },
];

/* ─── Sparkles Text ───────────────────────────────────────────────────────── */

interface SparkleData {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

const SPARKLE_COLORS = ["#a78bfa", "#818cf8", "#c4b5fd", "#e0d7ff"];

function generateSparkle(): SparkleData {
  return {
    id: Date.now() + Math.random() * 10000,
    x: 5 + Math.random() * 90,
    y: 5 + Math.random() * 90,
    size: 7 + Math.random() * 7,
    color:
      SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)] ??
      "#a78bfa",
  };
}

function SparkleIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <path
        d="M80 7C80 7 84.2846 45.2987 101.496 62.5C118.707 79.7013 157 84 157 84C157 84 118.707 88.2987 101.496 105.5C84.2846 122.701 80 161 80 161C80 161 75.7154 122.701 58.504 105.5C41.2926 88.2987 3 84 3 84C3 84 41.2926 79.7013 58.504 62.5C75.7154 45.2987 80 7 80 7Z"
        fill={color}
      />
    </svg>
  );
}

function SparklesText({ children }: { children: React.ReactNode }) {
  const [sparkles, setSparkles] = useState<SparkleData[]>(() =>
    Array.from({ length: 4 }, generateSparkle),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSparkles((prev) => [...prev.slice(1), generateSparkle()]);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <AnimatePresence>
        {sparkles.map((s) => (
          <motion.span
            key={s.id}
            style={{
              position: "absolute",
              left: `${s.x}%`,
              top: `${s.y}%`,
              pointerEvents: "none",
              zIndex: 1,
              display: "block",
              transform: "translate(-50%, -50%)",
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.1, 1, 0] }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          >
            <SparkleIcon size={s.size} color={s.color} />
          </motion.span>
        ))}
      </AnimatePresence>
      <span style={{ position: "relative", zIndex: 2 }}>{children}</span>
    </span>
  );
}

/* ─── Primitives ──────────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        marginBottom: 12,
      }}
    >
      {children}
    </p>
  );
}

function StatusBadge({ status }: { status: Status }) {
  // Sprint 24+: redesign para diferenciar visualmente "Disponível" de
  // "Instalado" (antes ambos eram pills verdes uppercase quase identicos).
  // available  => outline limpo + Download icon, tom neutro/cyan (acao)
  // beta       => outline ambar (cuidado/preview)
  // coming_soon => outline pontilhado, tom apagado
  if (status === "available") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 9px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 500,
          color: "#67e8f9",
          background: "transparent",
          border: "1px solid rgba(34,211,238,0.35)",
        }}
      >
        <Download size={11} strokeWidth={2} />
        Disponível
      </span>
    );
  }
  if (status === "beta") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 9px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 500,
          color: "#fbbf24",
          background: "transparent",
          border: "1px solid rgba(245,158,11,0.4)",
        }}
      >
        <Sparkles size={11} strokeWidth={2} />
        Beta
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        color: "var(--text-tertiary)",
        background: "transparent",
        border: "1px dashed rgba(255,255,255,0.18)",
      }}
    >
      <Clock size={11} strokeWidth={2} />
      Em breve
    </span>
  );
}

function PrimaryButton({
  onClick,
  children,
  size = "md",
}: {
  onClick: () => void;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(99,102,241,0.88)",
        border: "none",
        borderRadius: 8,
        padding: size === "lg" ? "10px 22px" : "8px 20px",
        fontSize: 13,
        fontWeight: size === "lg" ? 600 : 500,
        color: "#ffffff",
        cursor: "pointer",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#6366f1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(99,102,241,0.88)";
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  children,
  size = "md",
}: {
  onClick: () => void;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: size === "lg" ? "10px 18px" : "6px 14px",
        fontSize: size === "lg" ? 13 : 12,
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

function DisabledButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 8,
        padding: "10px 22px",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        cursor: "not-allowed",
      }}
    >
      {children}
    </button>
  );
}

function InstalledBadge() {
  // Sprint 24+: badge "instalado" agora tem forma distinta do "Disponível":
  // pill solido verde + CheckCircle2 — comunica "ja seu" vs outline neutro
  // do disponivel (acao pendente).
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        background: "rgba(34,197,94,0.18)",
        color: "#86efac",
        border: "1px solid rgba(34,197,94,0.32)",
      }}
    >
      <CheckCircle2 size={12} strokeWidth={2} />
      Instalado
    </span>
  );
}

function InstallButton({
  appId,
  installed,
  pending,
  onInstall,
  onUninstall,
  size = "md",
}: {
  appId?: string;
  installed: boolean;
  pending: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  size?: "md" | "lg";
}) {
  // Sprint 16 MX82: apps protegidos (alwaysEnabled OR PROTECTED_MODULES)
  // mostram badge "Incluído no OS" em vez de botao desinstalar.
  // Detecta protecao automaticamente via appId (se fornecido).
  const protectedApp =
    appId !== undefined && installed && isProtectedModule(appId);
  if (protectedApp) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(34,197,94,0.10)",
          border: "1px solid rgba(34,197,94,0.22)",
          borderRadius: 8,
          padding: size === "lg" ? "8px 14px" : "6px 12px",
          fontSize: size === "lg" ? 12 : 11,
          fontWeight: 500,
          color: "rgb(134, 239, 172)",
          cursor: "default",
        }}
      >
        Incluído no OS
      </span>
    );
  }
  if (pending) {
    return (
      <button
        type="button"
        disabled
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          padding: size === "lg" ? "10px 22px" : "8px 18px",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          cursor: "wait",
        }}
      >
        Aguarde…
      </button>
    );
  }
  if (installed) {
    return (
      <button
        type="button"
        onClick={onUninstall}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8,
          padding: size === "lg" ? "10px 18px" : "6px 14px",
          fontSize: size === "lg" ? 13 : 12,
          fontWeight: 500,
          color: "var(--text-secondary)",
          cursor: "pointer",
          transition: "background 120ms ease, color 120ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(239,68,68,0.16)";
          e.currentTarget.style.color = "#fca5a5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <Trash2 size={13} strokeWidth={2} />
        Desinstalar
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onInstall}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(99,102,241,0.88)",
        border: "none",
        borderRadius: 8,
        padding: size === "lg" ? "10px 22px" : "8px 18px",
        fontSize: 13,
        fontWeight: size === "lg" ? 600 : 500,
        color: "#ffffff",
        cursor: "pointer",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#6366f1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(99,102,241,0.88)";
      }}
    >
      <Download size={13} strokeWidth={2} />
      Instalar
    </button>
  );
}

function AppIconBox({
  iconName,
  color,
  size = 56,
  radius = 16,
}: {
  iconName: string;
  color: string;
  size?: number;
  radius?: number;
}) {
  const Icon = ICON_MAP[iconName] ?? Store;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(140deg, ${color}38, ${color}12)`,
        border: `1px solid ${color}40`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 4px 16px ${color}1a`,
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.6} style={{ color }} />
    </div>
  );
}

function MetaChip({
  icon: Icon,
  children,
}: {
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        color: "var(--text-tertiary)",
      }}
    >
      <Icon size={11} strokeWidth={1.8} />
      {children}
    </span>
  );
}

function InfoRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
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
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
        {label}
      </span>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Store Header ────────────────────────────────────────────────────────── */

function StoreHeader({
  activePage,
  onTabChange,
  onLogoClick,
}: {
  activePage: ActivePage;
  onTabChange: (tab: NavTab) => void;
  onLogoClick: () => void;
}) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        height: 54,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        background: "rgba(6,9,18,0.94)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <button
        type="button"
        onClick={onLogoClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          flexShrink: 0,
          width: 200,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1,
            background:
              "linear-gradient(135deg, #818cf8 0%, #a78bfa 55%, #c4b5fd 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.04em",
          }}
        >
          Æ
        </span>
        <SparklesText>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              fontFamily: "var(--font-display)",
            }}
          >
            Magic Store
          </span>
        </SparklesText>
      </button>

      {/* Nav tabs — active tab stretches to header bottom, covering inset shadow */}
      <nav
        style={{
          flex: 1,
          alignSelf: "stretch",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        {NAV_TABS.map((tab) => {
          const isActive = activePage === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              style={
                isActive
                  ? {
                      alignSelf: "stretch",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 16px",
                      borderRadius: "8px 8px 0 0",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                      borderLeft: "none",
                      borderRight: "none",
                      borderBottom: "none",
                      background: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      letterSpacing: "-0.01em",
                    }
                  : {
                      padding: "5px 16px",
                      borderRadius: 8,
                      border: "1px solid transparent",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 400,
                      cursor: "pointer",
                      transition: "background 120ms ease, color 120ms ease",
                      letterSpacing: "-0.01em",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
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
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Spacer simetrico ao logo (width:200) para a nav ficar centralizada
          em relacao ao header inteiro, nao apenas ao espaco restante. */}
      <div style={{ width: 200, flexShrink: 0 }} aria-hidden />
    </header>
  );
}

/* ─── Hero Banner ─────────────────────────────────────────────────────────── */

function HeroBanner({
  app,
  onOpen,
  onSelect,
  installed,
  pending,
  onInstall,
  onUninstall,
}: {
  app: CatalogApp;
  onOpen: (a: CatalogApp) => void;
  onSelect: (a: CatalogApp) => void;
  installed: boolean;
  pending: boolean;
  onInstall: () => void;
  onUninstall: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        padding: "36px 40px",
        overflow: "hidden",
        minHeight: 240,
        display: "flex",
        alignItems: "center",
        background: `linear-gradient(120deg, ${app.color}28 0%, rgba(15,21,27,0.6) 55%, rgba(6,9,18,0.92) 100%)`,
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -60,
          top: -60,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${app.color}40 0%, transparent 65%)`,
          filter: "blur(50px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 120,
          bottom: -80,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${app.color}22 0%, transparent 70%)`,
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 32,
          flex: 1,
        }}
      >
        <div style={{ flex: 1, maxWidth: 520 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <Sparkles size={11} style={{ color: app.color }} strokeWidth={2} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: app.color,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Em destaque
            </span>
          </div>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              fontFamily: "var(--font-display)",
              marginBottom: 10,
            }}
          >
            {app.name}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            {app.longDescription}
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {app.status !== "coming_soon" && installed ? (
              <PrimaryButton onClick={() => onOpen(app)} size="lg">
                <ExternalLink size={14} strokeWidth={2} />
                Abrir {app.name}
              </PrimaryButton>
            ) : null}
            {app.installable && app.status !== "coming_soon" ? (
              <InstallButton
                appId={
                  app.source.type === "internal" ? app.source.target : app.id
                }
                installed={installed}
                pending={pending}
                onInstall={onInstall}
                onUninstall={onUninstall}
                size="lg"
              />
            ) : null}
            <SecondaryButton onClick={() => onSelect(app)} size="lg">
              Ver detalhes
              <ChevronRight size={14} strokeWidth={2} />
            </SecondaryButton>
            {installed ? (
              <InstalledBadge />
            ) : (
              <StatusBadge status={app.status as Status} />
            )}
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              background: `linear-gradient(140deg, ${app.color}48, ${app.color}18)`,
              border: `1.5px solid ${app.color}50`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 60px ${app.color}30, 0 16px 48px rgba(0,0,0,0.4)`,
            }}
          >
            <AppIconBox
              iconName={app.icon}
              color={app.color}
              size={120}
              radius={30}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── App Card ────────────────────────────────────────────────────────────── */

function AppCard({
  app,
  onSelect,
  size = "md",
  installed = false,
}: {
  app: CatalogApp;
  onSelect: (app: CatalogApp) => void;
  size?: "sm" | "md" | "lg";
  installed?: boolean;
}) {
  const iconSize = size === "lg" ? 64 : size === "sm" ? 44 : 52;
  const iconRadius = size === "lg" ? 18 : size === "sm" ? 12 : 14;
  const cardPadding = size === "lg" ? 22 : size === "sm" ? 14 : 18;
  const titleSize = size === "lg" ? 16 : size === "sm" ? 13 : 14;
  const descSize = size === "sm" ? 11 : 12;
  const muted = app.status === "coming_soon";

  return (
    <button
      type="button"
      onClick={() => onSelect(app)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: cardPadding,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        textAlign: "left",
        cursor: "pointer",
        transition:
          "background 200ms ease, border-color 200ms ease, transform 200ms ease",
        opacity: muted ? 0.75 : 1,
        height: "100%",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <AppIconBox
          iconName={app.icon}
          color={app.color}
          size={iconSize}
          radius={iconRadius}
        />
        {installed ? (
          <InstalledBadge />
        ) : (
          <StatusBadge status={app.status as Status} />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <h3
          style={{
            fontSize: titleSize,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
          }}
        >
          {app.name}
        </h3>
        <p
          style={{
            fontSize: descSize,
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {app.description}
        </p>
      </div>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: "auto" }}
      >
        {app.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 10,
              padding: "2px 7px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "var(--text-tertiary)",
              borderRadius: 6,
              letterSpacing: "0.01em",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

/* ─── Horizontal Carousel ─────────────────────────────────────────────────── */

function CarouselButton({
  dir,
  onClick,
}: {
  dir: -1 | 1;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === -1 ? "Anterior" : "Próximo"}
      style={{
        position: "absolute",
        [dir === -1 ? "left" : "right"]: -14,
        top: "50%",
        transform: "translateY(-50%)",
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "rgba(15,21,27,0.95)",
        border: "1px solid rgba(255,255,255,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-tertiary)",
        cursor: "pointer",
        transition: "background 120ms ease, border-color 120ms ease",
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
      {dir === -1 ? (
        <ChevronLeft size={14} strokeWidth={2} />
      ) : (
        <ChevronRight size={14} strokeWidth={2} />
      )}
    </button>
  );
}

function HorizontalCarousel({
  children,
  cardWidth = 260,
}: {
  children: React.ReactNode;
  cardWidth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function scroll(dir: -1 | 1) {
    if (ref.current === null) return;
    ref.current.scrollBy({
      left: ref.current.clientWidth * 0.8 * dir,
      behavior: "smooth",
    });
  }
  return (
    <div style={{ position: "relative" }}>
      <div
        ref={ref}
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: `minmax(${cardWidth}px, 1fr)`,
          gap: 14,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          paddingBottom: 4,
        }}
      >
        {children}
      </div>
      <CarouselButton dir={-1} onClick={() => scroll(-1)} />
      <CarouselButton dir={1} onClick={() => scroll(1)} />
    </div>
  );
}

/* ─── Category Carousel (Sprint 25) ───────────────────────────────────────── */

function CategoryCarousel({
  label,
  apps,
  accent,
  onSelect,
  onNavigate,
  installed,
}: {
  label: string;
  apps: CatalogApp[];
  accent: string;
  onSelect: (app: CatalogApp) => void;
  onNavigate: () => void;
  installed: ReadonlySet<string>;
}) {
  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <SectionLabel>{label}</SectionLabel>
        <button
          type="button"
          onClick={onNavigate}
          style={{
            fontSize: 11,
            color: accent,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Ver todos →
        </button>
      </div>
      <HorizontalCarousel cardWidth={240}>
        {apps.map((app) => (
          <div key={app.id} style={{ scrollSnapAlign: "start" }}>
            <AppCard
              app={app}
              onSelect={onSelect}
              size="md"
              installed={installed.has(app.id)}
            />
          </div>
        ))}
      </HorizontalCarousel>
    </section>
  );
}

/* ─── Teaser Card (coming soon) ───────────────────────────────────────────── */

function TeaserCard({ item }: { item: TeaserItem }) {
  const { name, description, Icon, color } = item;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 18,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: `linear-gradient(140deg, ${color}28, ${color}0e)`,
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={26} strokeWidth={1.5} style={{ color }} />
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            background: "rgba(255,255,255,0.06)",
            color: "var(--text-tertiary)",
            border: "1px solid rgba(255,255,255,0.10)",
            letterSpacing: "0.02em",
          }}
        >
          <Clock size={9} strokeWidth={2} />
          Em breve
        </span>
      </div>
      <div>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 4,
          }}
        >
          {name}
        </h3>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

/* ─── Tab Sidebar ─────────────────────────────────────────────────────────── */

function TabSidebar({
  tab,
  activeFilter,
  onFilter,
  collapsed,
}: {
  tab: NavTab;
  activeFilter: string;
  onFilter: (id: string) => void;
  collapsed: boolean;
}) {
  const [query, setQuery] = useState("");
  const sections = SIDEBAR_CONFIGS[tab];

  const ASIDE_STYLE: React.CSSProperties = {
    width: "100%",
    height: "100%",
    background: "rgba(15,21,27,0.82)",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)",
    scrollbarWidth: "none",
  };

  if (collapsed) {
    const allItems = sections.flatMap((s) => s.items);
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
            const isActive = activeFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilter(item.id)}
                title={item.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: isActive
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid transparent",
                  background: isActive
                    ? "rgba(255,255,255,0.08)"
                    : "transparent",
                  color: isActive
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "background 120ms ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
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
                <item.icon
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

  const filtered = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside style={ASIDE_STYLE}>
      {/* Search */}
      <div style={{ padding: "10px 10px 4px" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            strokeWidth={1.8}
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
            type="search"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
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
              boxSizing: "border-box",
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
      <nav style={{ flex: 1, padding: "4px 0 40px 8px" }}>
        {filtered.map((section, sectionIdx) => (
          <div
            key={section.title}
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
              {section.title}
            </p>
            {section.items.map((item) => {
              const isActive = activeFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onFilter(item.id)}
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
                  <item.icon
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

/* ─── Store Front Page (homepage) ─────────────────────────────────────────── */

function StoreFrontPage({
  catalog,
  onSelect,
  onOpen,
  onNavigate,
  installed,
  pending,
  onInstall,
  onUninstall,
}: {
  catalog: CatalogApp[];
  onSelect: (app: CatalogApp) => void;
  onOpen: (app: CatalogApp) => void;
  onNavigate: (tab: NavTab) => void;
  installed: ReadonlySet<string>;
  pending: ReadonlySet<string>;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
}) {
  const heroApp = useMemo(
    () =>
      catalog.find((a) => a.status === "beta") ??
      catalog.find((a) => a.status === "available") ??
      catalog[0],
    [catalog],
  );

  const featured = catalog.filter(
    (a) => a.status === "available" || a.status === "beta",
  );
  const verticals = catalog.filter((a) => a.category === "vertical");
  const aiApps = catalog.filter((a) => a.category === "ai");
  const devTools = catalog.filter((a) => a.category === "dev-tools");
  const designApps = catalog.filter((a) => a.category === "design");
  const dataApps = catalog.filter((a) => a.category === "data");
  const games = catalog.filter((a) => a.category === "games");

  if (heroApp === undefined) return null;

  const categoryCards: {
    id: NavTab;
    label: string;
    description: string;
    color: string;
    Icon: typeof Store;
    count: string;
  }[] = [
    {
      id: "apps",
      label: "Aplicativos",
      description: "Verticais B2B e módulos para o workspace",
      color: "#818cf8",
      Icon: Store,
      count: `${catalog.length} apps`,
    },
    {
      id: "plugins",
      label: "Plugins",
      description: "Estenda as capacidades do seu OS",
      color: "#06b6d4",
      Icon: Puzzle,
      count: "Em breve",
    },
    {
      id: "widgets",
      label: "Widgets",
      description: "Personalize sua Mesa de trabalho",
      color: "#8b5cf6",
      Icon: LayoutGrid,
      count: "Em breve",
    },
    {
      id: "integracoes",
      label: "Integrações",
      description: "Conecte ao seu ecossistema B2B",
      color: "#f59e0b",
      Icon: Workflow,
      count: "Em breve",
    },
    {
      id: "distros",
      label: "Distros",
      description: "Distribuições verticais do Aethereos OS",
      color: "#10b981",
      Icon: Package,
      count: "Em breve",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
      {/* Main hero */}
      <HeroBanner
        app={heroApp}
        onOpen={onOpen}
        onSelect={onSelect}
        installed={installed.has(heroApp.id)}
        pending={pending.has(heroApp.id)}
        onInstall={() => onInstall(heroApp.id)}
        onUninstall={() => onUninstall(heroApp.id)}
      />

      {/* Category cards */}
      <section>
        <SectionLabel>Explorar por categoria</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {categoryCards.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onNavigate(cat.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "20px 18px",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${cat.color}20`,
                borderRadius: 16,
                textAlign: "left",
                cursor: "pointer",
                transition:
                  "background 200ms ease, border-color 200ms ease, transform 200ms ease",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${cat.color}0e`;
                e.currentTarget.style.borderColor = `${cat.color}40`;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = `${cat.color}20`;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${cat.color}18`,
                  border: `1px solid ${cat.color}28`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <cat.Icon
                  size={20}
                  strokeWidth={1.5}
                  style={{ color: cat.color }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 3,
                  }}
                >
                  {cat.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    lineHeight: 1.4,
                  }}
                >
                  {cat.description}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: cat.color,
                  letterSpacing: "0.03em",
                }}
              >
                {cat.count} →
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured apps carousel */}
      {featured.length > 0 && (
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <SectionLabel>Em destaque</SectionLabel>
            <button
              type="button"
              onClick={() => onNavigate("apps")}
              style={{
                fontSize: 11,
                color: "#a78bfa",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Ver todos →
            </button>
          </div>
          <HorizontalCarousel cardWidth={240}>
            {featured.map((app) => (
              <div key={app.id} style={{ scrollSnapAlign: "start" }}>
                <AppCard
                  app={app}
                  onSelect={onSelect}
                  size="md"
                  installed={installed.has(app.id)}
                />
              </div>
            ))}
          </HorizontalCarousel>
        </section>
      )}

      {/* Verticals carousel */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <SectionLabel>Verticais B2B</SectionLabel>
          <button
            type="button"
            onClick={() => onNavigate("apps")}
            style={{
              fontSize: 11,
              color: "#a78bfa",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Explorar →
          </button>
        </div>
        <HorizontalCarousel cardWidth={240}>
          {verticals.map((app) => (
            <div key={app.id} style={{ scrollSnapAlign: "start" }}>
              <AppCard
                app={app}
                onSelect={onSelect}
                size="md"
                installed={installed.has(app.id)}
              />
            </div>
          ))}
        </HorizontalCarousel>
      </section>

      {/* AI carousel */}
      {aiApps.length > 0 && (
        <CategoryCarousel
          label="Inteligência Artificial"
          apps={aiApps}
          accent="#a78bfa"
          onSelect={onSelect}
          onNavigate={() => onNavigate("apps")}
          installed={installed}
        />
      )}

      {/* Dev Tools carousel */}
      {devTools.length > 0 && (
        <CategoryCarousel
          label="Dev Tools"
          apps={devTools}
          accent="#22d3ee"
          onSelect={onSelect}
          onNavigate={() => onNavigate("apps")}
          installed={installed}
        />
      )}

      {/* Design carousel */}
      {designApps.length > 0 && (
        <CategoryCarousel
          label="Design & Mídia"
          apps={designApps}
          accent="#f472b6"
          onSelect={onSelect}
          onNavigate={() => onNavigate("apps")}
          installed={installed}
        />
      )}

      {/* Data & BI carousel */}
      {dataApps.length > 0 && (
        <CategoryCarousel
          label="Dados & BI"
          apps={dataApps}
          accent="#34d399"
          onSelect={onSelect}
          onNavigate={() => onNavigate("apps")}
          installed={installed}
        />
      )}

      {/* Games carousel */}
      {games.length > 0 && (
        <CategoryCarousel
          label="Jogos"
          apps={games}
          accent="#fbbf24"
          onSelect={onSelect}
          onNavigate={() => onNavigate("apps")}
          installed={installed}
        />
      )}

      {/* Plugins teaser */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <SectionLabel>Plugins — em desenvolvimento</SectionLabel>
          <button
            type="button"
            onClick={() => onNavigate("plugins")}
            style={{
              fontSize: 11,
              color: "#06b6d4",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Ver todos →
          </button>
        </div>
        <HorizontalCarousel cardWidth={240}>
          {PLUGINS_TEASER.slice(0, 4).map((item) => (
            <div key={item.id} style={{ scrollSnapAlign: "start" }}>
              <TeaserCard item={item} />
            </div>
          ))}
        </HorizontalCarousel>
      </section>

      {/* Widgets teaser */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <SectionLabel>Widgets para sua Mesa</SectionLabel>
          <button
            type="button"
            onClick={() => onNavigate("widgets")}
            style={{
              fontSize: 11,
              color: "#8b5cf6",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Ver todos →
          </button>
        </div>
        <HorizontalCarousel cardWidth={240}>
          {WIDGETS_TEASER.slice(0, 4).map((item) => (
            <div key={item.id} style={{ scrollSnapAlign: "start" }}>
              <TeaserCard item={item} />
            </div>
          ))}
        </HorizontalCarousel>
      </section>

      {/* Integrations teaser */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <SectionLabel>Integrações disponíveis em breve</SectionLabel>
          <button
            type="button"
            onClick={() => onNavigate("integracoes")}
            style={{
              fontSize: 11,
              color: "#f59e0b",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Ver todas →
          </button>
        </div>
        <HorizontalCarousel cardWidth={240}>
          {INTEGRACOES_TEASER.slice(0, 4).map((item) => (
            <div key={item.id} style={{ scrollSnapAlign: "start" }}>
              <TeaserCard item={item} />
            </div>
          ))}
        </HorizontalCarousel>
      </section>

      {/* Distros teaser */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <SectionLabel>Distribuições verticais</SectionLabel>
          <button
            type="button"
            onClick={() => onNavigate("distros")}
            style={{
              fontSize: 11,
              color: "#10b981",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Ver todas →
          </button>
        </div>
        <HorizontalCarousel cardWidth={240}>
          {DISTROS_TEASER.slice(0, 4).map((item) => (
            <div key={item.id} style={{ scrollSnapAlign: "start" }}>
              <TeaserCard item={item} />
            </div>
          ))}
        </HorizontalCarousel>
      </section>
    </div>
  );
}

/* ─── Apps Tab Page ───────────────────────────────────────────────────────── */

function AppsTabPage({
  catalog,
  sidebarFilter,
  onFilter: _onFilter,
  onSelect,
  installed,
}: {
  catalog: CatalogApp[];
  sidebarFilter: string;
  onFilter: (id: string) => void;
  onSelect: (app: CatalogApp) => void;
  installed: ReadonlySet<string>;
}) {
  const filtered = useMemo(() => {
    if (sidebarFilter === "all") return catalog;
    if (sidebarFilter === "installed")
      return catalog.filter((a) => installed.has(a.id));
    if (sidebarFilter === "beta")
      return catalog.filter((a) => a.status === "beta");
    if (sidebarFilter === "coming_soon")
      return catalog.filter((a) => a.status === "coming_soon");
    return catalog.filter((a) => a.category === sidebarFilter);
  }, [catalog, sidebarFilter, installed]);

  const filterLabel =
    SIDEBAR_CONFIGS.apps
      .flatMap((s) => s.items)
      .find((i) => i.id === sidebarFilter)?.label ?? "Todos os apps";

  return (
    <main
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "28px 32px 160px",
        scrollbarWidth: "none",
      }}
    >
      <div style={{ maxWidth: CONTENT_MAX_W, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              marginBottom: 4,
            }}
          >
            {filterLabel}
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            {filtered.length} aplicativo{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        {filtered.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {filtered.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onSelect={onSelect}
                size="md"
                installed={installed.has(app.id)}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: 60,
              color: "var(--text-tertiary)",
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <Package size={36} strokeWidth={1.4} />
            <p style={{ fontSize: 13 }}>Nenhum app nesta categoria ainda.</p>
          </div>
        )}
      </div>
    </main>
  );
}

/* ─── Generic Teaser Tab Page ─────────────────────────────────────────────── */

function TeaserTabPage({
  tab,
  items,
  sidebarFilter,
  onFilter: _onFilter,
  title,
  emptyLabel,
}: {
  tab: NavTab;
  items: TeaserItem[];
  sidebarFilter: string;
  onFilter: (id: string) => void;
  title: string;
  emptyLabel: string;
}) {
  const filtered =
    sidebarFilter === "all"
      ? items
      : items.filter((i) => i.category === sidebarFilter);
  const filterLabel =
    SIDEBAR_CONFIGS[tab]
      .flatMap((s) => s.items)
      .find((i) => i.id === sidebarFilter)?.label ?? title;

  return (
    <main
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "28px 32px 160px",
        scrollbarWidth: "none",
      }}
    >
      <div style={{ maxWidth: CONTENT_MAX_W, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              marginBottom: 4,
            }}
          >
            {filterLabel}
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            {emptyLabel}
          </p>
        </div>
        {filtered.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {filtered.map((item) => (
              <TeaserCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: 60,
              color: "var(--text-tertiary)",
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <Package size={36} strokeWidth={1.4} />
            <p style={{ fontSize: 13 }}>Nenhum item nesta categoria ainda.</p>
          </div>
        )}
      </div>
    </main>
  );
}

/* ─── App Detail View ─────────────────────────────────────────────────────── */

function AppDetailView({
  app,
  related,
  onSelect,
  onOpen,
  installed,
  pending,
  onInstall,
  onUninstall,
  installedSet,
}: {
  app: CatalogApp;
  related: CatalogApp[];
  onSelect: (app: CatalogApp) => void;
  onOpen: (app: CatalogApp) => void;
  installed: boolean;
  pending: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  installedSet: ReadonlySet<string>;
}) {
  const canOpen =
    app.status !== "coming_soon" &&
    (installed || app.source.type === "weblink");
  const sourceLabel: Record<typeof app.source.type, string> = {
    internal: "App interno do OS",
    iframe: "Iframe embarcado",
    weblink: "Link externo (nova aba)",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          position: "relative",
          padding: 32,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${app.color}24 0%, rgba(15,21,27,0.6) 60%, rgba(6,9,18,0.9) 100%)`,
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -80,
            top: -80,
            width: 340,
            height: 340,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${app.color}38 0%, transparent 65%)`,
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <AppIconBox
            iconName={app.icon}
            color={app.color}
            size={88}
            radius={22}
          />
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                fontFamily: "var(--font-display)",
                lineHeight: 1.1,
              }}
            >
              {app.name}
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                marginTop: 8,
                lineHeight: 1.55,
                maxWidth: 560,
              }}
            >
              {app.description}
            </p>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {installed ? (
                <InstalledBadge />
              ) : (
                <StatusBadge status={app.status as Status} />
              )}
              <MetaChip icon={Layers}>
                {app.type === "standalone" ? "Standalone" : "Módulo"}
              </MetaChip>
              <MetaChip icon={Building2}>
                {sourceLabel[app.source.type]}
              </MetaChip>
              {app.offlineCapable ? (
                <MetaChip icon={Check}>Offline-capable</MetaChip>
              ) : null}
            </div>
            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {canOpen ? (
                <PrimaryButton onClick={() => onOpen(app)} size="lg">
                  <ExternalLink size={14} strokeWidth={2} />
                  Abrir {app.name}
                </PrimaryButton>
              ) : !installed &&
                app.installable &&
                app.status !== "coming_soon" ? null : (
                <DisabledButton>
                  <Clock size={14} strokeWidth={2} />
                  {app.status === "coming_soon"
                    ? "Em breve"
                    : "Instale para abrir"}
                </DisabledButton>
              )}
              {app.installable && app.status !== "coming_soon" ? (
                <InstallButton
                  appId={
                    app.source.type === "internal" ? app.source.target : app.id
                  }
                  installed={installed}
                  pending={pending}
                  onInstall={onInstall}
                  onUninstall={onUninstall}
                  size="lg"
                />
              ) : null}
              {app.externalUrl !== undefined &&
                app.status !== "coming_soon" && (
                  <a
                    href={app.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 18px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      transition: "background 120ms ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background =
                        "rgba(255,255,255,0.11)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background =
                        "rgba(255,255,255,0.06)";
                    }}
                  >
                    Visitar site
                  </a>
                )}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.2fr) minmax(220px, 1fr)",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <SectionLabel>Sobre este app</SectionLabel>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              {app.longDescription}
            </p>
          </div>
          {app.tags.length > 0 && (
            <div>
              <SectionLabel>Tags</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {app.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      padding: "5px 10px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--text-secondary)",
                      borderRadius: 999,
                    }}
                  >
                    <Tag size={9} strokeWidth={2} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <aside style={{ alignSelf: "flex-start" }}>
          <SectionLabel>Informações</SectionLabel>
          <div
            style={{
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            <InfoRow label="Status">
              {installed ? (
                <InstalledBadge />
              ) : (
                <StatusBadge status={app.status as Status} />
              )}
            </InfoRow>
            <InfoRow label="Origem">
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {sourceLabel[app.source.type]}
              </span>
            </InfoRow>
            <InfoRow label="Licença">
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  textAlign: "right",
                }}
              >
                {app.license}
              </span>
            </InfoRow>
            <InfoRow label="Offline">
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {app.offlineCapable ? "Sim" : "Não"}
              </span>
            </InfoRow>
            <InfoRow label="Tipo">
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {app.type === "standalone"
                  ? "App standalone"
                  : "Módulo Camada 1"}
              </span>
            </InfoRow>
            <InfoRow label="Identificador" last={app.externalUrl === undefined}>
              <code
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-secondary)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                {app.id}
              </code>
            </InfoRow>
            {app.externalUrl !== undefined && (
              <InfoRow label="URL" last>
                <a
                  href={app.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    color: "#a5b4fc",
                    textDecoration: "none",
                    wordBreak: "break-all",
                    textAlign: "right",
                  }}
                >
                  {app.externalUrl.replace(/^https?:\/\//, "")}
                </a>
              </InfoRow>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section>
          <SectionLabel>Apps relacionados</SectionLabel>
          <HorizontalCarousel>
            {related.map((r) => (
              <div key={r.id} style={{ scrollSnapAlign: "start" }}>
                <AppCard
                  app={r}
                  onSelect={onSelect}
                  size="md"
                  installed={installedSet.has(r.id)}
                />
              </div>
            ))}
          </HorizontalCarousel>
        </section>
      )}

      {/* Sprint 23 MX128: secao de permissoes (so aparece se installed=true) */}
      <PermissionsSection appId={app.id} installed={installed} />
    </div>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */

export function MagicStoreApp() {
  const [activePage, setActivePage] = useState<ActivePage>(null);
  const [sidebarFilter, setSidebarFilter] = useState("all");
  const [selectedApp, setSelectedApp] = useState<CatalogApp | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sprint 21 MX115: catalogo agora vem do banco via appRegistryStore.
  const catalog = useMagicStoreCatalog();

  // Sprint 16 MX80: store global em vez de hook local — install/uninstall
  // refletem em tempo real no Dock/Mesa/Launcher.
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const activeCompanyId = useSessionStore((s) => s.activeCompanyId);
  const installed = useInstalledModulesStore((s) => s.installed);
  const pending = useInstalledModulesStore((s) => s.pending);
  const installError = useInstalledModulesStore((s) => s.error);
  const installModule = useInstalledModulesStore((s) => s.installModule);
  const uninstallModule = useInstalledModulesStore((s) => s.uninstallModule);
  const grantScopes = useInstalledModulesStore((s) => s.grantScopes);

  // Sprint 23 MX125: state do modal de consentimento.
  const [consentApp, setConsentApp] = useState<{
    id: string;
    name: string;
    icon?: string;
    color?: string;
    scopes: readonly string[];
  } | null>(null);

  const installCore = useCallback(
    async (moduleId: string, scopesToGrant: readonly string[]) => {
      if (drivers === null || activeCompanyId === null || userId === null)
        return;
      await installModule(drivers, activeCompanyId, moduleId);
      const nowInstalled = useInstalledModulesStore
        .getState()
        .installed.has(moduleId);
      if (!nowInstalled) return;
      // Sprint 23: grava grants para os scopes aceitos.
      if (scopesToGrant.length > 0) {
        await grantScopes(
          drivers,
          activeCompanyId,
          userId,
          moduleId,
          scopesToGrant,
        );
      }
      void drivers.scp.publishEvent(
        "platform.module.installed",
        {
          company_id: activeCompanyId,
          module: moduleId,
          installed_by: userId,
        },
        { actor: { type: "human", user_id: userId } },
      );
    },
    [drivers, activeCompanyId, userId, installModule, grantScopes],
  );

  const install = useCallback(
    async (moduleId: string) => {
      if (drivers === null || activeCompanyId === null || userId === null)
        return;
      // Sprint 23 MX125: consulta scopes declarados em app_registry.
      const entry = useAppRegistryStore.getState().apps.get(moduleId);
      const declared = entry?.permissions ?? [];
      const sensitives = declared.filter((s) => isSensitiveScope(s));

      if (sensitives.length === 0) {
        // Sem scopes sensitive: install + auto-grant todos os declarados.
        await installCore(moduleId, declared);
        return;
      }

      // Tem scopes sensitive: pede consentimento.
      setConsentApp({
        id: moduleId,
        name: entry?.name ?? moduleId,
        ...(entry?.icon !== undefined && { icon: entry.icon }),
        ...(entry?.color !== undefined && { color: entry.color }),
        scopes: declared,
      });
    },
    [drivers, activeCompanyId, userId, installCore],
  );

  const handleConsentAccept = useCallback(async () => {
    if (consentApp === null) return;
    const target = consentApp;
    setConsentApp(null);
    await installCore(target.id, target.scopes);
  }, [consentApp, installCore]);

  const handleConsentCancel = useCallback(() => {
    setConsentApp(null);
  }, []);

  const uninstall = useCallback(
    async (moduleId: string) => {
      if (drivers === null || activeCompanyId === null || userId === null)
        return;
      if (isProtectedModule(moduleId)) return;
      await uninstallModule(drivers, activeCompanyId, moduleId);
      const stillInstalled = useInstalledModulesStore
        .getState()
        .installed.has(moduleId);
      if (!stillInstalled) {
        void drivers.scp.publishEvent(
          "platform.module.uninstalled",
          {
            company_id: activeCompanyId,
            module: moduleId,
            uninstalled_by: userId,
          },
          { actor: { type: "human", user_id: userId } },
        );
      }
    },
    [drivers, activeCompanyId, userId, uninstallModule],
  );

  const openApp = useOSStore((s) => s.openApp);

  const related = useMemo(() => {
    if (selectedApp === null) return [];
    return catalog
      .filter(
        (a) =>
          a.id !== selectedApp.id &&
          (a.category === selectedApp.category ||
            a.tags.some((t) => selectedApp.tags.includes(t))),
      )
      .slice(0, 6);
  }, [selectedApp, catalog]);

  function handleOpen(app: CatalogApp) {
    const src = app.source;
    if (src.type === "internal") {
      const registered = getApp(src.target);
      if (registered !== undefined) {
        // Sprint 16 MX80: abre como tab (osStore.openApp), nao como window
        openApp(registered.id, registered.name);
      }
      return;
    }
    if (src.type === "weblink" || src.type === "iframe") {
      window.open(src.target, "_blank", "noopener,noreferrer");
      return;
    }
  }

  function handleInstall(id: string) {
    void install(id);
  }

  function handleUninstall(id: string) {
    void uninstall(id);
  }

  function handleTabChange(tab: NavTab) {
    setActivePage((prev) => (prev === tab ? null : tab));
    setSelectedApp(null);
    setSidebarFilter("all");
  }

  function handleLogoClick() {
    setActivePage(null);
    setSelectedApp(null);
    setSidebarFilter("all");
  }

  function handleFilter(id: string) {
    setSidebarFilter(id);
  }

  function handleNavigate(tab: NavTab) {
    setActivePage(tab);
    setSelectedApp(null);
    setSidebarFilter("all");
  }

  const showFullWidthContent = selectedApp !== null || activePage === null;

  function renderTabMainContent() {
    if (activePage === "apps") {
      return (
        <AppsTabPage
          catalog={catalog}
          sidebarFilter={sidebarFilter}
          onFilter={handleFilter}
          onSelect={setSelectedApp}
          installed={installed}
        />
      );
    }
    if (activePage === "plugins") {
      return (
        <TeaserTabPage
          tab="plugins"
          items={PLUGINS_TEASER}
          sidebarFilter={sidebarFilter}
          onFilter={handleFilter}
          title="Todos os plugins"
          emptyLabel="Plugins em desenvolvimento — disponíveis em breve."
        />
      );
    }
    if (activePage === "widgets") {
      return (
        <TeaserTabPage
          tab="widgets"
          items={WIDGETS_TEASER}
          sidebarFilter={sidebarFilter}
          onFilter={handleFilter}
          title="Todos os widgets"
          emptyLabel="Widgets para Mesa de trabalho — disponíveis em breve."
        />
      );
    }
    if (activePage === "integracoes") {
      return (
        <TeaserTabPage
          tab="integracoes"
          items={INTEGRACOES_TEASER}
          sidebarFilter={sidebarFilter}
          onFilter={handleFilter}
          title="Todas as integrações"
          emptyLabel="Integrações B2B — disponíveis em breve."
        />
      );
    }
    if (activePage === "distros") {
      return (
        <TeaserTabPage
          tab="distros"
          items={DISTROS_TEASER}
          sidebarFilter={sidebarFilter}
          onFilter={handleFilter}
          title="Todas as Distros"
          emptyLabel="Distribuições verticais do Aethereos OS — disponíveis em breve."
        />
      );
    }
    return null;
  }

  return (
    <div
      data-ae="magic-store-app"
      data-testid="magic-store-app"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "var(--bg-elevated)",
      }}
    >
      <StoreHeader
        activePage={activePage}
        onTabChange={handleTabChange}
        onLogoClick={handleLogoClick}
      />

      {showFullWidthContent ? (
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "32px 32px 160px",
            scrollbarWidth: "none",
          }}
        >
          <div style={{ maxWidth: CONTENT_MAX_W, margin: "0 auto" }}>
            {selectedApp !== null ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    marginLeft: -10,
                    marginBottom: 16,
                    background: "transparent",
                    border: "none",
                    borderRadius: 8,
                    color: "var(--text-tertiary)",
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "background 120ms ease, color 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-tertiary)";
                  }}
                >
                  <ArrowLeft size={13} strokeWidth={2} />
                  Voltar
                </button>
                <AppDetailView
                  app={selectedApp}
                  related={related}
                  onSelect={setSelectedApp}
                  onOpen={handleOpen}
                  installed={installed.has(selectedApp.id)}
                  pending={pending.has(selectedApp.id)}
                  onInstall={() => handleInstall(selectedApp.id)}
                  onUninstall={() => handleUninstall(selectedApp.id)}
                  installedSet={installed}
                />
              </>
            ) : (
              <StoreFrontPage
                catalog={catalog}
                onSelect={setSelectedApp}
                onOpen={handleOpen}
                onNavigate={handleNavigate}
                installed={installed}
                pending={pending}
                onInstall={handleInstall}
                onUninstall={handleUninstall}
              />
            )}
            {installError !== null ? (
              <div
                style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.28)",
                  borderRadius: 10,
                  color: "#fca5a5",
                  fontSize: 12,
                }}
              >
                {installError}
              </div>
            ) : null}
          </div>
        </main>
      ) : (
        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Sidebar wrapper — animated width */}
          <div
            style={{
              width: sidebarCollapsed ? STORE_SIDEBAR_ICON_W : STORE_SIDEBAR_W,
              flexShrink: 0,
              overflow: "hidden",
              transition: "width 250ms ease",
            }}
          >
            <TabSidebar
              tab={activePage as NavTab}
              activeFilter={sidebarFilter}
              onFilter={handleFilter}
              collapsed={sidebarCollapsed}
            />
          </div>

          {/* Collapse/expand toggle */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={
              sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"
            }
            style={{
              position: "absolute",
              left:
                (sidebarCollapsed ? STORE_SIDEBAR_ICON_W : STORE_SIDEBAR_W) -
                14,
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
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(15,21,27,0.95)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.8} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.8} />
            )}
          </button>

          {/* Tab main content */}
          {renderTabMainContent()}
        </div>
      )}

      {consentApp !== null && (
        <PermissionConsentModal
          open={true}
          appName={consentApp.name}
          appIcon={consentApp.icon ?? null}
          appColor={consentApp.color ?? null}
          scopes={consentApp.scopes}
          onAccept={handleConsentAccept}
          onCancel={handleConsentCancel}
        />
      )}
    </div>
  );
}
