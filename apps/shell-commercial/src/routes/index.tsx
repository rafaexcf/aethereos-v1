import { createRoute, useNavigate } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { useSessionStore } from "../stores/session";
import { isEmbedMode } from "../lib/embed";
import { useEffect, useState, useCallback } from "react";
import { EmbeddedApp } from "../components/EmbeddedApp";
import { useFeatureFlag, useFeatureFlagsContext } from "@aethereos/ui-shell";
import {
  NotificationBell,
  type NotificationItem,
} from "../components/NotificationBell";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DesktopPage,
});

function DesktopPage() {
  const navigate = useNavigate();
  const {
    drivers,
    userId,
    email,
    activeCompanyId,
    accessToken,
    refreshToken,
    companies,
    setActiveCompany,
    clearSession,
  } = useSessionStore();

  const [companyName, setCompanyName] = useState<string | null>(null);
  const [outboxCount, setOutboxCount] = useState<number | null>(null);
  const [showComercioDash, setShowComercioDash] = useState(false);

  const dashboardsFlag = useFeatureFlag("feature.experimental.dashboards");
  const { setFlag } = useFeatureFlagsContext();

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "demo-1",
      type: "success",
      title: "Sprint 5 concluído",
      body: "LiteLLM, Langfuse, Unleash, OTel e notificações estão operacionais.",
      read_at: null,
      created_at: new Date(),
    },
    {
      id: "demo-2",
      type: "info",
      title: "Feature flags ativas",
      body: "Unleash está configurado e pronto para segmentação por tenant.",
      read_at: null,
      created_at: new Date(Date.now() - 60_000),
    },
  ]);

  const handleMarkRead = useCallback((ids: string[]) => {
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: new Date() } : n)),
    );
  }, []);

  useEffect(() => {
    if (userId === null) {
      void navigate({ to: "/login" });
    }
  }, [userId, navigate]);

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    void drivers.auth.getCompanyName(activeCompanyId).then(setCompanyName);
    void drivers.auth.getOutboxCount(activeCompanyId).then(setOutboxCount);
  }, [drivers, activeCompanyId]);

  async function handleSignOut() {
    if (drivers === null) return;
    await drivers.auth.signOut();
    clearSession();
    await navigate({ to: "/login" });
  }

  async function handleSwitchCompany(companyId: string) {
    setActiveCompany(companyId);
    if (drivers !== null) {
      drivers.auth.withCompanyContext(companyId);
      setCompanyName(null);
      setOutboxCount(null);
      void drivers.auth.getCompanyName(companyId).then(setCompanyName);
      void drivers.auth.getOutboxCount(companyId).then(setOutboxCount);
    }
  }

  if (userId === null || activeCompanyId === null) return null;

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Header — oculto em modo embed */}
      {!isEmbedMode && (
        <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tight text-violet-400">
              Aethereos
            </span>
            {companies.length > 1 ? (
              <CompanySwitcher
                companies={companies}
                activeCompanyId={activeCompanyId}
                onSwitch={handleSwitchCompany}
              />
            ) : (
              <span className="rounded-md bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-400">
                {companyName ?? activeCompanyId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell
              notifications={notifications}
              onMarkRead={handleMarkRead}
            />
            <span className="text-sm text-zinc-400">{email ?? userId}</span>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500"
            >
              Sair
            </button>
          </div>
        </header>
      )}

      {/* Desktop area (ui-shell WindowManager entra aqui em M22+) */}
      <main className="flex flex-1 overflow-hidden">
        {showComercioDash && accessToken !== null && refreshToken !== null ? (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
              <span className="text-sm font-medium text-zinc-300">
                Comércio Digital
              </span>
              <button
                onClick={() => setShowComercioDash(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Fechar ×
              </button>
            </div>
            <div className="flex-1">
              <EmbeddedApp
                src={
                  import.meta.env["VITE_COMERCIO_EMBED_URL"] ??
                  "http://localhost:3000/embed"
                }
                accessToken={accessToken}
                refreshToken={refreshToken}
                title="Comércio Digital"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="space-y-4 text-center">
              <h1 className="text-4xl font-bold text-zinc-100">
                {companyName ?? "Aethereos"}
              </h1>
              <p className="text-zinc-400">
                Cloud multi-tenant. Empresa ativa:{" "}
                <code className="rounded bg-zinc-800 px-2 py-0.5 text-sm font-mono text-violet-400">
                  {companyName ?? activeCompanyId}
                </code>
              </p>
              {outboxCount !== null && (
                <p className="text-sm text-zinc-500">
                  Eventos SCP publicados:{" "}
                  <span className="font-mono text-zinc-300">{outboxCount}</span>
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <button
                  onClick={() => setShowComercioDash(true)}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
                >
                  Abrir Comércio Digital
                </button>
                {dashboardsFlag.enabled && (
                  <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500">
                    Dashboards (Experimental)
                  </button>
                )}
              </div>

              {/* Feature flag demo toggle */}
              <div className="mt-6 rounded-lg border border-zinc-700 p-3 text-left">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Feature flags (demo Unleash M34)
                </p>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dashboardsFlag.enabled}
                    onChange={(e) =>
                      setFlag("feature.experimental.dashboards", {
                        enabled: e.target.checked,
                        loading: false,
                        variant: e.target.checked ? "v2-layout" : "disabled",
                      })
                    }
                    className="h-4 w-4 accent-violet-500"
                  />
                  <span className="text-xs text-zinc-400">
                    feature.experimental.dashboards
                    {dashboardsFlag.enabled && (
                      <span className="ml-2 rounded bg-violet-900 px-1.5 py-0.5 text-violet-300">
                        {dashboardsFlag.variant}
                      </span>
                    )}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

interface CompanySwitcherProps {
  companies: string[];
  activeCompanyId: string;
  onSwitch: (companyId: string) => Promise<void>;
}

function CompanySwitcher({
  companies,
  activeCompanyId,
  onSwitch,
}: CompanySwitcherProps) {
  return (
    <select
      value={activeCompanyId}
      onChange={(e) => void onSwitch(e.target.value)}
      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-300 outline-none focus:border-violet-500"
    >
      {companies.map((id) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
    </select>
  );
}
