# SPRINT CIRÚRGICO 9.6 — Smoke test completo + consertar todos os bugs

> **Tipo:** Sprint cirúrgico autônomo. Foco exclusivo em: **executar smoke test completo via browser real (Playwright) descobrindo todos os bugs até o final do fluxo, e consertar cada um conforme aparece**.
>
> **Não cria features novas.** **Não toca em V2.** **Não reescreve arquitetura.**
> Sprint só fecha quando humano consegue executar o fluxo completo (cadastro → empresa → dashboard → criar pasta no Drive → ver evento SCP em consumer NATS) sem falhar.
>
> **Estimativa:** 4-8 horas. Custo: $35-65. Pode passar de 8h se descobrir bug arquitetural — nesse caso pause e reporte.

---

## CONTEXTO

Sprint 9.5 entregou-se com EXIT 0 em ci:full E test:smoke automatizado. Mas durante smoke test manual executado pelo humano em 2026-04-30, **descobrimos 12 bugs ao tentar usar o produto**, sendo o último (#11) **crítico** — bloqueia todo pipeline SCP por causa de operador SQL errado em trigger.

Status dos 12 bugs descobertos:

| #          | Bug                                                                | Status                                                                    |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 1-6, 6b, 9 | Bugs de env, GRANT, hook                                           | Sprint 9.5 fixou                                                          |
| 11         | `scp_outbox_validate` operador `->>` errado                        | Migration `20260430000017_fix_scp_outbox_validate.sql` criada e commitada |
| 7          | Seed `kernel.companies` falha por coluna `metadata` ausente        | **ABERTO**                                                                |
| 8          | Regex `[a-z0-9-]{3,63}` HTML inválido                              | **ABERTO**                                                                |
| 10         | `kernel.files` sem grant para `authenticated`                      | **ABERTO**                                                                |
| 12         | Seed printa "✓ N items" mesmo quando insert falha (falso-positivo) | **ABERTO**                                                                |

E há um número desconhecido de bugs ainda não descobertos no resto do fluxo: criar empresa via Edge Function, dashboard, abrir Drive, criar pasta, criar pessoa, abrir Chat, mandar mensagem, abrir Configurações, mudar tema, abrir Copilot, etc.

**Lição aprendida do 9.5:** smoke test automatizado (`pnpm test:smoke`) cria conta inline, não usa o caminho real. Por isso passou apesar dos 12 bugs. Sprint 9.6 precisa testar o caminho real do usuário ponta-a-ponta, com browser de verdade.

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code retomando trabalho. Esta é a primeira vez na história deste projeto que o gate de aceite é **funcionalmente** rigoroso: produto tem que funcionar para humano de fato.

1. **Leia integralmente:**
   - `CLAUDE.md`
   - `SPRINT_LOG.md` (todas as seções, especialmente Sprint 9.5)
   - `docs/testing/MANUAL_SMOKE_TEST.md`
   - `docs/testing/KNOWN_LIMITATIONS.md`
   - `docs/adr/0021-criterios-prontidao-camada-1-testes.md`
   - `docs/adr/0022-criterios-aceite-sprints-validacao-e2e.md`
   - `tooling/seed/src/` (todo conteúdo — entender o seed bug #7 e #12)
   - `apps/shell-commercial/src/routes/select-company.tsx` (form que tem regex bug #8)
   - `supabase/functions/create-company/index.ts`
   - `supabase/migrations/20260429000003_m22_create_company_fn.sql`
   - `supabase/migrations/20260430000017_fix_scp_outbox_validate.sql` (fix recente do bug #11)
   - `supabase/migrations/` listing — entender estado atual de migrations

2. **Confirme em voz alta** (escreva no chat antes de qualquer ação) cinco pontos:
   - Lista exata dos 4 bugs abertos com causa raiz e plano de fix
   - Por que `pnpm test:smoke` (do Sprint 9.5) não detectou os bugs #7, #8, #10, #11, #12 (hipótese: cria conta inline em vez de usar seed → criar empresa → criar arquivo)
   - Diferença entre `pnpm test:smoke` e Playwright E2E real
   - Como o seed atual mente sobre sucesso (printa "✓ N items" ignorando erros do `.upsert()`)
   - Plano de teste E2E que valide login + criar empresa + criar pasta no Drive + ver evento SCP no outbox

3. **Verifique estado:**

```bash
git log --oneline -10
git status
pnpm typecheck > /tmp/precheck.log 2>&1; echo "TYPECHECK EXIT: $?"
docker ps --format "table {{.Names}}\t{{.Status}}"
supabase status 2>&1 | head -10
ls supabase/migrations/ | tail -5
```

Se TYPECHECK != 0 ou Supabase não rodando, **pare** e descreva.

---

## REGRAS INVIOLÁVEIS

**R1.** Commit por milestone com mensagem estruturada.
**R2.** Milestone só começa após anterior ter critério de aceite e commit.
**R3.** Após 3 tentativas de fix de bug específico, marcar BLOQUEADO, registrar, pular.
**R4.** Nova dep exige justificativa.
**R5.** Bloqueios continuam: sem `next` em shells, sem `inngest`, sem `@clerk/*`, sem `prisma`, sem `framer-motion`.
**R6.** Antes de cada commit: `pnpm typecheck && pnpm lint`. Antes do encerramento: gates triplos (`ci:full` + `test:smoke` + `test:e2e:full`).
**R7.** Atualize `SPRINT_LOG.md` ao fim de cada milestone.
**R8.** Não execute fora de `~/Projetos/aethereos`. Não instale globais.
**R9.** Ao perceber contexto cheio: pare, escreva pickup point.

**R10. ESPECÍFICO 9.6 — Sem features novas, sem V2:**

- Você NÃO está criando UI nova
- Você NÃO está adicionando novos apps
- Você NÃO toca no projeto V2 (que está em `~/Projetos/aethereos-v2/`) — não abrir, não comparar, não importar nada
- Sua missão é **fazer V1 funcionar end-to-end** com humano fazendo signup → criar empresa → usar produto

**R11. ESPECÍFICO 9.6 — Honestidade radical:**

- Se descobrir bug que exige refactor amplo, marcar BLOQUEADO e descrever
- Se descobrir bug arquitetural que merece ADR (como aconteceu no 6.5 com Driver Model), parar e reportar
- Se algum app não funcionar mesmo após 2 tentativas de fix, marcar como `app_known_broken` em `KNOWN_LIMITATIONS.md` — sprint não falha por isso, mas tester sabe
- O propósito é **fazer humano usar o produto**. Tudo que não contribuir é fora de escopo.

**R12. ESPECÍFICO 9.6 — Seed honesto:**

- Seed atual (bug #12) mente sobre sucesso. Refactor obrigatório:
  - Cada `.upsert()` que retornar `error !== null` deve falhar o seed inteiro (`process.exit(1)`)
  - Output deve mostrar exatamente quantos items inseriram com sucesso, não placeholder
  - Antes de seed, validar via SQL `SELECT COUNT(*) FROM kernel.companies WHERE created_at > now() - interval '1 minute'` para confirmar
- Sem isso, não dá pra confiar em nenhuma demo do produto.

**R13. ESPECÍFICO 9.6 — Playwright executado pelo agente:**

- Sprint 8 / MX17 declarou Playwright suite criada mas nunca rodada
- Sprint 9.6 vai rodar de verdade
- Se Playwright revelar bugs novos, eles entram no escopo deste sprint

---

## ARQUIVO DE LOG

Adicione ao `SPRINT_LOG.md`:

```markdown
---

# Sprint 9.6 — Cirúrgico: smoke test completo + bugs até produto funcionar

Início: <timestamp ISO>
Modelo: Claude Code (Sprint 9.6 N=1)

## Origem

Smoke test manual em 2026-04-30 descobriu 12 bugs ao usar o produto.
Sprint 9.5 fixou 8. Restam 4 abertos + número desconhecido de bugs no
resto do fluxo (criar empresa, dashboard, Drive, etc).

Decisão humana: Sprint 9.6 termina o smoke test, descobre todos os bugs,
conserta cada um. Sprint só fecha com produto funcional end-to-end.

## 5 pontos de calibração respondidos

[5 pontos]

## Histórico de milestones (Sprint 9.6)

[preenchido conforme avança]
```

Commit antes de prosseguir.

---

## ROADMAP DE MILESTONES

### MX33 — Inventário e fix dos 4 bugs abertos

**Objetivo:** zerar bugs conhecidos antes de partir para descoberta de novos.

**Tarefas:**

**A. Bug #7 — Seed companies falha por `metadata` column ausente:**

1. Investigar: `docker exec supabase_db_aethereos psql -U postgres -c "\d kernel.companies"` — ver colunas reais
2. Identificar: seed tenta inserir coluna `metadata` que não existe no schema
3. Decisão de fix:
   - **Opção A:** adicionar coluna `metadata jsonb default '{}'::jsonb` em `kernel.companies` via migration
   - **Opção B:** remover `metadata` do seed
   - Escolher Opção A se for útil para próximas features (provavelmente sim — domínios reais usam metadata)
4. Criar migration apropriada
5. Aplicar via `supabase db reset` (em local — em prod seria `supabase db push`)

**B. Bug #8 — Regex `[a-z0-9-]{3,63}` HTML inválido:**

1. Investigar: o regex em si é válido, problema é como Vite/React injeta no `pattern=` HTML
2. Verificar `apps/shell-commercial/src/routes/select-company.tsx` — provável uso de `pattern={"..."}` com escape errado
3. Fix: ou usar `pattern="[a-z0-9-]{3,63}"` literal sem template string, ou validar via JS no `onSubmit` em vez de pattern HTML

**C. Bug #10 — `kernel.files` sem grant para `authenticated`:**

1. Verificar grants: `docker exec supabase_db_aethereos psql -U postgres -c "\dp kernel.files"`
2. Se faltar GRANT SELECT/INSERT/UPDATE/DELETE para `authenticated` (com filtro RLS), criar migration
3. Repetir verificação para outras tabelas kernel que apps usam: `kernel.people`, `kernel.chat_*`, `kernel.settings`, `kernel.notifications`, `kernel.scp_outbox`, `kernel.embeddings`
4. Migration consolidada se múltiplas tabelas faltarem grants

**D. Bug #12 — Seed mente sobre sucesso:**

1. Refatorar `tooling/seed/src/index.ts` e arquivos auxiliares (`companies.ts`, `users.ts`, `people.ts`, etc.):
   - Toda chamada `.upsert()` ou `.insert()` que retornar `{ error: ... }` deve `process.exit(1)`
   - Output mostra contagem real do banco antes de declarar sucesso
   - Validação: ao final, query `SELECT COUNT(*) FROM <table>` para cada tabela seedada e printar
2. Se seed falhar, mensagem clara qual ponto falhou e por quê

**Critério de aceite:**

```bash
supabase db reset
pnpm seed:dev
# Espera ver "3 companies, 9 users, 60 people, 42 files, 9 channels, ..." de verdade
docker exec supabase_db_aethereos psql -U postgres -c "SELECT 'companies' as tbl, COUNT(*) FROM kernel.companies UNION ALL SELECT 'users', COUNT(*) FROM kernel.users;"
# Esperado: companies=3, users=9 (ou similar conforme seed)
```

Commit: `fix(sprint-9.6): bugs 7/8/10/12 — companies metadata, regex pattern, file grants, seed honesto (MX33)`

---

### MX34 — Smoke test E2E real via Playwright (browser de verdade)

**Objetivo:** validar fluxo completo do usuário no navegador.

**Tarefas:**

1. Verificar Playwright já configurado (Sprint 8 / MX17). Se não:
   - `pnpm dlx playwright install chromium`
2. Configurar credentials para test:
   - Usar usuários do seed (`ana.lima@meridian.test` / `Aethereos@2026!`)
3. Criar test suite E2E completa em `tooling/e2e/full-flow.spec.ts`:
   - **Test 1 — Login pré-seed:** acessar app, login com user pré-seed, validar que dashboard carrega
   - **Test 2 — Signup novo:** signup com email novo, validar que recebe redirect para "escolher empresa"
   - **Test 3 — Criar empresa:** preencher form de criar empresa (nome + slug), validar que Edge Function retorna 201 e redireciona para dashboard
   - **Test 4 — Drive: criar pasta:** abrir Drive, criar pasta, validar que aparece em UI e em DB (`kernel.files`)
   - **Test 5 — Drive: upload arquivo:** upload arquivo simples (.txt), validar persiste em Storage e tem entry em `kernel.files`
   - **Test 6 — Pessoas: criar:** abrir Pessoas, criar pessoa, validar persiste em `kernel.people`
   - **Test 7 — Configurações: mudar tema:** mudar tema, recarregar app, validar persiste
   - **Test 8 — Chat: enviar mensagem:** abrir Chat, escolher canal, enviar mensagem, validar entrega via Realtime + persistência em `kernel.chat_messages`
   - **Test 9 — Copilot: abrir drawer:** Cmd+K, drawer abre, mensagem digitada (sem testar resposta LLM — está em degradado)
   - **Test 10 — Eventos SCP: criar pasta gera evento:** ao criar pasta no Drive, verificar via SQL direto que linha apareceu em `kernel.scp_outbox` com `event_type='platform.folder.created'`
   - **Test 11 — RLS isolation:** logout, login como user de outra company (`patricia.rodrigues@solaris.test`), validar que NÃO vê dados de Meridian
4. Script `pnpm test:e2e:full` no root
5. Cada test é independente (não depende de estado de teste anterior)

**Critério de aceite:**

```bash
# Pré-requisitos: Supabase up, seed rodado, scp-worker dev, shell-commercial dev
pnpm test:e2e:full > /tmp/e2e_full.log 2>&1
echo "EXIT: $?"
# Esperado: EXIT 0, 11/11 testes passando
```

**SE ALGUM TESTE FALHAR:** consertar bug específico, adicionar à lista de bugs descobertos, voltar a rodar test:e2e:full. Repetir até EXIT 0. Se um teste exigir 3+ tentativas, marcar como BLOQUEADO em `KNOWN_LIMITATIONS.md` e seguir.

Commit: `test(e2e): playwright suite completa cobrindo 11 cenários do produto (MX34)`

---

### MX35 — Bugs adicionais descobertos durante MX34

**Objetivo:** consertar tudo que apareceu nos testes E2E.

**Tarefas:**

1. Para cada teste de MX34 que falhou inicialmente, registrar:
   - Bug #N descoberto
   - Tela/ação onde apareceu
   - Causa raiz
   - Fix aplicado
   - Resultado: teste passa após fix? Sim/Não
2. Lista esperada (não-exaustiva, baseado em lições do smoke test manual):
   - Edge Function `create-company` pode ter bugs adicionais além do trigger SCP
   - Edge Function `scp-publish` pode ter bugs (validação de schema, JWT)
   - Drive: upload pode falhar por config Storage local (CORS, bucket inexistente)
   - Pessoas: validação de email/cargo
   - Chat: Realtime subscription requer setup específico
   - Configurações: settings JSONB key constraint
   - Copilot: pode crashar ao tentar conectar LiteLLM (deve cair em fallback Modo Degenerado, mas pode não estar funcionando)
3. **Para cada bug descoberto, criar migration ou fix isolado.** Não acumular fixes em um commit gigante.

**Critério de aceite:**

- Todos os bugs descobertos em MX34 estão fixados ou marcados BLOQUEADOS em `KNOWN_LIMITATIONS.md`
- `pnpm test:e2e:full` passa com EXIT 0

Commit por bug. Mensagem padrão: `fix(<scope>): <descricao> (MX35 — bug #N)`

---

### MX36 — Pipeline SCP end-to-end validado (browser → outbox → NATS → consumer)

**Objetivo:** prova material que o pipeline central do sistema funciona.

**Tarefas:**

1. Test E2E especial em `tooling/e2e/scp-pipeline-real.spec.ts`:
   - User loga
   - User cria pasta no Drive
   - Test verifica:
     - Linha em `kernel.files` (escrita aconteceu)
     - Linha em `kernel.scp_outbox` (Edge Function escreveu evento)
     - Worker scp-worker consome (esperar com timeout 10s)
     - Linha em `kernel.events` (worker processou)
     - Mensagem em NATS subject correspondente (subscribe e validar payload)
     - Audit log entry
2. Setup: subir scp-worker em background com `pnpm --filter=@aethereos/scp-worker dev` antes do test
3. Teardown: kill worker

**Critério de aceite:**

```bash
pnpm test:e2e:scp-pipeline > /tmp/e2e_scp.log 2>&1
echo "EXIT: $?"
# EXIT 0 obrigatório
```

Commit: `test(e2e): pipeline SCP end-to-end browser → outbox → NATS validado (MX36)`

---

### MX37 — Quick start atualizado + KNOWN_LIMITATIONS revisitado + encerramento

**Objetivo:** consolidar e fechar.

**Tarefas:**

1. Atualizar `docs/testing/QUICK_START.md`:
   - Sequência exata de comandos para humano levantar tudo do zero em <5min
   - Inclui `pnpm setup:env`, `pnpm dev:db`, `pnpm seed:dev`, scp-worker, shell-commercial
   - Inclui validação `pnpm test:e2e:full` opcional
2. Atualizar `docs/testing/KNOWN_LIMITATIONS.md`:
   - Status final dos 12 bugs originais
   - Bugs descobertos durante Sprint 9.6
   - Bugs marcados BLOQUEADOS (se houver)
3. Atualizar `SPRINT_LOG.md` com encerramento Sprint 9.6
4. Criar `docs/SPRINT_9_6_REPORT_2026-04-30.md`:
   - Total de bugs descobertos no smoke test inteiro: original 12 + descobertos 9.6 = N
   - Status final de cada
   - Validação E2E rodando: 11+ testes Playwright em browser real
   - Lições aprendidas: padrão de "CI verde mas produto quebrado" foi quebrado neste sprint
5. **Gates triplos:**

```bash
pnpm ci:full > /tmp/sprint96_ci.log 2>&1; echo "ci:full EXIT: $?"
pnpm test:smoke > /tmp/sprint96_smoke.log 2>&1; echo "test:smoke EXIT: $?"
pnpm test:e2e:full > /tmp/sprint96_e2e.log 2>&1; echo "test:e2e:full EXIT: $?"
# OS TRÊS DEVEM SER 0
```

Commit final: `chore: encerramento sprint 9.6 — produto funcional end-to-end`

Mensagem no chat: "SPRINT 9.6 ENCERRADO. ci:full + test:smoke + test:e2e:full todos EXIT 0. Produto funciona end-to-end. Aguardando smoke test manual final pelo humano."

---

## TÉRMINO DO SPRINT

Não inicie Sprint 10 sozinho. Pare aqui.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint 9.6 (Cirúrgico — smoke test completo) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (seção "Sprint 9.6")
3. Rode: git log --oneline -15 && git status && supabase status 2>&1 | head -5
4. Identifique a próxima milestone MX33-MX37 não concluída
5. Continue a partir dela

Lembrar: este sprint não cria features. Apenas conserta bugs até produto funcionar end-to-end.
Sprint só fecha com TRÊS gates EXIT 0: ci:full + test:smoke + test:e2e:full.
NÃO tocar em ~/Projetos/aethereos-v2 (projeto separado, fora do escopo).

Se SPRINT_LOG.md indicar "Sprint 9.6 encerrado", aguarde humano. Não inicie Sprint 10.

Roadmap em SPRINT_9_6_PROMPT.md na raiz.
```

Salve este arquivo como `SPRINT_9_6_PROMPT.md` na raiz do projeto antes de começar.
