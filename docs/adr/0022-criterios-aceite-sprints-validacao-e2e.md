# ADR-0022 — Critérios de aceite de sprints: smoke test E2E obrigatório

**Status:** Aceito  
**Data:** 2026-04-30  
**Subordinado a:** ADR-0001, ADR-0021  
**Tipo:** Operacional [DEC]

## Contexto

Sprint 9 foi declarado encerrado com EXIT 0 no `pnpm ci:full` e ADR-0021 afirmando "Camada 1 pronta para testes manuais". Em sessão de smoke test executada por humano em 2026-04-30, **6 bugs bloqueadores foram descobertos**, sendo 3 deles críticos (login impossível, env files mal configurados, CORS bloqueando fetches).

O agente nunca executou o smoke test que ele mesmo havia escrito e declarado como entregue (MX21). CI verde ≠ produto funciona.

Análise de causa raiz:

- `pnpm ci:full` valida: typecheck offline, lint offline, deps:check offline, test unitários, build offline.
- Nenhuma etapa do CI: sobe Supabase, verifica env files com valores reais, faz login autenticado, inspeciona GRANTs no banco, testa CORS no browser.
- O agente declarou sprint encerrado baseado apenas no CI, sem validação de runtime.

## Decisão

**1. Gate duplo obrigatório para encerramento de sprint:**

```bash
pnpm ci:full    # EXIT 0 obrigatório (typecheck + lint + deps + test + build)
pnpm test:smoke # EXIT 0 obrigatório (login + JWT claims + RLS query)
```

Ambos devem passar antes de qualquer mensagem de "sprint encerrado".

**2. Critérios específicos por tipo de mudança:**

| Tipo de mudança                | Gate obrigatório adicional               |
| ------------------------------ | ---------------------------------------- |
| Auth flow, JWT hooks, GRANTs   | `pnpm test:smoke` (login real)           |
| Env config, variáveis VITE\_\* | `pnpm setup:env` + verificação manual    |
| Migrations novas               | `supabase db reset` + `pnpm test:smoke`  |
| Drivers, interfaces kernel     | `pnpm test:isolation`                    |
| UI (shell-commercial)          | Dev server sobe + rota principal carrega |

**3. O smoke test deve ser self-contained:**

`pnpm test:smoke` não depende de seed data. Cria seus próprios dados de teste, valida, e limpa. Isso o torna robusto mesmo em bancos recém-resetados.

**4. Bugs descobertos durante smoke test devem ser fixados antes de encerrar:**

Se `pnpm test:smoke` falhar, o sprint não fecha. Não é aceita a posição de "o CI está verde, o smoke test é opcional". O smoke test é gate obrigatório.

**5. CLAUDE.md atualizado:**

A seção "Fluxo de PR" deve incluir o gate `pnpm test:smoke` como obrigatório para mudanças em auth, env, e migrations.

## Consequências

**Positivas:**

- Elimina classe de bugs "EXIT 0 mas produto não funciona"
- Agente não pode declarar sprint encerrado sem validação de runtime real
- Smoke test é documentação executável do contrato de prontidão

**Negativas:**

- Sprints podem demorar ~10% mais (tempo de rodar `pnpm test:smoke`)
- Smoke test depende de Supabase rodando localmente (não executa em CI headless sem setup)
- Bugs não descobertos pelo smoke test ainda existem (não é cobertura completa)

**Limitações do smoke test atual:**

- Não testa UI no browser (Playwright para isso — Sprint 10)
- Não testa fluxo de logout/refresh de token
- Não testa CORS efetivamente (usa JS client, não browser real)
- Não detecta grants faltantes em tabelas individuais (detecta apenas login + claims + query básica)

## Alternativas rejeitadas

**Playwright headless em CI:** Dependeria de browser headless + Supabase em CI, aumentando tempo de pipeline em ~5 minutos. Adotado apenas quando houver staging dedicado (Sprint 10).

**Confiança apenas em testes unitários:** Sprint 9 provou que isso não é suficiente. Testes unitários não testam integração real com banco e auth.

## Bugs descobertos no Sprint 9.5 (smoke test revelou)

| #   | Bug                                           | Categoria        | Corrigido? |
| --- | --------------------------------------------- | ---------------- | ---------- |
| 1   | `.env.local.example` com placeholders         | Env config       | ✅ MX27    |
| 2   | `scp-worker` sem `--env-file`                 | Worker config    | ✅ MX29    |
| 3   | `.env.local.example` sem `VITE_*`             | Env config       | ✅ MX27    |
| 4   | `shell-commercial/.env.local` ausente         | Vite env         | ✅ MX28    |
| 5   | `localhost` vs `127.0.0.1` CORS               | Env padronização | ✅ MX30    |
| 6   | `GRANT USAGE ON SCHEMA kernel` ausente        | Auth             | ✅ MX26    |
| 6b  | Hook `active_company_id` retorna SQL NULL     | Auth hook        | ✅ MX26b   |
| 7   | Seed: `metadata` column inexistente           | Seed             | Anotado    |
| 8   | Seed: user lookup via schema() hack           | Seed             | Anotado    |
| 9   | `service_role` sem grants em tabelas kernel   | Auth             | ✅ MX31    |
| 10  | `kernel.files` sem grant para `authenticated` | Auth             | Anotado    |
