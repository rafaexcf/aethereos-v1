import { createPortal } from "react-dom";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_REGISTRY } from "../lib/app-registry";

interface AppsLauncherProps {
  open: boolean;
  onClose: () => void;
  onOpenApp: (id: string, label: string) => void;
}

export function AppsLauncher({ open, onClose, onOpenApp }: AppsLauncherProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return APP_REGISTRY;
    return APP_REGISTRY.filter((a) => a.label.toLowerCase().includes(q));
  }, [search]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="apps-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 202,
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          />

          {/* Drawer acima da dock */}
          <motion.div
            key="apps-drawer"
            initial={{ opacity: 0, x: "-50%", y: 24 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              zIndex: 203,
              bottom: 100,
              left: "50%",
              width: "min(680px, 88vw)",
              maxHeight: "min(480px, 68vh)",
              borderRadius: 16,
              background: "rgba(8,10,18,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                "0 -4px 40px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.9)",
                  letterSpacing: "-0.01em",
                }}
              >
                Todos os Apps
              </span>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: "12px 18px 8px", flexShrink: 0 }}>
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar app…"
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Grid */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px 18px 20px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))",
                gap: 10,
                alignContent: "start",
              }}
            >
              {filtered.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    onOpenApp(app.id, app.label);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    padding: "20px 12px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    transition: "background 140ms, border-color 140ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(139,92,246,0.12)";
                    e.currentTarget.style.borderColor = "rgba(139,92,246,0.28)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.06)";
                  }}
                >
                  <span style={{ fontSize: 34, lineHeight: 1 }}>
                    {app.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.72)",
                      textAlign: "center",
                      lineHeight: 1.3,
                    }}
                  >
                    {app.label}
                  </span>
                </button>
              ))}

              {filtered.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    paddingTop: 40,
                    textAlign: "center",
                    color: "rgba(255,255,255,0.25)",
                    fontSize: 13,
                  }}
                >
                  Nenhum app encontrado
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
