import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  AnimatePresence,
  type MotionStyle,
} from "framer-motion";
import { useRef, useState, useEffect, startTransition } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import {
  Bell,
  CalendarDays,
  CloudSun,
  Droplets,
  LayoutGrid,
  LifeBuoy,
  Wind,
  X,
} from "lucide-react";
import {
  MONTH_NAMES,
  DAY_HEADERS_SHORT,
  getMonthDays,
  isSameDay,
  todayMidnight,
} from "../../apps/calendario/calendarUtils";
import { useOSStore } from "../../stores/osStore";
import { useDockStore } from "../../stores/dockStore";
import { useInstalledModulesStore } from "../../stores/installedModulesStore";
import { getApp, prefetchApp } from "../../apps/registry";
import { AppContextMenu } from "./AppContextMenu";
import type { OSApp } from "../../types/os";

const SPRING_CONFIG = { mass: 0.08, stiffness: 180, damping: 11 };

const ICON_BASE = 48;
const ICON_MAX = 76;
const ICON_RANGE = 160;

const HOVER_COLORS: Record<string, string> = {
  "ae-ai": "#8b5cf6",
  drive: "#06b6d4",
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
  const openApp = useOSStore((s) => s.openApp);
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
            <div style={{ padding: "0 12px 12px" }}>
              <button
                type="button"
                onClick={() => {
                  openApp("weather", "Tempo");
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 8,
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.22)",
                  color: "#a78bfa",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.1)";
                }}
              >
                Abrir Tempo →
              </button>
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
            fontSize: 11,
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

/* ── Widget de Data/Hora ────────────────────────────────────────────── */

function DockClockWidget() {
  const [now, setNow] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [popYear, setPopYear] = useState(now.getFullYear());
  const [popMonth, setPopMonth] = useState(now.getMonth());
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const openApp = useOSStore((s) => s.openApp);

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

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now.getHours().toString().padStart(2, "0");
  const min = now.getMinutes().toString().padStart(2, "0");
  const timeStr = `${hh}:${min}`;

  const dd = now.getDate().toString().padStart(2, "0");
  const mo = (now.getMonth() + 1).toString().padStart(2, "0");
  const dateLabel = `${dd}/${mo}`;

  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const miniCells = getMonthDays(popYear, popMonth);
  const todayMid = todayMidnight();

  function popPrev() {
    if (popMonth === 0) {
      setPopYear((y) => y - 1);
      setPopMonth(11);
    } else setPopMonth((m) => m - 1);
  }
  function popNext() {
    if (popMonth === 11) {
      setPopYear((y) => y + 1);
      setPopMonth(0);
    } else setPopMonth((m) => m + 1);
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="clock-popup"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-50"
            style={{ ...WIDGET_POPUP_STYLE, width: 256 }}
          >
            {/* Time + date header */}
            <div
              style={{
                padding: "14px 16px 12px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <p
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  letterSpacing: "-0.05em",
                  color: "var(--text-primary)",
                  lineHeight: 1,
                }}
              >
                {timeStr}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginTop: 5,
                  textTransform: "capitalize",
                }}
              >
                {dateStr}
              </p>
            </div>

            {/* Mini calendar */}
            <div style={{ padding: "12px 14px 8px" }}>
              {/* Mini header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  {MONTH_NAMES[popMonth]} {popYear}
                </span>
                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    type="button"
                    onClick={popPrev}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={popNext}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  marginBottom: 3,
                }}
              >
                {DAY_HEADERS_SHORT.map((h) => (
                  <span
                    key={h}
                    style={{
                      textAlign: "center",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.25)",
                    }}
                  >
                    {h[0]}
                  </span>
                ))}
              </div>

              {/* Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "2px 0",
                }}
              >
                {miniCells.map((cell, i) => {
                  const isToday = isSameDay(cell.date, todayMid);
                  return (
                    <div
                      key={i}
                      style={{
                        aspectRatio: "1",
                        borderRadius: "50%",
                        fontSize: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isToday ? "#8b5cf6" : "transparent",
                        color: isToday
                          ? "#fff"
                          : !cell.isCurrentMonth
                            ? "rgba(255,255,255,0.18)"
                            : "rgba(255,255,255,0.7)",
                        fontWeight: isToday ? 700 : 400,
                      }}
                    >
                      {cell.date.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Open calendar button */}
            <div style={{ padding: "0 14px 14px" }}>
              <button
                type="button"
                onClick={() => {
                  openApp("calendar", "Calendário");
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 8,
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.22)",
                  color: "#a78bfa",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.1)";
                }}
              >
                Abrir Calendário →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            Calendário
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dock icon */}
      <div
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex flex-col items-center justify-center cursor-pointer transition-colors"
        style={{
          width: ICON_BASE,
          height: ICON_BASE,
          borderRadius: "var(--radius-lg)",
          gap: 1,
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
        <CalendarDays
          size={18}
          strokeWidth={1.4}
          style={{ color: "rgba(255,255,255,0.65)" }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          {dateLabel}
        </span>
      </div>
    </div>
  );
}

/* ── Todos os apps (atalho direto) ──────────────────────────────────── */

function DockAppsLauncherWidget() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const openAppsLauncher = useOSStore((s) => s.openAppsLauncher);

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
            }}
          >
            Todos os apps
          </motion.div>
        )}
      </AnimatePresence>

      <div
        onClick={openAppsLauncher}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex flex-col items-center justify-center cursor-pointer"
        style={{
          width: ICON_BASE,
          height: ICON_BASE,
          borderRadius: "var(--radius-lg)",
          gap: 2,
          background: "transparent",
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "var(--glass-bg-hover)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <LayoutGrid
          size={20}
          strokeWidth={1.4}
          style={{ color: "rgba(255,255,255,0.65)" }}
        />
      </div>
    </div>
  );
}

/* ── Menu Suporte (popup) ───────────────────────────────────────────── */

const SUPPORT_ITEMS = [
  { label: "Ocultar Dock", icon: "▬", key: "dock" },
  { label: "Configurações", icon: "⚙", key: "settings" },
  { label: "Suporte", icon: "🛟", key: "support" },
] as const;

function DockSupportMenuWidget() {
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const openApp = useOSStore((s) => s.openApp);
  const toggleDockHidden = useOSStore((s) => s.toggleDockHidden);
  const openSupport = useOSStore((s) => s.openSupport);

  function handleAction(key: (typeof SUPPORT_ITEMS)[number]["key"]) {
    setOpen(false);
    if (key === "dock") toggleDockHidden();
    else if (key === "settings") openApp("settings", "Configurações");
    else if (key === "support") openSupport();
  }

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
            Suporte
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown menu */}
      <AnimatePresence>
        {open && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 250 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              key="support-menu"
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-[251]"
              style={{
                width: 196,
                borderRadius: 12,
                background: "rgba(10,12,22,0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.65)",
                padding: 5,
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              {SUPPORT_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleAction(item.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 8,
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.72)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 100ms, color 100ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(139,92,246,0.14)";
                    e.currentTarget.style.color = "#c4b5fd";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.72)";
                  }}
                >
                  <span
                    style={{ fontSize: 15, width: 20, textAlign: "center" }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dock icon */}
      <div
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex flex-col items-center justify-center cursor-pointer"
        style={{
          width: ICON_BASE,
          height: ICON_BASE,
          borderRadius: "var(--radius-lg)",
          gap: 2,
          background: open ? "var(--glass-bg)" : "transparent",
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
        <LifeBuoy
          size={20}
          strokeWidth={1.4}
          style={{ color: "rgba(255,255,255,0.65)" }}
        />
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
  const openApp = useOSStore((s) => s.openApp);
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
            <div
              style={{
                padding: "8px 12px 12px",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  openApp("notifications", "Notificações");
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 8,
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.22)",
                  color: "#a78bfa",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.1)";
                }}
              >
                Abrir Notificações →
              </button>
            </div>
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
  onContextMenu,
}: {
  app: OSApp;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  isOpen: boolean;
  isActiveTab: boolean;
  onContextMenu: (e: React.MouseEvent, appId: string) => void;
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
        onClick={() => {
          // INP: re-render do TabBar/AppFrame ao abrir/fechar tab eh nao-urgente,
          // libera a thread pra paint do feedback visual antes do commit.
          startTransition(() => {
            if (app.opensAsModal === true) toggleAIModal();
            else openApp(app.id, app.name);
          });
        }}
        onContextMenu={(e) => onContextMenu(e, app.id)}
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
  const dockHidden = useOSStore((s) => s.dockHidden);
  const toggleDockHidden = useOSStore((s) => s.toggleDockHidden);
  const order = useDockStore((s) => s.order);
  const installed = useInstalledModulesStore((s) => s.installed);
  const dockApps = order
    .map((id) => getApp(id))
    .filter((a): a is OSApp => a !== undefined)
    .filter((a) => a.alwaysEnabled === true || installed.has(a.id));
  const mouseX = useMotionValue(Infinity);

  const openAppIds = new Set(tabs.map((t) => t.appId));
  const activeAppId = tabs.find((t) => t.id === activeTabId)?.appId;

  // Sprint 26: menu de contexto do icone (Remover da Dock / Desinstalar).
  const [iconCtx, setIconCtx] = useState<{
    appId: string;
    x: number;
    y: number;
  } | null>(null);
  const handleIconContextMenu = (e: React.MouseEvent, appId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIconCtx({ appId, x: e.clientX, y: e.clientY });
  };

  return (
    <>
      {/* Strip de re-exibição — visível só quando dock está oculto */}
      <AnimatePresence>
        {dockHidden && (
          <motion.button
            key="dock-reveal"
            type="button"
            title="Mostrar Dock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={toggleDockHidden}
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 52,
              padding: "3px 24px 5px",
              borderRadius: "8px 8px 0 0",
              background: "rgba(139,92,246,0.14)",
              border: "1px solid rgba(139,92,246,0.22)",
              borderBottom: "none",
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                width: 28,
                height: 3,
                borderRadius: 2,
                background: "rgba(139,92,246,0.6)",
              }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50"
        data-testid="dock"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: dockHidden ? 0 : 1, y: dockHidden ? 80 : 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        style={{ pointerEvents: dockHidden ? "none" : "auto" }}
      >
        <motion.div
          onMouseMove={(e) => mouseX.set(e.pageX)}
          onMouseLeave={() => mouseX.set(Infinity)}
          className="flex items-end pb-3 pt-3 px-4"
          style={{
            gap: 10,
            background: "rgba(6,9,18,0.81)",
            backdropFilter: `blur(var(--blur-dock))`,
            WebkitBackdropFilter: `blur(var(--blur-dock))`,
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-dock)",
            boxShadow: "var(--shadow-dock)",
          }}
        >
          {/* Widget: Tempo + Atalhos do sistema (esquerda) */}
          <DockWeatherWidget />
          <DockAppsLauncherWidget />
          <DockSupportMenuWidget />
          <DockDivider />

          {/* Apps */}
          {dockApps.map((app) => (
            <DockIcon
              key={app.id}
              app={app}
              mouseX={mouseX}
              isOpen={openAppIds.has(app.id)}
              isActiveTab={activeAppId === app.id}
              onContextMenu={handleIconContextMenu}
            />
          ))}

          {/* Widget: Calendário + Notificações (direita) */}
          <DockDivider />
          <DockClockWidget />
          <DockNotifWidget />
        </motion.div>
      </motion.div>

      {iconCtx !== null && (
        <AppContextMenu
          surface="dock"
          appId={iconCtx.appId}
          pos={{ x: iconCtx.x, y: iconCtx.y }}
          onClose={() => setIconCtx(null)}
        />
      )}
    </>
  );
}
