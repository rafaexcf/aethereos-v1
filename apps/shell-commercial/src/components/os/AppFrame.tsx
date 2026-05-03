import {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { useOSStore } from "../../stores/osStore";
import { getApp } from "../../apps/registry";
import { ErrorBoundary } from "./ErrorBoundary";
import { AppLoader } from "./AppLoader";
import type { OSTab } from "../../types/os";

const DIVIDER_BG = "rgba(255,255,255,0.08)";
const DIVIDER_BG_ACTIVE = "rgba(255,255,255,0.18)";
const PANE_BG = "#191d21";

function PaneBody({ appId }: { appId: string }) {
  const app = getApp(appId);
  const AppComponent = app?.component;
  if (!AppComponent) return null;
  return (
    <Suspense fallback={<AppLoader appId={appId} />}>
      <AppComponent />
    </Suspense>
  );
}

function SplitCloseButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        position: "absolute",
        top: 6,
        right: 6,
        zIndex: 5,
        width: 22,
        height: 22,
        borderRadius: 6,
        background: "rgba(8,12,22,0.72)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "var(--text-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(8,12,22,0.72)";
      }}
    >
      <X size={12} strokeWidth={2.2} />
    </button>
  );
}

function SplitPane({ tab }: { tab: OSTab }) {
  const setSplitRatio = useOSStore((s) => s.setSplitRatio);
  const unsplitTab = useOSStore((s) => s.unsplitTab);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const ratio = tab.splitRatio ?? 0.5;
  const splitAppId = tab.splitAppId;

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const next = (e.clientX - rect.left) / rect.width;
      setSplitRatio(tab.id, next);
    }
    function onUp() {
      setDragging(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragging, setSplitRatio, tab.id]);

  const handleResetPrimary = useCallback(() => {
    unsplitTab(tab.id, "primary");
  }, [unsplitTab, tab.id]);

  const handleResetSplit = useCallback(() => {
    unsplitTab(tab.id, "split");
  }, [unsplitTab, tab.id]);

  if (splitAppId === undefined) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        background: PANE_BG,
      }}
    >
      <div
        style={{
          position: "relative",
          width: `${ratio * 100}%`,
          minWidth: "25%",
          background: PANE_BG,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SplitCloseButton
          onClick={handleResetSplit}
          label="Fechar painel esquerdo"
        />
        <ErrorBoundary onReset={handleResetSplit}>
          <PaneBody appId={tab.appId} />
        </ErrorBoundary>
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionar divisão"
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        style={{
          flex: "0 0 5px",
          cursor: "col-resize",
          background: dragging ? DIVIDER_BG_ACTIVE : DIVIDER_BG,
          transition: dragging ? undefined : "background 120ms ease",
          zIndex: 4,
        }}
        onMouseEnter={(e) => {
          if (!dragging) e.currentTarget.style.background = DIVIDER_BG_ACTIVE;
        }}
        onMouseLeave={(e) => {
          if (!dragging) e.currentTarget.style.background = DIVIDER_BG;
        }}
      />

      <div
        style={{
          position: "relative",
          flex: 1,
          minWidth: "25%",
          background: PANE_BG,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SplitCloseButton
          onClick={handleResetPrimary}
          label="Fechar painel direito"
        />
        <ErrorBoundary onReset={handleResetPrimary}>
          <PaneBody appId={splitAppId} />
        </ErrorBoundary>
      </div>
    </div>
  );
}

const TabPane = memo(function TabPane({
  tab,
  isActive,
}: {
  tab: OSTab;
  isActive: boolean;
}) {
  const closeTab = useOSStore((s) => s.closeTab);
  const app = getApp(tab.appId);
  const AppComponent = app?.component;

  const handleReset = useCallback(() => {
    closeTab(tab.id);
  }, [closeTab, tab.id]);

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
      {tab.splitAppId !== undefined ? (
        <SplitPane tab={tab} />
      ) : (
        <ErrorBoundary onReset={handleReset}>
          <Suspense fallback={<AppLoader appId={tab.appId} />}>
            <AppComponent />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
});

export function AppFrame() {
  const { tabs, activeTabId } = useOSStore();

  return (
    <div
      className="h-full overflow-hidden relative"
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
        <TabPane key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
      ))}
    </div>
  );
}
