# ADR-0018 — Fundação Operacional: LiteLLM, Langfuse, Unleash, OTel, Notificações, P14, Health

**Status:** Accepted  
**Data:** 2026-04-30  
**Autor:** Claude Code (claude-sonnet-4-6) assistindo rafaexcf  
**Revisão humana obrigatória antes de merge em produção**

---

## Contexto

Sprint 5 visava transformar a Camada 1 de um "shell com autenticação" para uma **plataforma operacionalmente madura**: observável, segura para fallback, com feature flags por tenant, notificações e health probes. Estas decisões complementam ADR-0016 (Camada 1) sem contradizer invariantes da Fundamentação.

---

## Decisões

### D1 — LiteLLM como único ponto de acesso a LLMs [DEC]

**Decisão:** Toda chamada LLM passa pelo gateway LiteLLM (HTTP, OpenAI-compatible). Nenhum SDK de provider (openai, anthropic) é chamado diretamente de código de aplicação.

**Razão:** Centraliza rate limiting por tenant, custo-por-chamada, fallback automático entre providers, roteamento adaptativo. CI já bloqueia imports diretos (CLAUDE.md seção 5).

**Consequência:** `packages/drivers-litellm/` implementa `LLMDriver`; `infra/litellm/config.yaml` define modelos e estratégia de fallback (claude-3-5-sonnet → gpt-4o-mini).

---

### D2 — Langfuse self-hosted via HTTP API (sem SDK npm) [DEC]

**Decisão:** `LangfuseObservabilityDriver` usa `fetch` para `/api/public/ingestion` (Basic auth) com buffer local + flush periódico. Zero dependência de `@langfuse/langfuse`.

**Razão:** Consistência com padrão do projeto (todos os drivers usam fetch diretamente); evita SDK que pode introduzir peer deps problemáticos; callback `success_callback: [langfuse]` no LiteLLM config captura traces de LLM automaticamente sem código extra.

**Consequência:** `instrumentedChat()` em `packages/kernel/` é o ponto único de execução de LLM com observabilidade embutida (P15 enforcement).

---

### D3 — Unleash self-hosted com cache local + TTL [DEC]

**Decisão:** `UnleashFeatureFlagDriver` mantém cache em memória (Map) com TTL configurável (padrão 60s). Em degraded mode, retorna `false` conservativo para toda flag.

**Razão:** Elimina round-trip para cada flag evaluation; suporta startPolling() para atualização proativa; o cache garante funcionamento mesmo com latência de rede.

**Consequência:** `packages/ui-shell/src/feature-flags/` expõe `FeatureFlagsProvider` + `useFeatureFlag` para frontend; estado inicial pode ser hidratado via SSR para evitar flash de conteúdo.

---

### D4 — OTel NodeSDK sem @opentelemetry/sdk-metrics como dep direta [DEC]

**Decisão:** `packages/observability/` não declara `@opentelemetry/sdk-metrics` como dependência direta — usa apenas o que `@opentelemetry/sdk-node` bundla internamente.

**Razão:** pnpm instala múltiplas instâncias quando declarado explicitamente; TypeScript detecta incompatibilidade de private fields (`_shutdown`) entre instâncias mesmo na mesma versão. Métricas são configuradas via `OTEL_METRICS_EXPORTER=otlp` em runtime.

**Consequência:** `startSdk()` aceita endpoint OTLP via config ou env var; `createLogger()` usa pino com mixin de OTel trace_id/span_id.

---

### D5 — Correlation ID derivado do OTel trace_id [DEC]

**Decisão:** `getCurrentCorrelationId()` (kernel) lê o trace_id do span OTel ativo quando disponível. Se não houver span ativo, gera UUID. `KernelPublisher` usa `context.correlation_id ?? getCurrentCorrelationId()`.

**Razão:** Liga eventos SCP ao trace HTTP automaticamente sem instrumentação manual; NATS driver já propaga `X-Correlation-Id` no header de mensagem; LangfuseDriver pode usar o mesmo ID para correlação de traces LLM.

**Consequência:** Fluxo completo: HTTP request → middleware gera/propaga `x-correlation-id` → OTel span ativo → `getCurrentCorrelationId()` → `KernelPublisher.correlation_id` → `X-Correlation-Id` NATS header. Next.js middleware usa `crypto.randomUUID()` (Web Crypto API, compatível com Edge Runtime).

---

### D6 — P14 (Modo Degenerado) implementado via wrappers não-Proxy [DEC]

**Decisão:** `withDegradedLLM()` e `withDegradedObservability()` são funções que retornam objetos literais delegando ao primary; em caso de throw, ativam o driver degradado (`DegradedLLMDriver`, `DegradedObservabilityDriver`). Callback `onDegrade` é chamado apenas na primeira falha de cada sequência.

**Razão:** Proxy em TypeScript é problemático com private class fields (`#field`) — o handler pode não interceptar corretamente. Object literal é explícito, type-safe e testável.

**Consequência:** FeatureFlagDriver já tem degraded mode nativo (`isDegraded`); EventBusDriver não precisa wrapper pois outbox PostgreSQL garante durabilidade.

---

### D7 — NotificationDriver como interface no Driver Model [DEC]

**Decisão:** `NotificationDriver` com `create/list/markRead/getUnreadCount` é adicionado a `packages/drivers/`; implementação concreta em `packages/drivers-supabase/`. RLS garante isolamento por `company_id + user_id`.

**Razão:** Notificações são um concern de plataforma (não de vertical); o Driver Model exige que toda dependência externa passe por interface.

**Consequência:** `service_role` policy separada permite que workers SCP notifiquem usuários sem RLS de user_id. Shell-commercial exibe bell com badge de contagem; dados carregados via `SupabaseNotificationDriver`.

---

### D8 — /readyz como probe de readiness composta [DEC]

**Decisão:** `/api/readyz` pinga supabase/litellm/unleash/otel-collector em paralelo com `AbortSignal.timeout(3000)`. Retorna 200 se todos ok, 503 com detalhes se algum falha.

**Razão:** Liveness (`/healthz`) apenas verifica que o processo está vivo; readiness (`/readyz`) verifica que as dependências estão acessíveis. Kubernetes e load balancers usam readiness para tráfego.

**Consequência:** Painel `/settings/ops` em shell-commercial consome o endpoint para visibilidade operacional sem acesso direto às ferramentas de infra.

---

## Itens fora de escopo (deferidos para sprints futuros)

- Integração real de NotificationBell com SupabaseNotificationDriver em shell-commercial (por ora: dados de demo)
- Unleash strategies avançadas: tenant-specific segments, gradual rollout com métricas de qualidade
- OTel baggage propagation entre processos (além do trace_id já propagado)
- Lago para billing metered (Sprint 6+)
- Temporal workflow engine (Fase 2)

---

## Conformidade com invariantes

- P1 (Kernel invariante): todas as adições ao kernel são úteis para ≥2 verticais ✅
- P4 (Multi-tenant por RLS): notifications.company_id + RLS por current_company_id() ✅
- P5 (SCP como barramento): correlation_id propagado no outbox e NATS headers ✅
- P6 (Guardrails mecânicos): CI bloqueia chamadas LLM sem passar por LiteLLM ✅
- P9 (AI-native): actor_type distingue human/agent em todos os contextos ✅
- P14 (Modo Degenerado): withDegradedLLM + withDegradedObservability + isDegraded ✅
- P15 (LLM budget declarado): instrumentedChat() obrigatório + Langfuse traces ✅
