# Runbook — Sentry setup (MX186)

> Sprint 33 / MX186 — error tracking real para Camada 1.

---

## Estado

`@sentry/react` está **instalado** no `apps/shell-commercial`. A inicialização
é condicional: só ativa quando `VITE_SENTRY_DSN` está definida E o build é
production. Em dev/preview ou sem DSN: no-op (sem network call, sem custo).

Implementação: `apps/shell-commercial/src/lib/observability.ts`.

```typescript
initSentryIfConfigured(); // chamado em main.tsx antes de qualquer render
```

`AppErrorBoundary` (em `components/os/ErrorBoundary.tsx`) já roteia via
`reportError()`, que automaticamente envia ao Sentry quando inicializado.

`installGlobalErrorHandlers()` captura `window.error` e
`unhandledrejection` — também são roteados via `reportError`.

---

## Setup pelo owner (manual, R10)

1. Criar conta gratuita em https://sentry.io
2. New Project → **Browser JavaScript** → escolher framework **React**
3. Copiar o DSN exibido (formato: `https://<key>@<org>.ingest.sentry.io/<id>`)
4. Adicionar como env var no Vercel:

   ```bash
   vercel env add VITE_SENTRY_DSN production
   # cole o DSN quando solicitado
   ```

5. Re-deploy:

   ```bash
   git push origin main
   ```

   Vercel auto-deploy reconstrói o bundle com a env var injetada.

6. Testar:
   - Abrir https://aethereos.io/login no browser
   - No DevTools console: `throw new Error("Sentry test")`
   - Em ~30s, evento deve aparecer no Sentry dashboard

---

## Configuração do tracesSampleRate

Default: **0.1** (10% das transações enviam performance data).

- **Free tier** Sentry: 5k transactions/mês. Com 10% sampling, suporta
  ~50k page-loads/mês — confortável durante dogfood (≤30 sessões/dia).
- Aumentar para 1.0 só se análise de performance for prioridade. Reduzir
  para 0 desabilita transactions (mantém só errors).

`replaysSessionSampleRate` está em **0** (desabilitado). Cota de Session
Replay free é apertada (50/mês). Habilitar manualmente se necessário:

```typescript
// observability.ts
replaysSessionSampleRate: 0.1,
replaysOnErrorSampleRate: 1.0, // 100% das sessões com erro
```

E adicionar `@sentry/replay` ao bundle.

---

## Como Sentry vê os erros

| Tipo                               | Captura                              |
| ---------------------------------- | ------------------------------------ |
| React render error                 | `AppErrorBoundary` → reportError     |
| Uncaught throw / promise rejection | window handlers → reportError        |
| Manual `reportError(err, ctx)`     | direto                               |
| HTTP fetch fail                    | breadcrumb (não capturado como erro) |
| Console.error                      | breadcrumb                           |

Tags incluídas:

- `source` (do `ErrorContext.tag` — ex: "AppErrorBoundary", "window.error")
- `environment` (production / preview)
- `release` (se `VITE_RELEASE` definido — opcional, p/ source maps)

Extra:

- `componentStack` (de React.ErrorInfo)
- Qualquer `extra` passado em `reportError`

---

## Source maps (futuro, opcional)

Para stack traces legíveis em produção, fazer upload de source maps:

1. `pnpm --filter @aethereos/shell-commercial add -D @sentry/vite-plugin`
2. Configurar plugin em `vite.config.ts` com `SENTRY_AUTH_TOKEN`
3. Build gera + upload automático

Não fazer agora — bundle já é minificado e Sentry mostra função/linha
em produção, suficiente para triagem de bugs.

---

## Custo / cota

Free tier (em 2026):

- 5k errors/mês
- 5k transactions/mês
- 1 user
- 7 dias retention

Suficiente para 30 dias de dogfood + comercio.digital MVP.

Se exceder: Sentry alerta no dashboard. Pagar plano Team ($26/mês para
50k errors) ou desabilitar (remover env var).

---

## Quando NÃO usar Sentry

- Dev local: nunca dispara (PROD check em `initSentryIfConfigured`)
- Preview deployments do Vercel: não tem `VITE_SENTRY_DSN` por padrão
- E2E tests: não tem env var

Para forçar Sentry em preview: adicionar VITE_SENTRY_DSN com scope
"preview" no Vercel (não recomendado — polui dashboard).

---

## Fallback

Se Sentry quebrar (DSN inválido, network down, init throw),
`reportError` cai automaticamente para `console.error("[obs] error", ...)` —
visível em Vercel logs / browser DevTools. **Sem perda de cobertura.**
