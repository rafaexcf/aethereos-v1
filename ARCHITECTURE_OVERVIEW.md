# ARCHITECTURE_OVERVIEW.md — Aethereos Sprint 20 (MX110)

> Visão geral pré-staging. Estado em **2026-05-04** (313 commits).
> Para detalhe constitucional: `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md`.
> Para auditorias específicas: `SECURITY_AUDIT.md` + `CODE_QUALITY_AUDIT.md`.

---

## 1. Topologia do monorepo

```
aethereos/
├── apps/                      # 5 apps + sites
│   ├── comercio-digital/      # Camada 2 — SaaS standalone (Next.js 15)
│   ├── scp-worker/            # Server worker (Node.js puro, postgres pkg)
│   ├── shell-base/            # Camada 0 — local-first, BUSL (Vite)
│   ├── shell-commercial/      # Camada 1 — multi-tenant, proprietário (Vite)
│   └── sites/                 # Sites institucionais (Astro, vazios em F1)
├── packages/                  # 14 packages
│   ├── config-eslint/         # ESLint shared config
│   ├── config-ts/             # TypeScript shared configs
│   ├── drivers/               # Interfaces puras (LLMDriver, DataDriver, etc.)
│   ├── drivers-byok/          # BYOK LLM (OpenAI-compatible multi-provider)
│   ├── drivers-langfuse/      # Observability — LLM tracing
│   ├── drivers-litellm/       # LiteLLM gateway
│   ├── drivers-local/         # Camada 0 — OPFS, BroadcastChannel, etc.
│   ├── drivers-nats/          # NATS JetStream (preservado para F2+)
│   ├── drivers-supabase/      # Supabase data + auth + storage + vector
│   ├── drivers-unleash/       # Feature flags
│   ├── kernel/                # Capabilities + invariants + schemas core
│   ├── observability/         # OTel + structured logger
│   ├── scp-registry/          # SCP event schemas (Zod)
│   └── ui-shell/              # AppShell + componentes shared
├── tooling/                   # 3 tooling
│   ├── e2e/                   # Playwright (34 specs)
│   ├── seed/                  # Seed data para dev
│   └── smoke/                 # Smoke test (auth + RLS)
├── supabase/
│   ├── migrations/            # 73 migrations (kernel.* + storage policies)
│   └── functions/             # 11 Edge Functions
├── infra/local/               # docker-compose.dev.yml (NATS, LiteLLM, OTel...)
├── docs/                      # ADRs (24) + runbooks
└── tsconfig.base.json         # strict + 6 flags adicionais
```

---

## 2. Apps (5)

### apps/shell-commercial — Camada 1 (proprietária)

OS web no domínio `aethereos.io`. Multi-tenant, RLS por `company_id`. Stack: Vite 8 + React 19 + TanStack Router + Zustand + Tailwind v4 + framer-motion (exceção ADR-0023).

App registry em 3 camadas (Sprint 21):

- **Banco** (`kernel.app_registry`): metadata global (sem company_id) de 52 apps — 31 nativos + 5 verticais + 5 AI + 1 Puter + 10 jogos.
- **Component map** (`apps/registry.ts:COMPONENT_MAP`): 31 React.lazy para apps nativos. Apps iframe/weblink não precisam de entrada.
- **Runtime** (`stores/appRegistryStore.ts`): Zustand store que carrega o banco no boot e merge com componentes; dispatch por `entry_mode`:
  - `internal` → tab com componente nativo
  - `iframe` → tab com `<IframeAppFrame>`
  - `weblink` → `window.open` (não cria tab)

Apps por categoria:

- **Sistema** (always_enabled): mesa, magic-store, ae-ai (Copilot), settings, notifications, lixeira
- **Productivity / Utilities / Optional**: drive, pessoas, chat, rh, bloco-de-notas, tarefas, agenda-telefonica, calculadora, relogio, weather, calendar, kanban, planilhas, documentos, apresentacoes, pdf, automacoes, reuniao, navegador, camera, gravador-de-voz, enquetes, gestor
- **Admin**: governanca, auditoria
- **Verticais (weblink)**: comercio-digital, logitix, erp, kwix, autergon
- **AI (weblink)**: claude, chatgpt, gemini, perplexity, huggingchat
- **Puter / Games (weblink)**: puter-os, 10 jogos open-source

### apps/shell-base — Camada 0 (open-source)

Local-first puro sob BUSL v1.1, domínio `aethereos.org`. OPFS + IndexedDB + PWA. Sem backend obrigatório. Em F1 está como MVP — apps complexos vivem só no shell-commercial.

### apps/comercio-digital — Camada 2 (vertical)

Primeiro SaaS standalone da família (Next.js 15 App Router). Bundle Camada 1 + módulos comerciais pré-instalados. Domínio `comercio.digital`.

### apps/scp-worker — Server worker

Node.js puro, sem Drizzle no domínio. Pacote `postgres` para SQL bruto. 4 consumers inline:

- `AuditConsumer` (wildcard) → kernel.audit_log
- `NotificationConsumer` (4 events) → kernel.notifications (idempotente)
- `EnrichmentConsumer` (4 events, Sprint 19) → kernel.context_records
- `EmbeddingConsumer` (file.uploaded + 3 enriched events, Sprint 19) → kernel.embeddings

Modo inline (sem NATS) — KL-7 ACCEPTED_F1.

### apps/sites/\* — Astro

Placeholders para F2 (aethereos-org, aethereos-io, b2baios-com-br).

---

## 3. Packages (14)

### Interfaces puras

- **drivers/** — `LLMDriver`, `DataDriver`, `AuthDriver`, `StorageDriver`, `EventBusDriver`, `VectorDriver`, `NotificationDriver`, `FlagsDriver`, `ObservabilityDriver`, `SecretsDriver`. Todas tipadas via Zod + Result type.

### Implementações de driver

- **drivers-byok/** — BYOK LLM driver (OpenAI/Anthropic/Google/Groq/Mistral/Custom)
- **drivers-langfuse/** — Tracing LLM
- **drivers-litellm/** — Gateway LiteLLM
- **drivers-local/** — Camada 0: OPFS storage, sqlite-wasm, BroadcastChannel, webcrypto secrets
- **drivers-nats/** — NATS JetStream (preservado, KL-7)
- **drivers-supabase/** — bifurcação server/browser (ADR-0020):
  - server: SupabaseDatabaseDriver (postgres + Drizzle)
  - browser: SupabaseBrowserDataDriver, SupabaseBrowserAuthDriver, SupabaseBrowserVectorDriver, SupabaseStorageDriver, SupabaseNotificationDriver
- **drivers-unleash/** — Feature flags

### Core domain

- **kernel/** — capabilities + invariant operations + helpers SCP. Não tem dependência runtime de nenhum driver concreto.
- **scp-registry/** — schemas Zod de todos os event types (platform.\*, agent.\*, context.\*, integration.\*, financial.\*, fiscal.\*). 9 smoke tests (Sprint 20 MX109).
- **observability/** — wrapper OTel + structured logger.

### SDK third-party (Sprint 22)

- **client/** — `@aethereos/client`: SDK tipado para apps iframe + nativos. 10 módulos (auth/drive/people/chat/notifications/scp/ai/settings/windows/theme). Dois transports: `BridgeTransport` (postMessage, modo padrão) e `DirectTransport` (router injetado pelo shell). 12 unit tests (factory + bridge protocol + handshake + timeout + subscribe).

### UI

- **ui-shell/** — AppShell, layouts, componentes shared (Loading, EmptyState, etc.).

### Build

- **config-ts/** — 5 tsconfig presets (base, library, library-build, react-library, vite-app, next-app)
- **config-eslint/** — ESLint flat config

---

## 4. Pipeline SCP (browser → outbox → consumers)

```
[Browser]
    │ user action
    ▼
[Edge Function scp-publish]      validate JWT → active_company_id → KNOWN_EVENT_TYPES
    │                            (rejeita platform.tenant.suspended se actor=agent)
    ▼
[INSERT kernel.scp_outbox]       (status='pending', envelope completo)
    │
    │ poll a cada SCP_POLL_INTERVAL_MS (default 2s)
    ▼
[scp-worker poller]              SELECT FOR UPDATE SKIP LOCKED LIMIT 50
    │
    ├─► AuditConsumer            → INSERT kernel.audit_log (sempre)
    ├─► NotificationConsumer     → SELECT existing → INSERT kernel.notifications (idempotente)
    ├─► EnrichmentConsumer       → UPSERT kernel.context_records (Sprint 19)
    └─► EmbeddingConsumer        → embed via LiteLLM/Edge Fn → UPSERT kernel.embeddings
                                   (Sprint 19: tanto files quanto context_records)
    │
    ▼
[UPDATE scp_outbox status='published' OR pending+attempts++]
    (max 3 attempts → status='failed' com last_error)
```

3 camadas SCP (Fundamentação 8.10):

1. **Camada 1** — eventos brutos (scp_outbox)
2. **Camada 2** — derived context records (kernel.context_records)
3. **Camada 3** — actionable insights via embeddings + RAG no Copilot

---

## 5. Driver Model

Princípio **P3** (Configuração supera código customizado): toda dependência externa atrás de uma interface. CI bloqueia imports diretos de SDK.

Bifurcação server/browser (ADR-0020):

- `apps/shell-*` consomem `@aethereos/drivers-supabase/browser`
- `apps/scp-worker` consome `@aethereos/drivers-supabase` (server)

Bloqueios de CI (`.dependency-cruiser.cjs` + revisão humana):

- `import postgres` em browser
- `import { drizzle }` em browser
- `KernelPublisher` instanciado em browser
- `@supabase/supabase-js` direto em código de domínio
- `next` em shells Vite
- `inngest`, `@clerk/*`, `prisma`

---

## 6. Autenticação + RLS

```
[/login] ── Supabase Auth ────► JWT { aud, exp, sub }
                                    │
                                    │ custom_access_token hook
                                    ▼
                                JWT { ..., active_company_id }
                                    │
                                    │ Bearer header
                                    ▼
                              kernel.current_company_id() ── lê claim
                                    │
                                    ▼
                            RLS: company_id = current_company_id()
                            RLS: user_id = auth.uid()
```

RLS coverage (Sprint 20 MX106): **68/68 tabelas** kernel com RLS habilitado. **99 policies** ativas. Anon **negado** no schema kernel (USAGE não concedido).

JWT claims:

- `sub`: user_id
- `email`
- `active_company_id` (custom claim, definido pelo hook)
- `is_platform_admin` (custom claim, lido via tenant_memberships)

---

## 7. Storage buckets (8)

| Bucket          | Public | Conteúdo                   |
| --------------- | ------ | -------------------------- |
| company-logos   | ✓      | Logos públicas             |
| user-avatars    | ✓      | Avatares                   |
| user-wallpapers | ✓      | Wallpapers do desktop      |
| kernel-files    | ✗      | Drive (RLS por company_id) |
| kernel-media    | ✗      | Camera, fotos              |
| kernel-meetings | ✗      | Gravações de reuniões      |
| kernel-pdfs     | ✗      | PDFs                       |
| kernel-voice    | ✗      | Voice recordings           |

---

## 8. Edge Functions (11)

| Função                | verify_jwt  | Função                                 |
| --------------------- | ----------- | -------------------------------------- |
| activate-module       | ✓           | Magic Store: instala módulo            |
| cnpj-lookup           | ✗ (público) | Lookup CNPJ na ReceitaWS (pre-auth)    |
| complete-onboarding   | ✓           | Onboarding wizard                      |
| context-snapshot      | ✓           | Sprint 19: agrega contexto de entidade |
| create-company        | ✓           | Cria company + tenant_memberships      |
| embed-text            | ✓           | Wrapper LiteLLM /embeddings            |
| register-company      | ✗ (público) | Cria user via Auth API (pre-auth)      |
| scp-publish           | ✓           | Outbox writer (browser → SCP)          |
| staff-approve-company | ✓           | Platform admin: aprova company         |
| staff-company-detail  | ✓           | Platform admin: detalha company        |
| staff-list-companies  | ✓           | Platform admin: lista companies        |

---

## 9. Infra local (docker-compose.dev.yml)

Serviços disponíveis em `pnpm dev:infra`:

- `nats` (porta 4222) — preservado para F2 (KL-7)
- `litellm` (porta 4000) — gateway LLM
- `langfuse` + `langfuse-postgres` — LLM observability
- `unleash` + `unleash-postgres` — feature flags
- `otel-collector` + `tempo` + `loki` + `prometheus` + `grafana` — observability stack

Supabase local via `pnpm db:start` (CLI Supabase).

---

## 10. Camadas de teste

| Tipo             | Quantidade | Localização                                         |
| ---------------- | ---------- | --------------------------------------------------- |
| Unit tests       | 27 files   | `packages/*/​__tests__/`, `apps/*/​__tests__/unit/` |
| RLS isolation    | 2 files    | `apps/scp-worker/__tests__/`                        |
| E2E (Playwright) | 34 specs   | `tooling/e2e/tests/`                                |
| Smoke (auth+RLS) | 1 script   | `tooling/smoke/`                                    |
| Seed (dev data)  | 1 script   | `tooling/seed/`                                     |

Gates de CI (`pnpm ci:full`):

1. `pnpm typecheck` — 25/25
2. `pnpm lint` — 23/23
3. `pnpm deps:check` — 0 errors (47 warnings em dist + 9 ciclos em apps internos)
4. `pnpm test` — 19/19 tasks (188+ tests)
5. `pnpm test:isolation` — RLS cross-tenant
6. `pnpm build` — 11/11

E2E não está em ci:full (precisa de Supabase local rodando) — roda em job CI separado (`.github/workflows/e2e.yml`, Sprint 14 MX69).

---

## 11. Estado dos KLs

Ver `KNOWN_LIMITATIONS.md`:

- 2 WONTFIX (KL-1 GoTrueClient, KL-2 scp-registry alias)
- 2 ACCEPTED_F1 (KL-7 SCP inline, KL-8 PDF binário)
- 1 DEFERRED (KL-5 Vercel preview → Sprint 21)
- 1 VALIDATED_MANUALLY (KL-6 BYOK Copilot)
- 1 OPEN info-level (KL-9 pnpm.overrides do MX104)

0 bloqueadores para staging.

---

## 12. Próximas fronteiras

- **Sprint 21**: staging deploy (Vercel + Supabase prod, KL-5)
- **F2**: NATS JetStream multi-host, Temporal workflow engine, Lago billing
- **F3**: Verticais standalone (LOGITIX, Kwix, Autergon)
