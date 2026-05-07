# CHANGELOG — Aethereos

> Resumo factual e conciso de cada sprint. Para detalhe completo: `SPRINT_LOG.md`.

Convenções:

- **Selos:** marcos arquiteturais (kernel, RLS, SCP, etc.).
- **Apps:** apps novos ou refeitos.
- **Drivers:** novos drivers ou bifurcações.
- **Ops:** infra, deploy, monitoring.

---

## Super Sprint F — Developer Console (2026-05-07) — **F2 SEALED**

- **Selo:** Ecossistema Aethereos aberto para developers terceiros. Portal completo, app CRUD, sandbox, review, docs, métricas, revenue share.
- **Schema:** 5 tabelas novas — `kernel.developer_accounts` (1:1 user, api_key gen_random_bytes), `kernel.app_submissions` (status: draft/submitted/in_review/approved/rejected/published/removed; UNIQUE developer+slug+version para versionamento), `kernel.app_reviews` (audit append-only), `kernel.app_installations` (tracking append-only), `kernel.developer_earnings` (revenue share 70/30 reservado). 91 → 96 tabelas kernel.\*.
- **Developer Console** (`apps/shell-commercial/src/apps/developer-console/`): novo app no shell, registro com aceite de termos, dashboard com 4 cards (apps, instalações, em revisão, rascunhos), API key mascarada com show/hide/copy/regenerate (Web Crypto), gráfico CSS de instalações dos últimos 30 dias, lista de apps com badges de status.
- **Wizard 5 steps** (`app-wizard.tsx`): identidade (slug auto-slugify), aparência (ícone Lucide + cor + screenshots URLs), técnico (HTTPS obrigatório, modo iframe/weblink, licença, tags), permissões (toggles dos 17 scopes do SCOPE_CATALOG, justificativa textarea para sensíveis 10+ chars, manifesto JSON preview), monetização (4 modelos, price em centavos, banner 70/30). Edit in-place para drafts, INSERT nova versão (bump automático) para publicados.
- **Sandbox** (`sandbox.tsx`): iframe + console de logs side-by-side, mock bridge no parent window respondendo handshake e RPC com 8 mock responses (auth.session, drive.list, people.list, chat.channels, notifications.list, ai.chat, settings.get, theme.current). Sem simulação de shell completo (R13).
- **Submit** + auto-publish via Edge Function `app-review`: staff (verificado por is_staff em app_metadata) chama com `{ submission_id, action, notes, checklist }`. Approve UPSERTs em `kernel.app_registry` com app_type='third_party' (R18) e marca submission published. Reject + request_changes notificam developer. Helper notifyDeveloper usa membership ativa do dev (notifications.company_id é NOT NULL).
- **Tab Gestor "Revisão de apps"** (`StaffAppReview.tsx`): lista filtrada (pendentes/todas), modal com resumo + scopes + checklist 7 itens + notas + 3 botões (Pedir mudanças / Rejeitar / Aprovar). Guard !isStaff renderiza mensagem informativa.
- **Docs developer**: 6 markdowns em `docs/developer/` — README (Getting Started + 5 min tutorial), SDK (10 módulos + bridge protocol), MANIFEST (formato + tabela de campos + Zod), PERMISSIONS (17 scopes em 9 categorias + consent flow), REVIEW (checklist + motivos + SLAs), MONETIZATION (4 modelos + 70/30 + benchmark mercado).
- **Revenue share placeholder** (R15): tabela `kernel.developer_earnings` reservada; UI mostra banner verde apenas para developers com apps pagos. Cobrança real fica para F3+ quando Stripe verificado.

## Super Sprint E — Billing (2026-05-07)

- **Selo:** Billing operacional sem Lago (Alternativa B). Planos, quotas, portal, alertas.
- **Decisão (MX232):** Lago fica como opt-in no compose para quem quiser, mas o billing oficial usa tabelas próprias em `kernel.*`. Ver `docs/billing/README.md` para o racional. Stripe real fica para quando a conta PJ estiver verificada — checkout opera em modo simulado (R9).
- **Schema:** 4 tabelas novas — `kernel.subscriptions` (UNIQUE company_id, default Free via trigger), `kernel.invoices` (com lago_invoice_id reservado), `kernel.usage_events` (append-only), `kernel.plan_limits` (catálogo global, R12). 87 → 91 tabelas kernel.\*.
- **Catálogo:** `@aethereos/kernel/billing` define 3 planos (Free R$0, Pro R$199, Enterprise R$799) e 3 métricas (active_users / storage_bytes / ai_queries) em centavos (R17). Mesmo conteúdo seedado em `kernel.plan_limits` para Edge Functions Deno.
- **Edge Functions:** `billing-sync` (plan + limits direto do banco), `billing-usage-report` (active_users + storage + ai_queries reais com alerts em 80%/95%), `create-checkout` (modo simulado: marca plano + cria invoice paid simbólica + emite SCP). Webhook de Lago/Stripe fica para sprint futuro.
- **Quotas (MX239):** `QuotaEnforcer` driver-agnostic em `@aethereos/kernel/billing` com cache 5min e métodos `checkUserInvite` / `checkAIQuery` / `checkFileUpload`. R10 cumprida (sem bypass owner/admin). 13 unit tests novos. `invite-member` Edge Function chama `checkUserInviteQuota` antes do invite — bloqueio com 403 + payload `{ metric, current, limit, percent }`. Wire-up de copilot e file upload fica como TODO.
- **Portal Gestor:** modo "Plano & Assinatura" deixa de ser placeholder. `tabs/PlanoAssinatura.tsx` (substitui inline TabPlanos) — comparador 3-coluna com upgrade modal. `tabs/ConsumoLimites.tsx` — 3 barras de progresso reais com cor dinâmica (verde/amarelo/laranja/vermelho) e banner amarelo quando há alertas. `tabs/HistoricoPagamentos.tsx` — tabela de invoices com Realtime, status badges, link para PDF e texto NF-e (MX241).
- **Alertas (MX240):** notificações persistidas em `kernel.notifications` por métrica >80% (idempotente por dia via source_id). Banner `QuotaAlertBanner` no PainelGeral com botão "Ver plano".
- **NF-e (MX241):** **Opção D** — emissão manual mediada por contato (`financeiro@aethereos.io`) até volume justificar provedor fiscal (NFe.io / Enotas / Focus NFe). `pdf_url` reservado em `kernel.invoices` para integração futura.

## Super Sprint D — Temporal + Choreography + Automacoes (2026-05-07)

- **Selo:** Workflow engine durável (Temporal) + SCP Choreography declarativa + Automacoes UI conectada ao novo modelo.
- **Infra:** `docker-compose.dev.yml` ganha Temporal stack (auto-setup 1.24, Postgres dedicado port 5435, UI 2.28 em port 8233). Comando `pnpm dev:temporal`. R7: sistema funciona sem Temporal.
- **Worker:** `apps/temporal-worker/` (novo) com Worker boot + NativeConnection, 6 activities (sendEmail/Resend ou log, querySupabase/insertSupabase/updateSupabase com identifier whitelist, emitSCPEvent, createNotification, evaluatePolicy + waitForApproval). 3 unit tests.
- **Workflows:** `onboardingFlow` (drip D0/D3/D10), `inviteReminderFlow` (D3 reminder/D7 expiração), `lgpdExportFlow` (notify-export-cleanup). Retry policy 3 attempts × backoff x2. Trigger CLI para debug.
- **Schema:** 3 tabelas novas — `kernel.choreographies` (per-company, RLS, YAML+JSON), `kernel.choreography_executions` (append-only via service_role), `kernel.choreography_step_approvals` (gate manual quando require_approval).
- **Engine:** `ChoreographyEngine` em `@aethereos/kernel/choreography` — match/start/finish/resolveTemplates (`{{trigger.payload.x}}`, `{{trigger.actor_id}}`), cache 30s, reusa `evaluateConditions` do Policy Engine. 15 unit tests.
- **Wiring server:** `ChoreographyConsumer` (5º inline consumer, `matches=*`) em scp-worker. Inline runner sem suporte a wait — força failed com mensagem clara (Temporal future).
- **App Automacoes:** modo Avançado (toggle no sidebar) substitui main por `<ChoreographiesView />` — lista coreografias com badges, toggle ativar/pausar, arquivar, editor YAML com validação inline (js-yaml), histórico de execuções. 5 templates pré-construídos (notify-team, escalate-task, weekly-backup, alert-large-file, daily-summary). Modo Simples (kernel.automations) preservado.
- **Seed:** 2 YAMLs em `infra/seed-data/choreographies/` (contact-to-sales inline-able, task-escalation Temporal-only).
- **Produção:** Temporal Server hospedado separadamente (Temporal Cloud, k8s operator, ou VPS). `TEMPORAL_ADDRESS` controla worker. Edge Functions atuais (`create-company`, `invite-member`, `export-company-data`) ainda chamam fluxo síncrono — migração para Temporal fica para sprint futuro via HTTP wrapper ou consumer SCP.

## Super Sprint C — i18n PT-BR + EN (2026-05-06)

- **Selo:** Sistema bilíngue (Português + Inglês) com framework completo.
- **Deps:** `react-i18next`, `i18next`, `i18next-browser-languagedetector`.
- **Estrutura:** 30 namespaces × 2 línguas = 60 arquivos JSON. ~400 chaves PT-BR + ~400 EN. `common.errors.*` mapeia códigos de erro de Edge Functions.
- **Hook:** `useAppTranslation(ns)` com formatadores Intl (formatDate short/long/relative, formatNumber, formatCurrency BRL/USD por locale, formatPercent).
- **Components:** `LanguageSwitcher` reutilizável (compact + full). Login, ErrorBoundary, LockScreen, CommandCenter migrados para `t()`.
- **Configurações:** seleção de idioma já existente agora wirea com `i18n.changeLanguage()` (sem reload).
- **Detecção:** localStorage `aethereos-language` → navegador → fallback `pt-BR`.
- **Nomes próprios** preservados: Aethereos, Dock, Magic Store, Copilot, Aether AI, Shadow Mode (R7).
- **Migração inline de t()** em componentes restantes fica como dívida incremental — chaves prontas em todos os JSONs.

## Super Sprint B — NATS Real (2026-05-06)

- **Selo:** KL-7 RESOLVED — SCP pipeline com fan-out cross-host via NATS JetStream.
- **Infra:** `docker-compose.dev.yml` NATS 2.11 com JetStream + `tools/nats-setup.mjs` (idempotente: stream `SCP_EVENTS`, 4 consumer groups durables com max_deliver=5).
- **Drivers:** `NatsEventBusDriver` ganha `subscribeGroup(name, handler)` para consumer groups pré-criados.
- **scp-worker:** ENV `NATS_URL` controla modo. Sem var = inline (legado). Com var = poller publica no stream + 4 consumer groups (audit/embedding/notification/enrichment) processam em paralelo. Reconnect a cada 5s. Métricas com nats_count/inline_count.
- **Health:** Edge Function `health` retorna `nats: 'configured' | 'not_configured'`.
- **Produção:** continua inline (Vercel/Supabase Cloud sem NATS_URL). NATS opcional para F2+.

## Super Sprint A — Policy Engine completo (2026-05-06)

- **Selo:** Governance-as-Code operacional. Agentes avaliados automaticamente: allow / deny / require_approval.
- **Schema:** 3 tabelas — `kernel.action_intents` (catálogo global, 25 intents seed), `kernel.policies` (per-company, draft/active/archived), `kernel.policy_evaluations` (append-only audit).
- **Runtime:** `PolicyEngine` em `@aethereos/kernel/policy` — cache 5min, deny short-circuit, defaults user=allow / agent=require_approval, dryRun mode. 13 unit tests.
- **Integração:** Copilot avalia ANTES de inserir proposal; allow → status=approved + auto_resolved, deny → rejected, require_approval → fluxo manual.
- **Policy Studio:** novo tab no Gestor (Permissões & Acessos > Políticas) com lista, YAML editor, edit/duplicate/activate/archive, simulação dryRun de 90 dias, métricas top 5 intents + breakdown allow/deny/escalar, 3 templates hardcoded (Conservador, Moderado, Operações Financeiras).
- **Audit:** badge "Auto-aprovado/rejeitado por política" em proposals; drawer com policy_evaluations row (resultado + reason + matched_rule JSON).
- **Deps:** js-yaml ^4 (+ types) para YAML serialize/parse.

## Sprint 34 — Quick Wins F2 (2026-05-06)

- **Selo:** KL-8 RESOLVED — PDF embedding funcional.
- **Apps:** EmbeddingConsumer no scp-worker agora processa PDFs via `unpdf` (Node-native, sem bindings). Branching por mime_type, limite 500k chars, skip gracioso para PDFs escaneados/protegidos.
- **Auditoria:** Weather/Câmera/Gravador já tinham APIs reais e persistência (open-meteo, kernel-media, kernel-voice). Documentado em runbook.

## Sprint 33 — Consolidação final (2026-05-06)

- **Selo:** Camada 1 ENCERRADA DEFINITIVAMENTE. Pronto para Camada 2.
- **Seed:** ampliado para 22 tabelas — extras.ts cobre departments, groups, company_roles, tasks, kanban, notes, app_permission_grants.
- **Apps:** Sentry integrado (`@sentry/react`) com init condicional via VITE_SENTRY_DSN.
- **E2E:** expandido de 34 para 54 testes — +7 specs (gestor, tarefas, kanban, notas, calendario, seguranca, permissions).
- **Mobile:** responsividade básica via media queries — banner <768px, ajustes TabBar/TopBar.
- **God components:** decisão técnica documentada (KL-14) — refatoração adiada para sprint pós-dogfood com E2E-first.
- **Auditorias:** Calendário/PDF/Agenda/Enquetes já tinham persistência (Sprints 5-22); CI E2E já existia (MX69 Sprint 14).

## Sprint 32 — Selo final Camada 1 (2026-05-06)

- **Selo:** Camada 1 código-completa. Re-auditorias de segurança e qualidade.
- **Ops:** deploy completo em produção (3 Edge Functions novas: invite-member, force-logout, export-company-data). Monitor de uptime documentado. DOGFOOD_PLAN.md + issue template. Documentação consolidada (README, ARCHITECTURE, GATES, KL, CHANGELOG, SPRINT_LOG).

## Sprint 31 — Gates finais (2026-05-09)

- **Selo:** Gate 3 PASS (SCP replay idempotente). Gate 7 PASS (compliance docs).
- **Ops:** health endpoint público, SLO instrumentation, observability hook. 6 docs legais: LICENSE BUSL, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, BRAND_POLICY, PRIVACY_POLICY. Eval seed dataset (50 queries). MX174 fechou Gates 6 com SECURITY_CHECKLIST 13/13 vetores MITIGADOS.

## Sprint 30 — Segurança enterprise + LGPD (2026-05-08)

- **Apps:** 2FA TOTP, sessões ativas com revoke, alertas de segurança.
- **Selo:** LGPD Art. 18 — exportação de dados (Edge Fn export-company-data, owner-only).
- **Schema:** kernel.security_alerts, kernel.login_history.

## Sprint 29 — Apps com persistência (2026-05-07)

- **Apps:** Tarefas, Kanban, Bloco de Notas migrados de localStorage para Postgres.
- **Schema:** kernel.tasks, kanban_boards/columns/cards (+ activity, attachments, labels, comments, checklist), notes (+ labels), task_lists.

## Sprint 28 — Permissões avançadas (2026-05-06)

- **Schema:** kernel.departments, department_members, groups, group_members, company_roles, app_access_rules, access_schedules, company_settings.
- **Apps:** Gestor → controle granular de acesso por departamento, grupo, role.

## Sprint 27 — Production readiness (2026-05-06)

- **Apps:** Menu Gestor completo (dashboard, equipe, convite, CRUD).
- **Ops:** Edge Function invite-member (email + role-check + rate-limit). Error boundaries. Rate limiting bucketizado (kernel.rate_limits).

## Sprint 26 — UX improvements

- Polish de UI no shell-commercial (Mesa, Dock, launcher), atalhos de teclado, animações.

## Sprint 25 — Catálogo 188+ apps (2026-05-05)

- **Apps:** 136 apps adicionados ao catálogo Magic Store (4 categorias: Dev Tools, IA, Finance, Games).

## Sprint 24 — Staging deploy (2026-05-05)

- **Ops:** deploy inicial em produção (oublhirkojyipwtmkzvw.supabase.co + aethereos.io). Edge functions deployadas. Auto-deploy Vercel via Git Integration.

## Sprint 21-23 — Magic Store operacional

- **Schema:** kernel.app_registry (catálogo global), kernel.app_permission_grants.
- **Drivers:** @aethereos/client SDK para apps iframe + AppBridgeHandler/IframeAppFrame (Sprint 22).
- **Apps:** Magic Store dinâmico (instalar/desinstalar reage em tempo real no Dock/Mesa).

## Sprint 20 — Auditoria pré-staging (2026-05-04)

- **Selo:** SECURITY_AUDIT.md (RLS 68/68, buckets, Edge Functions). CODE_QUALITY_AUDIT.md (TS strict, 0 critical/high vulns, drivers conformes). KNOWN_LIMITATIONS taxonomia. Sprint 20 selou pre-staging.

## Sprint 15-19 — Features Camada 1

- **Sprint 15:** BYOK Copilot (multi-provedor: OpenAI/Anthropic/Google/Groq/LM Studio/Ollama/Custom).
- **Sprint 16:** Magic Store registry dinâmico no banco.
- **Sprint 17:** Aether AI proposals (Shadow Mode + ActionApprovalPanel).
- **Sprint 18:** SCP pipeline inline (poller direto no Postgres + 4 consumers idempotentes).
- **Sprint 19:** Context Engine (3 camadas SCP, kernel.context_records + embeddings com RAG).

## Sprint 13-14 — E2E + CI

- 33 specs Playwright. CI GitHub Actions com typecheck/lint/deps/test/build/E2E.

## Sprint 2-12 — Fundação (2026-04-29 → 2026-05-04)

- **Selo:** monorepo com 14 packages + 5 apps + 24 ADRs.
- **Schema:** kernel multi-tenant com RLS por company_id + custom_access_token hook.
- **Drivers:** bifurcação server/browser (ADR-0020). LLMDriver, DataDriver, AuthDriver, StorageDriver, EventBusDriver, VectorDriver, etc.
- **Apps:** shell-commercial completa com Mesa/Dock/launcher, 30+ apps nativos (Tarefas, Kanban, Drive, Chat, Calendário, Pessoas, etc.).
- **Selo:** SCP barramento universal (P5), driver model (P3), kernel invariável (P1).
