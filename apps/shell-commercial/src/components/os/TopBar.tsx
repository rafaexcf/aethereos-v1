import { useState, useEffect, useRef } from "react";
import { Bell, LogOut, Settings, ChevronDown } from "lucide-react";
import { motion, AnimatePresence, type MotionStyle } from "framer-motion";
import { useSessionStore } from "../../stores/session";
import { useOSStore } from "../../stores/osStore";

const DROPDOWN_STYLE: MotionStyle = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-lg)",
  backdropFilter: `blur(var(--blur-ui))`,
  WebkitBackdropFilter: `blur(var(--blur-ui))`,
};

const DROPDOWN_MOTION = {
  initial: { opacity: 0, y: 8, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 6, scale: 0.97 },
  transition: { duration: 0.14, ease: "easeOut" },
};

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, handler]);
}

function Clock() {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const now = new Date();
    const ms = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    const t = setTimeout(() => {
      setTime(formatTime(new Date()));
      const id = setInterval(() => setTime(formatTime(new Date())), 60_000);
      return () => clearInterval(id);
    }, ms);
    return () => clearTimeout(t);
  }, []);

  return (
    <span
      className="tabular-nums"
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text-secondary)",
        letterSpacing: "-0.01em",
      }}
    >
      {time}
    </span>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  return (
    <motion.div
      ref={ref}
      {...DROPDOWN_MOTION}
      className="absolute right-0 top-full mt-2 w-80 z-50"
      style={{ ...DROPDOWN_STYLE, overflow: "hidden" }}
    >
      <div
        className="flex items-center px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Notificações
        </span>
      </div>
      <div className="px-4 py-8 text-center">
        <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Sem notificações
        </p>
      </div>
    </motion.div>
  );
}

function AvatarDropdown({
  onClose,
  email,
  companyName,
  onSignOut,
  onSettings,
}: {
  onClose: () => void;
  email: string | null;
  companyName: string | null;
  onSignOut: () => void;
  onSettings: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  return (
    <motion.div
      ref={ref}
      {...DROPDOWN_MOTION}
      className="absolute right-0 top-full mt-2 w-56 z-50"
      style={{ ...DROPDOWN_STYLE, overflow: "hidden" }}
    >
      <div
        className="px-3 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <p
          className="truncate"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {email ?? "—"}
        </p>
        <p
          className="truncate mt-0.5"
          style={{ fontSize: 11, color: "var(--text-tertiary)" }}
        >
          {companyName ?? "—"}
        </p>
      </div>
      <div className="py-1">
        <MenuItem
          icon={<Settings size={13} />}
          label="Configurações"
          onClick={() => {
            onSettings();
            onClose();
          }}
        />
        <div
          style={{
            height: 1,
            background: "var(--border-subtle)",
            margin: "4px 12px",
          }}
        />
        <MenuItem
          icon={<LogOut size={13} />}
          label="Sair"
          onClick={() => {
            onSignOut();
            onClose();
          }}
          danger
        />
      </div>
    </motion.div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 transition-colors cursor-pointer"
      style={{
        color: danger ? "#f87171" : "var(--text-secondary)",
        fontSize: 12,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = danger
          ? "rgba(248,113,113,0.08)"
          : "var(--glass-bg-hover)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      {label}
    </button>
  );
}

interface TopBarProps {
  companyName: string | null;
  onSignOut: () => void;
}

export function TopBar({ companyName, onSignOut }: TopBarProps) {
  const { email } = useSessionStore();
  const openApp = useOSStore((s) => s.openApp);
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const initials = email ? email.slice(0, 2).toUpperCase() : "??";

  return (
    <header
      data-testid="topbar"
      role="banner"
      aria-label="topbar"
      className="flex shrink-0 items-center justify-between px-4"
      style={{
        height: 32,
        background: "rgba(6,9,18,0.72)",
        backdropFilter: `blur(var(--blur-ui))`,
        WebkitBackdropFilter: `blur(var(--blur-ui))`,
        borderBottom: "1px solid var(--border-subtle)",
        boxShadow: "var(--glass-specular)",
      }}
    >
      {/* Left: Logo + Company */}
      <div className="flex items-center gap-2">
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          Aethereos
        </span>

        {companyName !== null && (
          <>
            <div
              style={{
                width: 1,
                height: 12,
                background: "var(--border-subtle)",
              }}
            />
            <div className="flex items-center gap-1 cursor-pointer">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                {companyName}
              </span>
              <ChevronDown
                size={11}
                style={{ color: "var(--text-tertiary)" }}
              />
            </div>
          </>
        )}
      </div>

      {/* Right: Clock, Bell, Avatar */}
      <div className="flex items-center gap-1">
        <Clock />

        <div
          style={{ width: 1, height: 12, background: "var(--border-subtle)" }}
          className="mx-1.5"
        />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setAvatarOpen(false);
            }}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--radius-sm)",
              color: "var(--text-tertiary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--glass-bg-hover)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            <Bell size={15} strokeWidth={1.7} />
          </button>
          <AnimatePresence>
            {notifOpen && (
              <NotificationsDropdown onClose={() => setNotifOpen(false)} />
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <div className="relative ml-0.5">
          <button
            onClick={() => {
              setAvatarOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center justify-center transition-opacity hover:opacity-80"
            style={{
              width: 24,
              height: 24,
              borderRadius: "var(--radius-full)",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.8), rgba(30,41,80,0.9))",
              border: "1px solid var(--glass-border-strong)",
              boxShadow: "var(--glass-specular)",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              {initials}
            </span>
          </button>
          <AnimatePresence>
            {avatarOpen && (
              <AvatarDropdown
                onClose={() => setAvatarOpen(false)}
                email={email}
                companyName={companyName}
                onSignOut={onSignOut}
                onSettings={() => openApp("settings", "Configurações")}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
