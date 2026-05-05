import { createPortal } from "react-dom";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { X, Search } from "lucide-react";
import { APP_REGISTRY } from "../apps/registry";
import { useInstalledModulesStore } from "../stores/installedModulesStore";
import { AppContextMenu } from "./os/AppContextMenu";

interface AppsLauncherProps {
  open: boolean;
  onClose: () => void;
  onOpenApp: (id: string, label: string) => void;
}

export function AppsLauncher({ open, onClose, onOpenApp }: AppsLauncherProps) {
  const [search, setSearch] = useState("");
  const installed = useInstalledModulesStore((s) => s.installed);
  // Sprint 26: menu de contexto (Desinstalar) por app no launcher.
  const [iconCtx, setIconCtx] = useState<{
    appId: string;
    x: number;
    y: number;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Sprint 16 MX79: filtra por visibilidade (alwaysEnabled OU installed)
    // alem de excluir "mesa" (home tab, nao launchable)
    const all = APP_REGISTRY.filter(
      (a) =>
        a.id !== "mesa" && (a.alwaysEnabled === true || installed.has(a.id)),
    );
    if (!q) return all;
    return all.filter((a) => a.name.toLowerCase().includes(q));
  }, [search, installed]);

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
              width: "min(720px, 90vw)",
              maxHeight: "min(520px, 72vh)",
              borderRadius: 18,
              background: "rgba(6,9,18,0.96)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow:
                "0 -4px 40px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px 12px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.85)",
                  letterSpacing: "-0.01em",
                  fontFamily: "var(--font-display)",
                }}
              >
                Todos os Apps
              </span>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.40)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.10)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.70)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.40)";
                }}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>

            {/* Search */}
            <div
              style={{
                padding: "10px 18px 8px",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 32,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.30)",
                  pointerEvents: "none",
                }}
              />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar app…"
                style={{
                  width: "100%",
                  padding: "8px 14px 8px 34px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  transition: "border-color 120ms ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(139,92,246,0.45)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              />
            </div>

            {/* Grid */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "6px 14px 22px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
                gap: 4,
                alignContent: "start",
                scrollbarWidth: "none",
              }}
            >
              {filtered.map((app) => {
                const Icon =
                  (
                    LucideIcons as unknown as Record<
                      string,
                      ComponentType<LucideProps>
                    >
                  )[app.icon] ?? LucideIcons.Box;

                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      onOpenApp(app.id, app.name);
                      onClose();
                      setSearch("");
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIconCtx({
                        appId: app.id,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 7,
                      padding: "12px 8px 10px",
                      borderRadius: 12,
                      background: "transparent",
                      border: "1px solid transparent",
                      cursor: "pointer",
                      transition:
                        "background 140ms ease, border-color 140ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.06)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.09)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    {/* Icon container — padrão Dock */}
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "var(--radius-lg)",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition:
                          "background 140ms ease, border-color 140ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${app.color}28`;
                        e.currentTarget.style.borderColor = `${app.color}44`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.06)";
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.08)";
                      }}
                    >
                      <Icon
                        size={24}
                        strokeWidth={1.4}
                        style={{ color: "rgba(255,255,255,0.75)" }}
                      />
                    </div>

                    {/* Label */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "rgba(255,255,255,0.60)",
                        textAlign: "center",
                        lineHeight: 1.25,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {app.name}
                    </span>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    padding: "48px 0",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.22)",
                    fontSize: 13,
                  }}
                >
                  Nenhum app encontrado
                </div>
              )}
            </div>

            {/* Footer — contagem */}
            <div
              style={{
                padding: "8px 18px 12px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
                {filtered.length} {filtered.length === 1 ? "app" : "apps"}{" "}
                disponíveis
              </span>
            </div>
          </motion.div>

          {iconCtx !== null && (
            <AppContextMenu
              surface="launcher"
              appId={iconCtx.appId}
              pos={{ x: iconCtx.x, y: iconCtx.y }}
              onClose={() => setIconCtx(null)}
            />
          )}
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
