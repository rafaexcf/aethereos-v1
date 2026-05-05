# SPRINT LONGO AUTÔNOMO — Aethereos Bootstrap Fase 8

> Continuação dos Sprints 1-7. Terceiro e último dos 3 sprints da consolidação Camada 1 antes de Camada 2.
> Foco desta fase: **dívidas externas e bloqueadores não-arquiteturais herdados dos sprints anteriores**.
>
> **Decisões humanas registradas para este sprint:**
>
> 1. **Sem chave LLM real.** Copilot continua em modo degradado.
> 2. **RAG é implementado mas NÃO VALIDADO end-to-end** (sem LLM real, RAG não pode ser testado contra resposta correta com citação). Marcado explicitamente como "implementação cega" no log de fechamento.
> 3. **Fix dos 3 containers em loop é trabalho paralelo** dentro deste sprint.
> 4. **Escopo completo:** LLM degradado + RAG não-validado + Staff service_role + fix containers + Playwright E2E.

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code retomando trabalho. Sprints 1-7 entregues. Camada 1 base e arquitetura consolidadas. Restam dívidas externas que não são bloqueadores arquiteturais mas são bloqueadores operacionais.

1. **Leia integralmente:**
   - `CLAUDE.md`
   - `SPRINT_LOG.md` (todas as seções, especialmente Sprint 7 revisado)
   - `docs/SPRINT_6_5_AUDITORIA.md`
   - `docs/architecture/SCP_PIPELINE_E2E.md`
   - `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` Partes XI (AI-native, RAG, Modo Sombra), V (Observabilidade), XII (Compliance)
   - `docs/SECURITY_GUIDELINES.md` (especialmente seção sobre service_role e JIT access)
   - `docs/LLM_OPEX_GUIDELINES.md`
   - `docs/adr/0014-resolucao-stack-vs-analise-externa.md`
   - `docs/adr/0019-apps-internos-camada-1-copilot-shadow.md`
   - `docs/adr/0020-driver-model-bifurcacao-server-browser.md`
   - Código atual:
     - `apps/shell-commercial/src/apps/copilot/`
     - `apps/shell-commercial/src/apps/staff/` (ou rota `/staff/*`)
     - `packages/drivers-litellm/`
     - `packages/drivers-langfuse/`
     - `packages/drivers/src/interfaces/vector.ts` (interface VectorDriver canônica)
     - `infra/local/docker-compose.dev.yml`
     - `infra/otel/`

2. **Confirme em voz alta** (escreva no chat antes de qualquer ação) sete pontos:
   - Por que RAG **não pode ser validado E2E** sem chave LLM real (decisão humana registrada — Copilot em degradado)
   - Diferença operacional entre `service_role` key e `anon` key do Supabase
   - Por que service_role NUNCA pode ser exposta ao browser (mesmo que via env var pública)
   - Como Edge Functions Supabase resolvem a necessidade de service_role sem expor ao browser (já estabelecido em ADR-0020 e MX8)
   - Lista dos 3 containers em loop e razão provável de cada um (Tempo já foi pinado em 2.5.0 mas voltou a falhar — investigar; Langfuse e OTel collector têm causas diferentes)
   - O que é Playwright e por que tem valor real para validar pipeline E2E que `tsx`/Vitest não conseguem cobrir
   - Como pgvector + VectorDriver canônico implementam RAG mantendo Driver Model

3. **Verifique estado:**

```bash
git log --oneline -8
git status
pnpm typecheck > /tmp/precheck.log 2>&1; echo "TYPECHECK EXIT: $?"
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Se TYPECHECK != 0, **pare** e descreva.

---

## REGRAS INVIOLÁVEIS

(Iguais aos sprints anteriores)

**R1.** Commit por milestone com mensagem estruturada.
**R2.** Milestone só começa após anterior ter critério de aceite e commit.
**R3.** Após 3 tentativas, BLOQUEADA, registrar, pular. Sem loops.
**R4.** Nova dep exige justificativa.
**R5.** Bloqueios continuam: sem `next` em shells, sem `inngest`, sem `@clerk/*`, sem `prisma`, sem `framer-motion`, sem `aws-cdk`/`terraform`.
**R6.** Toda chamada LLM via LiteLLM. Toda feature flag via Unleash. Toda persistência via Driver Model.
**R7.** Antes de cada commit: `pnpm typecheck && pnpm lint`. Antes do encerramento: `pnpm ci:full` EXIT 0.
**R8.** Atualize `SPRINT_LOG.md` ao fim de cada milestone.
**R9.** Não execute fora de `~/Projetos/aethereos`. Não instale globais.
**R10.** Ao perceber contexto cheio: pare, escreva pickup point.
**R11.** Reuso obrigatório de patterns já estabelecidos (Driver Model, Edge Functions, KernelPublisher, RLS).

**R12. ESPECÍFICO SPRINT 8 — RAG não-validado:**

- RAG (Retrieval-Augmented Generation) é implementado mas **NÃO PODE SER VALIDADO E2E** contra LLM real porque Copilot continua em modo degradado por decisão humana
- Toda milestone que toque em RAG **deve marcar explicitamente "NÃO VALIDADO"** no SPRINT_LOG.md
- Critério de aceite de RAG é apenas: pipeline de embedding gera vetores, retrieval com query retorna top-K corretamente, integração com fluxo de Copilot existe
- **NÃO** testar contra resposta de LLM real
- **NÃO** marcar RAG como "totalmente entregue" sem aspa explícita no log
- Quando humano configurar chave LLM em sprint futuro, validação E2E vira tarefa de então

**R13. ESPECÍFICO SPRINT 8 — service_role e segurança:**

- `service_role` key **NUNCA** entra em código que roda no browser
- `service_role` **só** é usada em: Edge Functions Supabase, `scp-worker`, scripts CLI, Server Actions Next.js
- Toda função que precisa de service_role tem comentário JSDoc declarando "REQUIRES service_role"
- Browser **nunca** tem `SUPABASE_SERVICE_ROLE_KEY` em env (verificar `.env.local.example` e build configs)

**R14. ESPECÍFICO SPRINT 8 — fix containers em paralelo:**

- 3 containers em loop: Langfuse, Tempo, OTel collector
- Cada um tem causa raiz potencialmente diferente
- Diagnóstico: `docker logs <container> 2>&1 | tail -30` para cada
- Fix: pinar versões compatíveis (como Tempo 2.5.0 já foi feito) ou ajustar config
- **NÃO refatorar configs amplamente** — apenas chegar a estado funcional mínimo
- Se algum container exigir refactor amplo, marcar BLOQUEADO e seguir

**R15. ESPECÍFICO SPRINT 8 — Playwright E2E:**

- Playwright é browser automation real (não Vitest)
- Instalar como dev dependency em `apps/shell-commercial/` ou em pacote dedicado `tooling/e2e/`
- Cobertura mínima: login → criar pasta no Drive → ver evento aparecer em consumer NATS via assertion direta no banco
- Não tentar cobrir tudo — apenas o caminho crítico de validação SCP

---

## ARQUIVO DE LOG

Adicione ao `SPRINT_LOG.md`:

```markdown
---

# Sprint 8 — Dívidas externas + RAG não-validado + Staff service_role + fix containers + Playwright E2E

Início: <timestamp ISO>
Modelo: Claude Code (Sprint 8 N=1)

## Decisões humanas registradas

- Sem chave LLM real (Copilot em degradado)
- RAG implementado mas NÃO VALIDADO E2E
- Fix de containers em paralelo
- Escopo completo

## Calibração inicial (7 pontos respondidos)

[7 pontos]

## Histórico de milestones (Sprint 8)

[preenchido conforme avança]
```

Commit antes de prosseguir.

---

## ROADMAP DE MILESTONES

### MX13 — Diagnóstico e fix dos 3 containers em loop

**Objetivo:** estabilizar infra operacional. Trabalho independente do resto, pode rodar primeiro.

**Tarefas:**

1. Para cada container em loop:
   - `docker logs aethereos-langfuse-dev 2>&1 | tail -50`
   - `docker logs aethereos-tempo-dev 2>&1 | tail -50`
   - `docker logs aethereos-otel-collector-dev 2>&1 | tail -50`
2. Identificar causa raiz de cada:
   - **Langfuse:** provavelmente schema migration ou env var faltando ou versão incompatível com Postgres versão usada
   - **Tempo:** já foi pinado em 2.5.0 mas voltou a falhar — investigar config (talvez seção `metrics_generator` precise ajuste)
   - **OTel collector:** provavelmente cascata (depende de Tempo) ou config de receivers/exporters incompatível com versão
3. Aplicar fix mínimo:
   - Pinar versões compatíveis (preferir versão estável conhecida em vez de `:latest`)
   - Ajustar configs apenas para o estritamente necessário
   - Se algum exigir refactor amplo de config, marcar BLOQUEADO e seguir
4. Validar:
   - `docker compose -f infra/local/docker-compose.dev.yml up -d --force-recreate <container>`
   - Esperar 30 segundos
   - `docker ps --filter "name=<container>" --format "table {{.Names}}\t{{.Status}}"` — sem `Restarting`
5. Documentar em `docs/runbooks/operational-containers.md`:
   - Quais versões funcionam
   - Como diagnosticar problemas comuns
   - Como restartar

**Critério de aceite:**

```bash
docker compose -f infra/local/docker-compose.dev.yml up -d
sleep 30
docker ps --format "table {{.Names}}\t{{.Status}}"
# Esperado: 0 containers em Restarting
# Se algum permanecer em loop após 3 tentativas, marcar BLOQUEADO no log
```

Commit: `fix(infra): estabilizar containers operacionais (langfuse, tempo, otel-collector) (MX13)`

---

### MX14 — Staff panel com dados reais via Edge Function

**Objetivo:** rota `/staff/*` deixa de usar `DEMO_COMPANIES`. Service_role pattern correto.

**Tarefas:**

1. Criar `supabase/functions/staff-list-companies/index.ts`:
   - Recebe POST com JWT
   - Verifica `is_staff: true` no JWT
   - Se não staff → 403
   - Se staff → query `kernel.companies` via service_role client (server-side, sem RLS)
   - Retorna lista paginada
   - **Auditoria automática:** insere em `kernel.staff_access_log` cada chamada (já existe da MX6)
2. Criar `supabase/functions/staff-company-detail/index.ts`:
   - Recebe `company_id` no path/query
   - Verifica staff
   - Query company + memberships + métricas básicas (eventos últimos 7 dias, billing usage placeholder, etc.)
   - Notification automática para owner: "Acesso staff a sua empresa por [Nome]"
   - Audit
3. Atualizar `apps/shell-commercial/src/routes/staff/`:
   - Substituir `DEMO_COMPANIES` por chamada à Edge Function
   - Lista, drill-down, e botões existentes continuam funcionando mas com dados reais
   - Se Edge Function retornar 403 (não staff), redirect para `/`
4. Validar JWT injection do claim `is_staff`:
   - Documentar em `docs/runbooks/staff-claims.md` como adicionar `is_staff` no JWT custom hook
   - Pode ser via Supabase Studio (manual) ou via SQL function (preferido)
5. Testes:
   - Edge Function recusa requisição sem JWT
   - Edge Function recusa requisição com JWT sem `is_staff`
   - Edge Function aceita JWT com `is_staff: true`
   - Audit log popula corretamente

**Critério de aceite:**

```bash
pnpm typecheck && pnpm lint
pnpm dev:db
supabase functions serve --debug &
# Manual: simular login com user que tem is_staff=true
# Acessar /staff → vê companies reais
# Owner de company-alvo recebe notification (verificar kernel.notifications)
# audit log populado
```

Commit: `feat(staff): edge functions com service_role + dados reais + auditoria (MX14)`

---

### MX15 — pgvector + VectorDriver concreto + embedder

**Objetivo:** infraestrutura para RAG. Sem testar contra LLM ainda.

**Tarefas:**

1. Migration `supabase/migrations/0016_pgvector_embeddings.sql`:
   - Habilitar `CREATE EXTENSION IF NOT EXISTS vector;`
   - Tabela `kernel.embeddings`:
     - `id UUID PK`
     - `company_id UUID NOT NULL`
     - `source_type TEXT CHECK (source_type IN ('file','event','note','custom'))`
     - `source_id UUID NOT NULL`
     - `chunk_index INT NOT NULL`
     - `chunk_text TEXT NOT NULL`
     - `embedding vector(1536)` (dim padrão de embeddings OpenAI/Anthropic recentes)
     - `metadata JSONB`
     - `created_at TIMESTAMPTZ DEFAULT NOW()`
   - INDEX usando `ivfflat` ou `hnsw` (preferido se Postgres versão suporta)
   - RLS por `company_id`
2. Criar `packages/drivers-supabase/src/vector.ts`:
   - `SupabasePgvectorDriver implements VectorDriver`
   - Métodos: `upsert(items)`, `search(queryEmbedding, topK, filter)`, `delete(ids)`, `count(filter)`
   - **Versão server-side** (usa driver postgres, em transações)
3. Criar `packages/drivers-supabase/src/browser-vector.ts`:
   - `SupabaseBrowserVectorDriver implements VectorDriver`
   - Para queries do browser, usa `@supabase/supabase-js` com RLS (search só, sem upsert/delete)
4. Embedder em `supabase/functions/embed-text/index.ts`:
   - Recebe texto + opcional `model` (default declarado)
   - Chama LiteLLM endpoint `/embeddings`
   - **Modo degradado:** se LiteLLM offline ou sem chave, retorna 503 com mensagem clara — UI deve esperar retry posterior
   - Retorna `{ embedding: number[], model_used: string, token_count: number }`
5. Worker `apps/scp-worker/` ganha consumer para `platform.file.uploaded`:
   - Quando arquivo de texto (txt, md, pdf) é uploaded, busca conteúdo do Storage
   - Chunka em 500-1000 char com overlap 100
   - Para cada chunk, chama `embed-text` Edge Function
   - Insere em `kernel.embeddings`
   - **Modo degradado:** se embedder retornar 503, deixa arquivo sem embeddings (re-tenta em job periódico futuro — fora do escopo)
6. Testes:
   - Unit: VectorDriver upsert + search funciona contra Supabase local
   - Unit: chunk + embed em modo degradado deixa arquivo sem vetores sem crashar
   - Unit: search retorna top-K ordenado por similaridade

**Critério de aceite:**

```bash
pnpm typecheck && pnpm lint
pnpm test --filter=@aethereos/drivers-supabase
pnpm dev:db
# Manual: upload de arquivo de texto no Drive
# Worker consome evento, mas embedder retorna 503 (sem chave LLM)
# kernel.embeddings continua vazia (modo degradado correto)
# Log estruturado registra "embedder degraded — file skipped"
```

**LOG OBRIGATÓRIO no SPRINT_LOG.md:**

> "MX15 — RAG infra implementada mas **NÃO VALIDADA E2E** porque Copilot continua em degradado por decisão humana. Quando humano configurar `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY` em `.env.local` + LiteLLM com modelo configurado, validação E2E vira tarefa de sprint posterior."

Commit: `feat(rag): pgvector + VectorDriver + embedder edge function (MX15) [NAO VALIDADO E2E]`

---

### MX16 — Integração de RAG com Copilot (cega, sem LLM real)

**Objetivo:** Copilot ganha capacidade de buscar contexto. Mas como LLM está em degradado, retrieval é exercitado mas resposta final é canned.

**Tarefas:**

1. Em `apps/shell-commercial/src/apps/copilot/`:
   - Antes de chamar `instrumentedChat()`, fazer:
     - Embedder da query do usuário via Edge Function (modo degradado se offline)
     - Search top-K em `kernel.embeddings` da company ativa via `SupabaseBrowserVectorDriver`
     - Anexar chunks recuperados como contexto na chamada LLM
2. Quando LLM está em degradado:
   - **Ainda** rodar retrieval (validar que query→embedding→search funciona)
   - Mostrar UI: "📚 Encontrei 3 trechos relevantes em seus documentos. Copilot offline — habilite chave LLM para receber resposta sintetizada."
3. Citação clicável:
   - Cada chunk recuperado mostra link para `kernel.files.id` original
   - User pode clicar e ver arquivo no Drive
4. Testes:
   - Mock retrieval retorna 3 chunks → UI mostra os 3 chunks com link
   - Mock retrieval offline → UI mostra "RAG temporariamente indisponível"

**Critério de aceite:**

```bash
pnpm typecheck && pnpm lint
pnpm test --filter=@aethereos/shell-commercial
# Manual:
# 1. Upload de arquivo .txt com conteúdo conhecido
# 2. Esperar embedder rodar (vai estar em degradado, embeddings nunca criados)
# 3. Abrir Copilot, perguntar sobre conteúdo
# 4. UI mostra: "Encontrei 0 trechos. RAG ou Copilot indisponíveis no momento."
# Quando humano configurar LLM real depois, ciclo deve fechar.
```

**LOG OBRIGATÓRIO:**

> "MX16 — UI de RAG integrada ao Copilot. **NÃO VALIDADA E2E** com LLM real. Estado atual: retrieval pipeline funcional mas embeddings não geradas (embedder em degradado), portanto search retorna sempre 0 chunks."

Commit: `feat(copilot): retrieval RAG integrado ao Copilot (MX16) [NAO VALIDADO E2E]`

---

### MX17 — Playwright E2E: validar pipeline SCP completo no browser real

**Objetivo:** o que MX11 declarou pendente. Browser real → Edge Function → DB → NATS → consumer.

**Tarefas:**

1. Decidir local: `tooling/e2e/` (preferido — package dedicado) ou em `apps/shell-commercial/__tests__/e2e/`.
2. Setup Playwright:
   - `pnpm add -D -w @playwright/test playwright`
   - `pnpm dlx playwright install chromium`
   - `playwright.config.ts` com baseURL apontando pra dev server local
3. Test suite mínima:
   - **Test 1 — Login:** signup novo user, validar que sessão é criada
   - **Test 2 — Onboarding company:** criar nova company, validar que user é owner
   - **Test 3 — Drive end-to-end:** criar pasta, upload arquivo, validar:
     - Linha em `kernel.files`
     - Linha em `kernel.scp_outbox`
     - Worker consome (esperar com timeout)
     - Linha em `kernel.events`
     - Audit log popula
   - **Test 4 — Isolamento cross-tenant:** criar 2 users em 2 companies, verificar que Drive de A não vê arquivos de B
4. Script `pnpm test:e2e:browser` no root package.json
5. Documentar em `docs/runbooks/playwright-e2e.md`:
   - Como rodar local
   - Como debugar (modo headed, slow-mo)
   - Como adicionar novos testes
6. **Não inserir em CI por padrão** — Playwright é pesado e pode flaky em containers de CI. Roda local + decisão futura sobre CI.

**Critério de aceite:**

```bash
pnpm dev:infra
pnpm dev:db
pnpm --filter=@aethereos/shell-commercial dev &
pnpm test:e2e:browser
# Os 4 testes passam
```

Commit: `test(e2e): playwright browser-real para validar pipeline SCP completo (MX17)`

---

### MX18 — Encerramento Sprint 8

**Objetivo:** consolidar e fechar.

**Tarefas:**

1. Atualizar `SPRINT_LOG.md` com encerramento Sprint 8.
2. Criar `docs/SPRINT_8_REPORT_2026-04-29.md` (ou data atual):
   - O que foi entregue
   - **Marcar explicitamente** itens "NÃO VALIDADOS E2E":
     - MX15 — RAG infra
     - MX16 — RAG integração Copilot
   - Status final dos containers (quais ficaram funcionais, quais ficaram BLOQUEADOS)
   - Pendências para Sprint 9 (hardening + IaC + pre-prod, finalmente)
3. Atualizar `CLAUDE.md`:
   - Seção 4 (stack): atualizar status (containers operacionais, RAG infra)
4. **CI completo:** `pnpm ci:full` EXIT 0 obrigatório.

**Critério de aceite:**

```bash
pnpm ci:full > /tmp/sprint8_final.log 2>&1; echo "EXIT: $?"
# DEVE ser 0.
```

Commit final: `chore: encerramento sprint 8 — divida externa + rag nao validado + e2e browser`

Mensagem no chat: "SPRINT 8 ENCERRADO. EXIT 0 confirmado. Aguardando revisão humana."

---

## TÉRMINO DO SPRINT

Não inicie Sprint 9 sozinho. Pare aqui.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint 8 (dívidas externas) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (seção "Sprint 8")
3. Rode: git log --oneline -15 && git status && docker ps --format "table {{.Names}}\t{{.Status}}"
4. Identifique a próxima milestone MX13-MX18 não concluída
5. Continue a partir dela

Lembrar decisões humanas: sem LLM real, RAG não-validado, fix containers em paralelo.

Se SPRINT_LOG.md indicar "Sprint 8 encerrado", aguarde humano. Não inicie Sprint 9.

Roadmap em SPRINT_8_PROMPT.md na raiz.
```

Salve este arquivo como `SPRINT_8_PROMPT.md` na raiz do projeto antes de começar.
