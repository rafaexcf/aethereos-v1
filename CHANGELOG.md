# CHANGELOG — Aethereos

> Resumo factual e conciso de cada sprint. Para detalhe completo: `SPRINT_LOG.md`.

Convenções:

- **Selos:** marcos arquiteturais (kernel, RLS, SCP, etc.).
- **Apps:** apps novos ou refeitos.
- **Drivers:** novos drivers ou bifurcações.
- **Ops:** infra, deploy, monitoring.

---

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
