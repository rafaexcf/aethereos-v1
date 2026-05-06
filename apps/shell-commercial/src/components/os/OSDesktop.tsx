import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PlusSquare, LayoutGrid, Image, AlignLeft, Lock } from "lucide-react";
import { TopBar } from "./TopBar";
import { TabBar } from "./TabBar";
import { AppFrame } from "./AppFrame";
import { Dock } from "./Dock";
import { OnboardingWizard } from "./OnboardingWizard";
import { LockScreen } from "./LockScreen";
import { useSessionStore } from "../../stores/session";
import { useOSStore } from "../../stores/osStore";
import { useMesaStore, getWallpaperStyle } from "../../stores/mesaStore";
import { useSettingsNavStore } from "../../stores/settingsNavStore";
import { lazyWithRetry } from "../../lib/lazy-with-retry";
const CopilotDrawer = lazyWithRetry(() =>
  import("../../apps/copilot/index").then((m) => ({
    default: m.CopilotDrawer,
  })),
);
import { AppsLauncher } from "../AppsLauncher";
import { SupportModal } from "../SupportModal";
import { NotificationToast } from "../NotificationToast";
import type { NotificationItem } from "../NotificationBell";
import { useNotificationsLifecycle } from "../../hooks/useNotify";
import { useIdleLock } from "../../hooks/useIdleLock";
import { useAutomationEngine } from "../../apps/automacoes/useAutomationEngine";
import { useWorkspacePersistence } from "../../hooks/useWorkspacePersistence";
import { useUserPreferencesLifecycle } from "../../hooks/useUserPreferencesLifecycle";
import { useLLMConfigLifecycle } from "../../hooks/useLLMConfigLifecycle";
import { useInstalledModulesLifecycle } from "../../hooks/useInstalledModulesLifecycle";
import { useAppRegistryLifecycle } from "../../hooks/useAppRegistryLifecycle";
import { useUserPreference } from "../../hooks/useUserPreference";

const DEFAULT_IDLE_LOCK_MINUTES = 15;

// ─── Desktop context menu ─────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
}

function DesktopContextMenu({
  pos,
  onClose,
  onAddApp,
  onWallpaper,
}: {
  pos: ContextMenuState;
  onClose: () => void;
  onAddApp: () => void;
  onWallpaper: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [lockedPos, setLockedPos] = useState(false);

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Clamp so the menu never overflows the viewport
  const MENU_W = 220;
  const MENU_H = 230;
  const x = Math.min(pos.x, window.innerWidth - MENU_W - 8);
  const y = Math.min(pos.y, window.innerHeight - MENU_H - 8);

  const items = [
    {
      label: "Adicionar Widget",
      icon: PlusSquare,
      action: () => {
        onClose();
      },
      disabled: true,
    },
    {
      label: "Adicionar App",
      icon: LayoutGrid,
      action: () => {
        onClose();
        onAddApp();
      },
      disabled: false,
    },
    { separator: true },
    {
      label: "Papel de Parede",
      icon: Image,
      action: () => {
        onClose();
        onWallpaper();
      },
      disabled: false,
    },
    {
      label: "Organizar Mesa",
      icon: AlignLeft,
      action: () => {
        onClose();
      },
      disabled: true,
    },
    { separator: true },
    {
      label: lockedPos ? "Desbloquear Posição" : "Travar Posição",
      icon: Lock,
      action: () => {
        setLockedPos((v) => !v);
      },
      disabled: false,
      checked: lockedPos,
    },
  ] as const;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        key="desktop-ctx"
        initial={{ opacity: 0, scale: 0.96, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed",
          top: y,
          left: x,
          zIndex: 9999,
          width: MENU_W,
          background: "rgba(8,12,22,0.96)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 12,
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
          padding: "4px",
          overflow: "hidden",
        }}
      >
        {items.map((item, i) => {
          if ("separator" in item) {
            return (
              <div
                key={`sep-${i}`}
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.07)",
                  margin: "3px 0",
                }}
              />
            );
          }

          const Icon = item.icon;
          const isDisabled = item.disabled;

          return (
            <button
              key={item.label}
              type="button"
              onClick={isDisabled ? undefined : item.action}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "7px 10px",
                borderRadius: 8,
                background: "transparent",
                border: "none",
                color: isDisabled
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(255,255,255,0.82)",
                fontSize: 13,
                fontWeight: 400,
                cursor: isDisabled ? "default" : "pointer",
                textAlign: "left",
                transition: "background 100ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isDisabled)
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon
                size={14}
                strokeWidth={1.8}
                style={{
                  color: isDisabled
                    ? "rgba(255,255,255,0.20)"
                    : "rgba(255,255,255,0.50)",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1 }}>{item.label}</span>
              {"checked" in item && item.checked && (
                <span
                  style={{ fontSize: 11, color: "#818cf8", fontWeight: 600 }}
                >
                  ✓
                </span>
              )}
              {isDisabled && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.22)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Em breve
                </span>
              )}
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
export function OSDesktop() {
  const navigate = useNavigate();
  const {
    userId,
    activeCompanyId,
    accessToken,
    drivers,
    clearSession,
    setAvatarUrl,
  } = useSessionStore();
  const { aiModalOpen, closeAIModal } = useOSStore();
  // Sprint 31 fast-follow (INP): só monta o CopilotDrawer apos primeira
  // abertura. Reduz blocking time do clique no Bot do Dock (drawer pesado +
  // motion enter animation reconciliam fora do critical path).
  const [drawerEverOpened, setDrawerEverOpened] = useState(false);
  useEffect(() => {
    if (aiModalOpen && !drawerEverOpened) {
      // Defer um tick: o paint do feedback do clique acontece antes do mount.
      const t = setTimeout(() => setDrawerEverOpened(true), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [aiModalOpen, drawerEverOpened]);
  const appsLauncherOpen = useOSStore((s) => s.appsLauncherOpen);
  const closeAppsLauncher = useOSStore((s) => s.closeAppsLauncher);
  const openAppsLauncher = useOSStore((s) => s.openAppsLauncher);
  const supportOpen = useOSStore((s) => s.supportOpen);
  const closeSupport = useOSStore((s) => s.closeSupport);
  const openApp = useOSStore((s) => s.openApp);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  // Bootstrap kernel.notifications loader + Realtime subscribe (kernel migration 20260502000011)
  useNotificationsLifecycle();
  useAutomationEngine();
  useWorkspacePersistence();
  useUserPreferencesLifecycle();
  useLLMConfigLifecycle();
  useInstalledModulesLifecycle();
  useAppRegistryLifecycle();
  const lockTimeoutPref = useUserPreference<number>(
    "lock_timeout_minutes",
    DEFAULT_IDLE_LOCK_MINUTES,
  );
  const lockTimeoutMinutes = lockTimeoutPref.isLoading
    ? DEFAULT_IDLE_LOCK_MINUTES
    : typeof lockTimeoutPref.value === "number"
      ? lockTimeoutPref.value
      : DEFAULT_IDLE_LOCK_MINUTES;
  useIdleLock(lockTimeoutMinutes);

  const isLocked = useSessionStore((s) => s.isLocked);

  const fetchLayout = useMesaStore((s) => s.fetchLayout);
  const wallpaper = useMesaStore((s) => s.wallpaper);
  const wallpaperUrl = useMesaStore((s) => s.wallpaperUrl);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [toastNotif, setToastNotif] = useState<NotificationItem | null>(null);
  const toastShownRef = useRef(false);
  // null = loading, true = done, false = show wizard
  const [onboardingCompleted, setOnboardingCompleted] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    if (userId === null) {
      void navigate({ to: "/login" });
    }
  }, [userId, navigate]);

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    void drivers.auth.getCompanyName(activeCompanyId).then(setCompanyName);
    void fetchLayout();

    // Check onboarding_completed
    void drivers.data
      .from("companies")
      .select("onboarding_completed")
      .eq("id", activeCompanyId)
      .single()
      .then(({ data }: { data: { onboarding_completed: boolean } | null }) => {
        setOnboardingCompleted(data?.onboarding_completed ?? true);
      });
  }, [drivers, activeCompanyId, fetchLayout]);

  // Hidrata avatar do usuário a partir de kernel.profiles → vai p/ TopBar etc.
  useEffect(() => {
    if (drivers === null || userId === null) return;
    void drivers.data
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }: { data: { avatar_url: string | null } | null }) => {
        if (data !== null && data.avatar_url !== null && data.avatar_url !== "")
          setAvatarUrl(data.avatar_url);
      });
  }, [drivers, userId, setAvatarUrl]);

  useEffect(() => {
    if (toastShownRef.current) return;
    toastShownRef.current = true;
    const notif: NotificationItem = {
      id: "os-welcome",
      type: "info",
      title: "Notificação persistente",
      body: "Este container fica visível até ser fechado manualmente.",
      read_at: null,
      created_at: new Date(),
      app: "Configurações",
      appId: "settings",
      context: "sistema",
    };
    const t = setTimeout(() => setToastNotif(notif), 1800);
    return () => clearTimeout(t);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (drivers === null) return;
    await drivers.auth.signOut();
    clearSession();
    await navigate({ to: "/login" });
  }, [drivers, clearSession, navigate]);

  if (userId === null || activeCompanyId === null) return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  return (
    <div
      data-testid="os-desktop"
      className="flex flex-col h-screen w-screen overflow-hidden relative"
      style={{
        paddingTop: 42,
        ...getWallpaperStyle(wallpaper, wallpaperUrl),
      }}
    >
      <TopBar companyName={companyName} onSignOut={handleSignOut} />

      <TabBar />

      <div
        className="flex-1 overflow-hidden relative"
        onContextMenu={(e) => {
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <AppFrame />
      </div>

      <Dock />

      {/* Apps launcher */}
      <AppsLauncher
        open={appsLauncherOpen}
        onClose={closeAppsLauncher}
        onOpenApp={(id, label) => {
          openApp(id, label);
          closeAppsLauncher();
        }}
      />

      {/* Modal de suporte */}
      <SupportModal open={supportOpen} onClose={closeSupport} />

      {/* Context menu da mesa */}
      {ctxMenu !== null && (
        <DesktopContextMenu
          pos={ctxMenu}
          onClose={() => setCtxMenu(null)}
          onAddApp={() => openAppsLauncher()}
          onWallpaper={() => {
            // Sprint 26: navega direto pra aba Mesa (onde fica o picker
            // de wallpaper) — antes abria settings em "home" e usuario
            // achava que "nao acontecia nada".
            useSettingsNavStore.getState().setPendingTab("mesa");
            openApp("settings", "Configurações");
            setCtxMenu(null);
          }}
        />
      )}

      {/* Toast de notificação — flutua acima da dock */}
      <NotificationToast
        item={toastNotif}
        onDismiss={() => setToastNotif(null)}
      />

      {/* AI Copilot drawer — montado apos primeira abertura (INP fix) */}
      {drivers !== null && drawerEverOpened && (
        <Suspense fallback={null}>
          <CopilotDrawer
            open={aiModalOpen}
            onClose={closeAIModal}
            llm={drivers.llm}
            obs={drivers.obs}
            data={drivers.data}
            scp={drivers.scp}
            userId={userId}
            companyId={activeCompanyId}
            correlationId={crypto.randomUUID()}
          />
        </Suspense>
      )}

      {/* Onboarding wizard — shown when onboarding_completed=false */}
      {onboardingCompleted === false &&
        drivers !== null &&
        accessToken !== null && (
          <OnboardingWizard
            companyId={activeCompanyId}
            accessToken={accessToken}
            data={drivers.data}
            auth={drivers.auth}
            supabaseUrl={supabaseUrl}
            onComplete={() => setOnboardingCompleted(true)}
          />
        )}

      <AnimatePresence>
        {isLocked && <LockScreen key="lockscreen" />}
      </AnimatePresence>
    </div>
  );
}
