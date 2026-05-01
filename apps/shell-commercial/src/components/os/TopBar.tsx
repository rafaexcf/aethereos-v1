import { useState, useEffect, useRef } from "react";
import {
  LogOut,
  Settings,
  Building2,
  HardDrive,
  Users,
  MessageSquare,
  Star,
  X,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "../../stores/session";
import { useOSStore } from "../../stores/osStore";

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

const NAV_APPS = [
  { id: "drive", label: "Drive", icon: HardDrive, color: "#06b6d4" },
  { id: "pessoas", label: "Pessoas", icon: Users, color: "#8b5cf6" },
  { id: "chat", label: "Mensagens", icon: MessageSquare, color: "#06b6d4" },
  { id: "magic-store", label: "Magic Store", icon: Star, color: "#0ea5e9" },
];

function ControlPanel({
  onClose,
  email,
  companyName,
  initials,
  avatarUrl,
  onSignOut,
  onSettings,
  onNav,
}: {
  onClose: () => void;
  email: string | null;
  companyName: string | null;
  initials: string;
  avatarUrl: string | null;
  onSignOut: () => void;
  onSettings: () => void;
  onNav: (id: string, name: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.65 }}
      className="fixed z-[91] flex flex-col"
      style={{
        top: 48,
        right: 12,
        width: 296,
        transformOrigin: "top right",
        background: "rgba(12, 18, 26, 0.95)",
        backdropFilter: "blur(48px)",
        WebkitBackdropFilter: "blur(48px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        boxShadow:
          "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
        overflow: "hidden",
      }}
    >
      {/* ── User section ── */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Avatar */}
        <div
          className="flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(30,41,80,0.95))",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {avatarUrl !== null ? (
            <img
              src={avatarUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <span
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {initials}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p
            className="truncate"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {email ?? "—"}
          </p>
          {companyName !== null && (
            <div className="flex items-center gap-1 mt-0.5">
              <Building2
                size={10}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
              <p
                className="truncate"
                style={{ fontSize: 11, color: "var(--text-tertiary)" }}
              >
                {companyName}
              </p>
            </div>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Fechar painel"
          className="flex items-center justify-center transition-opacity hover:opacity-60"
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
            color: "var(--text-tertiary)",
            flexShrink: 0,
          }}
        >
          <X size={11} />
        </button>
      </div>

      {/* ── App grid 2 × 2 ── */}
      <div
        className="grid grid-cols-2 gap-2 p-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {NAV_APPS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => {
              onNav(id, label);
              onClose();
            }}
            className="flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
            style={{
              height: 76,
              borderRadius: 14,
              background: `${color}12`,
              border: `1px solid ${color}20`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${color}20`;
              e.currentTarget.style.borderColor = `${color}38`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${color}12`;
              e.currentTarget.style.borderColor = `${color}20`;
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: `${color}20`,
              }}
            >
              <Icon size={17} style={{ color }} strokeWidth={1.6} />
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* ── Bottom actions ── */}
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          onClick={() => {
            onSettings();
            onClose();
          }}
          className="flex flex-1 items-center justify-center gap-1.5 cursor-pointer transition-all"
          style={{
            height: 36,
            borderRadius: 10,
            background: "rgba(100,116,139,0.12)",
            border: "1px solid rgba(100,116,139,0.18)",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(100,116,139,0.22)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(100,116,139,0.12)";
          }}
        >
          <Settings size={13} style={{ color: "#94a3b8" }} strokeWidth={1.6} />
          Configurações
        </button>

        <button
          onClick={() => {
            onSignOut();
            onClose();
          }}
          className="flex flex-1 items-center justify-center gap-1.5 cursor-pointer transition-all"
          style={{
            height: 36,
            borderRadius: 10,
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.18)",
            fontSize: 12,
            color: "#f87171",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.20)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.10)";
          }}
        >
          <LogOut size={13} style={{ color: "#f87171" }} strokeWidth={1.6} />
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
  const { email, avatarUrl } = useSessionStore();
  const openApp = useOSStore((s) => s.openApp);
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = email ? email.slice(0, 2).toUpperCase() : "??";

  return (
    <>
      <header
        data-testid="topbar"
        role="banner"
        aria-label="topbar"
        className="flex shrink-0 items-center justify-between px-4"
        style={{
          height: 42,
          background: "rgba(6,9,18,0.81)",
          backdropFilter: "blur(var(--blur-dock))",
          WebkitBackdropFilter: "blur(var(--blur-dock))",
          borderBottom: "1px solid var(--glass-border)",
          position: "relative",
          zIndex: 50,
        }}
      >
        {/* Left: wordmark */}
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          ÆTHEREOS
        </span>

        {/* Right: company name + avatar trigger */}
        <div className="flex items-center gap-2">
          {companyName !== null && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              {companyName}
            </span>
          )}

          {/* Avatar + hamburger badge */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir painel de controle"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className="relative flex items-center justify-center transition-opacity hover:opacity-75 overflow-hidden"
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.8), rgba(30,41,80,0.9))",
              border: "1px solid var(--glass-border)",
              flexShrink: 0,
            }}
          >
            {avatarUrl !== null ? (
              <img
                src={avatarUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
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
            )}

            {/* Hamburger badge */}
            <span
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                bottom: -3,
                right: -3,
                width: 13,
                height: 13,
                borderRadius: "50%",
                background: "rgba(6,9,18,0.95)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              <Menu size={7} style={{ color: "rgba(255,255,255,0.75)" }} />
            </span>
          </button>
        </div>
      </header>

      {/* macOS-style Control Panel popup */}
      <AnimatePresence>
        {menuOpen && (
          <ControlPanel
            onClose={() => setMenuOpen(false)}
            email={email}
            companyName={companyName}
            initials={initials}
            avatarUrl={avatarUrl}
            onSignOut={onSignOut}
            onSettings={() => openApp("settings", "Configurações")}
            onNav={(id, name) => openApp(id, name)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
