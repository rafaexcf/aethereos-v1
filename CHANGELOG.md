# CHANGELOG — Aethereos

> Resumo factual e conciso de cada sprint. Para detalhe completo: `SPRINT_LOG.md`.

Convenções:

- **Selos:** marcos arquiteturais (kernel, RLS, SCP, etc.).
- **Apps:** apps novos ou refeitos.
- **Drivers:** novos drivers ou bifurcações.
- **Ops:** infra, deploy, monitoring.

---

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
