# SPRINT 20 — Auditoria Geral e Revisao de Codigo Pre-Deploy

> **Objetivo:** Revisao completa do codebase antes do staging deploy. Corrigir vulnerabilidades de deps, resolver TODOs/FIXMEs, limpar KLs resolviveis, validar RLS, revisar seguranca, consolidar testes, garantir qualidade de codigo.
> **NAO inclui:** features novas, staging deploy (isso e Sprint 21), verticais.
> **Estimativa:** 4-6 horas. Custo: $25-45.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md
3. KNOWN_LIMITATIONS.md — 6 KLs abertas (KL-1, KL-2, KL-5, KL-6, KL-7, KL-8)
4. SECURITY_GUIDELINES.md (project knowledge)
5. git log --oneline -10

### Estado do projeto (snapshot pre-auditoria)

- 313 commits, 18 packages, 405MB monorepo
- 73 migrations, 68 tabelas kernel, 11 Edge Functions
- 34 E2E tests, 27 unit test files
- TypeScript strict: 25/25 PASS, Lint: 23/23 PASS
- Deps audit: 10 vulnerabilidades (5 moderate, 4 high, 1 CRITICAL)
- TODO/FIXME/HACK: 3 no codebase
- console.log: 0 no shell (bom)
- 6 KNOWN_LIMITATIONS abertas
- 0 embeddings reais (pipeline depende de LLM configurado)

---

## MILESTONES

### MX104 — Resolver vulnerabilidades de dependencias

O que fazer:

1. Rodar pnpm audit --audit-level=high e identificar as 10 vulnerabilidades:
   pnpm audit 2>&1

2. Para cada vulnerabilidade:
   a) Se tem fix disponivel: pnpm update <package> ou override no package.json raiz
   b) Se e transitiva sem fix: adicionar override em pnpm.overrides no package.json raiz
   c) Se e false positive ou nao aplicavel ao nosso contexto: documentar em KNOWN_LIMITATIONS como KL-9

3. A CRITICAL e prioridade absoluta. Se nao tem fix, documentar workaround e mitigacao.

4. Objetivo: pnpm audit --audit-level=high retorna 0 vulnerabilidades (ou apenas moderate aceitaveis).

5. Depois de resolver: pnpm install --frozen-lockfile pode quebrar. Se necessario: pnpm install (atualiza lockfile) e commitar pnpm-lock.yaml.

Criterio de aceite: 0 critical, 0 high. Moderate documentadas se nao resolviveis.

Commit: fix(deps): resolve critical + high vulnerabilities (MX104)

---

### MX105 — Resolver TODO/FIXME/HACK e codigo morto

O que fazer:

1. Encontrar os 3 TODO/FIXME/HACK:
   grep -rn "TODO\|FIXME\|HACK\|XXX" packages/ apps/ --include="_.ts" --include="_.tsx" | grep -v node_modules | grep -v dist

2. Para cada um:
   a) Se e tarefa pendente real: implementar ou criar issue e remover o TODO
   b) Se e nota obsoleta: remover
   c) Se e decisao arquitetural adiada: converter em comentario explicativo sem tag TODO

3. Procurar codigo morto:
   - Imports nao usados (eslint deveria pegar, mas verificar)
   - Funcoes exportadas nao referenciadas
   - Componentes nunca montados
   - Rotas nunca acessiveis

4. Verificar se existem arquivos .ts/.tsx com mais de 2000 linhas (sinais de God Component):
   find apps/ packages/ -name "_.ts" -o -name "_.tsx" | grep -v node_modules | grep -v dist | xargs wc -l 2>/dev/null | sort -rn | head -10

5. Se algum arquivo excede 2000 linhas, NAO refatorar agora — apenas documentar como divida tecnica.

Criterio de aceite: 0 TODO/FIXME/HACK no codigo. Codigo morto identificado e removido ou documentado.

Commit: chore: resolve todos + remove dead code (MX105)

---

### MX106 — Auditoria de seguranca RLS

O que fazer:

1. Verificar que TODAS as 68 tabelas do schema kernel tem RLS habilitado:
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='kernel' ORDER BY tablename;
   Qualquer tabela com rowsecurity=false e BLOCKER.

2. Para cada tabela com RLS, verificar que as policies usam kernel.current_company_id() ou auth.uid():
   SELECT schemaname, tablename, policyname, qual, with_check FROM pg_policies WHERE schemaname='kernel' ORDER BY tablename;

3. Verificar que NENHUMA tabela kernel e acessivel sem autenticacao (anon role):
   - Rodar query como anon: SELECT \* FROM kernel.companies LIMIT 1; (deve retornar 0 ou erro)
   - Verificar GRANT statements: nao deve ter GRANT SELECT ON kernel.\* TO anon

4. Verificar storage buckets:
   - company-logos: public (ok, logos sao publicos)
   - user-avatars: public (ok)
   - user-wallpapers: public (ok)
   - kernel-files: private (DEVE ser private, verificar)
   - kernel-pdfs: private (DEVE ser private, verificar)

5. Verificar Edge Functions:
   - Todas exigem Authorization header? (exceto talvez cnpj-lookup)
   - scp-publish valida JWT antes de inserir?
   - create-company valida input?

6. Gerar relatorio de auditoria em SECURITY_AUDIT.md:
   - Tabelas com RLS: X/68
   - Tabelas sem RLS: lista (se houver)
   - Buckets: status de cada um
   - Edge Functions: status de autenticacao
   - Vulnerabilidades de deps: status pos-MX104

Criterio de aceite: SECURITY_AUDIT.md gerado. 68/68 tabelas com RLS. 0 tabelas acessiveis por anon. Buckets privados confirmados.

Commit: audit(security): RLS + storage + edge functions review (MX106)

---

### MX107 — Auditoria de qualidade de codigo

O que fazer:

1. Verificar TypeScript strict em todos os packages:
   grep -r "strict" packages/_/tsconfig.json apps/_/tsconfig.json | grep -v node_modules
   Todos devem ter "strict": true.

2. Verificar que todos os packages exportam tipos corretamente:
   Para cada package em packages/: verificar que package.json tem "types" ou "typesVersions" apontando para dist/

3. Verificar circular dependencies:
   pnpm deps:check (dependency-cruiser)
   Se ha violacoes, listar e avaliar severidade.

4. Verificar que driver interfaces sao respeitados:
   - LLMDriver: BYOKLLMDriver, LiteLLMDriver, DegradedLLMDriver — todos implementam?
   - DataDriver: SupabaseBrowserDataDriver — implementa?
   - AuthDriver: SupabaseAuthDriver — implementa?
   - Listar qualquer @ts-ignore, @ts-expect-error, as any no codebase:
     grep -rn "@ts-ignore\|@ts-expect-error\|as any" packages/ apps/ --include="_.ts" --include="_.tsx" | grep -v node_modules | grep -v dist

5. Verificar cobertura de testes:
   - 34 E2E tests — quais areas do app NAO tem teste?
   - 27 unit test files — quais packages NAO tem testes?
   - Listar packages sem **tests**/ ou _.test.ts:
     for d in packages/_/; do [ -d "$d/__tests__" ] || [ -f "$d/src/*.test.ts" ] 2>/dev/null || echo "SEM TESTES: $d"; done

6. Documentar resultado em CODE_QUALITY_AUDIT.md

Criterio de aceite: CODE_QUALITY_AUDIT.md gerado com status de cada item.

Commit: audit(quality): typescript strict + deps + driver conformance + test coverage (MX107)

---

### MX108 — Resolver KNOWN_LIMITATIONS resolviveis

O que fazer:

Revisar as 6 KLs e resolver as que sao simples:

KL-1 — Multiple GoTrueClient instances detected:

- Provavelmente warning do Supabase SDK quando multiplas instancias sao criadas
- Solucao: singleton pattern no boot. Se ja esta usando singleton, e warning inofensivo — documentar como WONTFIX

KL-2 — scp-registry alias aponta para source em vez de dist:

- Verificar tsconfig paths e package.json exports
- Se e problema de build: corrigir exports map
- Se e so em dev (HMR): aceitar como WONTFIX

KL-5 — Vercel deploy preview:

- NAO resolver agora (Sprint 21 fara staging deploy)
- Manter como pendente

KL-6 — Validacao E2E manual do BYOK Copilot:

- Se Sprint 15 foi validado manualmente: mudar status para VALIDATED_MANUALLY
- Se nao: documentar como pendente para staging

KL-7 — SCP pipeline modo inline:

- NAO resolver agora (NATS e Horizonte 2)
- Manter como aceito para F1

KL-8 — EmbeddingConsumer sem PDF:

- NAO resolver agora (precisa pdf-parse dep)
- Manter como aceito para F1

Criterio de aceite: Cada KL tem status atualizado (resolved, wontfix, accepted_f1, deferred). KLs simples resolvidas.

Commit: chore: update known limitations — resolve KL-1, KL-2 where possible (MX108)

---

### MX109 — Consolidacao de testes

O que fazer:

1. Rodar suite completa 3x para detectar flaky tests:
   for i in 1 2 3; do
   echo "=== Run $i ==="
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full 2>&1 | tail -3
   done

2. Se algum teste falha intermitentemente: investigar e corrigir ou documentar como flaky.

3. Rodar unit tests de todos os packages:
   pnpm test 2>&1 | tail -10

4. Se algum package nao tem testes, e uma area critica (kernel, drivers, scp-worker): adicionar pelo menos 1 smoke test.

5. Verificar que pnpm ci:full passa (gate completo de CI):
   pnpm ci:full 2>&1 | tail -10

Criterio de aceite: 3 runs E2E consecutivos sem falha. pnpm ci:full green.

Commit: test: consolidation — 3x E2E stability + ci:full green (MX109)

---

### MX110 — Documentacao final pre-deploy

O que fazer:

1. Gerar ARCHITECTURE_OVERVIEW.md com:
   - Diagrama textual da arquitetura (monorepo, packages, apps, infra)
   - Lista de packages com descricao de cada um
   - Lista de apps com descricao
   - Pipeline SCP (browser -> Edge Function -> outbox -> poller -> consumers)
   - Driver Model (interfaces -> implementacoes)
   - Fluxo de autenticacao (Supabase Auth -> JWT claims -> RLS)

2. Atualizar README.md raiz com:
   - Badges: CI status, TypeScript, license
   - Quick start resumido
   - Link para docs detalhados

3. Consolidar SPRINT_LOG.md — verificar que todos os sprints 2-19 estao documentados.

4. Atualizar QUICK_START.md com instrucoes completas de setup local:
   - Prerequisites: Node 22, pnpm, Docker, Supabase CLI
   - Passos: clone, install, db start, seed, dev
   - Como rodar E2E
   - Como rodar scp-worker
   - Como configurar BYOK LLM

5. Atualizar SPRINT_LOG.md com Sprint 20.

Criterio de aceite: 3 documentos de auditoria gerados (SECURITY_AUDIT.md, CODE_QUALITY_AUDIT.md, ARCHITECTURE_OVERVIEW.md). README atualizado. SPRINT_LOG completo.

Commit: docs: sprint 20 — pre-deploy audit complete (MX110)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem feat/fix/docs/audit/chore(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. NAO adicionar features novas. Este sprint e AUDITORIA e LIMPEZA.
R5. Bloqueios mantidos: sem next em shells, sem inngest, sem @clerk/\*, sem prisma.
R6. Antes de cada commit: pnpm typecheck && pnpm lint.
R7. Nao execute fora de ~/Projetos/aethereos.
R8. Ao perceber contexto cheio: pare, escreva pickup point.
R9. NAO quebrar os 33+ E2E existentes.
R10. Vulnerabilidades CRITICAL e HIGH devem ser resolvidas ou ter mitigacao documentada.
R11. Se pnpm update quebrar o build: reverter e usar override especifico.
R12. RLS ausente em qualquer tabela kernel e BLOCKER que deve ser resolvido ANTES de commitar MX106.
R13. Nao refatorar componentes grandes — apenas documentar como divida. Refatoracao e outro sprint.

---

## TERMINO DO SPRINT

Quando MX110 estiver commitado:

1. Rode o gate final completo:
   pnpm typecheck && pnpm lint && pnpm test
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full
   pnpm audit --audit-level=high

2. Reporte:
   - TypeCheck: X/X
   - Lint: X/X
   - Unit tests: X passed
   - E2E: X passed, Y failed, Z skipped
   - Audit: X critical, Y high, Z moderate
   - RLS: X/68 tabelas com RLS
   - Documentos gerados: SECURITY_AUDIT.md, CODE_QUALITY_AUDIT.md, ARCHITECTURE_OVERVIEW.md

3. Pare aqui. Nao inicie Sprint 21.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 20 (Auditoria Pre-Deploy) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX104-MX110 nao concluida
5. Continue a partir dela

Lembrar:

- Sprint de AUDITORIA. ZERO features novas.
- Prioridade: deps critical/high -> RLS 68/68 -> TODOs -> KLs -> testes -> docs
- 3 documentos finais: SECURITY_AUDIT.md, CODE_QUALITY_AUDIT.md, ARCHITECTURE_OVERVIEW.md
- pnpm audit --audit-level=high deve retornar 0 critical/high ao final
- 33+ E2E nao podem quebrar
- Se update quebrar build: reverter + override especifico

Roadmap em SPRINT_20_PROMPT.md na raiz.
