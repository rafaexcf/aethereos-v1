import { useState, type ReactElement } from "react";
import { ExternalLink, Loader2, AlertTriangle } from "lucide-react";

/**
 * Sprint 21 MX113: renderiza um app cujo entry_mode='iframe' como <iframe>
 * fullscreen dentro do AppFrame. Loading + fallback em caso de bloqueio
 * por X-Frame-Options ou erro de rede.
 *
 * sandbox liberal o suficiente para apps de terceiros funcionarem
 * (allow-scripts + allow-same-origin + allow-popups + allow-forms) mas
 * sem allow-top-navigation (nao deixa app escapar do shell).
 */
export function IframeAppFrame({
  url,
  appId,
  appName,
}: {
  url: string;
  appId: string;
  appName: string;
}): ReactElement {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#0f1216",
      }}
    >
      {loading && !error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: "var(--text-tertiary)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Loader2 size={28} className="animate-spin" aria-hidden />
          <span style={{ fontSize: 13 }}>Carregando {appName}…</span>
        </div>
      )}
      {error ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 32,
            textAlign: "center",
          }}
        >
          <AlertTriangle size={32} color="#f59e0b" aria-hidden />
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Não foi possível carregar {appName} embutido
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              maxWidth: 480,
            }}
          >
            O servidor do app bloqueia incorporação em iframes (cabeçalho
            X-Frame-Options ou Content-Security-Policy). Abra em uma nova aba.
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.4)",
              color: "#d8b4fe",
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            <ExternalLink size={14} aria-hidden />
            Abrir em nova aba
          </a>
        </div>
      ) : (
        <iframe
          key={appId}
          src={url}
          title={appName}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            background: "#fff",
          }}
        />
      )}
    </div>
  );
}
