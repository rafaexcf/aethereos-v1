import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Lock, LogOut } from "lucide-react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import { useModalA11y } from "../shared/useModalA11y";
import { useAppTranslation } from "../../hooks/useAppTranslation";

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000 * 30);
    return () => window.clearInterval(id);
  }, []);
  return now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function useToday(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000 * 60 * 5);
    return () => window.clearInterval(id);
  }, []);
  return now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function LockScreen() {
  const { t } = useAppTranslation("shell");
  const navigate = useNavigate();
  const drivers = useDrivers();
  const email = useSessionStore((s) => s.email);
  const avatarUrl = useSessionStore((s) => s.avatarUrl);
  const unlock = useSessionStore((s) => s.unlock);
  const clearSession = useSessionStore((s) => s.clearSession);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clock = useClock();
  const today = useToday();

  const noop = useCallback(() => {
    // bloqueado: Esc nao fecha
  }, []);
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose: noop });

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, []);

  const initials =
    email !== null && email.length > 0 ? email.slice(0, 2).toUpperCase() : "??";
  const userName =
    email !== null && email.includes("@") ? email.split("@")[0] : email;

  const handleUnlock = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (drivers === null || email === null || submitting) return;
      if (password.length === 0) {
        setError("Digite sua senha para desbloquear.");
        return;
      }
      setSubmitting(true);
      setError(null);
      const result = await drivers.auth.signIn(email, password);
      if (!result.ok) {
        setError(result.error.message);
        setPassword("");
        setSubmitting(false);
        inputRef.current?.focus();
        return;
      }
      setPassword("");
      setSubmitting(false);
      unlock();
    },
    [drivers, email, password, submitting, unlock],
  );

  const handleSignOut = useCallback(async () => {
    if (drivers === null) return;
    await drivers.auth.signOut();
    clearSession();
    await navigate({ to: "/login" });
  }, [drivers, clearSession, navigate]);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Tela bloqueada"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(17,22,28,0.96)",
        backdropFilter: "blur(36px) saturate(160%)",
        WebkitBackdropFilter: "blur(36px) saturate(160%)",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 0,
          right: 0,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 300,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {clock}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "var(--text-tertiary)",
            textTransform: "capitalize",
          }}
        >
          {today}
        </div>
      </div>

      <motion.form
        onSubmit={handleUnlock}
        initial={{ scale: 0.97, opacity: 0, y: 6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        style={{
          width: 320,
          padding: "32px 28px 24px",
          borderRadius: 20,
          background: "rgba(25,29,33,0.72)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03) inset",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(30,41,80,0.95))",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {avatarUrl !== null ? (
            <img
              src={avatarUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              {initials}
            </span>
          )}
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
              textTransform: "capitalize",
            }}
          >
            {userName ?? "Conta"}
          </div>
          {email !== null && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              {email}
            </div>
          )}
        </div>

        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${error !== null ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          <Lock
            size={13}
            strokeWidth={1.7}
            style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
          />
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.currentTarget.value);
              if (error !== null) setError(null);
            }}
            placeholder={t("lockscreen.password_placeholder")}
            aria-label={t("lockscreen.password_placeholder")}
            autoComplete="current-password"
            disabled={submitting}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
        </div>

        {error !== null && (
          <div
            role="alert"
            style={{
              width: "100%",
              fontSize: 11,
              color: "#fca5a5",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || password.length === 0}
          style={{
            width: "100%",
            height: 38,
            borderRadius: 10,
            border: "1px solid rgba(99,102,241,0.45)",
            background:
              submitting || password.length === 0
                ? "rgba(99,102,241,0.18)"
                : "rgba(99,102,241,0.32)",
            color: "var(--text-primary)",
            fontSize: 13,
            fontWeight: 600,
            cursor: submitting || password.length === 0 ? "default" : "pointer",
            transition: "background 100ms",
          }}
        >
          {submitting ? t("lockscreen.unlocking") : t("lockscreen.unlock")}
        </button>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            color: "var(--text-tertiary)",
            fontSize: 11,
            cursor: "pointer",
            padding: "4px 8px",
            marginTop: -4,
          }}
        >
          <LogOut size={11} strokeWidth={1.6} />
          Sair desta conta
        </button>
      </motion.form>
    </motion.div>
  );
}
