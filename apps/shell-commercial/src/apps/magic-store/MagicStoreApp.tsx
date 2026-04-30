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
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-left hover:border-zinc-700 hover:bg-zinc-800/80 transition-all cursor-pointer"
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
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: `${STATUS_COLORS[app.status] ?? "#6b7280"}20`,
            color: STATUS_COLORS[app.status] ?? "#9ca3af",
          }}
        >
          {STATUS_LABELS[app.status] ?? app.status}
        </span>
      </div>
      <div>
        <div className="text-sm font-semibold text-zinc-100">{app.name}</div>
        <div className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">
          {app.description}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-auto">
        {app.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded"
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
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-sm h-full bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
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
              <div className="text-sm font-semibold text-zinc-100">
                {app.name}
              </div>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
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
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              Sobre
            </h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {app.longDescription}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              Tags
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {app.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              Tipo
            </h4>
            <div className="text-sm text-zinc-400">
              {app.type === "standalone"
                ? "App Camada 2 standalone (subdomínio próprio)"
                : "Módulo opcional Camada 1"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 shrink-0">
          {app.status === "coming_soon" ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-zinc-500 text-center">
                Em desenvolvimento — disponível em breve.
              </div>
            </div>
          ) : canOpen ? (
            <button
              onClick={handleOpen}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors"
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
      <div className="flex flex-col h-full overflow-hidden">
        {/* Category filter */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-zinc-800 shrink-0 overflow-x-auto">
          {CATEGORIES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                category === id
                  ? "bg-violet-600 text-white"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-zinc-600">
              Nenhum app nesta categoria ainda.
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{
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
        <div className="px-5 py-3 border-t border-zinc-800 shrink-0 flex items-center justify-between">
          <span className="text-xs text-zinc-600">
            {MAGIC_STORE_CATALOG.length} apps disponíveis ou em breve
          </span>
          <a
            href="https://aethereos.io/marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
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
