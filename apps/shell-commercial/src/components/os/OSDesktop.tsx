import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { TopBar } from "./TopBar";
import { AppFrame } from "./AppFrame";
import { useSessionStore } from "../../stores/session";
import { useOSStore } from "../../stores/osStore";
import { useMesaStore } from "../../stores/mesaStore";
import { CopilotDrawer } from "../../apps/copilot/index";

export function OSDesktop() {
  const navigate = useNavigate();
  const { userId, activeCompanyId, drivers, clearSession } = useSessionStore();
  const { aiModalOpen, closeAIModal } = useOSStore();
  const fetchLayout = useMesaStore((s) => s.fetchLayout);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    if (userId === null) {
      void navigate({ to: "/login" });
    }
  }, [userId, navigate]);

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) return;
    void drivers.auth.getCompanyName(activeCompanyId).then(setCompanyName);
    void fetchLayout();
  }, [drivers, activeCompanyId, fetchLayout]);

  const handleSignOut = useCallback(async () => {
    if (drivers === null) return;
    await drivers.auth.signOut();
    clearSession();
    await navigate({ to: "/login" });
  }, [drivers, clearSession, navigate]);

  if (userId === null || activeCompanyId === null) return null;

  return (
    <div
      data-testid="os-desktop"
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      <TopBar companyName={companyName} onSignOut={handleSignOut} />

      {/* TabBar placeholder — MX43 */}
      <div id="tabbar-slot" style={{ background: "var(--bg-base)" }} />

      <div className="flex-1 overflow-hidden relative">
        <AppFrame />
      </div>

      {/* Dock placeholder — MX44 */}
      <div id="dock-slot" />

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
    </div>
  );
}
