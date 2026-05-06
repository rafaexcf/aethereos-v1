# Gates Status — Fase 1 / Camada 1

Sprint 32 / MX180 — selo final Camada 1.

Data: 2026-05-06
Próximo foco: dogfood de 30 dias + comercio.digital em paralelo.

---

## Resumo executivo

| Status     | Gates      |
| ---------- | ---------- |
| ✅ PASS    | 1, 2, 3, 7 |
| ⚠️ PARCIAL | 4, 5, 6    |
| ⏳ TEMPO   | 8          |

A Camada 1 está **codigo-completa** após Sprint 32. Os gates parciais e
pendentes dependem de tempo (dogfood) ou contratação externa (pen test) —
não de mais código.

---

## Detalhe por gate

### ✅ Gate 1 — Provisionamento

**Status:** PASS (mantido)
**Critério:** novo tenant é provisionado com schema completo, RLS,
edge functions, e usuários iniciais.

**Evidência:**

- Edge Functions `register-company`, `create-company`, `complete-onboarding`,
  `invite-member` (Sprint 27).
- Seed determinístico cobre 2 empresas + cross-tenant.
- E2E `signup-onboarding-create-company.spec.ts` passa.

---

### ✅ Gate 2 — Isolamento

**Status:** PASS (mantido)
**Critério:** dados de tenant A nunca são lidos ou escritos por tenant B.

**Evidência:**

- **81 tabelas** em `kernel.*` com RLS habilitada (era 68 em Sprint 20).
  Ver `SECURITY_AUDIT.md` Sprint 32.
- 123 policies ativas. Padrão dominante:
  `company_id = kernel.current_company_id()`.
- `pnpm test:isolation` — 13 cenários cross-tenant.
- E2E `cross-tenant-rls.spec.ts` no Playwright.
- 13 vetores no `docs/SECURITY_CHECKLIST.md` — todos MITIGADO.

---

### ✅ Gate 3 — SCP end-to-end + replay

**Status:** PASS (Sprint 31 / MX170, mantido)
**Critério:** evento publicado pelo browser → outbox → consumer →
projeções derivadas. Replay idempotente por id ou range.

**Evidência:**

- `apps/scp-worker/src/main.ts` — outbox poller com FOR UPDATE SKIP LOCKED.
- `apps/scp-worker/src/replay.ts` — replayEvent + replayRange.
- 4 consumers idempotentes (audit, notification, embedding, enrichment).
- Migration `20260509000001_kernel_scp_replay.sql` — replay_count + event_id UNIQUE.
- 38/38 unit tests passando, 6 de replay específicos.
- Pipeline E2E: 13/13 desde Sprint 9.6.

---

### ⚠️ Gate 4 — Copilot básico (eval dataset)

**Status:** PARCIAL (mantido)
**Critério:** dataset de avaliação cobrindo categorias canônicas + 500+
queries com uso real.

**Entregue:**

- Copilot integrado com LiteLLM gateway + RAG sobre kernel.embeddings.
- Agent proposals workflow (Sprint 17).
- `docs/copilot-eval-dataset.json` — 50 queries seed.
- LLM observability via Langfuse self-hosted.

**Pendente:**

- Expansão para 500+ queries com uso real (30 dias de dogfood).
- Sistema automatizado de eval (precision/recall por categoria).

**Plano:** ambos endereçados pós-dogfood.

---

### ⚠️ Gate 5 — SLO (métricas, uptime)

**Status:** PARCIAL (Sprint 31 / MX171-172, complementado em Sprint 32 / MX179)
**Critério:** instrumentation completa + 30 dias de uptime ≥ 99,5%.

**Entregue:**

- Edge Function `health` pública (200 ok, db status, uptime_seconds).
- SLO instrumentation em scp-worker: p50/p95/p99 a cada 100 eventos.
- Error tracking: `lib/observability.ts` + handlers globais.
- Vercel auto-deploy + runbook completo.
- Sprint 32: `docs/runbooks/uptime-monitoring.md` documenta UptimeRobot.

**Pendente:**

- 30 dias de uptime medido em produção (depende de tempo).
- Monitor externo configurado pelo owner (manual — não automatizado por agente).

**Plano:** owner cria UptimeRobot no D-1 do dogfood. 30 dias acumulam
naturalmente. Atualizar para PASS em ~2026-06-06.

---

### ⚠️ Gate 6 — Segurança (pen test)

**Status:** PARCIAL (mantido)
**Critério:** todos vetores de ameaça mitigados + pen test externo sem
findings críticos.

**Entregue:**

- `docs/SECURITY_CHECKLIST.md` — 13 vetores, todos MITIGADO.
- 2FA TOTP, sessões ativas, alertas, exportação LGPD (Sprint 30).
- `SECURITY.md` com canal `security@aethereos.io` + disclosure 90 dias.
- Headers de produção (X-Content-Type-Options, X-Frame-Options, etc.).
- Rate-limit em endpoints sensíveis (Sprint 27).
- Sprint 32: 16 Edge Functions auditadas (era 11).

**Pendente:**

- Pen test externo (contratar após 30 dias de staging).
- Bug bounty publicado.
- CSP estrito.

---

### ✅ Gate 7 — Compliance docs

**Status:** PASS (Sprint 31 / MX169, mantido)
**Critério:** documentos legais e operacionais públicos.

**Entregue:**

- `LICENSE` — BUSL-1.1 (Camada 0) + proprietária (Camadas 1/2).
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`,
  `BRAND_POLICY.md`, `PRIVACY_POLICY.md`.

---

### ⏳ Gate 8 — Dogfood (30 dias)

**Status:** INICIADO (Sprint 32 / MX178)
**Critério:** 30 dias de uso interno com tráfego real.

**Plano:** começa em 2026-05-06. Métricas em `docs/DOGFOOD_PLAN.md`:

- Uptime e latência (Gate 5).
- Bugs descobertos por categoria.
- Eval queries reais para Gate 4 (target 200+).
- Findings de segurança operacional.
- Sessões: 25/30 dias mínimo.

Atualizar para PASS em ~2026-06-06 se critérios atingidos.

---

## Próximas frentes (fora desta fase)

- **comercio.digital** — primeiro SaaS standalone (Camada 2),
  desenvolvimento em paralelo ao dogfood.
- **Pen test externo** — sprint dedicada após 30 dias.
- **Verticais** — logitix, kwix, autergon (Camada 2).

---

Versão: 2.0.0
Última revisão: 2026-05-06 (Sprint 32, selo final Camada 1)
