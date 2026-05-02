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
} from "lucide-react";
import { AppShell } from "@aethereos/ui-shell";
import {
  MAGIC_STORE_CATALOG,
  type MagicStoreApp as CatalogApp,
} from "../../data/magic-store-catalog";

/* ─── Constants ────────────────────────────────────────────────────────────── */

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
  { title: string; subtitle: string; icon: typeof Sparkles; color: string }
> = {
  featured: {
    title: "Em destaque",
    subtitle: "Apps recomendados para o seu workspace",
    icon: Sparkles,
    color: "#818cf8",
  },
  vertical: {
    title: "Verticais B2B",
    subtitle: "Soluções verticais standalone do ecossistema Aethereos",
    icon: Building2,
    color: "#22d3ee",
  },
  optional: {
    title: "Opcionais",
    subtitle: "Módulos que ampliam recursos do seu OS",
    icon: Boxes,
    color: "#a78bfa",
  },
  beta: {
    title: "Em Beta",
    subtitle: "Apps em validação — uso limitado, feedback bem-vindo",
    icon: FlaskConical,
    color: "#fbbf24",
  },
  coming_soon: {
    title: "Em breve",
    subtitle: "Próximos lançamentos do roadmap Aethereos",
    icon: Clock,
    color: "#94a3b8",
  },
};

/* ─── Primitives ──────────────────────────────────────────────────────────── */

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

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 14,
      }}
    >
      <div>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            fontFamily: "var(--font-display)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
        {subtitle !== undefined && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginTop: 3,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action !== undefined && action}
    </div>
  );
}

/* ─── Sidebar ─────────────────────────────────────────────────────────────── */

function MagicStoreSidebar({
  active,
  onSelect,
  searchQuery,
  onSearch,
}: {
  active: CategoryView;
  onSelect: (id: CategoryView) => void;
  searchQuery: string;
  onSearch: (q: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Search */}
      <div
        style={{
          padding: "14px 12px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 10,
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
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "7px 11px 7px 30px",
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

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 8px 16px", overflowY: "auto" }}>
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.label} style={{ marginTop: idx === 0 ? 0 : 12 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                padding: "8px 8px 4px",
              }}
            >
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id && searchQuery === "";
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
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: isActive
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "1px solid transparent",
                    background: isActive
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                    color: isActive
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                    transition:
                      "background 120ms ease, color 120ms ease, border-color 120ms ease",
                    marginBottom: 1,
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
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "10px 14px 14px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <a
          href="https://aethereos.io/marketplace"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--text-tertiary)",
            textDecoration: "none",
            transition: "color 120ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color =
              "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color =
              "var(--text-tertiary)";
          }}
        >
          Marketplace completo
          <ExternalLink size={10} strokeWidth={2} />
        </a>
      </div>
    </div>
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
      {/* Decorative blur */}
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
            <button
              type="button"
              onClick={() => onOpen(app)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                background: "#6366f1",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
                transition: "background 120ms ease, transform 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#4f46e5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#6366f1";
              }}
            >
              <ExternalLink size={14} strokeWidth={2} />
              Abrir {app.name}
            </button>
          )}
          <button
            type="button"
            onClick={() => onSelect(app)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              cursor: "pointer",
              transition: "background 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.14)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }}
          >
            Ver detalhes
            <ChevronRight size={14} strokeWidth={2} />
          </button>
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
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        textAlign: "left",
        cursor: "pointer",
        transition:
          "background 200ms ease, border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease",
        opacity: muted ? 0.78 : 1,
        height: "100%",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
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
}: {
  app: CatalogApp;
  onSelect: (app: CatalogApp) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(app)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        textAlign: "left",
        cursor: "pointer",
        transition: "background 160ms ease",
        width: "100%",
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
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

/* ─── Horizontal scroll carousel ──────────────────────────────────────────── */

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
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Anterior"
        style={{
          position: "absolute",
          left: -14,
          top: "50%",
          transform: "translateY(-50%)",
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(15,21,27,0.95)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-primary)",
          cursor: "pointer",
          boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
          opacity: 0.85,
          transition: "opacity 120ms ease, background 120ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.85";
        }}
      >
        <ChevronLeft size={14} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Próximo"
        style={{
          position: "absolute",
          right: -14,
          top: "50%",
          transform: "translateY(-50%)",
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(15,21,27,0.95)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-primary)",
          cursor: "pointer",
          boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
          opacity: 0.85,
          transition: "opacity 120ms ease, background 120ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.85";
        }}
      >
        <ChevronRight size={14} strokeWidth={2} />
      </button>
    </div>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
      <FeaturedHero app={heroApp} onOpen={onOpen} onSelect={onSelect} />

      {available.length > 0 && (
        <section>
          <SectionHeader
            title="Disponíveis agora"
            subtitle="Apps prontos para uso ou em fase Beta"
          />
          <HorizontalCarousel>
            {available.map((app) => (
              <div key={app.id} style={{ scrollSnapAlign: "start" }}>
                <AppCard app={app} onSelect={onSelect} size="md" />
              </div>
            ))}
          </HorizontalCarousel>
        </section>
      )}

      <section>
        <SectionHeader
          title="Verticais B2B"
          subtitle="Soluções standalone do ecossistema Aethereos"
        />
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
      </section>

      {comingSoon.length > 0 && (
        <section>
          <SectionHeader
            title="Em breve"
            subtitle="Próximos lançamentos do roadmap"
          />
          <div
            style={{
              borderRadius: 14,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            {comingSoon.map((app, idx) => (
              <div
                key={app.id}
                style={{
                  borderBottom:
                    idx === comingSoon.length - 1
                      ? "none"
                      : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <CompactRow app={app} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CategoryView({
  category,
  apps,
  onSelect,
}: {
  category: CategoryView;
  apps: CatalogApp[];
  onSelect: (app: CatalogApp) => void;
}) {
  const meta = CATEGORY_HEADERS[category];
  const HeaderIcon = meta.icon;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          paddingBottom: 16,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: `${meta.color}20`,
            border: `1px solid ${meta.color}38`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <HeaderIcon
            size={26}
            strokeWidth={1.6}
            style={{ color: meta.color }}
          />
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
            {meta.title}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginTop: 4,
            }}
          >
            {meta.subtitle}
          </p>
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          {apps.length} {apps.length === 1 ? "app" : "apps"}
        </div>
      </div>

      {apps.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: 60,
            color: "var(--text-tertiary)",
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
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            fontFamily: "var(--font-display)",
            lineHeight: 1.15,
          }}
        >
          Resultados para "{query}"
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginTop: 4,
          }}
        >
          {results.length}{" "}
          {results.length === 1 ? "app encontrado" : "apps encontrados"}
        </p>
      </div>
      {results.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: 60,
            color: "var(--text-tertiary)",
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

/* ─── Detail view ─────────────────────────────────────────────────────────── */

function AppDetailView({
  app,
  related,
  onBack,
  onSelect,
  onOpen,
}: {
  app: CatalogApp;
  related: CatalogApp[];
  onBack: () => void;
  onSelect: (app: CatalogApp) => void;
  onOpen: (app: CatalogApp) => void;
}) {
  const canOpen =
    app.status !== "coming_soon" &&
    app.type === "standalone" &&
    app.externalUrl !== undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          marginLeft: -10,
          background: "transparent",
          border: "none",
          borderRadius: 8,
          color: "var(--text-tertiary)",
          fontSize: 12,
          cursor: "pointer",
          alignSelf: "flex-start",
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

      {/* Hero */}
      <div
        style={{
          position: "relative",
          padding: 28,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${app.color}1f 0%, rgba(15,21,27,0.55) 70%, rgba(6,9,18,0.85) 100%)`,
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
          boxShadow:
            "0 12px 36px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.05)",
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
            background: `radial-gradient(circle, ${app.color}30 0%, transparent 70%)`,
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
                fontSize: 30,
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
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                <Layers size={11} strokeWidth={1.8} />
                {app.type === "standalone" ? "Standalone" : "Módulo"}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                <Building2 size={11} strokeWidth={1.8} />
                {app.category === "vertical" ? "Vertical B2B" : "Opcional"}
              </span>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              {canOpen ? (
                <button
                  type="button"
                  onClick={() => onOpen(app)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 22px",
                    background: "#6366f1",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#ffffff",
                    cursor: "pointer",
                    transition: "background 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#4f46e5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#6366f1";
                  }}
                >
                  <ExternalLink size={14} strokeWidth={2} />
                  Abrir {app.name}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 22px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    cursor: "not-allowed",
                  }}
                >
                  <Clock size={14} strokeWidth={2} />
                  Em breve
                </button>
              )}
              {app.externalUrl !== undefined &&
                app.status !== "coming_soon" && (
                  <a
                    href={app.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 18px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 10,
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

      {/* Body: 2 columns (main + side) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.2fr) minmax(220px, 1fr)",
          gap: 28,
        }}
      >
        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <section>
            <SectionHeader title="Sobre este app" />
            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              {app.longDescription}
            </p>
          </section>

          {app.tags.length > 0 && (
            <section>
              <SectionHeader title="Tags" />
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
            </section>
          )}
        </div>

        {/* Side info */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            padding: 18,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14,
            alignSelf: "flex-start",
          }}
        >
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Informações
          </h3>
          <InfoRow label="Status" value={STATUS_LABELS[app.status as Status]} />
          <InfoRow
            label="Categoria"
            value={app.category === "vertical" ? "Vertical B2B" : "Opcional"}
          />
          <InfoRow
            label="Tipo"
            value={
              app.type === "standalone" ? "App standalone" : "Módulo Camada 1"
            }
          />
          <InfoRow label="Identificador" value={app.id} mono />
          {app.externalUrl !== undefined && (
            <InfoRow
              label="URL"
              value={
                <a
                  href={app.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    color: "#a5b4fc",
                    textDecoration: "none",
                    wordBreak: "break-all",
                  }}
                >
                  {app.externalUrl.replace(/^https?:\/\//, "")}
                </a>
              }
            />
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section>
          <SectionHeader
            title="Apps relacionados"
            subtitle="Outros apps que podem te interessar"
          />
          <HorizontalCarousel>
            {related.map((r) => (
              <div key={r.id} style={{ scrollSnapAlign: "start" }}>
                <AppCard app={r} onSelect={onSelect} size="md" />
              </div>
            ))}
          </HorizontalCarousel>
        </section>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          color: "var(--text-primary)",
          fontFamily: mono === true ? "var(--font-mono)" : "inherit",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */

export function MagicStoreApp() {
  const [category, setCategory] = useState<CategoryView>("featured");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<CatalogApp | null>(null);

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

  function handleSelect(app: CatalogApp) {
    setSelectedApp(app);
  }

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

  return (
    <AppShell
      title="Magic Store"
      subtitle="Apps e módulos do ecossistema Aethereos"
      sidebarWidth={228}
      sidebar={
        <MagicStoreSidebar
          active={category}
          onSelect={handleSelectCategory}
          searchQuery={searchQuery}
          onSearch={handleSearch}
        />
      }
    >
      <div
        data-testid="magic-store-app"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 36px 160px",
          background: "var(--bg-elevated)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          {selectedApp !== null ? (
            <AppDetailView
              app={selectedApp}
              related={related}
              onBack={() => setSelectedApp(null)}
              onSelect={handleSelect}
              onOpen={handleOpen}
            />
          ) : searchQuery.trim() !== "" ? (
            <SearchResults
              query={searchQuery.trim()}
              results={searchResults}
              onSelect={handleSelect}
            />
          ) : category === "featured" ? (
            <FeaturedView
              catalog={MAGIC_STORE_CATALOG}
              onSelect={handleSelect}
              onOpen={handleOpen}
            />
          ) : (
            <CategoryView
              category={category}
              apps={filteredByCategory}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
