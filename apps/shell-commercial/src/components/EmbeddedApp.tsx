import { useEffect, useRef, useState } from "react";

interface EmbeddedAppProps {
  src: string;
  accessToken: string;
  refreshToken: string;
  title?: string;
}

/**
 * Renders a SaaS standalone app inside an iframe and bootstraps its session
 * by forwarding the shell's tokens via the embed postMessage protocol.
 *
 * Protocol (EMBED_PROTOCOL.md):
 *   1. iframe loads and emits embed.ready (v1) immediately
 *   2. Shell receives embed.ready, sends host.token.set with tokens
 *   3. iframe calls setSession(), re-emits embed.ready when authenticated
 */
export function EmbeddedApp({
  src,
  accessToken,
  refreshToken,
  title = "App",
}: EmbeddedAppProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== "object") return;

      const data = event.data as Record<string, unknown>;

      if (data["type"] === "embed.ready") {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;

        iframe.contentWindow.postMessage(
          {
            type: "host.token.set",
            access_token: accessToken,
            refresh_token: refreshToken,
          },
          new URL(src).origin,
        );

        setIsReady(true);
      } else if (data["type"] === "embed.error") {
        setError(
          typeof data["message"] === "string"
            ? data["message"]
            : "Erro ao carregar app embedado",
        );
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [src, accessToken, refreshToken]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-sm text-zinc-500">
          Carregando {title}...
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
