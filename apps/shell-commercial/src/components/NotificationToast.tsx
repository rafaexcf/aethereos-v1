import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { NotificationItem } from "./NotificationBell";
import { useOSStore } from "../stores/osStore";

interface NotificationToastProps {
  item: NotificationItem | null;
  onDismiss: (id: string) => void;
}

const TYPE_CONFIG: Record<
  NotificationItem["type"],
  { color: string; accentBg: string; border: string; label: string }
> = {
  success: {
    color: "#4ade80",
    accentBg: "rgba(74,222,128,0.12)",
    border: "rgba(74,222,128,0.22)",
    label: "Sucesso",
  },
  info: {
    color: "#60a5fa",
    accentBg: "rgba(96,165,250,0.1)",
    border: "rgba(96,165,250,0.2)",
    label: "Info",
  },
  warning: {
    color: "#fbbf24",
    accentBg: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.2)",
    label: "Atenção",
  },
  error: {
    color: "#f87171",
    accentBg: "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.2)",
    label: "Erro",
  },
};

// Dock bottom: 20px (bottom-5) + dock height ~72px + 12px gap
const BOTTOM_OFFSET = 104;

// 420px × 1.3 = 546px
const TOAST_WIDTH = "min(546px, 92vw)";

export function NotificationToast({ item, onDismiss }: NotificationToastProps) {
  const openApp = useOSStore((s) => s.openApp);
  const cfg = item !== null ? TYPE_CONFIG[item.type] : null;

  function handleNavigate() {
    if (item === null || item.appId === undefined) return;
    openApp(item.appId, item.app ?? item.appId);
    onDismiss(item.id);
  }

  return createPortal(
    <AnimatePresence>
      {item !== null && cfg !== null && (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: "-50%", y: 16, scale: 0.97 }}
          animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
          exit={{ opacity: 0, x: "-50%", y: 10, scale: 0.98 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            bottom: BOTTOM_OFFSET,
            left: "50%",
            width: TOAST_WIDTH,
            cursor: item.appId !== undefined ? "pointer" : "default",
            zIndex: 400,
            borderRadius: 14,
            background: "rgba(8,10,20,0.96)",
            border: `1px solid ${cfg.border}`,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: `0 8px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 0 60px ${cfg.accentBg}`,
            overflow: "hidden",
          }}
        >
          <div
            onClick={item.appId !== undefined ? handleNavigate : undefined}
            style={{
              padding: "13px 14px 14px",
              display: "flex",
              gap: 11,
              alignItems: "flex-start",
            }}
          >
            {/* Colored accent dot */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: cfg.accentBg,
                border: `1.5px solid ${cfg.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: cfg.color,
                  boxShadow: `0 0 8px ${cfg.color}`,
                }}
              />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: cfg.color,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  {item.app ?? cfg.label}
                </span>
                <span
                  style={{
                    width: 2,
                    height: 2,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  agora
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.92)",
                  margin: 0,
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                }}
              >
                {item.title}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.48)",
                  marginTop: 4,
                  lineHeight: 1.45,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {item.body}
              </p>
              {item.appId !== undefined && (
                <p
                  style={{
                    fontSize: 11,
                    color: cfg.color,
                    marginTop: 6,
                    fontWeight: 500,
                    opacity: 0.8,
                  }}
                >
                  Abrir {item.app ?? "app"} →
                </p>
              )}
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.35)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 100ms, color 100ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "rgba(255,255,255,0.35)";
              }}
            >
              <X size={11} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
