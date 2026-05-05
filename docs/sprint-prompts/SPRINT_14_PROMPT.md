# SPRINT 14 — CI E2E no GitHub Actions + Resolve Skipped Tests

> **Objetivo:** E2E rodando no CI (GitHub Actions), 32/32 green, deploy preview Vercel.
> **NAO inclui:** features novas, verticais, IaC Pulumi, Supabase remoto.
> **Estimativa:** 3-5 horas. Custo: $20-40.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar que Sprint 13 esta documentado
3. git log --oneline -10 — confirmar HEAD em dc29b29
4. .github/workflows/ci.yml — CI atual (typecheck, lint, deps-check, audit, test, build — SEM E2E)
5. tooling/e2e/.env.local — credenciais de teste
6. KNOWN_LIMITATIONS.md — KL-3 (3 onboarding skipped) e KL-4 (1 os-shell flaky)

### Estado atual confirmado

- 28/32 E2E passam local, 0 failed, 4 skipped (KL-3 + KL-4)
- CI existente: 6 jobs paralelos (setup, typecheck, lint, deps-check, audit, test) + build
- CI NAO roda E2E (falta Supabase local no runner + Playwright)
- Sem Vercel configurado
- Supabase remoto NAO linkado (auth token expirado ou ausente)
- Infra local: docker-compose.dev.yml, litellm config, OTel configs (grafana, loki, prometheus, tempo)

---

## MILESTONES

### MX66 — Resolver KL-3: seed onboarding company + 3 testes

O que fazer:

1. Criar seed deterministico para onboarding E2E:
   - Company com onboarding_completed=false
   - Usuario seed associado a essa company
   - Pode ser no tooling/seed/src/companies.ts + users.ts, ou em SQL fixture dedicada

2. Adicionar ao tooling/e2e/.env.local:
   E2E_ONBOARDING_COMPANY_ID=id_da_company
   E2E_ONBOARDING_EMAIL=email_do_user
   E2E_ONBOARDING_PASSWORD=Aethereos@2026!

3. Atualizar tooling/e2e/tests/onboarding.spec.ts para usar as novas env vars e logar com o usuario correto

4. Rodar os 3 testes de onboarding e confirmar que passam

Criterio de aceite: 3 testes de onboarding passam (nao mais skipped).

Commit: fix(e2e): seed onboarding company + resolve KL-3 (MX66)

---

### MX67 — Resolver KL-4: os-shell:66 flaky mesa icons

O que fazer:

1. Investigar o teste os-shell.spec.ts:66 (closing all non-pinned tabs hides TabBar)
   - O skip acontece porque mesa_layouts ainda nao hidratou e os icones nao aparecem
   - Solucao: adicionar waitFor robusto antes de interagir com icones da Mesa

2. Criar helper waitForDesktopReady(page) que espera:
   - [data-testid="os-desktop"] visivel
   - [data-testid="dock"] visivel
   - Pelo menos 1 icone interagivel na Mesa (ou timeout graceful)

3. Usar esse helper nos testes que dependem de Mesa icons

4. Remover o test.skip() condicional — se o desktop nao renderiza icones em 15s, o teste deve falhar (nao skipar silenciosamente)

Criterio de aceite: Teste os-shell:66 passa consistentemente (rodar 3x para confirmar nao e flaky).

Commit: fix(e2e): waitForDesktopReady helper + resolve KL-4 (MX67)

---

### MX68 — Validacao local: 32/32 E2E green

O que fazer:

1. Re-rodar o seed completo para garantir dados limpos:
   cd tooling/seed && pnpm start

2. Rodar suite completa:
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

3. Resultado esperado: 32 passed, 0 failed, 0 skipped.

4. Se algum teste ainda falha ou skipa, corrigir antes de prosseguir.

5. Rodar 2x adicionais para confirmar estabilidade (sem flaky tests).

Criterio de aceite: 3 runs consecutivas com 32/32 green (ou 31+ sem flaky).

Commit: test(e2e): 32/32 green — all known limitations resolved (MX68)

---

### MX69 — E2E no GitHub Actions CI

O que fazer:

1. Adicionar job e2e ao .github/workflows/ci.yml que:
   - Instala Playwright browsers (chromium)
   - Instala Supabase CLI via supabase/setup-cli@v1
   - Roda supabase start (sobe Postgres, Auth, Storage, Edge Functions)
   - Roda seed (cd tooling/seed && pnpm start)
   - Build do shell (pnpm --filter @aethereos/shell-commercial build)
   - Serve o build com preview server
   - Roda pnpm test:e2e:full com env vars do Supabase local

2. As anon_key e service_key sao as keys padrao do Supabase local (supabase start). Sao publicas e documentadas. NAO sao secrets reais.

3. Se supabase start falhar no CI por Docker-in-Docker, investigar alternativas:
   - GitHub Actions runners tem Docker disponivel nativamente
   - Se nao funcionar, aceitar job com continue-on-error: true e documentar

4. Se E2E no CI for muito lento (>10min), considerar rodar apenas subset critico (login, cross-tenant, scp-pipeline) e suite completa em schedule noturno.

Criterio de aceite: Push para main dispara CI com job e2e que roda. Idealmente green.

Commit: ci: add E2E job with Supabase local + Playwright (MX69)

---

### MX70 — Vercel deploy preview (opcional)

O que fazer:

1. Verificar se o usuario tem conta Vercel. Se nao, skip esta milestone.

2. Se tem conta:
   - npx vercel login
   - npx vercel link na raiz ou em apps/shell-commercial
   - Configurar build command: pnpm --filter @aethereos/shell-commercial build
   - Output directory: apps/shell-commercial/dist
   - Environment variables no Vercel dashboard

3. Configurar Vercel GitHub integration para deploy preview em PRs.

4. Se nao tem conta Vercel ou nao quer configurar agora, documentar como divida para Sprint 15.

Criterio de aceite: Deploy preview funciona em PR, OU milestone documentada como deferida.

Commit: ci: vercel deploy preview configuration (MX70)

---

### MX71 — Documentacao + encerramento

O que fazer:

1. Atualizar SPRINT_LOG.md com Sprint 14
2. Atualizar KNOWN_LIMITATIONS.md (remover KL-3 e KL-4 se resolvidos)
3. Se E2E no CI funciona: atualizar QUICK_START.md
4. Se Vercel preview funciona: adicionar badge no README

Criterio de aceite: Documentacao atualizada, SPRINT_LOG.md cobre Sprint 14.

Commit: docs: sprint 14 — CI E2E + known limitations resolved (MX71)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem feat/fix/docs/ci(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. Nova dep exige justificativa em commit.
R5. Bloqueios mantidos: sem next em shells, sem inngest, sem @clerk/\*, sem prisma.
R6. Antes de cada commit: pnpm typecheck && pnpm lint.
R7. Atualize SPRINT_LOG.md ao fim de cada milestone.
R8. Nao execute fora de ~/Projetos/aethereos. Nao escreva em ~/Projetos/aethereos-v2.
R9. Ao perceber contexto cheio: pare, escreva pickup point.
R10. Este sprint e CONSOLIDACAO + CI. PROIBIDO adicionar features novas ou apps novos.

---

## TERMINO DO SPRINT

Quando MX71 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte o resultado (X passed, Y failed, Z skipped).

3. Pare aqui. Nao inicie Sprint 15.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 14 (CI E2E + Skipped Tests) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX66-MX71 nao concluida
5. Continue a partir dela

Lembrar:

- Sprint de consolidacao + CI. ZERO features novas.
- Objetivo: 32/32 E2E green + E2E no GitHub Actions.
- KL-3 (onboarding) e KL-4 (mesa flaky) devem ser resolvidos.
- Vercel deploy e opcional (MX70) — depende de conta.
- Splash bypass via ?skipSplash query param ja implementado (Sprint 13).

Roadmap em SPRINT_14_PROMPT.md na raiz.
