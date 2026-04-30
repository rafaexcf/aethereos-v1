import { useState } from "react";
import {
  ShoppingCart,
  Truck,
  BarChart3,
  TrendingUp,
  Zap,
  ExternalLink,
  X,
  ChevronRight,
  Store,
} from "lucide-react";
import { AppShell } from "@aethereos/ui-shell";
import {
  MAGIC_STORE_CATALOG,
  filterCatalog,
  type MagicStoreApp as CatalogApp,
  type MagicStoreCategory,
} from "../../data/magic-store-catalog";

const ICON_MAP: Record<
  string,
  React.FC<{ size?: number; className?: string }>
> = {
  ShoppingCart,
  Truck,
  BarChart3,
  TrendingUp,
  Zap,
  Store,
};

function AppIcon({
  name,
  color,
  size = 24,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const Icon = ICON_MAP[name] ?? Store;
  return <Icon size={size} style={{ color }} />;
}

const STATUS_LABELS: Record<string, string> = {
  available: "Disponível",
  beta: "Beta",
  coming_soon: "Em breve",
};

const STATUS_COLORS: Record<string, string> = {
  available: "#10b981",
  beta: "#f59e0b",
  coming_soon: "#6b7280",
};

const CATEGORIES: { id: MagicStoreCategory; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "vertical", label: "Verticais" },
  { id: "optional", label: "Opcionais" },
  { id: "beta", label: "Beta" },
  { id: "coming_soon", label: "Em breve" },
];

interface AppCardProps {
  app: CatalogApp;
  onClick: () => void;
}

function AppCard({ app, onClick }: AppCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        background: hovered ? "var(--glass-bg-hover)" : "var(--glass-bg)",
        border: `1px solid ${hovered ? "var(--border-default)" : "var(--glass-border)"}`,
        borderRadius: "var(--radius-lg)",
        textAlign: "left",
        cursor: "pointer",
        transition: "var(--transition-default)",
        boxShadow: "var(--glass-specular)",
      }}
    >
      <div className="flex items-start justify-between">
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: `${app.color}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AppIcon name={app.icon} color={app.color} size={22} />
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 9999,
            background: `${STATUS_COLORS[app.status] ?? "#6b7280"}20`,
            color: STATUS_COLORS[app.status] ?? "#9ca3af",
          }}
        >
          {STATUS_LABELS[app.status] ?? app.status}
        </span>
      </div>
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {app.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginTop: 4,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {app.description}
        </div>
      </div>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: "auto" }}
      >
        {app.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 10,
              padding: "2px 6px",
              background: "var(--glass-bg)",
              color: "var(--text-secondary)",
              borderRadius: 4,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

interface AppDetailDrawerProps {
  app: CatalogApp;
  onClose: () => void;
}

function AppDetailDrawer({ app, onClose }: AppDetailDrawerProps) {
  const canOpen =
    app.status !== "coming_soon" &&
    app.type === "standalone" &&
    app.externalUrl;

  const handleOpen = () => {
    if (app.type === "standalone" && app.externalUrl) {
      window.open(app.externalUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 384,
          height: "100%",
          background: "var(--bg-base)",
          borderLeft: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `${app.color}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppIcon name={app.icon} color={app.color} size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {app.name}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 9999,
                  background: `${STATUS_COLORS[app.status] ?? "#6b7280"}20`,
                  color: STATUS_COLORS[app.status] ?? "#9ca3af",
                }}
              >
                {STATUS_LABELS[app.status] ?? app.status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 4,
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "var(--transition-default)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--glass-bg-hover)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div>
            <h4
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Sobre
            </h4>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {app.longDescription}
            </p>
          </div>

          <div>
            <h4
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Tags
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {app.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    background: "var(--glass-bg)",
                    color: "var(--text-secondary)",
                    borderRadius: 4,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Tipo
            </h4>
            <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              {app.type === "standalone"
                ? "App Camada 2 standalone (subdomínio próprio)"
                : "Módulo opcional Camada 1"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 20,
            borderTop: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          {app.status === "coming_soon" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  textAlign: "center",
                }}
              >
                Em desenvolvimento — disponível em breve.
              </div>
            </div>
          ) : canOpen ? (
            <button
              onClick={handleOpen}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 16px",
                background: "var(--accent)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: "var(--radius-md)",
                border: "none",
                cursor: "pointer",
                transition: "var(--transition-default)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--accent)";
              }}
            >
              <ExternalLink size={15} />
              Abrir {app.name}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MagicStoreApp() {
  const [category, setCategory] = useState<MagicStoreCategory>("all");
  const [selectedApp, setSelectedApp] = useState<CatalogApp | null>(null);

  const filtered = filterCatalog(MAGIC_STORE_CATALOG, category);

  return (
    <AppShell
      title="Magic Store"
      subtitle="Apps e módulos para expandir o Aethereos"
    >
      <div
        data-testid="magic-store-app"
        className="flex flex-col h-full overflow-hidden"
      >
        {/* Category filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "12px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
            overflowX: "auto",
          }}
        >
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: "nowrap",
                border: "none",
                cursor: "pointer",
                transition: "var(--transition-default)",
                background: category === id ? "var(--accent)" : "transparent",
                color: category === id ? "#fff" : "var(--text-tertiary)",
              }}
              onMouseEnter={(e) => {
                if (category !== id) {
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.background = "var(--glass-bg-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (category !== id) {
                  e.currentTarget.style.color = "var(--text-tertiary)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {filtered.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                fontSize: 14,
                color: "var(--text-tertiary)",
              }}
            >
              Nenhum app nesta categoria ainda.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              }}
            >
              {filtered.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  onClick={() => setSelectedApp(app)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-subtle)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            {MAGIC_STORE_CATALOG.length} apps disponíveis ou em breve
          </span>
          <a
            href="https://aethereos.io/marketplace"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--text-tertiary)",
              textDecoration: "none",
              transition: "var(--transition-default)",
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
            Ver todos no marketplace <ChevronRight size={11} />
          </a>
        </div>
      </div>

      {/* Detail drawer */}
      {selectedApp !== null && (
        <AppDetailDrawer
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </AppShell>
  );
}
