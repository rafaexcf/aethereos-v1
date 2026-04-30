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

const SPRING_CONFIG = { mass: 0.1, stiffness: 150, damping: 12 };

const HOVER_COLORS: Record<string, string> = {
  "ae-ai": "#8b5cf6",
  drive: "#06b6d4",
  pessoas: "#8b5cf6",
  chat: "#06b6d4",
  settings: "#64748b",
  comercio: "#f0fc05",
  logitix: "#059669",
  erp: "#7c3aed",
  "magic-store": "#0ea5e9",
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
  const [hovered, setHovered] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (bounds === undefined) return 500;
    return val - (bounds.x + bounds.width / 2);
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [44, 64, 44]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [44, 64, 44]);
  const iconSizeTransform = useTransform(
    distance,
    [-150, 0, 150],
    [22, 32, 22],
  );

  const width = useSpring(widthTransform, SPRING_CONFIG);
  const height = useSpring(heightTransform, SPRING_CONFIG);
  const iconSize = useSpring(iconSizeTransform, SPRING_CONFIG);

  const Icon =
    (LucideIcons as unknown as Record<string, ComponentType<LucideProps>>)[
      app.icon
    ] ?? LucideIcons.Box;

  const hoverColor = HOVER_COLORS[app.id] ?? app.color;

  function handleMouseEnter() {
    setHovered(true);
    prefetchApp(app.id);
    const t = setTimeout(() => setShowTooltip(true), 600);
    setTooltipTimeout(t);
  }

  function handleMouseLeave() {
    setHovered(false);
    setShowTooltip(false);
    if (tooltipTimeout !== null) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
  }

  void hovered;

  return (
    <div className="relative flex flex-col items-center">
      {/* Tooltip via portal equivalent — absolute above icon */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium pointer-events-none"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--shadow-md)",
              color: "var(--text-primary)",
            }}
          >
            {app.name}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dot indicator — open app */}
      {isOpen && (
        <div
          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: 4,
            height: 4,
            background: isActiveTab ? hoverColor : "rgba(255,255,255,0.4)",
          }}
        />
      )}

      {/* Icon container */}
      <motion.div
        ref={ref}
        style={{ width, height }}
        onClick={() =>
          app.opensAsModal === true
            ? toggleAIModal()
            : openApp(app.id, app.name)
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex items-center justify-center rounded-xl cursor-pointer transition-colors"
        whileTap={{ scale: 0.9 }}
      >
        <motion.div
          style={{ width: iconSize, height: iconSize }}
          className="flex items-center justify-center"
        >
          <Icon
            size={22}
            strokeWidth={1.5}
            style={{ color: "rgba(255,255,255,0.65)" }}
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
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      data-testid="dock"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-end pb-2 pt-3 px-4"
        style={{
          gap: 8,
          background: "rgba(15,21,27,0.88)",
          backdropFilter: "blur(var(--glass-blur-heavy))",
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
