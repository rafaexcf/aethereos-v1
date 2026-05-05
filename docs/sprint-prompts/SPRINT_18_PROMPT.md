# SPRINT 18 — SCP Consumer: Outbox Poller + NATS JetStream + Workers

> **Objetivo:** Eventos no scp_outbox sao consumidos, publicados no NATS JetStream, e processados por consumers (embedding, audit log, notificacoes). Pipeline completo: browser -> Edge Function -> outbox -> poller -> NATS -> consumers.
> **NAO inclui:** Context Engine avancado, Policy Engine, staging deploy, verticais.
> **Estimativa:** 4-6 horas. Custo: $25-45.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar Sprint 17 documentado
3. git log --oneline -10 — confirmar HEAD
4. kernel.scp_outbox — tabela outbox (id, company_id, event_type, event_id, payload, envelope, status pending/published/failed, attempts, last_error, created_at, published_at)
5. apps/scp-worker/ — skeleton existente (main.ts VAZIO, embedding-consumer.ts parcial, package.json com deps @aethereos/drivers-nats)
6. packages/kernel/src/scp/consumer.ts — BaseConsumer abstract class (eventTypes, handle, start)
7. supabase/functions/scp-publish/index.ts — Edge Function que insere no outbox (validada E2E)
8. infra/local/docker-compose.dev.yml — NATS JetStream na porta 4222, HTTP monitoring 8222
9. packages/drivers-nats/ — verificar se existe e que interface expoe

### Estado atual

- 17 eventos pending no outbox (platform.file.uploaded), nenhum processado
- Edge Function scp-publish funciona (validada E2E): browser POST -> insere em scp_outbox
- scp-worker existe como skeleton: package.json com deps, main.ts VAZIO
- embedding-consumer.ts tem logica de chunking + fetch para embed-text Edge Function, mas nao esta wired
- BaseConsumer no kernel define abstract class com eventTypes + handle + start
- NATS configurado no docker-compose mas nunca subiu em dev (nao e blocker — poller pode funcionar sem NATS)
- @aethereos/drivers-nats e dep declarada mas precisa verificar se existe

### Arquitetura da solucao

Pipeline SCP em 3 etapas:

ETAPA 1 — Outbox Poller (sem NATS, funciona standalone):

- Process Node.js que pollea scp_outbox WHERE status=pending ORDER BY created_at ASC LIMIT 50
- Para cada evento: processa diretamente (chama consumers inline) ou publica no NATS
- Marca como published ou failed (com retry ate 3 tentativas)
- Roda como processo separado: pnpm --filter @aethereos/scp-worker start

ETAPA 2 — NATS JetStream (quando disponivel):

- Poller publica no NATS stream SCP_EVENTS
- Consumers subscrevem via NATS consumer groups (durable)
- Se NATS nao disponivel: fallback para processamento inline no poller

ETAPA 3 — Consumers:

- EmbeddingConsumer: platform.file.uploaded -> chunk + embed -> INSERT kernel.embeddings
- AuditConsumer: todos os eventos -> INSERT kernel.audit_log (append-only)
- NotificationConsumer: platform.person.created, platform.file.uploaded -> INSERT kernel.notifications

Para este sprint, priorizar ETAPA 1 (poller standalone) + ETAPA 3 (consumers inline). NATS e opcional — se drivers-nats existe e funciona, integrar; se nao, inline e suficiente.

---

## MILESTONES

### MX90 — Verificar drivers-nats e decidir modo

O que fazer:

1. Verificar se packages/drivers-nats/ existe e compila:
   - ls packages/drivers-nats/src/
   - Se existe: verificar interface (NatsEventBusDriver)
   - Se NAO existe: criar stub minimo ou operar em modo inline (sem NATS)

2. Verificar se NATS sobe localmente:
   - docker compose -f infra/local/docker-compose.dev.yml up -d nats
   - curl http://localhost:8222/varz (monitoring)
   - Se funciona: modo NATS habilitado
   - Se nao: modo inline (poller processa diretamente sem pub/sub)

3. Decisao: documentar modo escolhido (NATS ou inline) no commit message.

4. Se drivers-nats nao existir ou nao compilar: NAO gastar mais de 30min tentando fazer funcionar. Ir para modo inline e registrar como KNOWN_LIMITATION.

Criterio de aceite: Decisao documentada. Se NATS: container sobe e responde. Se inline: justificativa clara.

Commit: chore(scp-worker): verify nats availability — mode decision (MX90)

---

### MX91 — Outbox Poller

O que fazer:

1. Implementar apps/scp-worker/src/main.ts:

   Loop principal:
   - Conectar ao Postgres via connection string (SUPABASE_DB_URL ou postgres://postgres:postgres@127.0.0.1:54322/postgres)
   - A cada 2 segundos (configurable via SCP_POLL_INTERVAL_MS):
     a) SELECT \* FROM kernel.scp_outbox WHERE status='pending' ORDER BY created_at ASC LIMIT 50 FOR UPDATE SKIP LOCKED
     b) Para cada evento: chamar processEvent(event)
     c) Se sucesso: UPDATE status='published', published_at=now()
     d) Se erro: UPDATE attempts=attempts+1, last_error=error.message. Se attempts >= 3: status='failed'
   - Graceful shutdown em SIGTERM/SIGINT

2. processEvent(event) decide o que fazer:
   - Se NATS disponivel: publicar no stream SCP_EVENTS subject scp.{event_type}
   - Se inline: chamar consumers diretamente

3. Usar postgres package (ja e dep) para queries raw (nao Drizzle — worker e lightweight).

4. Env vars:
   - DATABASE_URL (default postgres://postgres:postgres@127.0.0.1:54322/postgres)
   - SCP_POLL_INTERVAL_MS (default 2000)
   - NATS_URL (default nats://127.0.0.1:4222, opcional)
   - SUPABASE_URL (para Edge Functions de embedding)
   - SUPABASE_ANON_KEY

5. Script start: node --env-file=../../.env.local dist/main.js (ja existe no package.json)

Criterio de aceite: Rodar pnpm --filter @aethereos/scp-worker start, poller consome eventos pending e marca como published. Log estruturado no console.

Commit: feat(scp-worker): outbox poller — poll pending events + mark published (MX91)

---

### MX92 — AuditConsumer

O que fazer:

1. Criar apps/scp-worker/src/consumers/audit-consumer.ts:
   - Escuta TODOS os event types (wildcard)
   - Para cada evento: INSERT em kernel.audit_log com campos mapeados do envelope
   - Campos: company_id, event_type, event_id, actor (do envelope), payload, created_at
   - Append-only, nunca falha (catch e log, nao rejeita)

2. Verificar schema de kernel.audit_log e adaptar INSERT conforme colunas existentes.

3. Registrar o consumer no main.ts.

Criterio de aceite: Eventos processados pelo poller geram registros em kernel.audit_log.

Commit: feat(scp-worker): audit consumer — append-only audit log for all events (MX92)

---

### MX93 — EmbeddingConsumer

O que fazer:

1. Completar apps/scp-worker/src/embedding-consumer.ts (ja tem logica parcial):
   - Escuta: platform.file.uploaded
   - Para cada evento: extrair file_id, storage_path, mime_type do payload
   - Se mime_type suportado (text/plain, text/markdown): fetch conteudo do storage, chunk, embed via Edge Function embed-text, INSERT em kernel.embeddings
   - Se nao suportado: skip com log

2. Edge Function embed-text pode nao existir ainda. Se nao existir:
   - Criar supabase/functions/embed-text/index.ts que recebe texto e retorna embedding via LLM driver
   - OU: chamar embedding diretamente via LiteLLM gateway POST /embeddings
   - OU: marcar como KNOWN_LIMITATION (embedding depende de LLM configurado) e implementar consumer skeleton que loga skip

3. Se embedding nao e viavel sem LLM gateway rodando, fazer o consumer graceful: tenta, se falha loga e marca evento como published (nao bloqueia pipeline).

Criterio de aceite: EmbeddingConsumer registrado, processa platform.file.uploaded. Se embedding viavel: gera registros em kernel.embeddings. Se nao: skip gracioso documentado.

Commit: feat(scp-worker): embedding consumer — chunk + embed for file uploads (MX93)

---

### MX94 — NotificationConsumer

O que fazer:

1. Criar apps/scp-worker/src/consumers/notification-consumer.ts:
   - Escuta: platform.person.created, platform.file.uploaded, kernel.chat.channel_created
   - Para cada evento: INSERT em kernel.notifications para o usuario relevante
     - platform.person.created: notificar created_by user (Novo contato: {full_name})
     - platform.file.uploaded: notificar uploaded_by user (Arquivo enviado: {name})
     - kernel.chat.channel_created: notificar created_by user (Canal criado: {name})
   - type: 'info', source_app: event_type prefix (platform, kernel)

2. Cuidado com duplicacao: se o browser ja emitiu notificacao inline (como no proposal workflow), o consumer pode gerar duplicata. Solucao: verificar se ja existe notificacao com source_id = event_id antes de inserir (idempotencia).

3. Registrar o consumer no main.ts.

Criterio de aceite: Eventos processados geram notificacoes. Sem duplicatas.

Commit: feat(scp-worker): notification consumer — auto-notify on key events (MX94)

---

### MX95 — Script de dev e integracao

O que fazer:

1. Adicionar script no package.json raiz:
   - "dev:scp-worker": "pnpm --filter @aethereos/scp-worker dev"
   - "dev:infra": "docker compose -f infra/local/docker-compose.dev.yml up -d nats litellm"

2. Criar .env.local na raiz (se nao existe) com:
   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres
   SCP_POLL_INTERVAL_MS=2000
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

3. Documentar no README ou QUICK_START.md como rodar o pipeline completo:
   Terminal 1: pnpm db:start (Supabase)
   Terminal 2: pnpm dev:infra (NATS + LiteLLM)
   Terminal 3: pnpm dev (shell)
   Terminal 4: pnpm dev:scp-worker (consumer)

4. Testar pipeline end-to-end:
   - Abrir shell no browser
   - Upload arquivo no Drive (gera platform.file.uploaded)
   - scp-worker consome o evento
   - Verificar: audit_log tem registro, notification criada

Criterio de aceite: Pipeline end-to-end funciona localmente. Docs atualizados.

Commit: feat(infra): scp-worker dev scripts + pipeline integration (MX95)

---

### MX96 — Testes + documentacao

O que fazer:

1. Testes unitarios para o poller:
   - Mock postgres: verifica SELECT FOR UPDATE SKIP LOCKED
   - Mock processEvent: verifica UPDATE status
   - Retry logic: 3 tentativas -> failed

2. Testes unitarios para cada consumer:
   - AuditConsumer: verifica INSERT em audit_log
   - NotificationConsumer: verifica INSERT com idempotencia
   - EmbeddingConsumer: verifica chunk logic (ja tem teste?)

3. Rodar suite completa:
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

4. Resultado esperado: 33+ passed, 0 failed. Nenhum E2E existente quebrado.

5. Atualizar SPRINT_LOG.md com Sprint 18.

Criterio de aceite: Testes passam, documentacao atualizada.

Commit: docs: sprint 18 — SCP consumer pipeline (MX96)

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
R10. NAO quebrar os 33 E2E existentes.
R11. Poller usa FOR UPDATE SKIP LOCKED para concorrencia (multiplas instancias seguras).
R12. Consumers NUNCA bloqueiam o pipeline. Se um consumer falha, log e continua.
R13. Se NATS nao funcionar em 30min, ir para modo inline e documentar.

---

## TERMINO DO SPRINT

Quando MX96 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte o resultado (X passed, Y failed, Z skipped).

3. Pare aqui. Nao inicie Sprint 19.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 18 (SCP Consumer Pipeline) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX90-MX96 nao concluida
5. Continue a partir dela

Lembrar:

- Pipeline: browser -> scp-publish Edge Function -> scp_outbox -> poller -> consumers
- Poller usa SELECT FOR UPDATE SKIP LOCKED, retry 3x, marca published/failed
- 3 consumers: Audit (todos), Embedding (file.uploaded), Notification (person/file/channel)
- NATS e opcional (modo inline e fallback valido)
- Consumers nunca bloqueiam pipeline (catch + log + continue)
- 33 E2E existentes nao podem quebrar

Roadmap em SPRINT_18_PROMPT.md na raiz.
