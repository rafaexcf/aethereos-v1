import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { TopBar } from "./TopBar";
import { TabBar } from "./TabBar";
import { AppFrame } from "./AppFrame";
import { Dock } from "./Dock";
import { OnboardingWizard } from "./OnboardingWizard";
import { useSessionStore } from "../../stores/session";
import { useOSStore } from "../../stores/osStore";
import { useMesaStore, getWallpaperStyle } from "../../stores/mesaStore";
import { CopilotDrawer } from "../../apps/copilot/index";

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
  const fetchLayout = useMesaStore((s) => s.fetchLayout);
  const wallpaper = useMesaStore((s) => s.wallpaper);
  const wallpaperUrl = useMesaStore((s) => s.wallpaperUrl);
  const [companyName, setCompanyName] = useState<string | null>(null);
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

      <div className="flex-1 overflow-hidden relative">
        <AppFrame />
      </div>

      <Dock />

      {/* AI Copilot drawer */}
      {drivers !== null && (
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
    </div>
  );
}
