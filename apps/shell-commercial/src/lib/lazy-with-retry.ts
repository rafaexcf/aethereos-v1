import React, { type ComponentType, type LazyExoticComponent } from "react";

// React.lazy usa ComponentType<any> no upstream — replicamos pra que
// componentes com props tipadas (CopilotDrawerProps etc.) funcionem.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

/**
 * Sprint 31 fast-follow — wrapper sobre React.lazy com retry inteligente.
 *
 * Resolve dois cenarios:
 *
 *   1) HMR / network transient em dev: tenta novamente apos 150ms antes
 *      de propagar o erro pra unhandledrejection.
 *
 *   2) Chunk 404 pos-deploy em prod: detecta "Failed to fetch
 *      dynamically imported module" e dispara reload one-shot da pagina
 *      pra atualizar o index.html + SW cache. Flag em sessionStorage
 *      previne loop em deploy genuinamente quebrado.
 *
 * Usage:
 *
 *   const MyApp = lazyWithRetry(() => import("./my-app"));
 *
 *   // ou com .then()
 *   const Other = lazyWithRetry(() =>
 *     import("./other").then((m) => ({ default: m.OtherApp })),
 *   );
 */

const RELOAD_FLAG = "aethereos:chunk-reload";
const RETRY_DELAY_MS = 150;

function isChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

function shouldReload(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(RELOAD_FLAG) === "1") return false;
    sessionStorage.setItem(RELOAD_FLAG, "1");
    // Auto-clear apos 5s pra permitir nova recuperacao em sessao longa.
    setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        // ignore
      }
    }, 5000);
    return true;
  } catch {
    return false;
  }
}

export function lazyWithRetry<T extends AnyComponent>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await importer();
    } catch (err) {
      if (!isChunkError(err)) throw err;

      // Tentativa 2: aguarda 150ms (HMR pode estar reescrevendo) e retenta.
      await new Promise<void>((r) => setTimeout(r, RETRY_DELAY_MS));
      try {
        return await importer();
      } catch (err2) {
        if (!isChunkError(err2)) throw err2;
        // Falha persistente — provavelmente chunk removido em deploy.
        // Reload UMA vez pra atualizar SPA. Se ja recarregamos nesta sessao,
        // propaga erro pra ErrorBoundary mais proxima.
        if (shouldReload()) {
          window.location.reload();
          // Retorna placeholder enquanto o reload nao completa.
          return new Promise<{ default: T }>(() => {
            // never resolves — vamos recarregar a pagina
          });
        }
        throw err2;
      }
    }
  });
}
