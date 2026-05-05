# SPRINT 13 — Consolidacao e Validacao E2E

> **Objetivo:** Fazer 32/32 testes E2E passarem + atualizar SPRINT_LOG.md.
> **NAO inclui:** features novas, verticais, deploy staging, IaC.
> **Estimativa:** 2-4 horas. Custo: $15-30.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — nota que termina no Sprint 9.6. Sprints 10-12 foram executados mas nao formalizados.
3. git log --oneline -20 — confirmar HEAD em 7307d94
4. tooling/e2e/tests/helpers.ts — o helper loginToDesktop() e a raiz dos 18 testes falhando
5. tooling/e2e/.env.local — credenciais existem mas Playwright nao carrega automaticamente
6. apps/shell-commercial/src/main.tsx — splash screen com ~3s de delay

### Estado atual confirmado

- 69/69 migrations aplicadas, banco sincronizado
- 33 apps no registry, build compila
- 14/32 E2E passam (login, register, company-creation, cross-tenant, SCP pipeline)
- 18/32 E2E falham — todos dependem de loginToDesktop() que nao chega ao [data-testid="os-desktop"] a tempo
- 4/32 skipped — onboarding (falta E2E_ONBOARDING_COMPANY_ID)
- Causa raiz dos 18 falhos: splash screen (3s) + boot assincrono (2-5s) + timeout insuficiente no helper

### Diagnostico detalhado dos falhos

Os 18 testes que falham sao: os-shell (5), drive (3), magic-store (3), rh (4), onboarding-dependentes (3).

Todos falham com Error: expect(locator).toBeVisible() apos ~13-14s.

O loginToDesktop() em helpers.ts faz:

1. page.goto("/login") — preenche email/senha — clica "Entrar"
2. waitForURL(/(select-company|desktop)/) com 15s timeout
3. Se select-company: procura botao com regex UUID /[0-9a-f-]{36}/ — clica
4. waitForURL(/\/desktop$/) com 15s
5. expect(locator('[data-testid="os-desktop"]')).toBeVisible() com 10s

O problema esta na soma dos timeouts vs splash + boot:

- Splash: 1.2s font + 1.4s animation + 0.35s exit = ~3s
- Boot (drivers, auth, fetch): 2-5s
- Select-company render + seletor UUID: 1-2s
- Desktop render: 1-2s
- Total real: 7-12s — e o helper nao da tempo suficiente

---

## MILESTONES

### MX61 — Fix loginToDesktop helper (raiz dos 18 falhos)

O que fazer:

1. Em apps/shell-commercial/src/main.tsx, adicionar bypass do splash em ambiente E2E:
   const skipSplash = new URLSearchParams(window.location.search).has('skipSplash');
   Se skipSplash query param presente, pular animacao inteira e ir direto ao boot.

2. Em tooling/e2e/tests/helpers.ts, alterar loginToDesktop:
   - Navegar com ?skipSplash no goto inicial: page.goto("/login?skipSplash")
   - Garantir que apos login o redirect mantem o param ou que o splash ja foi bypassado
   - Aumentar timeout do os-desktop para 20s (margem de seguranca)
   - Fix do seletor na select-company: o botao mostra UUID em span, nao no texto do button diretamente. Ajustar seletor para encontrar o botao que contem o span com UUID.

3. Verificar que o seletor de company funciona:
   - A pagina renderiza button com span className="font-mono text-xs text-zinc-400" companyId dentro
   - O filter({ hasText: /[0-9a-f-]{36}/ }) deveria funcionar com hasText (que busca texto dentro)
   - Se nao funcionar, usar locator("button:has(span.font-mono)") ou similar

Criterio de aceite: Os 18 testes que falhavam agora chegam ao desktop. Rodar set -a; source tooling/e2e/.env.local; set +a && pnpm test:e2e:full e confirmar progresso.

Commit: fix(e2e): loginToDesktop — bypass splash + increase timeouts (MX61)

---

### MX62 — Fix testes skipped do onboarding (4 testes)

O que fazer:

1. Criar company de teste com onboarding_completed = false no seed ou na migration de teste.

2. Criar usuario de teste associado a essa company, ou usar o seed existente.

3. Adicionar ao tooling/e2e/.env.local:
   E2E_ONBOARDING_COMPANY_ID=10000000-0000-0000-0000-000000000099

4. Os testes de onboarding precisam logar com um usuario que pertence a essa company. Pode ser necessario criar novo usuario seed ou adicionar env vars separadas.

5. Se a complexidade for alta, marcar como KNOWN_LIMITATION e documentar — nao bloquear o sprint.

Criterio de aceite: Os 4 testes de onboarding ou passam ou estao documentados como KNOWN_LIMITATION com justificativa clara.

Commit: fix(e2e): onboarding tests — add test company with onboarding_completed=false (MX62)

---

### MX63 — Fix testes que fazem skip condicional dentro do corpo

O que fazer:

Alguns testes fazem test.skip() dentro do corpo baseado em condicoes runtime (ex: nenhum employee encontrado, botao editar nao visivel). Esses sao 3-4 testes em rh.spec.ts e os-shell.spec.ts.

1. Revisar cada test.skip() condicional:
   - rh.spec.ts:91 — skip se rows.count() === 0 — seed precisa ter employees para a company de teste
   - rh.spec.ts:118 — skip se rows.count() === 0 — idem
   - rh.spec.ts:128 — skip se botao editar nao visivel — pode depender do drawer abrir
   - os-shell.spec.ts:71 — skip se icone da mesa nao visivel — depende do desktop renderizar

2. Se o problema e falta de dados seed, verificar que o seed popula kernel.employees para a company de teste.

3. Se o seed ja popula, o problema e timing. Adicionar waitForSelector ou aumentar timeout.

Criterio de aceite: Zero test.skip() condicionais sem justificativa forte.

Commit: fix(e2e): remove conditional skips — seed employees + timing fixes (MX63)

---

### MX64 — Validacao final: 32/32 E2E green

O que fazer:

1. Rodar suite completa:
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Se algum teste ainda falha, investigar e corrigir individualmente.

3. Resultado esperado: 28+ passed, 0 failed. Skips aceitos apenas com KNOWN_LIMITATION documentada.

4. Rodar gates de CI:
   pnpm typecheck
   pnpm lint

Criterio de aceite: pnpm test:e2e:full com EXIT 0 (ou falhas documentadas em KNOWN_LIMITATIONS.md).

Commit: test(e2e): 32/32 green — sprint 13 validation (MX64)

---

### MX65 — Atualizar SPRINT_LOG.md + documentacao

O que fazer:

1. Adicionar ao SPRINT_LOG.md os sprints que faltam formalizar:

   Sprint 10 — Paradigma OS Visual (commits bfe1df5 a 95318ce):
   - TopBar macOS-feel, TabBar Chrome+Arc hybrid com drag-drop
   - Dock com magnification (framer-motion), Mesa como tab pinned
   - Splash screen, Command Center, Lockscreen
   - 18 apps internos + Magic Store catalog
   - Onboarding wizard 3 steps
   - 25 migrations kernel.\* (apps internos + storage + persistencia)

   Sprint 11 — Polish + Coverage (commits 6483a53 a f9dcf47):
   - Lixeira com delete cascade
   - PDF refresh, camera unsaved warning, lock timeout configuravel
   - Governanca + Auditoria com dados reais (substituiu DEMO arrays)
   - 5 ADRs + runbook deploy migrations

   Sprint 13 — Consolidacao E2E (este sprint):
   - Fix loginToDesktop helper (splash bypass + timeouts)
   - Onboarding test company
   - Seed employees para testes
   - 32/32 E2E green

2. Atualizar KNOWN_LIMITATIONS.md com status atual.

3. Atualizar QUICK_START.md se comandos mudaram.

Criterio de aceite: SPRINT_LOG.md cobre sprints 10-13. Documentacao reflete estado real.

Commit: docs: sprint log 10-13 + known limitations update (MX65)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem feat/fix/docs(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. Nova dep exige justificativa em commit.
R5. Bloqueios mantidos: sem next em shells, sem inngest, sem @clerk/\*, sem prisma.
R6. Antes de cada commit: pnpm typecheck && pnpm lint.
R7. Atualize SPRINT_LOG.md ao fim de cada milestone.
R8. Nao execute fora de ~/Projetos/aethereos. Nao escreva em ~/Projetos/aethereos-v2.
R9. Ao perceber contexto cheio: pare, escreva pickup point.
R10. Este sprint e CONSOLIDACAO. PROIBIDO adicionar features novas, apps novos, migrations novas (exceto seed data para testes).

---

## TERMINO DO SPRINT

Quando MX65 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte o resultado (X passed, Y failed, Z skipped).

3. Pare aqui. Nao inicie Sprint 14.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 13 (Consolidacao E2E) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX61-MX65 nao concluida
5. Continue a partir dela

Lembrar:

- Sprint de consolidacao. ZERO features novas.
- Objetivo: 32/32 E2E green.
- Splash bypass via ?skipSplash query param.
- Env vars em tooling/e2e/.env.local devem ser carregadas com set -a; source.
- SPRINT_LOG.md precisa cobrir sprints 10-13.

Roadmap em SPRINT_13_PROMPT.md na raiz.
