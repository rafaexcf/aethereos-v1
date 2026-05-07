/**
 * Super Sprint F / MX246 — Sandbox de teste.
 *
 * R13: simplificado. Iframe + console de logs lado a lado. Mock bridge
 * responde a postMessage com dados fake conforme scope solicitado.
 *
 * Console mostra cada postMessage trocado entre app (iframe) e mock
 * bridge (parent). Útil para developer verificar handshake e chamadas
 * SDK antes de submeter para revisão.
 */

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { X, Trash2, Play } from "lucide-react";
import { useModalA11y } from "../../components/shared/useModalA11y";
import type { AppSubmission } from "./types";

interface SandboxProps {
  app: AppSubmission;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  ts: string;
  direction: "in" | "out";
  payload: unknown;
}

const MOCK_RESPONSES: Record<string, unknown> = {
  "auth.session": {
    user: {
      id: "mock-user-1",
      email: "test@aethereos.dev",
      full_name: "Test User",
    },
    company: { id: "mock-company-1", name: "Sandbox Company" },
  },
  "drive.list": [
    {
      id: "f-1",
      name: "test.pdf",
      size_bytes: 102400,
      mime_type: "application/pdf",
    },
    {
      id: "f-2",
      name: "notes.md",
      size_bytes: 4096,
      mime_type: "text/markdown",
    },
  ],
  "people.list": [
    { id: "p-1", full_name: "Maria Silva", email: "maria@example.com" },
    { id: "p-2", full_name: "João Costa", email: "joao@example.com" },
  ],
  "chat.channels": [{ id: "c-1", name: "general", type: "public" }],
  "notifications.list": [],
  "ai.chat": {
    content: "Esta é uma resposta mock do sandbox.",
    model: "mock",
    tokens: 12,
  },
  "settings.get": { theme: "dark", language: "pt-BR" },
  "theme.current": { name: "aethereos-dark", colors: { primary: "#6366f1" } },
};

export function Sandbox({ app, onClose }: SandboxProps): React.ReactElement {
  const ref = useModalA11y<HTMLDivElement>({ open: true, onClose });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    function handler(event: MessageEvent): void {
      const iframe = iframeRef.current;
      if (iframe === null || event.source !== iframe.contentWindow) return;

      const data = event.data as {
        id?: string;
        method?: string;
        type?: string;
      };
      const id = String(data.id ?? `evt-${Date.now()}`);
      const ts = new Date().toLocaleTimeString("pt-BR", { hour12: false });

      // Log incoming
      setLogs((prev) => [
        ...prev,
        {
          id: `${Date.now()}-in-${prev.length}`,
          ts,
          direction: "in",
          payload: data,
        },
      ]);

      // Handshake: respond with sandbox context
      if (data.type === "handshake" || data.method === "handshake") {
        const reply = {
          id,
          type: "handshake_ack",
          context: {
            sandbox: true,
            user: { id: "mock-user-1", name: "Test User" },
            company: { id: "mock-company-1", name: "Sandbox Company" },
          },
        };
        iframe.contentWindow?.postMessage(reply, "*");
        setLogs((prev) => [
          ...prev,
          {
            id: `${Date.now()}-out-${prev.length}`,
            ts,
            direction: "out",
            payload: reply,
          },
        ]);
        return;
      }

      // RPC method call: respond with mock data
      if (data.method !== undefined) {
        const mock = MOCK_RESPONSES[data.method] ?? null;
        const reply = { id, ok: true, result: mock };
        iframe.contentWindow?.postMessage(reply, "*");
        setLogs((prev) => [
          ...prev,
          {
            id: `${Date.now()}-out-${prev.length}`,
            ts,
            direction: "out",
            payload: reply,
          },
        ]);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4000,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`Sandbox — ${app.name}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0e1216",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          width: "94vw",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Play size={14} color="#a78bfa" />
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Sandbox — {app.name} v{app.version}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {app.entry_url}
          </span>
          <span style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#34d399",
              background: "rgba(52,211,153,0.15)",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            mock data
          </span>
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            aria-label="Recarregar"
            title="Recarregar app"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              padding: "6px 10px",
              color: "var(--text-secondary)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </header>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div
            style={{
              flex: 1.6,
              minWidth: 0,
              borderRight: "1px solid rgba(255,255,255,0.06)",
              background: "#fff",
            }}
          >
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={app.entry_url}
              title={`Sandbox de ${app.name}`}
              sandbox="allow-scripts allow-same-origin allow-forms"
              referrerPolicy="no-referrer"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "#fff",
              }}
            />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              background: "#0b0e12",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                }}
              >
                Console — {logs.length} mensagens
              </span>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setLogs([])}
                aria-label="Limpar console"
                title="Limpar"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: 10,
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                color: "var(--text-secondary)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {logs.length === 0 ? (
                <p
                  style={{
                    color: "var(--text-tertiary)",
                    textAlign: "center",
                    margin: "20px 0",
                  }}
                >
                  Aguardando mensagens do app… Use postMessage do iframe para
                  handshake e chamadas SDK.
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: "6px 8px",
                      background:
                        log.direction === "in"
                          ? "rgba(96,165,250,0.10)"
                          : "rgba(167,139,250,0.10)",
                      border:
                        log.direction === "in"
                          ? "1px solid rgba(96,165,250,0.18)"
                          : "1px solid rgba(167,139,250,0.18)",
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: log.direction === "in" ? "#60a5fa" : "#a78bfa",
                        fontWeight: 600,
                        marginBottom: 2,
                      }}
                    >
                      {log.direction === "in" ? "← APP" : "→ BRIDGE"} {log.ts}
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {JSON.stringify(log.payload, null, 0)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
