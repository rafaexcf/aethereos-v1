import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  AnimatePresence,
  type MotionStyle,
} from "framer-motion";
import { useRef, useState } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { Bell, CloudSun, Droplets, Wind, X } from "lucide-react";
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

const WIDGET_POPUP_STYLE: MotionStyle = {
  background: "rgba(6,9,18,0.92)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-lg)",
};

/* ── Separador vertical ─────────────────────────────────────────────── */

function DockDivider() {
  return (
    <div
      style={{
        width: 1,
        height: 24,
        background: "rgba(255,255,255,0.10)",
        flexShrink: 0,
        alignSelf: "center",
      }}
    />
  );
}

/* ── Widget de Tempo ────────────────────────────────────────────────── */

const WEATHER_MOCK = {
  temp: 24,
  condition: "Parcialmente nublado",
  humidity: 68,
  wind: 12,
  city: "São Paulo",
};

function DockWeatherWidget() {
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  function handleMouseEnter() {
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
        {showTooltip && !open && (
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
            }}
          >
            Tempo
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-50 w-52"
            style={WIDGET_POPUP_STYLE}
          >
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    fontWeight: 500,
                  }}
                >
                  {WEATHER_MOCK.city}
                </span>
                <button
                  onClick={() => setOpen(false)}
                  style={{ color: "var(--text-tertiary)" }}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <CloudSun
                  size={32}
                  style={{ color: "#f59e0b" }}
                  strokeWidth={1.4}
                />
                <div>
                  <p
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      lineHeight: 1,
                    }}
                  >
                    {WEATHER_MOCK.temp}°C
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    {WEATHER_MOCK.condition}
                  </p>
                </div>
              </div>
              <div
                className="flex items-center justify-between pt-2"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-1">
                  <Droplets
                    size={11}
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <span
                    style={{ fontSize: 11, color: "var(--text-secondary)" }}
                  >
                    {WEATHER_MOCK.humidity}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind size={11} style={{ color: "var(--text-tertiary)" }} />
                  <span
                    style={{ fontSize: 11, color: "var(--text-secondary)" }}
                  >
                    {WEATHER_MOCK.wind} km/h
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon */}
      <div
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex flex-col items-center justify-center cursor-pointer transition-colors"
        style={{
          width: ICON_BASE,
          height: ICON_BASE,
          borderRadius: "var(--radius-lg)",
          gap: 2,
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "var(--glass-bg-hover)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLElement).style.background = open
            ? "var(--glass-bg)"
            : "transparent";
        }}
      >
        <CloudSun size={20} style={{ color: "#f59e0b" }} strokeWidth={1.4} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          {WEATHER_MOCK.temp}°
        </span>
      </div>
    </div>
  );
}

/* ── Central de Notificações ────────────────────────────────────────── */

const MOCK_NOTIFICATIONS = [
  {
    id: "1",
    title: "RH",
    message: "Carlos Souza atualizou o perfil",
    time: "2min",
  },
  {
    id: "2",
    title: "Drive",
    message: "Relatório Q1 foi compartilhado",
    time: "14min",
  },
  {
    id: "3",
    title: "Sistema",
    message: "Backup concluído com sucesso",
    time: "1h",
  },
];

function DockNotifWidget() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const visible = MOCK_NOTIFICATIONS.filter((n) => !dismissed.has(n.id));
  const hasNew = visible.length > 0;

  function handleMouseEnter() {
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

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  function dismissAll() {
    setDismissed(new Set(MOCK_NOTIFICATIONS.map((n) => n.id)));
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && !open && (
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
            }}
          >
            Notificações
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full mb-4 right-0 z-50 w-72"
            style={WIDGET_POPUP_STYLE}
          >
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Notificações
              </span>
              {visible.length > 0 && (
                <button
                  onClick={dismissAll}
                  style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                  className="hover:opacity-70 transition-opacity"
                >
                  Limpar tudo
                </button>
              )}
            </div>

            {visible.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  Sem notificações
                </p>
              </div>
            ) : (
              <div className="py-1 max-h-64 overflow-y-auto">
                {visible.map((n, i) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2.5 px-3 py-2 group"
                    style={{
                      borderBottom:
                        i < visible.length - 1
                          ? "1px solid var(--border-subtle)"
                          : "none",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {n.title}
                      </p>
                      <p
                        className="truncate"
                        style={{
                          fontSize: 12,
                          color: "var(--text-primary)",
                          marginTop: 1,
                        }}
                      >
                        {n.message}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: "var(--text-tertiary)",
                          marginTop: 2,
                        }}
                      >
                        {n.time} atrás
                      </p>
                    </div>
                    <button
                      onClick={() => dismiss(n.id)}
                      style={{
                        color: "var(--text-tertiary)",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-70"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon */}
      <div
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex items-center justify-center cursor-pointer transition-colors"
        style={{
          width: ICON_BASE,
          height: ICON_BASE,
          borderRadius: "var(--radius-lg)",
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "var(--glass-bg-hover)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLElement).style.background = open
            ? "var(--glass-bg)"
            : "transparent";
        }}
      >
        <Bell
          size={20}
          strokeWidth={1.4}
          style={{ color: "rgba(255,255,255,0.75)" }}
        />
        {hasNew && (
          <div
            className="absolute"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#ef4444",
              top: 10,
              right: 10,
              border: "1.5px solid rgba(6,9,18,0.8)",
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ── DockIcon (app) ─────────────────────────────────────────────────── */

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

/* ── Dock root ──────────────────────────────────────────────────────── */

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
        {/* Widget: Tempo (esquerda) */}
        <DockWeatherWidget />
        <DockDivider />

        {/* Apps */}
        {dockApps.map((app) => (
          <DockIcon
            key={app.id}
            app={app}
            mouseX={mouseX}
            isOpen={openAppIds.has(app.id)}
            isActiveTab={activeAppId === app.id}
          />
        ))}

        {/* Widget: Notificações (direita) */}
        <DockDivider />
        <DockNotifWidget />
      </motion.div>
    </motion.div>
  );
}
