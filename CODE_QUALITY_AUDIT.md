# CODE_QUALITY_AUDIT.md — Aethereos Sprint 32 (MX176)

> Re-auditoria de qualidade pós-Sprints 21-31. Estado em **2026-05-06**.
> Sprint 20 (MX107) cobriu 25 tasks typecheck + 27 unit tests + 34 E2E.
> Sprint 32 (MX176) re-audita após adição de @aethereos/client, AppBridge,
> 136 apps no catálogo, Menu Gestor, departamentos, persistência, 2FA/LGPD,
> SCP replay, health endpoint.

---

## Resumo executivo

| Item                                  | Sprint 20 | Sprint 32       | Status |
| ------------------------------------- | --------- | --------------- | ------ |
| TypeScript strict no root tsconfig    | ✅        | ✅              | ✅     |
| Compiler strict flags adicionais      | 6         | 6               | ✅     |
| `pnpm typecheck`                      | 25/25     | **26/26**       | ✅     |
| `pnpm lint`                           | (passing) | **24/24**       | ✅     |
| `@ts-ignore` / `@ts-expect-error`     | 0         | 0               | ✅     |
| `as any` em código fonte              | 4         | 4               | ✅     |
| `pnpm audit --audit-level=high`       | 0 vulns   | **0 vulns**     | ✅     |
| Dep cruiser errors                    | 0         | 0               | ✅     |
| Dep cruiser warnings (reais)          | 9         | ~10 (intra-app) | ⚠️     |
| Test files (unit)                     | 27        | **36**          | ✅     |
| E2E test cases                        | 34        | **34**          | ✅     |
| TODO/FIXME/HACK em fonte              | 0         | 0               | ✅     |
| `console.log` em shell-commercial/src | 0         | **0**           | ✅     |

**Veredito: APROVADO PARA PRODUÇÃO.** Pontos de atenção documentados
como dívida técnica não-bloqueadora (idem Sprint 20).

---

## 1. TypeScript strict

`tsconfig.base.json` raiz aplica strict + 6 flags adicionais herdados por
todos os packages/apps:

```json
"strict": true,
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true,
"noFallthroughCasesInSwitch": true,
"noPropertyAccessFromIndexSignature": true,
"exactOptionalPropertyTypes": true,
"useUnknownInCatchVariables": true
```

`pnpm typecheck` passa em **26/26 tasks** (era 25/25 — adicionado
`@aethereos/client`, package introduzido em Sprint 22 para SDK de apps).

---

## 2. Type escapes

| Localização                                       | Total | Comentário                                                           |
| ------------------------------------------------- | ----- | -------------------------------------------------------------------- |
| `apps/*/.next/types/`                             | 20    | Gerados pelo Next.js — não código fonte. Excluídos.                  |
| Código fonte real (`as any`)                      | 4     | Todos em `packages/drivers-supabase/src/*` — limitação SDK upstream. |
| `@ts-ignore` / `@ts-expect-error` em código fonte | 0     | ✅                                                                   |

Os 4 `as any` mantêm-se idênticos a Sprint 20 (mesmas linhas, mesma
justificativa: `.schema()` API beta, types de Blob upstream restritos).
Mitigação prevista: revisitar quando `@supabase/supabase-js ≥3` estabilizar.

---

## 3. Dependências

```bash
$ pnpm audit --audit-level=high
No known vulnerabilities found
```

Mantido em 0 critical/high desde Sprint 20 MX104. Overrides em
`pnpm.overrides` continuam válidos:

- `happy-dom >=20.8.9`
- `serialize-javascript >=7.0.5`
- `drizzle-orm >=0.45.2`
- `vite >=6.4.2`
- `uuid >=14.0.0`
- `postcss >=8.5.10`
- `esbuild >=0.25.0`

---

## 4. Dep Cruiser

```bash
$ pnpm deps:check
182 dependency violations (0 errors, 69 warnings).
884 modules, 1910 dependencies cruised.
```

**0 errors.** 69 warnings — a grande maioria continua sendo falso-positivos
em `apps/shell-commercial/dist/assets/*.js` (artifacts pós-bundle cruzando
entre si). Recomendação F2 (idem Sprint 20): excluir `apps/*/dist/**` do
scan via `.dependency-cruiser.cjs`.

Ciclos reais em código fonte (intra-app, não cross-camada): ~10 entre
mesa, magic-store, gestor, configuracoes, calendário. Documentados como
dívida de refatoração de god components (R13).

---

## 5. Cobertura de testes

### Unit tests

```bash
$ find apps/ packages/ -name "*.test.ts" -o -name "*.test.tsx" \
    -o -name "*.spec.ts" | grep -v node_modules | grep -v dist | \
    grep -v "/e2e/" | wc -l
36
```

Era 27 em Sprint 20. **+9 arquivos** desde então (scp-worker replay,
@aethereos/client, kernel novos modelos, drivers ampliados).

### E2E tests

```bash
$ find tooling/e2e/tests -name "*.spec.ts" | wc -l
11
$ grep -hE "^\s*test\(" tooling/e2e/tests/*.spec.ts | wc -l
34
```

11 spec files, **34 test cases** (idêntico a Sprint 20). 33 passing + 1
skipped (governanca pré-existente). R6 do sprint preservado: 33+ E2E não
podem quebrar.

### Specs

- `register.spec.ts`, `login.spec.ts`, `onboarding.spec.ts`
- `company-creation.spec.ts`
- `cross-tenant.spec.ts`, `scp-pipeline.spec.ts`
- `os-shell.spec.ts`, `magic-store.spec.ts`, `drive.spec.ts`
- `rh.spec.ts`, `governanca.spec.ts`

---

## 6. TODO/FIXME/HACK

```bash
$ grep -rn "TODO\|FIXME\|HACK" packages/ apps/ \
    --include="*.ts" --include="*.tsx" | \
    grep -v node_modules | grep -v dist | wc -l
1
```

O único hit é falso-positivo em `apps/scp-worker/src/consumers/audit-consumer.ts:8`
(`* Captura TODOS os eventos do scp_outbox`). PT-BR para "all events", não
um TODO ativo. Idêntico ao Sprint 20.

---

## 7. console.log em produção

```bash
$ grep -rn "console.log" apps/shell-commercial/src/ \
    --include="*.ts" --include="*.tsx" | wc -l
0
```

Mantido em zero. Logs estruturados via `jlog()` no scp-worker e
`console.warn/error` nos drivers. Conforme P15 / Fundamentação.

---

## 8. God components (>1500 linhas)

| Arquivo                                                      | Linhas | Sprint 20 | Δ    |
| ------------------------------------------------------------ | ------ | --------- | ---- |
| apps/shell-commercial/src/apps/configuracoes/index.tsx       | 7278   | 6969      | +309 |
| apps/shell-commercial/src/apps/relogio/index.tsx             | 6600   | 6600      | 0    |
| apps/shell-commercial/src/apps/agenda-telefonica/index.tsx   | 4110   | 4110      | 0    |
| apps/shell-commercial/src/apps/magic-store/MagicStoreApp.tsx | 3414   | 3104      | +310 |
| apps/shell-commercial/src/apps/gestor/index.tsx              | 3062   | 3155      | -93  |
| apps/shell-commercial/src/apps/calendario/CalendarApp.tsx    | 2984   | 2984      | 0    |
| apps/shell-commercial/src/apps/camera/index.tsx              | 2746   | 2746      | 0    |
| apps/shell-commercial/src/apps/calculadora/index.tsx         | 2545   | 2537      | +8   |
| apps/shell-commercial/src/apps/enquetes/index.tsx            | 2513   | —         | novo |
| apps/shell-commercial/src/apps/apresentacoes/index.tsx       | 1992   | —         | novo |
| apps/shell-commercial/src/apps/weather/WeatherApp.tsx        | 1961   | —         | novo |
| apps/shell-commercial/src/apps/gravador-de-voz/index.tsx     | 1961   | —         | novo |
| apps/shell-commercial/src/apps/planilhas/index.tsx           | 1922   | —         | novo |
| apps/shell-commercial/src/apps/governanca/index.tsx          | 1847   | —         | novo |
| apps/shell-commercial/src/apps/kanban/BoardView.tsx          | 1767   | —         | novo |
| apps/shell-commercial/src/apps/reuniao/index.tsx             | 1726   | —         | novo |
| apps/shell-commercial/src/apps/navegador/index.tsx           | 1634   | —         | novo |
| apps/shell-commercial/src/apps/kanban/index.tsx              | 1620   | —         | novo |
| apps/shell-commercial/src/apps/copilot/index.tsx             | 1523   | —         | novo |

Sintomas conhecidos de god component. R13 do Sprint 20 (manter na auditoria
atual) proíbe refatoração agora — a Camada 1 já passou pelo selo de
features e a refatoração desses módulos é trabalho de Camada 2.
**Documentado como dívida técnica F2** — não bloqueia produção.

Nota: `tarefas/index.tsx` (2944 em Sprint 20) caiu da lista — virou
módulo persistente backed por `kernel.tasks` em Sprint 29; código vivo,
mas hoje 1.4k linhas (não na cabeça da lista).

---

## 9. Pontos de atenção (não-bloqueadores)

1. **~10 ciclos no shell-commercial/src** — refatoração futura.
2. **~19 god components >1500 linhas** — refatoração futura.
3. **4 `as any`** todos em drivers-supabase, contornando limitações do SDK.
4. **dep-cruiser scan inclui dist/** — gera 60+ warnings falso-positivos.
   Configurar exclude em F2.

Nenhuma dessas dívidas bloqueia produção, deploy, ou os 34 E2E.

---

## 10. Verificação final

```bash
$ pnpm typecheck && pnpm lint
26/26 successful (typecheck)
24/24 successful (lint)
$ pnpm audit --audit-level=high
No known vulnerabilities found
```

Camada 1 código-completa. Próximo: dogfood + monitor uptime + comércio.digital.
