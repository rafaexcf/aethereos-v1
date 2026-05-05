import { createRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { rootRoute } from "./__root";
import { useSessionStore } from "../stores/session";
import { isEmbedMode } from "../lib/embed";
import { useEffect, useRef, useState, useCallback } from "react";
import { EmbeddedApp } from "../components/EmbeddedApp";
import { useFeatureFlag, useFeatureFlagsContext } from "@aethereos/ui-shell";
import {
  NotificationBell,
  type NotificationItem,
} from "../components/NotificationBell";
import { NotificationCenter } from "../components/NotificationCenter";
import { AppsLauncher } from "../components/AppsLauncher";
import { SupportModal } from "../components/SupportModal";
import { NotificationToast } from "../components/NotificationToast";
import { useWindowsStore } from "../stores/windows";
import { APP_REGISTRY, getApp } from "../lib/app-registry";
import { CopilotDrawer } from "../apps/copilot/index";
import { UniversalSearch } from "../search/UniversalSearch";

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

  const { windows, toggleApp, closeApp, focusApp } = useWindowsStore();

  const [companyName, setCompanyName] = useState<string | null>(null);
  const [outboxCount, setOutboxCount] = useState<number | null>(null);
  const [showComercioDash, setShowComercioDash] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [dockHidden, setDockHidden] = useState(false);
  const [toastNotif, setToastNotif] = useState<NotificationItem | null>(null);

  const dashboardsFlag = useFeatureFlag("feature.experimental.dashboards");
  const { setFlag } = useFeatureFlagsContext();

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      type: "success",
      title: "Sprint 5 concluído",
      body: "LiteLLM, Langfuse, Unleash, OTel e notificações estão operacionais.",
      read_at: null,
      created_at: new Date(),
      app: "Sistema",
      context: "sistema",
    },
    {
      id: "notif-2",
      type: "info",
      title: "Feature flags ativas",
      body: "Unleash está configurado e pronto para segmentação por tenant.",
      read_at: null,
      created_at: new Date(Date.now() - 3 * 60_000),
      app: "Sistema",
      context: "sistema",
    },
    {
      id: "notif-3",
      type: "info",
      title: "Nova proposta do Copilot",
      body: "Criar pasta 'Contratos Q2' no Drive — aguardando sua aprovação.",
      read_at: new Date(Date.now() - 30 * 60_000),
      created_at: new Date(Date.now() - 45 * 60_000),
      app: "Copilot",
      context: "sistema",
    },
    {
      id: "notif-4",
      type: "warning",
      title: "Limite de API próximo",
      body: "80% do limite mensal de chamadas de API atingido. Considere fazer upgrade do plano.",
      read_at: null,
      created_at: new Date(Date.now() - 2 * 3600_000),
      app: "Sistema",
      context: "sistema",
    },
    {
      id: "notif-5",
      type: "success",
      title: "Venda concluída",
      body: "Pedido #4521 de R$ 1.280,00 confirmado e pagamento aprovado.",
      read_at: null,
      created_at: new Date(Date.now() - 26 * 3600_000),
      app: "Comércio",
      context: "comercio",
    },
    {
      id: "notif-6",
      type: "error",
      title: "Falha na integração Shopify",
      body: "Erro ao sincronizar estoque: timeout na API após 3 tentativas. Verifique as credenciais.",
      read_at: new Date(Date.now() - 20 * 3600_000),
      created_at: new Date(Date.now() - 27 * 3600_000),
      app: "Integrações",
      context: "comercio",
    },
    {
      id: "notif-7",
      type: "info",
      title: "Novo membro adicionado",
      body: "Maria Silva foi adicionada ao workspace com perfil de Colaborador.",
      read_at: null,
      created_at: new Date(Date.now() - 3 * 86400_000),
      app: "RH",
      context: "sistema",
    },
    {
      id: "notif-8",
      type: "warning",
      title: "Certificado SSL expirando",
      body: "O certificado de idp.aethereos.com expira em 14 dias. Renove antes do vencimento.",
      read_at: new Date(Date.now() - 2 * 86400_000),
      created_at: new Date(Date.now() - 4 * 86400_000),
      app: "Sistema",
      context: "sistema",
    },
    {
      id: "notif-9",
      type: "success",
      title: "Relatório financeiro gerado",
      body: "Fechamento de abril exportado com sucesso em PDF e XLSX.",
      read_at: null,
      created_at: new Date(Date.now() - 5 * 86400_000),
      app: "Financeiro",
      context: "financeiro",
    },
  ]);

  const handleMarkRead = useCallback((ids: string[]) => {
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: new Date() } : n)),
    );
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date() })),
    );
  }, []);

  const handleToastDismiss = useCallback(
    (id: string) => {
      setToastNotif(null);
      handleMarkRead([id]);
    },
    [handleMarkRead],
  );

  useEffect(() => {
    if (userId === null) {
      void navigate({ to: "/login" });
    }
  }, [userId, navigate]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        setCopilotOpen((prev) => !prev);
      }
      if (e.key === "Escape" && copilotOpen) {
        setCopilotOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copilotOpen]);

  const toastShownRef = useRef(false);
  useEffect(() => {
    if (toastShownRef.current) return;
    const first = notifications.find((n) => n.read_at === null);
    if (first == null) return;
    toastShownRef.current = true;
    const t = setTimeout(() => setToastNotif(first), 1800);
    return () => clearTimeout(t);
  }, [notifications]);

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
              onExpand={() => setNotifCenterOpen(true)}
            />
            <button
              type="button"
              onClick={() => setCopilotOpen((prev) => !prev)}
              title="AI Copilot (Cmd+K)"
              className={[
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors",
                copilotOpen
                  ? "border-violet-500 bg-violet-600/20 text-violet-300"
                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500",
              ].join(" ")}
            >
              <span>🤖</span>
              <span>Copilot</span>
              <span className="text-zinc-600">⌘K</span>
            </button>
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

      {/* Desktop — apps + Dock */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* App area: renderiza o app mais focado (maior zIndex) */}
        <div className="flex flex-1 overflow-hidden">
          {windows.length === 0 && !showComercioDash ? (
            /* Desktop vazio — placeholder com atalhos */
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <h1 className="text-3xl font-bold text-zinc-100">
                {companyName ?? "Aethereos"}
              </h1>
              <p className="text-sm text-zinc-500">
                Empresa:{" "}
                <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-violet-400">
                  {companyName ?? activeCompanyId}
                </code>
              </p>
              {outboxCount !== null && (
                <p className="text-xs text-zinc-600">
                  Eventos SCP publicados:{" "}
                  <span className="font-mono">{outboxCount}</span>
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <button
                  onClick={() => setShowComercioDash(true)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500"
                >
                  Comércio Digital (embed)
                </button>
                {dashboardsFlag.enabled && (
                  <button className="rounded-lg border border-indigo-700 px-3 py-1.5 text-xs text-indigo-300">
                    Dashboards (Experimental)
                  </button>
                )}
              </div>
              {/* Feature flag demo toggle */}
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-zinc-600">
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
                  className="h-3.5 w-3.5 accent-violet-500"
                />
                feature.experimental.dashboards
              </label>
            </div>
          ) : showComercioDash &&
            accessToken !== null &&
            refreshToken !== null ? (
            /* Comércio Digital embed */
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
            /* App interno aberto (renderiza o de maior zIndex) */
            <AppWindowLayer
              windows={windows}
              onClose={closeApp}
              onFocus={focusApp}
            />
          )}
        </div>

        {/* Dock — ocultável via menu do sistema */}
        {!isEmbedMode && !dockHidden && (
          <div className="flex shrink-0 items-center justify-center gap-2 border-t border-zinc-800 bg-zinc-900 px-4 py-2">
            {APP_REGISTRY.map((app) => {
              const isOpen = windows.some((w) => w.appId === app.id);
              return (
                <button
                  key={app.id}
                  type="button"
                  title={app.label}
                  onClick={() => toggleApp(app.id, app.label)}
                  className="relative flex h-12 w-12 items-center justify-center rounded-xl transition-transform hover:scale-110 active:scale-95"
                >
                  <span className="text-2xl select-none">{app.icon}</span>
                  {isOpen && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-violet-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Central de Notificações — portal sobre tudo */}
      <NotificationCenter
        open={notifCenterOpen}
        notifications={notifications}
        onClose={() => setNotifCenterOpen(false)}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        dockHidden={dockHidden}
        onToggleDock={() => setDockHidden((h) => !h)}
        onOpenApps={() => {
          setNotifCenterOpen(false);
          setAppsOpen(true);
        }}
        onOpenSettings={() => {
          setNotifCenterOpen(false);
          toggleApp("configuracoes", "Configurações");
        }}
        onOpenSupport={() => {
          setNotifCenterOpen(false);
          setSupportOpen(true);
        }}
      />

      {/* Launcher de todos os apps */}
      <AppsLauncher
        open={appsOpen}
        onClose={() => setAppsOpen(false)}
        onOpenApp={(id, label) => toggleApp(id, label)}
      />

      {/* Modal de suporte */}
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />

      {/* Toast de notificação — flutua acima da dock */}
      <NotificationToast item={toastNotif} onDismiss={handleToastDismiss} />

      {/* Universal Search — Ctrl+K / Cmd+K */}
      <UniversalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* AI Copilot Drawer — Ctrl+I / Cmd+I (movido do Ctrl+K) */}
      {drivers !== null && (
        <CopilotDrawer
          open={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          llm={drivers.llm}
          obs={drivers.obs}
          data={drivers.data}
          scp={drivers.scp}
          userId={userId}
          companyId={activeCompanyId}
          correlationId={crypto.randomUUID()}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppWindowLayer — renderiza o app com maior zIndex
// ---------------------------------------------------------------------------

import type { AppWindow } from "../stores/windows";

interface AppWindowLayerProps {
  windows: AppWindow[];
  onClose: (appId: string) => void;
  onFocus: (appId: string) => void;
}

function AppWindowLayer({ windows, onClose, onFocus }: AppWindowLayerProps) {
  const sorted = [...windows].sort((a, b) => b.zIndex - a.zIndex);
  const topWindow = sorted[0];
  if (topWindow === undefined) return null;

  const app = getApp(topWindow.appId);
  if (app === undefined) return null;

  const AppComponent = app.component;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Tab bar quando há mais de um app aberto */}
      {windows.length > 1 && (
        <div className="flex shrink-0 items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-2 py-1">
          {sorted.map((w) => {
            const wApp = getApp(w.appId);
            return (
              <button
                key={w.appId}
                type="button"
                onClick={() => onFocus(w.appId)}
                className={[
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors",
                  w.appId === topWindow.appId
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300",
                ].join(" ")}
              >
                <span>{wApp?.icon}</span>
                <span>{w.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(w.appId);
                  }}
                  className="ml-1 text-zinc-600 hover:text-zinc-300"
                >
                  ×
                </button>
              </button>
            );
          })}
        </div>
      )}
      {/* Header do app com botão fechar */}
      {windows.length === 1 && (
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
          <span className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <span>{app.icon}</span>
            <span>{app.label}</span>
          </span>
          <button
            type="button"
            onClick={() => onClose(topWindow.appId)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Fechar ×
          </button>
        </div>
      )}
      {/* Conteúdo do app */}
      <div className="flex flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
              Carregando…
            </div>
          }
        >
          <AppComponent />
        </Suspense>
      </div>
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
