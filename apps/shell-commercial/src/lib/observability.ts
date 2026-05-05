// Sprint 31 / MX171 — Error tracking lightweight (Gate 5).
//
// Estratégia (R11): mantemos logging estruturado via console como linha de
// base e oferecemos um hook para que o operador habilite Sentry sem mudança
// de código no shell:
//
//   1) Se `window.Sentry` estiver disponível (carregado via <script>
//      ou variavel global), usamos Sentry.captureException.
//   2) Senão, console.error com prefixo "[obs]" para que o time de
//      observabilidade consiga grepar via Vercel logs / Loki.
//
// Para habilitar Sentry em produção, basta:
//   - Definir VITE_SENTRY_DSN no Vercel.
//   - Adicionar <script src="https://browser.sentry-cdn.com/...">
//     no index.html OU instalar @sentry/browser e inicializar em main.tsx.
//
// Esse desenho cumpre o critério de "captura uncaught exceptions e
// unhandled rejections" sem adicionar dependencia opcional ao bundle.

interface SentryLike {
  captureException: (error: unknown, ctx?: Record<string, unknown>) => void;
  captureMessage: (msg: string, ctx?: Record<string, unknown>) => void;
}

interface WithSentry {
  Sentry?: SentryLike;
}

function getSentry(): SentryLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as WithSentry;
  return typeof w.Sentry === "object" && w.Sentry !== null ? w.Sentry : null;
}

export interface ErrorContext {
  tag?: string;
  componentStack?: string;
  extra?: Record<string, unknown>;
}

export function reportError(error: unknown, ctx: ErrorContext = {}): void {
  const sentry = getSentry();
  if (sentry !== null) {
    try {
      sentry.captureException(error, {
        tags: typeof ctx.tag === "string" ? { source: ctx.tag } : undefined,
        extra: { componentStack: ctx.componentStack, ...ctx.extra },
      });
      return;
    } catch {
      // Se Sentry quebrar, cai pro fallback de console.
    }
  }
  const msg = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error("[obs] error", {
    msg,
    tag: ctx.tag,
    componentStack: ctx.componentStack,
    extra: ctx.extra,
    stack: error instanceof Error ? error.stack : undefined,
  });
}

let installed = false;

/**
 * Instala handlers globais para `error` e `unhandledrejection` no window.
 * Chamado uma única vez no boot do shell. Idempotente.
 */
export function installGlobalErrorHandlers(): void {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, {
      tag: "window.error",
      extra: {
        filename: event.filename,
        line: event.lineno,
        col: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, { tag: "unhandled-rejection" });
  });
}
