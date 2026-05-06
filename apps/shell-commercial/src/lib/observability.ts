// Sprint 31 / MX171 — Error tracking lightweight (Gate 5).
// Sprint 33 / MX186 — Sentry SDK como dep direta do shell.
//
// Estratégia: console.error estruturado é a baseline (sempre disponível
// via Vercel logs / Loki). Em produção com VITE_SENTRY_DSN configurado,
// initSentryIfConfigured() registra a integração @sentry/react e
// reportError passa a duplicar para o dashboard Sentry.
//
// Configuração:
//   1) Criar projeto em sentry.io (Browser JavaScript → React)
//   2) Adicionar VITE_SENTRY_DSN nos env vars do Vercel (production scope)
//   3) Re-deploy — Sentry ativa automaticamente
//
// No modo dev/preview ou sem DSN, este módulo é no-op (sem network call,
// sem custo de cota Sentry).

import * as Sentry from "@sentry/react";

type ErrorContextTags = Record<string, string>;
type ErrorContextExtra = Record<string, unknown>;

let sentryInitialized = false;

/**
 * Inicializa Sentry se VITE_SENTRY_DSN estiver definida E estivermos em
 * produção. Idempotente. Chamar uma única vez no boot.
 */
export function initSentryIfConfigured(): void {
  if (sentryInitialized) return;
  const dsn = import.meta.env["VITE_SENTRY_DSN"];
  if (typeof dsn !== "string" || dsn === "") return;
  if (!import.meta.env.PROD) return;

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env["VITE_RELEASE"] ?? undefined,
      // Performance tracing leve — 10% das transações.
      tracesSampleRate: 0.1,
      // Session Replay desabilitado por padrão (cota free é apertada).
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      // Integrations padrão do @sentry/react cobrem React error boundary,
      // browser errors, fetch/XHR breadcrumbs.
    });
    sentryInitialized = true;
  } catch {
    // Falha de init é silenciada — fallback console.error continua ativo.
  }
}

export interface ErrorContext {
  tag?: string;
  componentStack?: string;
  extra?: Record<string, unknown>;
}

export function reportError(error: unknown, ctx: ErrorContext = {}): void {
  if (sentryInitialized) {
    try {
      const tags: ErrorContextTags = {};
      if (typeof ctx.tag === "string") tags["source"] = ctx.tag;
      const extra: ErrorContextExtra = { ...ctx.extra };
      if (typeof ctx.componentStack === "string") {
        extra["componentStack"] = ctx.componentStack;
      }
      Sentry.captureException(error, { tags, extra });
      // Mesmo enviando ao Sentry, mantemos console.error em dev p/ debug.
      if (!import.meta.env.PROD) {
        const msg = error instanceof Error ? error.message : String(error);
        // eslint-disable-next-line no-console
        console.error("[obs/sentry] error", { msg, tag: ctx.tag });
      }
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
