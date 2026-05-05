# Gates Status — Fase 1 / Camada 1

Sprint 31 / MX174 — snapshot final de código da Camada 1.

Data: 2026-05-05
Próximo foco: dogfood de 30 dias + comercio.digital em paralelo.

---

## Resumo executivo

| Status     | Gates      |
| ---------- | ---------- |
| ✅ PASS    | 1, 2, 3, 7 |
| ⚠️ PARCIAL | 4, 5, 6    |
| ⏳ TEMPO   | 8          |

A Camada 1 está **codigo-completa**. Os gates parciais e pendentes
dependem de tempo (dogfood) ou contratação externa (pen test) — não
de mais código.

---

## Detalhe por gate

### ✅ Gate 1 — Provisionamento

**Status:** PASS
**Critério:** novo tenant é provisionado com schema completo, RLS,
edge functions, e usuários iniciais.

**Evidência:**

- Edge Function `register-company` + `create-company` + `complete-onboarding`.
- Seed determinístico cobre 2 empresas (Meridian, Solaris) + cross-tenant.
- E2E `signup-onboarding-create-company.spec.ts` passa.

---

### ✅ Gate 2 — Isolamento

**Status:** PASS
**Critério:** dados de tenant A nunca são lidos ou escritos por tenant B.

**Evidência:**

- 70+ tabelas em `kernel.*` com RLS habilitada.
- `pnpm test:isolation` — 13 cenários de cross-tenant cobrindo SELECT,
  INSERT, UPDATE, DELETE via PostgREST e RPC.
- E2E `cross-tenant-rls.spec.ts` no Playwright.
- `docs/SECURITY_CHECKLIST.md` vetores 1, 2, 8 — MITIGADO.

---

### ✅ Gate 3 — SCP end-to-end + replay

**Status:** PASS (Sprint 31 / MX170)
**Critério:** evento publicado pelo browser → outbox → consumer →
projeções derivadas. Replay idempotente de evento por id ou range.

**Evidência:**

- `apps/scp-worker/src/main.ts` — outbox poller com FOR UPDATE SKIP
  LOCKED, max attempts, latency metrics.
- `apps/scp-worker/src/replay.ts` — `replayEvent(eventId)` +
  `replayRange(from, to)`.
- `apps/scp-worker/src/replay-cli.ts` — CLI `pnpm --filter
@aethereos/scp-worker replay --event-id <uuid>`.
- Migration `20260509000001_kernel_scp_replay.sql` — `replay_count`,
  `last_replayed_at` em `scp_outbox`; `event_id UUID UNIQUE` em
  `audit_log`.
- 4 consumers idempotentes:
  - AuditConsumer: `INSERT ... ON CONFLICT (event_id) DO NOTHING`.
  - NotificationConsumer: skip se `(user_id, source_app, source_id)`
    já existe.
  - EmbeddingConsumer: `INSERT ... ON CONFLICT (company_id, source_id,
chunk_index) DO UPDATE`.
  - EnrichmentConsumer: `INSERT ... ON CONFLICT (company_id,
entity_type, entity_id, record_type) DO UPDATE`.
- 38/38 unit tests passando, incluindo 6 testes específicos de replay.
- Pipeline E2E: 13/13 passando desde Sprint 9.6.

---

### ⚠️ Gate 4 — Copilot básico (eval dataset)

**Status:** PARCIAL (Sprint 31 / MX173)
**Critério:** dataset de avaliação cobrindo categorias canônicas +
500+ queries com uso real.

**Entregue:**

- Copilot integrado com LiteLLM gateway (Sprint 15) + RAG sobre
  `kernel.embeddings` + agent proposals workflow (Sprint 17).
- `docs/copilot-eval-dataset.json` — 50 queries seed (rag/proposal/
  direct/decline).
- LLM observability via Langfuse self-hosted (decisão do CLAUDE.md §4).

**Pendente:**

- Expansão para 500+ queries com uso real ao longo de 30 dias de
  dogfood.
- Sistema automatizado de eval (rodar dataset contra Copilot e medir
  precision/recall por categoria).

**Plano:** ambos endereçados pós-dogfood quando houver tráfego real.

---

### ⚠️ Gate 5 — SLO (métricas, uptime)

**Status:** PARCIAL (Sprint 31 / MX171, MX172)
**Critério:** instrumentation completa + 30 dias de uptime ≥ 99,5%.

**Entregue:**

- Edge Function `health` pública (200 ok, db status, uptime_seconds).
- SLO instrumentation em scp-worker: p50/p95/p99 a cada 100 eventos
  via log estruturado consultável em Vercel logs / Loki.
- Error tracking: `lib/observability.ts` roteia para
  `window.Sentry` se disponível, console.error estruturado caso
  contrário; handlers globais para `error` + `unhandledrejection`.
- Vercel auto-deploy via Git Integration (push em main → produção).
- `docs/runbooks/auto-deploy.md` cobre deploy + migrations + rollback.

**Pendente:**

- 30 dias de uptime medido em produção (depende de tempo).
- Uptime monitor externo configurado (BetterUptime / UptimeRobot
  apontando para health endpoint).
- Sentry com DSN real configurado em prod (opcional, R11 do sprint).

**Plano:** monitor externo configurado no início do dogfood (1 dia).
30 dias acumulam naturalmente.

---

### ⚠️ Gate 6 — Segurança (pen test)

**Status:** PARCIAL (Sprint 31 / MX174)
**Critério:** todos vetores de ameaça mitigados + pen test externo
sem findings críticos.

**Entregue:**

- `docs/SECURITY_CHECKLIST.md` — 13 vetores, todos com status
  MITIGADO + evidência + última verificação.
- 2FA TOTP, sessões ativas, alertas, exportação LGPD
  (Sprint 30 MX163-MX168).
- `SECURITY.md` com canal `security@aethereos.io` + disclosure 90 dias.
- Headers de produção (X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy, Permissions-Policy).
- Rate-limit em endpoints sensíveis (Sprint 27 MX147).

**Pendente:**

- Pen test externo (contratar após 30 dias de staging).
- Bug bounty publicado.
- CSP estrito (atualmente permissivo para HMR Vite).

---

### ✅ Gate 7 — Compliance docs

**Status:** PASS (Sprint 31 / MX169)
**Critério:** documentos legais e operacionais públicos.

**Entregue:**

- `LICENSE` — BUSL-1.1 (Camada 0) + proprietária (Camadas 1/2),
  Change Date 2030-04-29 → Apache 2.0.
- `CONTRIBUTING.md` — fluxo de PR, code-review checklist, padrão de
  commits.
- `SECURITY.md` — disclosure responsável, escopo, vetores de alta
  prioridade.
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1.
- `BRAND_POLICY.md` — uso de nome, logo, cores, "Powered by" BUSL.
- `PRIVACY_POLICY.md` — LGPD art. 18, retenção, DPO configurável,
  link para export-company-data.

---

### ⏳ Gate 8 — Dogfood (30 dias)

**Status:** PENDENTE (requer tempo)
**Critério:** 30 dias de uso interno em staging com tráfego real.

**Plano:** começa após Sprint 31 finalizar deploy. Métricas a coletar:

- Uptime e latência (Gate 5).
- Bugs descobertos por categoria.
- Eval queries reais para Gate 4.
- Findings de segurança operacional.

---

## Próximas frentes (fora desta fase)

- **comercio.digital** — primeiro SaaS standalone (Camada 2),
  desenvolvimento em paralelo ao dogfood.
- **Pen test externo** — sprint dedicada após 30 dias.
- **Verticais** — logitix, kwix, autergon (Camada 2).

---

Versão: 1.0.0
Última revisão: 2026-05-05 (Sprint 31, encerramento código Camada 1)
