import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import { useRef, useState } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { useOSStore } from "../../stores/osStore";
import { getVisibleDockApps, prefetchApp } from "../../apps/registry";
import type { OSApp } from "../../types/os";

const SPRING_CONFIG = { mass: 0.08, stiffness: 180, damping: 11 };

const ICON_BASE = 48;
const ICON_MAX = 76;
const ICON_RANGE = 160;

const HOVER_COLORS: Record<string, string> = {
  "ae-ai": "#8b5cf6",
  drive: "#06b6d4",
  pessoas: "#8b5cf6",
  chat: "#06b6d4",
  settings: "#94a3b8",
  comercio: "#f0fc05",
  logitix: "#10b981",
  erp: "#7c3aed",
  "magic-store": "#0ea5e9",
  rh: "#f59e0b",
};

function DockIcon({
  app,
  mouseX,
  isOpen,
  isActiveTab,
}: {
  app: OSApp;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  isOpen: boolean;
  isActiveTab: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const openApp = useOSStore((s) => s.openApp);
  const toggleAIModal = useOSStore((s) => s.toggleAIModal);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (bounds === undefined) return 1000;
    return val - (bounds.x + bounds.width / 2);
  });

  const sizeTransform = useTransform(
    distance,
    [-ICON_RANGE, 0, ICON_RANGE],
    [ICON_BASE, ICON_MAX, ICON_BASE],
  );
  const iconSizeTransform = useTransform(
    distance,
    [-ICON_RANGE, 0, ICON_RANGE],
    [
      Math.round(ICON_BASE * 0.46),
      Math.round(ICON_MAX * 0.46),
      Math.round(ICON_BASE * 0.46),
    ],
  );

  const size = useSpring(sizeTransform, SPRING_CONFIG);
  const iconSize = useSpring(iconSizeTransform, SPRING_CONFIG);

  const Icon =
    (LucideIcons as unknown as Record<string, ComponentType<LucideProps>>)[
      app.icon
    ] ?? LucideIcons.Box;

  const hoverColor = HOVER_COLORS[app.id] ?? app.color;

  function handleMouseEnter() {
    prefetchApp(app.id);
    const t = setTimeout(() => setShowTooltip(true), 550);
    setTooltipTimeout(t);
  }

  function handleMouseLeave() {
    setShowTooltip(false);
    if (tooltipTimeout !== null) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap pointer-events-none px-2.5 py-1"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
              color: "var(--text-primary)",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              backdropFilter: `blur(var(--blur-ui))`,
              WebkitBackdropFilter: `blur(var(--blur-ui))`,
            }}
          >
            {app.name}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open indicator dot */}
      <div
        className="absolute rounded-full transition-all duration-200"
        style={{
          width: isActiveTab ? 5 : 3,
          height: isActiveTab ? 5 : 3,
          bottom: -2,
          left: "50%",
          transform: "translateX(-50%)",
          background: isOpen
            ? isActiveTab
              ? hoverColor
              : "rgba(255,255,255,0.5)"
            : "transparent",
          boxShadow: isOpen && isActiveTab ? `0 0 6px ${hoverColor}` : "none",
        }}
      />

      {/* Icon container */}
      <motion.div
        ref={ref}
        style={{
          width: size,
          height: size,
          borderRadius: "var(--radius-lg)",
          background: isOpen ? "var(--glass-bg)" : "transparent",
        }}
        onClick={() =>
          app.opensAsModal === true
            ? toggleAIModal()
            : openApp(app.id, app.name)
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex items-center justify-center cursor-pointer"
        whileTap={{ scale: 0.88 }}
        role="button"
        aria-label={app.name}
        data-testid={`dock-app-${app.id}`}
        onHoverStart={(e) => {
          (e.target as HTMLElement).style.background = "var(--glass-bg-hover)";
        }}
        onHoverEnd={(e) => {
          (e.target as HTMLElement).style.background = isOpen
            ? "var(--glass-bg)"
            : "transparent";
        }}
      >
        <motion.div
          style={{ width: iconSize, height: iconSize }}
          className="flex items-center justify-center"
        >
          <Icon
            size={24}
            strokeWidth={1.4}
            style={{ color: "rgba(255,255,255,0.75)" }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

export function Dock() {
  const tabs = useOSStore((s) => s.tabs);
  const activeTabId = useOSStore((s) => s.activeTabId);
  const dockApps = getVisibleDockApps();
  const mouseX = useMotionValue(Infinity);

  const openAppIds = new Set(tabs.map((t) => t.appId));
  const activeAppId = tabs.find((t) => t.id === activeTabId)?.appId;

  return (
    <motion.div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50"
      data-testid="dock"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-end pb-3 pt-3 px-4"
        style={{
          gap: 10,
          background: "rgba(6,9,18,0.52)",
          backdropFilter: `blur(var(--blur-dock))`,
          WebkitBackdropFilter: `blur(var(--blur-dock))`,
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-dock)",
          boxShadow: "var(--shadow-dock)",
        }}
      >
        {dockApps.map((app) => (
          <DockIcon
            key={app.id}
            app={app}
            mouseX={mouseX}
            isOpen={openAppIds.has(app.id)}
            isActiveTab={activeAppId === app.id}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
