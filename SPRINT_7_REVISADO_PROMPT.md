# SPRINT LONGO AUTÔNOMO — Aethereos Bootstrap Fase 7 (REVISADO)

> Sprint 7 **revisado** após descoberta arquitetural no Sprint 6.5.
> Foco desta fase: **fechar a dívida arquitetural antes de qualquer hardening ou deploy real**.
>
> Sprint 7 **original** (hardening + IaC + pre-prod) foi adiado para Sprint 9.
> Sprint 8 cobrirá dívidas externas (LLM real, Staff service_role, RAG, fix containers).

---

## DESCOBERTA QUE MOTIVOU A REVISÃO

Auditoria objetiva do Sprint 6.5 (MX1) revelou:

1. **`SupabaseDatabaseDriver` original (Sprint 1) não roda no browser** porque usa `postgres` Node.js nativo. Foi escrito assumindo apenas server-side.
2. **Sprint 6.5 / MX2 criou `SupabaseBrowserDataDriver`** para apps de UI que rodam em Vite. Isso resolveu o sintoma mas bifurcou o Driver Model.
3. **Sprint 3 / M24** declarou Driver Model "empiricamente validado contra Local + Cloud" mas testou apenas contra **mocks**, não contra dois drivers cloud reais (server e browser).
4. **ADR-0016** (Camada 1 cloud-first) foi escrita assumindo simetria que não existe.
5. **Apps do Sprint 6.5 escrevem dados via `SupabaseBrowserDataDriver` mas não emitem eventos SCP** — `KernelPublisher` requer NATS + Node.js, inviável no browser. Outbox pattern só funciona server-side.

Isso quebra invariante central da Fundamentação Parte VIII (toda mudança gera evento SCP). Sem fix, todo dado entrando no sistema cria estado divergente entre banco e Event Store.

**Sprint 7 revisado fecha esse buraco antes de qualquer outra coisa.**

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code retomando trabalho. Sprints 1-6.5 entregues, mas com dívida arquitetural detectada.

1. **Leia integralmente:**
   - `CLAUDE.md`
   - `SPRINT_LOG.md` (todas as seções, especialmente Sprint 6.5)
   - `docs/SPRINT_6_5_AUDITORIA.md` (336 linhas — leitura cuidadosa)
   - `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` Partes IV.7 (Driver Model), VIII (SCP — Outbox e Event Store), X (RLS)
   - `docs/adr/0014-resolucao-stack-vs-analise-externa.md`
   - `docs/adr/0015-camada-0-arquitetura-local-first.md`
   - `docs/adr/0016-camada-1-arquitetura-cloud-first.md` (vai ser parcialmente revisado neste sprint)
   - Código atual:
     - `packages/drivers/src/interfaces/database.ts` (interface canônica)
     - `packages/drivers-supabase/src/database.ts` (server-side, `postgres` Node)
     - `apps/shell-commercial/src/lib/drivers.ts` (composição browser)
     - `apps/shell-commercial/src/lib/supabase-browser-data-driver.ts` (criado em Sprint 6.5 / MX2)
     - `packages/kernel/src/scp/publisher.ts` (KernelPublisher — server-only)

2. **Confirme em voz alta** (escreva no chat antes de qualquer ação) seis pontos:
   - Diferença entre `SupabaseDatabaseDriver` (server, `postgres`) e `SupabaseBrowserDataDriver` (browser, `@supabase/supabase-js`)
   - Por que browser não consegue escrever no Outbox PostgreSQL diretamente (RLS + visibilidade da `kernel.scp_outbox`)
   - O que é uma Edge Function do Supabase e por que ela é o caminho certo para outbox writer
   - Como `correlation_id` precisa propagar de browser → Edge Function → DB para preservar rastreabilidade
   - O que difere `pnpm test:isolation` de `pnpm test` e por que ainda não foi implementado de verdade
   - Quais 5 apps atualmente escrevem dados sem emitir eventos SCP (Drive, Pessoas, Configs, Chat, Staff)

3. **Verifique estado:**

```bash
git log --oneline -10
git status
pnpm typecheck > /tmp/precheck.log 2>&1; echo "TYPECHECK EXIT: $?"
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Se TYPECHECK != 0, **pare** e descreva.

---

## REGRAS INVIOLÁVEIS

(Iguais aos sprints anteriores)

**R1.** Commit por milestone com mensagem estruturada.
**R2.** Milestone só começa após anterior ter critério de aceite verificado e commit.
**R3.** Após 3 tentativas, BLOQUEADA, registrar, pular. Sem loops.
**R4.** Nova dep exige justificativa.
**R5.** Bloqueios continuam: sem `next` em shells, sem `inngest`, sem `@clerk/*`, sem `prisma`, sem `framer-motion`, sem `aws-cdk`/`terraform`.
**R6.** Toda chamada LLM via LiteLLM. Toda feature flag via Unleash.
**R7.** Toda persistência via Driver Model.
**R8.** Antes de cada commit: `pnpm typecheck && pnpm lint`. Antes do encerramento: `pnpm ci:full` EXIT 0.
**R9.** Atualize `SPRINT_LOG.md` ao fim de cada milestone.
**R10.** Não execute fora de `~/Projetos/aethereos`. Não instale globais.
**R11.** Ao perceber contexto cheio: pare, escreva pickup point.

**R12. ESPECÍFICO SPRINT 7 REVISADO — Sem features novas:**

- Você NÃO está criando UI nova
- Você NÃO está adicionando novos apps
- Você NÃO está reescrevendo arquitetura ampla
- Sua missão é **fechar dívida arquitetural** preservando comportamento existente
- Se descobrir bug pré-existente fora do escopo, anote no log mas **não conserte** — vira tarefa do Sprint 8

**R13. ESPECÍFICO SPRINT 7 REVISADO — Honestidade radical:**

- Se algum item exigir refactor amplo de packages existentes, **pare** e marque BLOQUEADO descrevendo o que precisa ser refatorado
- Se uma decisão arquitetural emergir durante o trabalho que mereça ADR, **pare** e descreva no log para humano decidir
- Auditoria do Sprint 6.5 expôs problemas que estavam invisíveis. Continue esse padrão.

**R14. ESPECÍFICO SPRINT 7 REVISADO — Edge Functions:**

- Edge Functions Supabase são código TypeScript que roda em Deno no edge da CDN da Supabase
- Local de código: `supabase/functions/<nome>/index.ts`
- Deploy: `supabase functions deploy <nome>` (manual no Sprint 7; automatizado depois)
- Comunicação browser → Edge Function: HTTP POST com JWT do usuário no header `Authorization`
- Edge Function tem acesso ao `SUPABASE_SERVICE_ROLE_KEY` via env (configurado server-side, nunca exposto ao browser)
- Outbox writing precisa ser **atômico** com a transação de domínio — Edge Function abre transação, faz UPDATE/INSERT da entidade + INSERT no `kernel.scp_outbox` numa só transação

---

## ARQUIVO DE LOG

Adicione ao `SPRINT_LOG.md`:

```markdown
---

# Sprint 7 (REVISADO) — Fechamento de dívida arquitetural

Início: <timestamp ISO>
Modelo: Claude Code (Sprint 7 revisado N=1)

## Origem

Sprint 6.5 / MX1 expôs dívida arquitetural: Driver Model bifurcou,
Outbox SCP só funciona server-side, apps escrevem sem emitir eventos.
Decisão humana: Sprint 7 original (hardening + IaC) adiado para Sprint 9.

## Calibração inicial (6 pontos respondidos)

[6 pontos]

## Histórico de milestones (Sprint 7 revisado)

[preenchido conforme avança]
```

Commit antes de prosseguir.

---

## ROADMAP DE MILESTONES

### MX7 — ADR de retificação: Driver Model bifurcado

**Objetivo:** documentar honestamente que o Driver Model bifurcou e estabelecer regras claras para os dois ramos.

**Tarefas:**

1. Criar `docs/adr/0020-driver-model-bifurcacao-server-browser.md`:
   - Status: Aceito
   - Subordinado a: ADR-0001, ADR-0014, ADR-0015, ADR-0016
   - Contexto: descoberta do Sprint 6.5 / MX1
   - Decisão: Driver Model tem dois ramos paralelos por contexto de execução
     - **Ramo Server (Node.js):** `SupabaseDatabaseDriver` via `postgres`, usado em `scp-worker`, Server Actions Next.js, Edge Functions, scripts CLI
     - **Ramo Browser:** `SupabaseBrowserDataDriver` via `@supabase/supabase-js`, usado em shells Vite (shell-base, shell-commercial)
     - **Ambos implementam interface canônica** `DatabaseDriver` mas com **capabilities diferentes** declaradas
   - Capabilities declaradas: ramo browser **NÃO** pode escrever em `kernel.scp_outbox` direto (RLS bloqueia, e mesmo se permitido, transações distribuídas browser↔server seriam frágeis)
   - Operações de escrita que exigem outbox são feitas via **Edge Functions** (server) que recebem chamada do browser
   - Mapeamento: tabela atualizada de "Driver × Camada 0 × Camada 1" com nova coluna "Browser ramo Camada 1"
   - Alternativas rejeitadas:
     - Forçar tudo em SSR (perderia natureza local-first do shell)
     - Conectar PostgreSQL direto do browser (impossível em produção)
     - Driver único isomórfico (overhead enorme, não vale a pena)
   - Consequências: aumenta cuidado com testes (cada feature de escrita tem 2 caminhos a testar), simplifica deploy (browser e server independentes)
2. Atualizar ADR-0016: adicionar nota de "Revisado parcialmente por ADR-0020" no header
3. Atualizar `CLAUDE.md`:
   - Seção 4 (stack): documentar bifurcação de drivers
   - Seção 5 (bloqueios em PR): adicionar regra: "Apps que rodam em browser usam apenas SupabaseBrowserDataDriver. Apps server-side (scp-worker, Edge Functions, comercio.digital) usam SupabaseDatabaseDriver"
4. Atualizar `packages/drivers/src/interfaces/database.ts` com JSDoc declarando capabilities por contexto

**Critério de aceite:**

```bash
ls docs/adr/0020-driver-model-bifurcacao-server-browser.md
grep -l "ADR-0020" CLAUDE.md
pnpm typecheck && pnpm lint
```

Commit: `docs(adr): ADR-0020 retificacao Driver Model bifurcacao server/browser (MX7)`

---

### MX8 — Edge Function `scp-publish` como outbox writer atômico

**Objetivo:** caminho oficial de browser → server para emissão SCP.

**Tarefas:**

1. Criar `supabase/functions/scp-publish/index.ts` (Deno):
   - Recebe POST com JWT no header
   - Body validado por Zod (mesmos schemas de `scp-registry`):
     - `event_type`, `payload`, `correlation_id`, `causation_id?`, `idempotency_key?`
   - Verifica JWT e extrai `user_id`, `company_id` ativo
   - Validação contra schema registrado (rejeita evento sem schema)
   - Bloqueio mecânico de operações invariantes se `actor.type=agent`
   - Abre transação via `service_role` client
   - Escreve em `kernel.scp_outbox` com `tenant_id=company_id`, `actor`, etc.
   - Retorna `{ event_id, correlation_id, occurred_at }`
   - Log estruturado com correlation_id propagado
2. Wrapper TypeScript em `apps/shell-commercial/src/lib/scp-publisher-browser.ts`:
   - `publishEvent(eventType, payload, opts?)`
   - Faz POST para `${SUPABASE_URL}/functions/v1/scp-publish`
   - Inclui JWT atual no header
   - Retorna Promise com event_id
   - Modo Degenerado: se Edge Function offline, log local + tentativa em background
3. Migration `supabase/migrations/0015_scp_publish_audit.sql`:
   - Trigger `BEFORE INSERT` em `kernel.scp_outbox` que valida `event_type` está no registry
   - Função `kernel.is_invariant_operation(event_type, payload)` retorna boolean
4. Testes:
   - Unit: chamar Edge Function com payload válido, verificar insert em outbox
   - Unit: chamar com payload inválido (schema mismatch), verificar 400
   - Unit: chamar com `actor.type=agent` tentando operação invariante, verificar 403
   - E2E: browser → Edge Function → outbox → consumer NATS recebe

**Critério de aceite:**

```bash
pnpm dev:db
supabase functions serve scp-publish &   # roda Edge Function localmente
# Teste curl: POST com JWT → 200, evento no outbox
# Teste curl: POST sem JWT → 401
# Teste curl: POST com event_type não registrado → 400
pnpm test --filter=@aethereos/shell-commercial
```

Commit: `feat(scp): edge function scp-publish como outbox writer atomico (MX8)`

---

### MX9 — Conectar emissão SCP em todos os apps do shell-commercial

**Objetivo:** os 5 apps que escrevem dados passam a emitir eventos via `publishEvent()`.

**Tarefas:**

1. Em cada app, após cada escrita bem-sucedida, chamar `publishEvent()` com schema apropriado:
   - **Drive** — `platform.file.uploaded`, `platform.file.deleted`, `platform.folder.created`
   - **Pessoas** — `platform.person.created`, `platform.person.updated`, `platform.person.deactivated`
   - **Chat** — `platform.chat.message_sent`, `platform.chat.channel_created`
   - **Configurações** — `platform.settings.updated`
   - **Staff** — `platform.staff.access` (já parcialmente feito em MX6, finalizar)
2. Pattern recomendado em cada app: chamada de driver (escrita) seguida de `publishEvent()` em try-catch que registra falha de evento mas não reverte escrita (eventual consistency aceitável aqui — Outbox writer atômico é só Edge Function)
3. **Outra opção (preferida):** mover toda escrita para chamar Edge Function que faz tudo (escrita + outbox + audit) em uma transação atômica. **Decisão arquitetural:** escolher uma das duas e documentar na ADR-0020.
4. Recomendação: para escritas simples (1 row), usar Edge Function dedicada (mais atômico). Para escritas em batch ou com lógica complexa de UI, manter padrão atual + emit posterior.
5. Testes E2E atualizados:
   - Criar arquivo no Drive → verificar evento em outbox + audit log
   - Criar pessoa → mesmo
   - Enviar mensagem chat → mesmo

**Critério de aceite:**

```bash
pnpm test --filter=@aethereos/shell-commercial
# Manual: subir tudo, criar pasta no Drive
# Verificar em DB: kernel.scp_outbox tem registro
# Worker SCP processa, evento aparece em kernel.events
```

Commit: `feat(apps): emissao SCP via edge function em todos os apps (MX9)`

---

### MX10 — Testes de isolamento RLS reais (`pnpm test:isolation`)

**Objetivo:** o que Sprint 1 / M19 declarou pronto mas o Sprint 6.5 / MX1 confirmou que nunca foi implementado de verdade.

**Tarefas:**

1. Criar `apps/scp-worker/__tests__/rls-isolation.test.ts` (ou local equivalente) com:
   - Teste 1: criar 2 companies (A, B), criar dados em cada
   - Teste 2: query como user de A → vê só dados de A
   - Teste 3: query como user de B → vê só dados de B
   - Teste 4: query sem contexto de tenant → 0 rows (fail-closed)
   - Teste 5: trocar contexto na mesma sessão muda visibilidade
   - Teste 6: tentar acessar dados de outra company via SQL injection → 0 rows
   - Teste 7: agent com `supervising_user_id` herda escopo do supervisor
2. Cobertura de RLS por tabela: `kernel.companies`, `kernel.tenant_memberships`, `kernel.files`, `kernel.people`, `kernel.chat_*`, `kernel.settings`, `kernel.events`, `kernel.scp_outbox`, `kernel.audit_log`, `kernel.notifications`, `kernel.staff_access_log`
3. Setup: usa Supabase local (`pnpm dev:db`). Skip se não disponível.
4. Script `pnpm test:isolation` no root package.json roda esses testes
5. CI roda `pnpm test:isolation` se Supabase disponível, ou marca como `skipped` graciosamente

**Critério de aceite:**

```bash
pnpm dev:db
pnpm test:isolation
# Todos os testes passam, fail-closed comprovado, isolamento por company validado
```

Commit: `test(rls): testes de isolamento cross-tenant reais (MX10)`

---

### MX11 — Validação fim-a-fim: usuário cria pasta → evento aparece em consumer NATS

**Objetivo:** prova material de que pipeline completo funciona, end-to-end, sem mock.

**Tarefas:**

1. Script de validação E2E em `tests/e2e/scp-pipeline.test.ts`:
   - Sobe Supabase local
   - Sobe scp-worker
   - Sobe NATS local
   - Login programático como user de uma company
   - Cria arquivo no Drive via UI (Playwright ou via API direta)
   - Espera 2-3 segundos
   - Verifica:
     - Linha em `kernel.files`
     - Linha em `kernel.scp_outbox` com `event_type='platform.file.uploaded'`
     - Linha em `kernel.events` (worker processou)
     - Mensagem em NATS subject correspondente
     - Audit log entry
2. Documentar em `docs/architecture/SCP_PIPELINE_E2E.md`:
   - Diagrama textual do pipeline
   - Como rodar o teste
   - O que validar manualmente

**Critério de aceite:**

```bash
pnpm dev:infra
pnpm dev:db
pnpm test:e2e
# Pipeline E2E passa
# Documentação existe e descreve fluxo
```

Commit: `test(e2e): validacao fim-a-fim do pipeline SCP (MX11)`

---

### MX12 — Encerramento Sprint 7 revisado

**Objetivo:** consolidar e fechar.

**Tarefas:**

1. Atualizar `SPRINT_LOG.md` com encerramento Sprint 7 revisado.
2. Criar `docs/SPRINT_7_REVISADO_REPORT_2026-04-29.md`:
   - O que foi entregue
   - Status final de cada dívida do Sprint 6.5
   - Pendências (vão para Sprint 8): LLM real, Staff service_role, RAG, fix containers
   - Métricas
3. **CI completo:** `pnpm ci:full` EXIT 0 obrigatório.

**Critério de aceite:**

```bash
pnpm ci:full > /tmp/sprint7r_final.log 2>&1; echo "EXIT: $?"
# DEVE ser 0.
```

Commit final: `chore: encerramento sprint 7 revisado — divida arquitetural fechada`

Mensagem no chat: "SPRINT 7 REVISADO ENCERRADO. EXIT 0 confirmado. Aguardando revisão humana."

---

## TÉRMINO DO SPRINT

Não inicie Sprint 8 sozinho. Pare aqui.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint 7 revisado (dívida arquitetural) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (seção "Sprint 7 (REVISADO)")
3. Leia docs/SPRINT_6_5_AUDITORIA.md
4. Rode: git log --oneline -15 && git status
5. Identifique a próxima milestone MX7-MX12 não concluída
6. Continue a partir dela

Lembrar: este sprint não cria features, só fecha dívida arquitetural.

Se SPRINT_LOG.md indicar "Sprint 7 revisado encerrado", aguarde humano. Não inicie Sprint 8.

Roadmap em SPRINT_7_REVISADO_PROMPT.md na raiz.
```

Salve este arquivo como `SPRINT_7_REVISADO_PROMPT.md` na raiz do projeto antes de começar.
