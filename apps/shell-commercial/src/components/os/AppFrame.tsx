import { Suspense, memo, useCallback } from "react";
import { useOSStore } from "../../stores/osStore";
import { getApp } from "../../apps/registry";
import { ErrorBoundary } from "./ErrorBoundary";
import { AppLoader } from "./AppLoader";

const TabPane = memo(function TabPane({
  tabId,
  appId,
  isActive,
}: {
  tabId: string;
  appId: string;
  isActive: boolean;
}) {
  const app = getApp(appId);
  const AppComponent = app?.component;
  const closeTab = useOSStore((s) => s.closeTab);

  const handleReset = useCallback(() => {
    closeTab(tabId);
  }, [closeTab, tabId]);

  if (!AppComponent) return null;

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        visibility: isActive ? "visible" : "hidden",
        pointerEvents: isActive ? "auto" : "none",
        zIndex: isActive ? 1 : 0,
      }}
    >
      <ErrorBoundary onReset={handleReset}>
        <Suspense fallback={<AppLoader appId={appId} />}>
          <AppComponent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
});

export function AppFrame() {
  const { tabs, activeTabId } = useOSStore();

  return (
    <div
      className="flex-1 overflow-hidden relative"
      style={{ background: "var(--bg-base)" }}
    >
      {tabs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
            Selecione um app
          </p>
        </div>
      )}
      {tabs.map((tab) => (
        <TabPane
          key={tab.id}
          tabId={tab.id}
          appId={tab.appId}
          isActive={tab.id === activeTabId}
        />
      ))}
    </div>
  );
}
