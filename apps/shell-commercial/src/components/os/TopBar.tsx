import { useState } from "react";
import { Menu } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useSessionStore } from "../../stores/session";
import { CommandCenter } from "./CommandCenter";

interface TopBarProps {
  companyName: string | null;
  onSignOut: () => void;
}

export function TopBar({ companyName, onSignOut }: TopBarProps) {
  const { email, avatarUrl } = useSessionStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = email !== null ? email.slice(0, 2).toUpperCase() : "??";

  return (
    <>
      <header
        data-testid="topbar"
        role="banner"
        aria-label="topbar"
        className="flex items-center justify-between px-4"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 42,
          background: "rgba(6,9,18,0.81)",
          backdropFilter: "blur(var(--blur-dock))",
          WebkitBackdropFilter: "blur(var(--blur-dock))",
          borderBottom: "1px solid var(--glass-border)",
          zIndex: 50,
        }}
      >
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

      <AnimatePresence>
        {menuOpen && (
          <CommandCenter
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            email={email}
            companyName={companyName}
            initials={initials}
            avatarUrl={avatarUrl}
            onSignOut={onSignOut}
          />
        )}
      </AnimatePresence>
    </>
  );
}
