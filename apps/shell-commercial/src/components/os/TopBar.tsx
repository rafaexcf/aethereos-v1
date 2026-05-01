import { useState, useEffect, useRef } from "react";
import { LogOut, Settings, ChevronDown } from "lucide-react";
import { motion, AnimatePresence, type MotionStyle } from "framer-motion";
import { useSessionStore } from "../../stores/session";
import { useOSStore } from "../../stores/osStore";

const DROPDOWN_STYLE: MotionStyle = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-lg)",
  backdropFilter: "blur(var(--glass-blur-heavy))",
  WebkitBackdropFilter: "blur(var(--glass-blur-heavy))",
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
  const [avatarOpen, setAvatarOpen] = useState(false);
  const initials = email ? email.slice(0, 2).toUpperCase() : "??";

  function closeAll() {
    setAvatarOpen(false);
  }

  return (
    <header
      data-testid="topbar"
      role="banner"
      aria-label="topbar"
      className="relative flex shrink-0 items-center justify-between px-4"
      style={{
        height: 36,
        background: "rgba(6,9,18,0.96)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      {/* Left: ÆTHEREOS */}
      <div className="flex items-center">
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          ÆTHEREOS
        </span>
      </div>

      {/* Center: Company name (absolute) */}
      {companyName !== null && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 cursor-pointer select-none"
          style={{ pointerEvents: "auto" }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            {companyName}
          </span>
          <ChevronDown size={11} style={{ color: "var(--text-tertiary)" }} />
        </div>
      )}

      {/* Right: Avatar */}
      <div className="flex items-center gap-0.5">
        {/* Avatar */}
        <div className="relative ml-0.5">
          <button
            onClick={() => setAvatarOpen((v) => !v)}
            aria-label="Menu do usuário"
            className="flex items-center justify-center transition-opacity hover:opacity-80"
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.8), rgba(30,41,80,0.9))",
              border: "1px solid var(--glass-border)",
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
                onSignOut={() => {
                  closeAll();
                  onSignOut();
                }}
                onSettings={() => openApp("settings", "Configurações")}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
