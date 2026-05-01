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

const SANDWICH_NAV = [
  { id: "drive", label: "Drive", icon: HardDrive, color: "#06b6d4" },
  { id: "pessoas", label: "Pessoas", icon: Users, color: "#8b5cf6" },
  { id: "chat", label: "Mensagens", icon: MessageSquare, color: "#06b6d4" },
  { id: "magic-store", label: "Magic Store", icon: Star, color: "#0ea5e9" },
];

function SandwichPanel({
  onClose,
  email,
  companyName,
  initials,
  onSignOut,
  onSettings,
  onNav,
}: {
  onClose: () => void;
  email: string | null;
  companyName: string | null;
  initials: string;
  onSignOut: () => void;
  onSettings: () => void;
  onNav: (id: string, name: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[90]"
        style={{ background: "rgba(0,0,0,0.35)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        ref={ref}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
        className="fixed top-0 right-0 bottom-0 z-[91] flex flex-col"
        style={{
          width: 260,
          background: "rgba(6,9,18,0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid var(--glass-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header do painel */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Menu
          </span>
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex items-center justify-center transition-opacity hover:opacity-60"
            style={{ color: "var(--text-tertiary)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* User info */}
        <div
          className="flex items-center gap-3 px-4 py-4"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.8), rgba(30,41,80,0.9))",
              border: "1px solid var(--glass-border)",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {initials}
            </span>
          </div>
          <div className="min-w-0">
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
        </div>

        {/* Navegação rápida */}
        <div className="flex-1 overflow-y-auto py-2">
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "8px 16px 4px",
            }}
          >
            Navegação rápida
          </p>
          {SANDWICH_NAV.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => {
                onNav(id, label);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer"
              style={{ color: "var(--text-secondary)", fontSize: 13 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--glass-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--radius-md)",
                  background: `${color}18`,
                }}
              >
                <Icon size={14} style={{ color }} strokeWidth={1.6} />
              </div>
              {label}
            </button>
          ))}
        </div>

        {/* Ações de conta */}
        <div
          className="py-2"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <button
            onClick={() => {
              onSettings();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer"
            style={{ color: "var(--text-secondary)", fontSize: 13 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--glass-bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: "var(--radius-md)",
                background: "rgba(100,116,139,0.15)",
              }}
            >
              <Settings
                size={14}
                style={{ color: "#94a3b8" }}
                strokeWidth={1.6}
              />
            </div>
            Configurações
          </button>
          <button
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer"
            style={{ color: "#f87171", fontSize: 13 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(248,113,113,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: "var(--radius-md)",
                background: "rgba(239,68,68,0.12)",
              }}
            >
              <LogOut
                size={14}
                style={{ color: "#f87171" }}
                strokeWidth={1.6}
              />
            </div>
            Sair
          </button>
        </div>
      </motion.div>
    </>
  );
}

interface TopBarProps {
  companyName: string | null;
  onSignOut: () => void;
}

export function TopBar({ companyName, onSignOut }: TopBarProps) {
  const { email } = useSessionStore();
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
          height: 36,
          background: "rgba(6,9,18,0.96)",
          borderBottom: "1px solid var(--glass-border)",
          position: "relative",
          zIndex: 50,
        }}
      >
        {/* Left: ÆTHEREOS */}
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

        {/* Right: company + avatar (sandwich trigger) */}
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

          {/* Avatar — sandwich menu trigger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            className="flex items-center justify-center transition-opacity hover:opacity-75"
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
        </div>
      </header>

      {/* Sandwich panel (portal-like, fora do header) */}
      <AnimatePresence>
        {menuOpen && (
          <SandwichPanel
            onClose={() => setMenuOpen(false)}
            email={email}
            companyName={companyName}
            initials={initials}
            onSignOut={onSignOut}
            onSettings={() => openApp("settings", "Configurações")}
            onNav={(id, name) => openApp(id, name)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
