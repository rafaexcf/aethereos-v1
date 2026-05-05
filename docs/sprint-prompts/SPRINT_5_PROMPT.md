# SPRINT LONGO AUTÔNOMO — Aethereos Bootstrap Fase 5

> Continuação dos Sprints 1-4. Início da consolidação da Camada 1.
> Foco desta fase: **Fundação operacional — LiteLLM, Langfuse, Unleash, OpenTelemetry, Notificações, Modo Degenerado, Health Checks**.
>
> Plano-mestre completo em `CAMADA_1_PLANO_MESTRE.md`. Este sprint é o primeiro de 3 (5, 6, 7) que consolidam Camada 1 antes de Camada 2.

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code retomando trabalho. Sprints 1-4 concluídos, comercio.digital entregue como SaaS standalone, Camada 1 base (shell-commercial) operacional mas sem infra de observabilidade/feature-flags/LLM-gateway.

1. **Leia integralmente:**
   - `CLAUDE.md`
   - `SPRINT_LOG.md`
   - `CAMADA_1_PLANO_MESTRE.md` (contexto de onde Sprint 5 se encaixa)
   - `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` Partes V (SLOs/Observabilidade), XI (AI-native), XIII (Modo Degenerado)
   - `docs/LLM_OPEX_GUIDELINES.md` (P15 — orçamento LLM)
   - `docs/SECURITY_GUIDELINES.md`
   - `docs/adr/0014-resolucao-stack-vs-analise-externa.md` (decisões cravadas: LiteLLM, Langfuse, Unleash, OTel)
   - `packages/drivers/src/interfaces/llm.ts`
   - `packages/drivers/src/interfaces/observability.ts`
   - `packages/drivers/src/interfaces/feature-flags.ts`

2. **Confirme em voz alta** (escreva no chat antes de qualquer ação) sete pontos:
   - Por que LiteLLM em vez de chamar OpenAI/Anthropic direto (P15 + ADR-0014)
   - O que é P15 e que 6 campos exige antes de merge de feature LLM
   - Por que feature flags em tabela ad-hoc no banco é bloqueado pelo guardrail e Unleash é a alternativa cravada
   - O que distingue traces (Tempo) de logs (Loki) de métricas (Prometheus) no OTel stack
   - Como `correlation_id` propaga entre evento SCP, request HTTP e chamada LLM
   - O que é Modo Degenerado (P14) e por que é obrigatório
   - Diferença entre health (`/healthz`) e readiness (`/readyz`) probes

3. **Verifique estado:**

```bash
git log --oneline -8
git status
pnpm ci:full > /tmp/precheck.log 2>&1; echo "EXIT: $?"
```

Se EXIT != 0, **pare** e descreva. Não inicie sprint sobre base quebrada.

---

## REGRAS INVIOLÁVEIS

(Iguais aos Sprints 1-4)

**R1.** Commit obrigatório após cada milestone, mensagem estruturada.

**R2.** Nenhuma milestone começa sem critério de aceite verificado e commit feito.

**R3.** Após 3 tentativas, BLOQUEADA, registrar, pular. Sem loops.

**R4.** Nova dep exige justificativa. Verifique stack ADR-0014.

**R5.** Bloqueios continuam: sem `next` em shells, sem `inngest`, sem `@clerk/*`, sem `prisma`, sem `framer-motion`, sem `aws-cdk`/`terraform`.

**R6.** Toda chamada LLM passa por LiteLLM gateway. **Nunca** instanciar `OpenAI()` ou `Anthropic()` direto em código de domínio. Importar do `LLMDriver` interface.

**R7.** Toda feature flag passa por Unleash. **Nunca** ler de tabela ad-hoc no banco para controle de feature.

**R8.** Antes de cada commit: `pnpm typecheck && pnpm lint`. Antes do encerramento: `pnpm ci:full` completo, EXIT 0 confirmado.

**R9.** Atualize `SPRINT_LOG.md` ao fim de cada milestone.

**R10.** Não execute fora de `~/Projetos/aethereos`. Não instale globais.

**R11.** Ao perceber contexto cheio: pare, escreva pickup point.

**R12.** Reuso obrigatório de patterns dos sprints anteriores (Driver Model, KernelPublisher, RLS, project references).

**R13.** **Específico Sprint 5:** novos containers Docker entram em `docker-compose.dev.yml`. Não fragmentar em múltiplos compose files. Toda config local em um lugar.

**R14.** **Específico Sprint 5:** secrets nunca commitados. Toda chave/token em `.env.local.example` com placeholder claro. `.gitignore` cobre `.env.local`.

**R15.** **Específico Sprint 5:** custo de LLM observável desde a primeira chamada. M33 (Langfuse) precisa estar funcional antes de qualquer feature LLM real. Se M33 ficar BLOQUEADA, M45+ no Sprint 6 também trava — flag isso no log.

---

## ARQUIVO DE LOG

Adicione nova seção ao `SPRINT_LOG.md`:

```markdown
---

# Sprint 5 — Fundação operacional (LiteLLM, Langfuse, Unleash, OTel, Notificações, P14, Health)

Início: <timestamp ISO>
Modelo: Claude Code (Sprint 5 N=1)
Plano-mestre: ver CAMADA_1_PLANO_MESTRE.md

## Calibração inicial (Sprint 5)

[7 pontos respondidos]

## Histórico de milestones (Sprint 5)

[preenchido conforme avança]
```

Commit antes de prosseguir.

---

## ROADMAP DE MILESTONES

### M32 — LiteLLM gateway local + LLMDriver concreto

**Objetivo:** todo LLM call passa por gateway. Fallback de provider documentado e funcional.

**Tarefas:**

1. Adicionar serviço `litellm` no `docker-compose.dev.yml`:
   - Imagem: `ghcr.io/berriai/litellm:main-latest` (ou versão estável recente)
   - Porta: 4000
   - Volume: `./infra/litellm/config.yaml:/app/config.yaml`
   - Env: `LITELLM_MASTER_KEY` (dev placeholder)
2. Criar `infra/litellm/config.yaml`:
   - Model list com providers: `anthropic/claude-3-5-sonnet`, `openai/gpt-4o-mini`
   - Fallback chains configurados
   - Rate limits básicos
   - Routing strategy: `simple-shuffle` ou `least-busy`
3. Criar `packages/drivers-litellm/`:
   ```
   packages/drivers-litellm/
   ├── package.json
   ├── tsconfig.json + tsconfig.build.json
   ├── src/
   │   ├── index.ts
   │   └── litellm-driver.ts        # implements LLMDriver
   ```
4. `LiteLLMDriver` cobre:
   - `chat(messages, opts)` — chamada bloqueante com retorno tipado
   - `chatStream(messages, opts)` — streaming
   - `embed(texts)` — embeddings
   - `getCost(usage)` — calcula custo a partir de tokens (lê tabela de preços local atualizada)
5. `.env.local.example` documenta:
   ```
   LITELLM_BASE_URL=http://localhost:4000
   LITELLM_MASTER_KEY=sk-dev-litellm-master-key-replace-me
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   ```
6. Script `pnpm dev:llm` que sobe LiteLLM via compose.
7. Testes em `packages/drivers-litellm/__tests__/`:
   - Chat call mockado retorna estrutura esperada
   - Stream call funciona com async iterator
   - getCost calcula corretamente para Claude e GPT
   - Fallback é respeitado quando primary falha (mock)

**Critério de aceite:**

```bash
pnpm dev:infra      # supabase + nats + litellm up
curl http://localhost:4000/health   # responde 200
pnpm test --filter=@aethereos/drivers-litellm   # passa
pnpm typecheck && pnpm lint
```

Commit: `feat(drivers-litellm): gateway LLM com fallback e custo (M32)`

---

### M33 — Langfuse self-hosted local + ObservabilityDriver concreto

**Objetivo:** toda chamada LLM rastreada, com custo e qualidade.

**Tarefas:**

1. Adicionar serviços ao `docker-compose.dev.yml`:
   - `langfuse-server` (imagem oficial)
   - `langfuse-postgres` (Postgres dedicado, separado do Supabase)
   - Portas: Langfuse UI em 3001
2. Variáveis de env documentadas no `.env.local.example`:
   ```
   LANGFUSE_PUBLIC_KEY=pk-lf-...
   LANGFUSE_SECRET_KEY=sk-lf-...
   LANGFUSE_BASE_URL=http://localhost:3001
   ```
3. Criar `packages/drivers-langfuse/` com `LangfuseObservabilityDriver implements ObservabilityDriver`:
   - `traceLLM(call, response, metadata)` envia trace
   - `traceEvent(event)` envia evento SCP relevante
   - `tag(traceId, key, value)`
   - Buffering local com flush periódico (não bloquear hot path)
4. **Integração com LiteLLM:** configurar LiteLLM para enviar callbacks para Langfuse automaticamente (`litellm.success_callback = ["langfuse"]`).
5. Wrapper helper em `packages/kernel/src/llm/`:
   - `instrumentedChat(driver, opts)` — chama LLMDriver, envia trace para ObservabilityDriver, retorna resposta
   - Toda feature LLM usa esse helper, nunca chama driver direto
6. Script `pnpm dev:observability` sobe Langfuse stack.
7. Bootstrap inicial: criar projeto default no Langfuse via API durante init.

**Critério de aceite:**

```bash
pnpm dev:llm
pnpm dev:observability
# Browser: http://localhost:3001 — UI Langfuse acessível
# Rodar teste: invocar instrumentedChat com mensagem qualquer
# Verificar: trace aparece no UI Langfuse com custo, latência, modelo
pnpm test --filter=@aethereos/drivers-langfuse
```

Commit: `feat(drivers-langfuse): observabilidade LLM via Langfuse self-hosted (M33)`

---

### M34 — Unleash self-hosted local + FeatureFlagDriver concreto

**Objetivo:** feature flags com segmentação. Sem mais hard-codes ou tabelas ad-hoc.

**Tarefas:**

1. Adicionar serviços `unleash-server` + `unleash-postgres` ao compose. Porta UI 4242.
2. Criar `packages/drivers-unleash/` com `UnleashFeatureFlagDriver implements FeatureFlagDriver`:
   - `isEnabled(flagName, context)` onde `context` inclui `companyId`, `userId`, `plan`, `role`
   - `getVariant(flagName, context)` para A/B
   - Cache local com refresh (default 60s)
   - Modo Degenerado: se Unleash offline, default conservador (false) com log
3. Bootstrap inicial: no `pnpm dev:feature-flags`, criar projeto default + 3 flags de exemplo:
   - `feature.copilot.enabled` (segmentado por plan)
   - `feature.embed_mode` (segmentado por company)
   - `feature.experimental.dashboards`
4. Provider React em `packages/ui-shell/src/feature-flags/`:
   - `<FeatureFlagsProvider>` que injeta context
   - Hook `useFeatureFlag(name)` retorna `{ enabled, loading, variant }`
   - SSR-safe (Next.js compatible) — recebe initial state do server
5. Demo de uso em shell-commercial: esconder/mostrar item do dock baseado em flag.

**Critério de aceite:**

```bash
pnpm dev:feature-flags
# UI Unleash em http://localhost:4242 acessível, login admin/unleash4all
# Toggle flag `feature.experimental.dashboards` na UI
# shell-commercial em dev mode reflete mudança em <60s sem reload
pnpm test --filter=@aethereos/drivers-unleash
```

Commit: `feat(drivers-unleash): feature flags com segmentacao por tenant/plan (M34)`

---

### M35 — OpenTelemetry stack: Tempo + Loki + Prometheus + Grafana

**Objetivo:** observabilidade da plataforma (não só LLM). Traces, logs, métricas em um lugar.

**Tarefas:**

1. Adicionar ao compose:
   - `tempo` (Grafana Tempo, traces)
   - `loki` (Grafana Loki, logs)
   - `prometheus` (métricas)
   - `grafana` (dashboards, porta 3002)
   - `otel-collector` (recebe OTLP, distribui)
2. Configs em `infra/otel/`:
   - `otel-collector-config.yaml`
   - `tempo-config.yaml`
   - `loki-config.yaml`
   - `prometheus.yml`
   - `grafana/datasources/` provisionando os 3 sources
   - `grafana/dashboards/` com 2-3 dashboards iniciais (System Health, SCP Events, LLM Costs)
3. Criar `packages/observability/`:
   - SDK OTel-JS configurado: trace + metrics exporters apontando para collector
   - Logger Pino com formato OpenTelemetry-friendly
   - Helpers: `withSpan(name, fn)`, `recordMetric(name, value, attrs)`, `getCurrentTraceId()`
4. Integrar nos apps:
   - `apps/scp-worker/src/instrumentation.ts` — auto-instrument
   - `apps/shell-commercial/src/lib/instrumentation.ts`
   - `apps/comercio-digital/instrumentation.ts` (Next.js native instrumentation)
5. Logs estruturados: substituir `console.log` (que está bloqueado em prod) por `logger.info()` em todos os apps onde houver. CI grep `console.log` em src deve retornar 0.
6. Dashboards iniciais:
   - **System Health:** CPU/mem dos containers, requests/sec, error rate, p95 latency
   - **SCP Events:** eventos publicados/sec por type, outbox lag, consumer lag
   - **LLM Costs:** custo cumulativo por dia/modelo/company, token usage, latency p95
7. Script `pnpm dev:observability` agora sobe Langfuse + OTel stack juntos.

**Critério de aceite:**

```bash
pnpm dev:infra
# Browser: http://localhost:3002 — Grafana acessível, login admin/admin
# 3 dashboards aparecem
# Subir shell-commercial em dev, fazer ações
# Traces aparecem em Tempo
# Logs aparecem em Loki
# Métricas aparecem em Prometheus
```

Commit: `feat(observability): otel stack tempo/loki/prometheus/grafana (M35)`

---

### M36 — Correlation ID propagation end-to-end

**Objetivo:** debug forense possível. Toda operação rastreável de ponta a ponta.

**Tarefas:**

1. Middleware Next.js (`apps/comercio-digital/`) injeta `correlation_id` em todo request: gera novo se não vier, propaga em response header `X-Correlation-Id`.
2. Mesmo no shell-commercial e apps Vite — interceptor de fetch adiciona/lê header.
3. `KernelPublisher.publish()` usa `correlation_id` do contexto OTel atual se não passado explicitamente.
4. NATS publish inclui `correlation_id` em headers da mensagem JetStream. Consumer extrai e propaga ao processar.
5. `instrumentedChat()` (M33) lê `correlation_id` atual e envia como tag para Langfuse.
6. Server Actions Next.js consultam `correlation_id` do request atual (via headers/context).
7. Helper `getCurrentCorrelationId()` exportado de `@aethereos/observability`.
8. Test E2E em `apps/comercio-digital/__tests__/correlation.test.ts`:
   - Simulate POST /api/checkout com `X-Correlation-Id: test-xyz`
   - Verificar que evento outbox tem `correlation_id=test-xyz`
   - Verificar que log estruturado tem `correlation_id=test-xyz`

**Critério de aceite:**

```bash
pnpm test --filter=@aethereos/comercio-digital
# Test correlation.test.ts passa
# Manual: clicar comprar produto, copiar correlation_id do header
# Buscar em Grafana Loki: filtrar logs por correlation_id
# Esperado: ver request HTTP, evento outbox, NATS publish, NATS consume, audit log — todos com mesmo correlation_id
```

Commit: `feat(observability): correlation_id propagado end-to-end (M36)`

---

### M37 — Sistema de notificações unificadas

**Objetivo:** infraestrutura de notificações para apps da Camada 1 consumirem.

**Tarefas:**

1. Migration `supabase/migrations/0008_notifications.sql`:
   - `kernel.notifications`:
     - `id UUID PK`
     - `company_id UUID NOT NULL`
     - `user_id UUID NOT NULL` (destinatário; NULL = broadcast company)
     - `category TEXT NOT NULL CHECK (category IN ('system','event','user','agent'))`
     - `severity TEXT NOT NULL CHECK (severity IN ('info','success','warning','error'))`
     - `title TEXT NOT NULL`
     - `body TEXT`
     - `payload JSONB`
     - `read_at TIMESTAMPTZ`
     - `dismissed_at TIMESTAMPTZ`
     - `created_at TIMESTAMPTZ DEFAULT NOW()`
   - INDEX (user_id, read_at, created_at DESC)
   - RLS: user vê só suas notifications da company ativa
2. `packages/drivers/src/interfaces/notification.ts` — interface `NotificationDriver`:
   - `dispatch(notification)`
   - `list(userId, opts)`
   - `markRead(id)`
   - `markAllRead(userId)`
3. `packages/drivers-supabase/src/notification.ts` — implementação:
   - `dispatch` insert + Realtime broadcast no canal `notifications:user:{userId}`
   - `list` query com filtros
4. Schemas SCP:
   - `platform.notification.dispatched`
5. UI no shell-commercial:
   - Badge no header com count de não-lidas (Realtime subscription)
   - Drawer lateral com lista
   - Click marca como lida + trigger ação (se houver)
6. Helper `dispatchNotification(opts)` em `@aethereos/kernel/notifications`:
   - Recebe usuário, categoria, severity, title, body, payload
   - Persiste + emite evento SCP

**Critério de aceite:**

```bash
pnpm test --filter=@aethereos/drivers-supabase   # cobre nova feature
pnpm dev:db && pnpm --filter=@aethereos/shell-commercial dev
# Manual: trigger notification via console SQL
# Browser shell-commercial recebe via Realtime, badge atualiza, drawer mostra
```

Commit: `feat(kernel): sistema de notificacoes unificadas com Realtime (M37)`

---

### M38 — Modo Degenerado (P14) operacionalizado

**Objetivo:** P14 deixa de ser princípio escrito e vira código mecânico.

**Tarefas:**

1. Criar `packages/kernel/src/degraded/`:
   - `degraded-wrapper.ts` — decorator que envolve chamadas de driver
   - `fallbacks.ts` — fallbacks default por tipo de operação
   - `types.ts` — `DegradedMode = 'silent' | 'logged' | 'fail-loud'` por critidade
2. Pattern `withDegraded(driver, fallback, opts)`:
   - Tenta operação primária com timeout
   - Em erro/timeout: invoca fallback
   - Loga warning estruturado
   - Emite evento `platform.degraded.activated` com contexto
3. Aplicar nos drivers cloud onde fallback faz sentido:
   - `LLMDriver.chat()` em modo degraded → retorna canned response com warning ("Sistema com lentidão, sua mensagem foi recebida.")
   - `FeatureFlagDriver.isEnabled()` em modo degraded → retorna default conservador (false para feature ativada por padrão; preserva acesso para feature desativada por default)
   - `ObservabilityDriver.traceLLM()` em modo degraded → log local + buffer + retry assíncrono
   - `NotificationDriver.dispatch()` em modo degraded → escreve em queue local, retry posterior
4. Health check incluído em cada driver: `driver.health()` retorna `{ ok: bool, latency_ms: number, last_error?: string }`.
5. Documentar em `docs/architecture/MODO_DEGENERADO.md`:
   - Lista de drivers com fallback
   - Comportamento esperado em cada degradação
   - Como testar (script para tomar serviços down)

**Critério de aceite:**

```bash
pnpm test --filter=@aethereos/kernel    # testes de modo degraded passam
# Manual: docker stop litellm
# Tentar chat via UI shell-commercial
# Esperado: retorna canned response, log structured warning, evento platform.degraded.activated registrado
# docker start litellm — operação volta normal
```

Commit: `feat(kernel): modo degenerado P14 com fallback wrappers (M38)`

---

### M39 — Health checks + readiness probes + dashboard

**Objetivo:** "está tudo bem?" tem resposta única e acionável.

**Tarefas:**

1. Endpoints em todos os apps backend:
   - `/healthz` (liveness): processo respondendo? Retorna 200 sempre que processo está vivo.
   - `/readyz` (readiness): dependências saudáveis? Verifica drivers críticos via `.health()`. Retorna 200 só se tudo essencial está up.
2. `apps/scp-worker/src/health.ts` — endpoint dedicado.
3. `apps/shell-commercial/src/api/healthz.ts` (Vite middleware ou rota especial).
4. `apps/comercio-digital/app/api/healthz/route.ts` e `readyz/route.ts`.
5. **Painel "Operações" no shell-commercial** (`apps/shell-commercial/src/routes/settings/operations.tsx`):
   - Polling a cada 10s de `/readyz` de cada serviço configurado
   - Status: Supabase, NATS, LiteLLM, Langfuse, Unleash, OTel collector
   - Cores: verde (ok), amarelo (degraded), vermelho (down)
   - Última verificação, latência, error rate
   - Acessível só para staff/admin role
6. Dashboard Grafana atualizado:
   - "Service Health Overview" usando métricas de readiness probes
7. Configuração de probes para ambiente containerizado (k8s/docker-compose):
   - Healthcheck blocks no `docker-compose.dev.yml` para todos os serviços

**Critério de aceite:**

```bash
pnpm dev:infra
curl http://localhost:3000/api/healthz   # comercio-digital — 200
curl http://localhost:5173/healthz       # shell-commercial — 200
# Browser shell-commercial: /settings/operations
# Dashboard mostra todos os serviços em verde
# docker stop langfuse-server
# Esperado: dashboard mostra Langfuse em vermelho dentro de 10s
# Esperado: shell-commercial continua funcional (P14 — degradação graceful)
```

Commit: `feat(operations): health checks + readiness probes + painel de operacoes (M39)`

---

### M40 — ADR-0018 + encerramento Sprint 5

**Objetivo:** registrar decisões e fechar sprint.

**Tarefas:**

1. Criar `docs/adr/0018-fundacao-operacional-camada-1.md`:
   - Status: Aceito
   - Subordinado a: ADR-0001, ADR-0014, ADR-0016
   - Contexto: Camada 1 base sem observabilidade, sem feature flags, sem gateway LLM
   - Decisão: stack operacional cravada (LiteLLM, Langfuse, Unleash, OTel/Tempo/Loki/Prometheus/Grafana, Modo Degenerado P14, Health Probes, Notificações via Realtime)
   - Consequências
   - Alternativas rejeitadas (LangSmith managed em vez de Langfuse, LaunchDarkly em vez de Unleash, OpenAI/Anthropic direto em vez de LiteLLM, etc.)
   - Anexo: regras de PR adicionais (correlation_id obrigatório, instrumentedChat ao invés de chamar driver direto, etc.)
2. Atualizar `CLAUDE.md`:
   - Seção 4 (stack): marcar componentes operacionais como entregues
   - Seção 5 (bloqueios em PR): adicionar regras (sem `console.log`, sem chamada LLM fora de LiteLLM, sem flag em tabela ad-hoc)
   - Referência ADR-0018
3. `SPRINT_LOG.md` encerramento:
   - Sumário de M32-M40
   - Métricas: bundles, testes, dashboards, custos esperados em produção
4. `docs/SPRINT_5_REPORT_2026-04-29.md`:
   - O que foi entregue
   - Pendências para humano (provider keys reais, decisão sobre LiteLLM master key em prod, decisão de Langfuse cloud vs self-host em prod)
   - Métricas operacionais: custos esperados de containers em prod, latências medidas
   - Sugestão Sprint 6 (apps internos + AI Copilot, conforme plano-mestre)
5. **Antes do commit final:** `pnpm ci:full` EXIT 0 obrigatório.

**Critério de aceite:**

```bash
pnpm ci:full > /tmp/sprint5_final.log 2>&1; echo "EXIT: $?"
# DEVE ser 0.
```

Commit final: `chore: encerramento sprint 5 — fundacao operacional camada 1`

Mensagem no chat: "SPRINT 5 ENCERRADO. EXIT 0 confirmado. Aguardando revisão humana."

---

## TÉRMINO DO SPRINT

Não inicie Sprint 6 sozinho. Pare aqui.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint 5 (Fundação operacional Camada 1) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (seção "Sprint 5")
3. Leia CAMADA_1_PLANO_MESTRE.md
4. Rode: git log --oneline -15 && git status
5. Identifique a próxima milestone M32-M40 não concluída
6. Continue a partir dela

Se SPRINT_LOG.md indicar "Sprint 5 encerrado", aguarde humano. Não inicie Sprint 6.

Roadmap completo em SPRINT_5_PROMPT.md na raiz.
```

Salve este arquivo como `SPRINT_5_PROMPT.md` na raiz do projeto antes de começar.
