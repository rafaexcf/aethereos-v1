import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { X, Plus } from "lucide-react";
import { WIDGET_SPECS } from "./specs";
import { getApp } from "../../registry";

interface WidgetGalleryProps {
  open: boolean;
  onClose: () => void;
  onPick: (appId: string) => void;
  /** Widgets ja instalados — exibe label "Adicionado" no card. */
  installedAppIds?: ReadonlySet<string>;
}

export function WidgetGallery({
  open,
  onClose,
  onPick,
  installedAppIds,
}: WidgetGalleryProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="wg-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 220,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          />

          <motion.div
            key="wg-drawer"
            initial={{ opacity: 0, x: "-50%", y: 24 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              zIndex: 221,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(720px, 92vw)",
              maxHeight: "min(540px, 80vh)",
              borderRadius: 18,
              background: "rgba(6,9,18,0.96)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow:
                "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
            }}
          >
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
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.92)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Galeria de Widgets
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.45)",
                    marginTop: 2,
                  }}
                >
                  Adicione um widget à sua Mesa
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "14px 18px 18px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 10,
                alignContent: "start",
              }}
            >
              {WIDGET_SPECS.map((spec) => {
                const app = getApp(spec.appId);
                if (app === undefined) return null;
                const Icon =
                  (
                    LucideIcons as unknown as Record<
                      string,
                      ComponentType<LucideProps>
                    >
                  )[app.icon] ?? LucideIcons.Box;
                const isInstalled = installedAppIds?.has(spec.appId) === true;
                return (
                  <button
                    key={spec.appId}
                    type="button"
                    onClick={() => onPick(spec.appId)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      padding: 14,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition:
                        "background 140ms ease, border-color 140ms ease, transform 140ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${app.color}14`;
                      e.currentTarget.style.borderColor = `${app.color}44`;
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.08)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: `${app.color}22`,
                          border: `1px solid ${app.color}44`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon
                          size={16}
                          strokeWidth={1.6}
                          style={{ color: app.color }}
                        />
                      </div>
                      {isInstalled ? (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 5,
                            background: "rgba(34,197,94,0.18)",
                            color: "#86efac",
                            border: "1px solid rgba(34,197,94,0.32)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          Na mesa
                        </span>
                      ) : (
                        <Plus
                          size={14}
                          strokeWidth={1.8}
                          style={{ color: "rgba(255,255,255,0.42)" }}
                        />
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.92)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {spec.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.5)",
                          marginTop: 2,
                          lineHeight: 1.4,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {spec.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
