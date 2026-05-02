import { createPortal } from "react-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_LINKS = [
  {
    emoji: "📚",
    title: "Documentação",
    desc: "Guias e referências técnicas",
  },
  {
    emoji: "🎓",
    title: "Tutoriais",
    desc: "Primeiros passos e casos de uso",
  },
  {
    emoji: "🟢",
    title: "Status do sistema",
    desc: "Disponibilidade em tempo real",
  },
  {
    emoji: "💬",
    title: "Comunidade",
    desc: "Fórum de desenvolvedores",
  },
];

export function SupportModal({ open, onClose }: SupportModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSend() {
    if (!subject.trim() || !message.trim()) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setSubject("");
      setMessage("");
    }, 3500);
  }

  const canSend = subject.trim().length > 0 && message.trim().length > 0;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="support-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 202,
              background: "rgba(0,0,0,0.62)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />

          {/* Modal centralizado */}
          <motion.div
            key="support-modal"
            initial={{ opacity: 0, x: "-50%", y: "-46%" }}
            animate={{ opacity: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, x: "-50%", y: "-48%" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              zIndex: 203,
              top: "50%",
              left: "50%",
              width: "min(520px, 92vw)",
              borderRadius: 16,
              background: "rgba(8,10,18,0.97)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "rgba(139,92,246,0.15)",
                    border: "1px solid rgba(139,92,246,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                  }}
                >
                  🛟
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.92)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Suporte & Ajuda
                </span>
              </div>
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

            {/* Body */}
            <div style={{ padding: "20px" }}>
              {/* Quick links */}
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Recursos
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 22,
                }}
              >
                {QUICK_LINKS.map((l) => (
                  <button
                    key={l.title}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 120ms, border-color 120ms",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(139,92,246,0.08)";
                      e.currentTarget.style.borderColor =
                        "rgba(139,92,246,0.22)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.03)";
                      e.currentTarget.style.borderColor =
                        "rgba(255,255,255,0.06)";
                    }}
                  >
                    <span
                      style={{
                        fontSize: 18,
                        lineHeight: 1,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {l.emoji}
                    </span>
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.78)",
                          marginBottom: 3,
                        }}
                      >
                        {l.title}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.35)",
                          lineHeight: 1.4,
                        }}
                      >
                        {l.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Contact form */}
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Fale conosco
              </p>

              {sent ? (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: 10,
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.22)",
                    textAlign: "center",
                    color: "#4ade80",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  ✓ Mensagem enviada! Responderemos em até 24h.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Assunto"
                    style={{
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Descreva seu problema ou dúvida…"
                    rows={4}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 13,
                      outline: "none",
                      resize: "none",
                      fontFamily: "inherit",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 9,
                      fontSize: 13,
                      fontWeight: 600,
                      background: canSend
                        ? "rgba(139,92,246,0.85)"
                        : "rgba(255,255,255,0.05)",
                      border: "none",
                      color: canSend ? "#fff" : "rgba(255,255,255,0.25)",
                      cursor: canSend ? "pointer" : "default",
                      transition: "background 150ms",
                    }}
                  >
                    Enviar mensagem
                  </button>
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
