"use client";

import { useEffect, useRef, useState } from "react";
import { SupabaseBrowserAuthDriver } from "@aethereos/drivers-supabase/browser";

interface EmbedLayoutProps {
  children: React.ReactNode;
}

export default function EmbedLayout({ children }: EmbedLayoutProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const driverRef = useRef<SupabaseBrowserAuthDriver | null>(null);

  useEffect(() => {
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";

    if (supabaseUrl) {
      driverRef.current = new SupabaseBrowserAuthDriver({
        supabaseUrl,
        supabaseAnonKey,
      });
    }

    function handleMessage(event: MessageEvent) {
      const driver = driverRef.current;
      if (!driver || !event.data || typeof event.data !== "object") return;

      const data = event.data as Record<string, unknown>;
      const { type, access_token, refresh_token } = data;

      if (
        type === "host.token.set" &&
        typeof access_token === "string" &&
        typeof refresh_token === "string"
      ) {
        driver
          .setSession({ access_token, refresh_token })
          .then((result) => {
            if (result.ok) {
              setIsReady(true);
              window.parent.postMessage(
                { type: "embed.ready", version: "1" },
                "*",
              );
            } else {
              setError("Falha ao restaurar sessão.");
              window.parent.postMessage(
                {
                  type: "embed.error",
                  code: "session_restore_failed",
                  message: "Failed to restore session from host token.",
                },
                "*",
              );
            }
          })
          .catch(() => {
            setError("Erro interno ao inicializar sessão.");
          });
      }
    }

    window.addEventListener("message", handleMessage);

    window.parent.postMessage({ type: "embed.ready", version: "1" }, "*");
    setIsReady(true);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center text-[var(--muted-foreground)] text-sm">
        {error}
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="h-screen flex items-center justify-center text-[var(--muted-foreground)] text-sm">
        Carregando...
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-auto bg-[var(--background)]">
      {children}
    </div>
  );
}
