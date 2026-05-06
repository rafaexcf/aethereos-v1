# CI E2E — auditoria Sprint 33 / MX189

> Sprint 33 prompt afirmou: "CI roda typecheck/lint/test mas NAO roda E2E".
> Esta era inverdade — a job E2E já estava configurada desde Sprint 14 / MX69.

Data: 2026-05-06.

---

## Estado atual

`.github/workflows/ci.yml` job `e2e`:

- **Trigger:** push em main + branches feat/fix/chore/docs/refactor + PRs em main.
- **Dependências:** `needs: [typecheck, lint]` — só roda após esses gates.
- **Setup:** `supabase/setup-cli@v1` + `supabase start` (Docker-in-Docker
  no Ubuntu runner — funciona sem hack).
- **Seed:** `tooling/seed start` antes do teste.
- **Server:** Playwright `webServer.command` inicia o shell-commercial dev
  server automaticamente (`pnpm --filter @aethereos/shell-commercial dev`).
- **Run:** `playwright test` rodando todos os 18 specs (54 cases após MX187).
- **Artifacts:** upload de `playwright-report/` e `test-results/` em failure
  (retention 14 dias).
- **Cleanup:** `supabase stop --no-backup` em `always()`.

Env vars são as keys públicas determinísticas do Supabase local
(documentadas em supabase docs — não são secrets).

---

## Gaps potenciais

| Item                      | Estado   | Comentário                                                  |
| ------------------------- | -------- | ----------------------------------------------------------- |
| Build cache compartilhado | ❌       | Cada job re-roda `pnpm install`. Aceito por ora.            |
| Sentry DSN no E2E         | n/a      | E2E não dispara Sentry (PROD check). Correto.               |
| Failure retries           | ❌       | `retries: 0` em playwright.config. Pode ser flaky em CI.    |
| Browser parallel          | ❌       | `fullyParallel: false`. Trade-off por ordem determinística. |
| Cobertura de browsers     | chromium | Sufficient — não rodamos Firefox/Safari.                    |

Nenhum desses gaps é bloqueador. Esses ajustes serão feitos quando o CI
mostrar flakiness real durante o dogfood.

---

## Decisão MX189

CI E2E já existe e funciona. Sem mudança necessária.

Se o sprint pediu para "adicionar" CI E2E, a tarefa está coberta pelo
trabalho do Sprint 14 — apenas a documentação do sprint estava desatualizada.

---

## Como rodar localmente

```bash
# Local: precisa supabase local rodando
supabase start
pnpm --filter @aethereos/seed start
set -a; source tooling/e2e/.env.local; set +a
pnpm --filter shell-commercial dev   # em outro terminal
pnpm exec playwright test            # em outro terminal
```

Ou apenas:

```bash
pnpm test:e2e:full
```

(quando configurado em `package.json` raiz)

---

## Próximas frentes

- **Cross-browser** (firefox, safari): adicionar projetos no
  `playwright.config.ts`. Custo CI ~3x. Adiar.
- **Visual regression** (screenshots): Chromatic ou Percy. Adiar para
  pós-comercio.digital.
- **Accessibility automation** (axe-core): plugin Playwright. Adiar.
