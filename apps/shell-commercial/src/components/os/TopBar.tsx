import { useState, useEffect, useRef } from "react";
import { Bell, LogOut, Settings, ChevronDown } from "lucide-react";
import { motion, AnimatePresence, type MotionStyle } from "framer-motion";
import { useSessionStore } from "../../stores/session";
import { useOSStore } from "../../stores/osStore";

const dropdownStyle: MotionStyle = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-lg)",
  backdropFilter: "blur(var(--glass-blur-heavy))",
};

function Clock() {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const now = new Date();
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    const timeout = setTimeout(() => {
      setTime(formatTime(new Date()));
      const interval = setInterval(
        () => setTime(formatTime(new Date())),
        60000,
      );
      return () => clearInterval(interval);
    }, msUntilNextMinute);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <span
      className="text-[13px] tabular-nums font-medium"
      style={{ color: "var(--text-secondary)" }}
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-1 w-80 z-50"
      style={dropdownStyle}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          Notificações
        </span>
      </div>
      <div className="px-3 py-6 text-center">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-1 w-56 z-50"
      style={dropdownStyle}
    >
      <div
        className="px-3 py-2.5"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <p
          className="text-xs font-medium truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {email ?? "—"}
        </p>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          {companyName ?? "—"}
        </p>
      </div>
      <div className="py-1">
        <button
          onClick={() => {
            onSettings();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--glass-bg-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Settings size={14} />
          Configurações
        </button>
        <div
          className="my-1 mx-2"
          style={{
            height: 1,
            background: "var(--glass-border)",
          }}
        />
        <button
          onClick={() => {
            onSignOut();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer text-red-400"
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(239,68,68,0.08)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </motion.div>
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
        height: 38,
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Left: Logo + Company */}
      <div className="flex items-center gap-2">
        <span
          className="text-[13px] font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Aethereos
        </span>
        {companyName !== null && (
          <>
            <div
              style={{
                width: 1,
                height: 14,
                background: "var(--border-subtle)",
              }}
            />
            <div className="flex items-center gap-1 cursor-pointer">
              <span
                className="text-[12px] font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {companyName}
              </span>
              <ChevronDown
                size={12}
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
          style={{ width: 1, height: 14, background: "var(--border-subtle)" }}
          className="mx-1"
        />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setAvatarOpen(false);
            }}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{
              width: 32,
              height: 32,
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--glass-bg-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <Bell size={16} strokeWidth={1.8} />
          </button>
          <AnimatePresence>
            {notifOpen && (
              <NotificationsDropdown onClose={() => setNotifOpen(false)} />
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <div className="relative">
          <button
            onClick={() => {
              setAvatarOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
            style={{
              width: 26,
              height: 26,
              background: "linear-gradient(135deg, #475569, #1e293b)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span className="text-white text-[11px] font-semibold leading-none">
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
