import { useState, useMemo, useRef } from "react";
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
  Boxes,
  FlaskConical,
  Clock,
  Search,
  Tag,
  Layers,
  Package,
  ArrowLeft,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  MAGIC_STORE_CATALOG,
  type MagicStoreApp as CatalogApp,
} from "../../data/magic-store-catalog";

/* ─── Constants ────────────────────────────────────────────────────────────── */

const SIDEBAR_W = 239;
const SIDEBAR_ICON_W = 48;
const CONTENT_MAX_W = 1095;

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
};

type Status = "available" | "beta" | "coming_soon";

const STATUS_LABELS: Record<Status, string> = {
  available: "Disponível",
  beta: "Beta",
  coming_soon: "Em breve",
};

const STATUS_TONES: Record<Status, { fg: string; bg: string; border: string }> =
  {
    available: {
      fg: "#34d399",
      bg: "rgba(16,185,129,0.14)",
      border: "rgba(16,185,129,0.28)",
    },
    beta: {
      fg: "#fbbf24",
      bg: "rgba(245,158,11,0.14)",
      border: "rgba(245,158,11,0.28)",
    },
    coming_soon: {
      fg: "var(--text-tertiary)",
      bg: "rgba(255,255,255,0.06)",
      border: "rgba(255,255,255,0.10)",
    },
  };

type CategoryView =
  | "featured"
  | "vertical"
  | "optional"
  | "beta"
  | "coming_soon";

interface NavItem {
  id: CategoryView;
  label: string;
  icon: typeof Sparkles;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Descobrir",
    items: [{ id: "featured", label: "Em destaque", icon: Sparkles }],
  },
  {
    label: "Categorias",
    items: [
      { id: "vertical", label: "Verticais B2B", icon: Building2 },
      { id: "optional", label: "Opcionais", icon: Boxes },
    ],
  },
  {
    label: "Status",
    items: [
      { id: "beta", label: "Beta", icon: FlaskConical },
      { id: "coming_soon", label: "Em breve", icon: Clock },
    ],
  },
];

const CATEGORY_HEADERS: Record<
  CategoryView,
  {
    title: string;
    subtitle: string;
    icon: typeof Sparkles;
    color: string;
    iconBg: string;
  }
> = {
  featured: {
    title: "Em destaque",
    subtitle: "Apps recomendados para o seu workspace",
    icon: Sparkles,
    color: "#818cf8",
    iconBg: "rgba(99,102,241,0.22)",
  },
  vertical: {
    title: "Verticais B2B",
    subtitle: "Soluções verticais standalone do ecossistema Aethereos",
    icon: Building2,
    color: "#22d3ee",
    iconBg: "rgba(6,182,212,0.22)",
  },
  optional: {
    title: "Opcionais",
    subtitle: "Módulos que ampliam recursos do seu OS",
    icon: Boxes,
    color: "#a78bfa",
    iconBg: "rgba(139,92,246,0.22)",
  },
  beta: {
    title: "Em Beta",
    subtitle: "Apps em validação — uso limitado, feedback bem-vindo",
    icon: FlaskConical,
    color: "#fbbf24",
    iconBg: "rgba(245,158,11,0.22)",
  },
  coming_soon: {
    title: "Em breve",
    subtitle: "Próximos lançamentos do roadmap Aethereos",
    icon: Clock,
    color: "#94a3b8",
    iconBg: "rgba(100,116,139,0.22)",
  },
};

/* ─── Sidebar shared style (idêntico ao Configurações) ───────────────────── */

const ASIDE_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  background: "rgba(15,21,27,0.82)",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
};

/* ─── Design primitives (espelho do Configurações) ───────────────────────── */

function ContentHeader({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  icon: typeof Sparkles;
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

function StatusBadge({ status }: { status: Status }) {
  const tone = STATUS_TONES[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.border}`,
      }}
    >
      {status === "available" && <Check size={10} strokeWidth={2.5} />}
      {STATUS_LABELS[status]}
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
  const padding = size === "lg" ? "10px 22px" : "8px 20px";
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
        padding,
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
  const padding = size === "lg" ? "10px 18px" : "6px 14px";
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
        padding,
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

/* ─── App icon box (squircle macOS-style) ────────────────────────────────── */

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

/* ─── Sidebar (mesmo padrão exato do Configurações) ─────────────────────── */

function MagicStoreSidebar({
  active,
  onSelect,
  collapsed,
  searchQuery,
  onSearch,
}: {
  active: CategoryView;
  onSelect: (id: CategoryView) => void;
  collapsed: boolean;
  searchQuery: string;
  onSearch: (q: string) => void;
}) {
  const filtered = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  })).filter((section) => section.items.length > 0);

  if (collapsed) {
    const allItems = NAV_SECTIONS.flatMap((s) => s.items);
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
                <Icon
                  size={16}
                  style={{ color: "currentColor", flexShrink: 0 }}
                  strokeWidth={1.8}
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
      {/* App identity — clica e vai para "featured" */}
      <button
        type="button"
        onClick={() => onSelect("featured")}
        aria-label="Magic Store"
        aria-current={active === "featured" ? "page" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 14px 12px",
          background:
            active === "featured" ? "rgba(255,255,255,0.04)" : "transparent",
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
          if (active !== "featured")
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        }}
        onMouseLeave={(e) => {
          if (active !== "featured")
            e.currentTarget.style.background = "transparent";
        }}
      >
        <Store
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
          Magic Store
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
            name="ae-store-search"
            placeholder="Buscar apps…"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
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
              const Icon = item.icon;
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
                  <Icon
                    size={15}
                    style={{ color: "currentColor", flexShrink: 0 }}
                    strokeWidth={1.8}
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
            Nenhum resultado para "{searchQuery}"
          </p>
        )}
      </nav>
    </aside>
  );
}

/* ─── Cards ───────────────────────────────────────────────────────────────── */

function FeaturedHero({
  app,
  onOpen,
  onSelect,
}: {
  app: CatalogApp;
  onOpen: (a: CatalogApp) => void;
  onSelect: (a: CatalogApp) => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        padding: 28,
        overflow: "hidden",
        background: `linear-gradient(125deg, ${app.color}26 0%, rgba(15,21,27,0.55) 60%, rgba(6,9,18,0.85) 100%), var(--bg-base)`,
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow:
          "0 16px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -80,
          top: -80,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${app.color}38 0%, transparent 70%)`,
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: 620,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={12} style={{ color: app.color }} strokeWidth={2} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: app.color,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            App em destaque
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <AppIconBox
            iconName={app.icon}
            color={app.color}
            size={72}
            radius={20}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
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
            <div style={{ marginTop: 6 }}>
              <StatusBadge status={app.status as Status} />
            </div>
          </div>
        </div>

        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.55,
          }}
        >
          {app.longDescription}
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          {app.status !== "coming_soon" && app.externalUrl !== undefined && (
            <PrimaryButton onClick={() => onOpen(app)} size="lg">
              <ExternalLink size={14} strokeWidth={2} />
              Abrir {app.name}
            </PrimaryButton>
          )}
          <SecondaryButton onClick={() => onSelect(app)} size="lg">
            Ver detalhes
            <ChevronRight size={14} strokeWidth={2} />
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

function AppCard({
  app,
  onSelect,
  size = "md",
}: {
  app: CatalogApp;
  onSelect: (app: CatalogApp) => void;
  size?: "sm" | "md" | "lg";
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
        borderRadius: 14,
        textAlign: "left",
        cursor: "pointer",
        transition:
          "background 200ms ease, border-color 200ms ease, transform 200ms ease",
        opacity: muted ? 0.78 : 1,
        height: "100%",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
        e.currentTarget.style.transform = "translateY(-1px)";
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
          gap: 12,
        }}
      >
        <AppIconBox
          iconName={app.icon}
          color={app.color}
          size={iconSize}
          radius={iconRadius}
        />
        <StatusBadge status={app.status as Status} />
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
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          marginTop: "auto",
        }}
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

function CompactRow({
  app,
  onSelect,
  last,
}: {
  app: CatalogApp;
  onSelect: (app: CatalogApp) => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(app)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "11px 16px",
        background: "transparent",
        border: "none",
        borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
        textAlign: "left",
        cursor: "pointer",
        transition: "background 160ms ease",
        width: "100%",
        minHeight: 64,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <AppIconBox iconName={app.icon} color={app.color} size={40} radius={10} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {app.name}
          </span>
          <StatusBadge status={app.status as Status} />
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginTop: 2,
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {app.description}
        </p>
      </div>
      <ChevronRight
        size={14}
        style={{ color: "var(--text-tertiary)" }}
        strokeWidth={1.8}
      />
    </button>
  );
}

/* ─── Horizontal carousel ─────────────────────────────────────────────────── */

function HorizontalCarousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(dir: -1 | 1) {
    if (ref.current === null) return;
    const w = ref.current.clientWidth;
    ref.current.scrollBy({ left: w * 0.85 * dir, behavior: "smooth" });
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={ref}
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: "minmax(260px, 1fr)",
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
        transition:
          "background 120ms ease, border-color 120ms ease, color 120ms ease",
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

/* ─── Browse views ────────────────────────────────────────────────────────── */

function FeaturedView({
  catalog,
  onSelect,
  onOpen,
}: {
  catalog: CatalogApp[];
  onSelect: (app: CatalogApp) => void;
  onOpen: (app: CatalogApp) => void;
}) {
  const heroApp = useMemo(
    () =>
      catalog.find((a) => a.status === "beta") ??
      catalog.find((a) => a.status === "available") ??
      catalog[0],
    [catalog],
  );
  const verticals = catalog.filter((a) => a.category === "vertical");
  const comingSoon = catalog.filter((a) => a.status === "coming_soon");
  const available = catalog.filter(
    (a) => a.status === "available" || a.status === "beta",
  );

  if (heroApp === undefined) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <FeaturedHero app={heroApp} onOpen={onOpen} onSelect={onSelect} />

      {available.length > 0 && (
        <div>
          <SectionLabel>Disponíveis agora</SectionLabel>
          <HorizontalCarousel>
            {available.map((app) => (
              <div key={app.id} style={{ scrollSnapAlign: "start" }}>
                <AppCard app={app} onSelect={onSelect} size="md" />
              </div>
            ))}
          </HorizontalCarousel>
        </div>
      )}

      <div>
        <SectionLabel>Verticais B2B</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {verticals.map((app) => (
            <AppCard key={app.id} app={app} onSelect={onSelect} size="md" />
          ))}
        </div>
      </div>

      {comingSoon.length > 0 && (
        <div>
          <SectionLabel>Em breve</SectionLabel>
          <div
            style={{
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            {comingSoon.map((app, idx) => (
              <CompactRow
                key={app.id}
                app={app}
                onSelect={onSelect}
                last={idx === comingSoon.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryPage({
  category,
  apps,
  onSelect,
}: {
  category: CategoryView;
  apps: CatalogApp[];
  onSelect: (app: CatalogApp) => void;
}) {
  const meta = CATEGORY_HEADERS[category];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={meta.icon}
        iconBg={meta.iconBg}
        iconColor={meta.color}
        title={meta.title}
        subtitle={meta.subtitle}
      />

      <div>
        <SectionLabel>
          {apps.length} {apps.length === 1 ? "app" : "apps"}
        </SectionLabel>
        {apps.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: 60,
              color: "var(--text-tertiary)",
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <Package size={40} strokeWidth={1.4} />
            <p style={{ fontSize: 13 }}>Nenhum app nesta categoria ainda.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {apps.map((app) => (
              <AppCard key={app.id} app={app} onSelect={onSelect} size="md" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResults({
  query,
  results,
  onSelect,
}: {
  query: string;
  results: CatalogApp[];
  onSelect: (app: CatalogApp) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ContentHeader
        icon={Search}
        iconBg="rgba(99,102,241,0.22)"
        iconColor="#818cf8"
        title={`Resultados para "${query}"`}
        subtitle={`${results.length} ${results.length === 1 ? "app encontrado" : "apps encontrados"}`}
      />
      {results.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: 60,
            color: "var(--text-tertiary)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Search size={40} strokeWidth={1.4} />
          <p style={{ fontSize: 13 }}>Nenhum resultado. Tente outra busca.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {results.map((app) => (
            <AppCard key={app.id} app={app} onSelect={onSelect} size="md" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── App detail ──────────────────────────────────────────────────────────── */

function AppDetailView({
  app,
  related,
  onSelect,
  onOpen,
}: {
  app: CatalogApp;
  related: CatalogApp[];
  onSelect: (app: CatalogApp) => void;
  onOpen: (app: CatalogApp) => void;
}) {
  const canOpen =
    app.status !== "coming_soon" &&
    app.type === "standalone" &&
    app.externalUrl !== undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Hero — segue padrão visual do FeaturedHero, mais alto */}
      <div
        style={{
          position: "relative",
          padding: 28,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${app.color}26 0%, rgba(15,21,27,0.55) 60%, rgba(6,9,18,0.85) 100%), var(--bg-base)`,
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
          boxShadow:
            "0 16px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -100,
            top: -100,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${app.color}38 0%, transparent 70%)`,
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            gap: 22,
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
                maxWidth: 580,
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
              <StatusBadge status={app.status as Status} />
              <MetaChip icon={Layers}>
                {app.type === "standalone" ? "Standalone" : "Módulo"}
              </MetaChip>
              <MetaChip icon={Building2}>
                {app.category === "vertical" ? "Vertical B2B" : "Opcional"}
              </MetaChip>
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
              ) : (
                <DisabledButton>
                  <Clock size={14} strokeWidth={2} />
                  Em breve
                </DisabledButton>
              )}
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
                      cursor: "pointer",
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

      {/* Body: 2 colunas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.2fr) minmax(220px, 1fr)",
          gap: 24,
        }}
      >
        {/* Main */}
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

        {/* Aside info — usa SettingGroup-style */}
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
              <StatusBadge status={app.status as Status} />
            </InfoRow>
            <InfoRow label="Categoria">
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {app.category === "vertical" ? "Vertical B2B" : "Opcional"}
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
        <div>
          <SectionLabel>Apps relacionados</SectionLabel>
          <HorizontalCarousel>
            {related.map((r) => (
              <div key={r.id} style={{ scrollSnapAlign: "start" }}>
                <AppCard app={r} onSelect={onSelect} size="md" />
              </div>
            ))}
          </HorizontalCarousel>
        </div>
      )}
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
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */

export function MagicStoreApp() {
  const [category, setCategory] = useState<CategoryView>("featured");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<CatalogApp | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const filteredByCategory = useMemo(() => {
    if (category === "vertical")
      return MAGIC_STORE_CATALOG.filter((a) => a.category === "vertical");
    if (category === "optional")
      return MAGIC_STORE_CATALOG.filter((a) => a.category === "optional");
    if (category === "beta")
      return MAGIC_STORE_CATALOG.filter((a) => a.status === "beta");
    if (category === "coming_soon")
      return MAGIC_STORE_CATALOG.filter((a) => a.status === "coming_soon");
    return MAGIC_STORE_CATALOG;
  }, [category]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q === "") return [];
    return MAGIC_STORE_CATALOG.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const related = useMemo(() => {
    if (selectedApp === null) return [];
    return MAGIC_STORE_CATALOG.filter(
      (a) =>
        a.id !== selectedApp.id &&
        (a.category === selectedApp.category ||
          a.tags.some((t) => selectedApp.tags.includes(t))),
    ).slice(0, 6);
  }, [selectedApp]);

  function handleOpen(app: CatalogApp) {
    if (app.type === "standalone" && app.externalUrl !== undefined) {
      window.open(app.externalUrl, "_blank", "noopener,noreferrer");
    }
  }

  function handleSelectCategory(id: CategoryView) {
    setCategory(id);
    setSelectedApp(null);
    setSearchQuery("");
  }

  function handleSearch(q: string) {
    setSearchQuery(q);
    setSelectedApp(null);
  }

  const isFeatured = category === "featured" && searchQuery.trim() === "";
  const isSearching = searchQuery.trim() !== "";

  // Breadcrumb label da página atual
  const currentLabel = (() => {
    if (selectedApp !== null) return selectedApp.name;
    if (isSearching) return `Busca: "${searchQuery.trim()}"`;
    if (isFeatured) return null;
    return CATEGORY_HEADERS[category].title;
  })();

  return (
    <div
      data-ae="magic-store-app"
      data-testid="magic-store-app"
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
        <MagicStoreSidebar
          active={category}
          onSelect={handleSelectCategory}
          collapsed={collapsed}
          searchQuery={searchQuery}
          onSearch={handleSearch}
        />
      </div>

      {/* Collapse/expand toggle (idêntico ao Configurações) */}
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
        <div style={{ maxWidth: CONTENT_MAX_W, margin: "0 auto" }}>
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
              onClick={() => {
                setCategory("featured");
                setSelectedApp(null);
                setSearchQuery("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: 0,
                background: "transparent",
                border: "none",
                cursor: isFeatured ? "default" : "pointer",
                color: "var(--text-tertiary)",
                transition: "color 120ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isFeatured)
                  e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                if (!isFeatured)
                  e.currentTarget.style.color = "var(--text-tertiary)";
              }}
              disabled={isFeatured}
              aria-current={isFeatured ? "page" : undefined}
            >
              <Store
                size={13}
                style={{ color: "currentColor", flexShrink: 0 }}
                strokeWidth={1.6}
              />
              <span style={{ fontSize: 12, color: "currentColor" }}>
                Magic Store
              </span>
            </button>
            {selectedApp !== null && (
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
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: 0,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-tertiary)",
                    fontSize: 12,
                    transition: "color 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                  }}
                >
                  {CATEGORY_HEADERS[category].title}
                </button>
              </>
            )}
            {currentLabel !== null && (
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
                  {currentLabel}
                </span>
              </>
            )}
          </nav>

          {selectedApp !== null ? (
            <>
              {/* Voltar inline acima do hero */}
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  marginLeft: -10,
                  marginBottom: 14,
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
              />
            </>
          ) : isSearching ? (
            <SearchResults
              query={searchQuery.trim()}
              results={searchResults}
              onSelect={setSelectedApp}
            />
          ) : isFeatured ? (
            <FeaturedView
              catalog={MAGIC_STORE_CATALOG}
              onSelect={setSelectedApp}
              onOpen={handleOpen}
            />
          ) : (
            <CategoryPage
              category={category}
              apps={filteredByCategory}
              onSelect={setSelectedApp}
            />
          )}
        </div>
      </main>
    </div>
  );
}
