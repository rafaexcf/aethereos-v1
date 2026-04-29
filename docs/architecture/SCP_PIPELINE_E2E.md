# SCP Pipeline — Validação End-to-End

> Sprint 7 Revisado · MX11 · Ref: ADR-0020, Fundamentação 8.10 [INV]

## Visão Geral do Pipeline

```
Browser (shell-commercial)
  │
  │  1. Escreve dado de domínio (ex: INSERT INTO kernel.files)
  │
  │  2. POST /functions/v1/scp-publish  ← supabase/functions/scp-publish/index.ts
  │     JWT no header Authorization
  │     Body: { event_type, payload, actor, correlation_id }
  │
  ▼
Edge Function (Deno — Supabase CDN)
  │
  │  3. Valida JWT via auth.getUser()
  │  4. Extrai active_company_id do payload JWT decodificado
  │  5. Valida event_type (regex + set de tipos conhecidos)
  │  6. Bloqueia operações invariantes de agente (HTTP 403)
  │  7. INSERT INTO kernel.scp_outbox via adminClient (service_role)
  │     status = 'pending'
  │
  ▼
kernel.scp_outbox (PostgreSQL)
  │
  │  Trigger: kernel_scp_outbox_validate_before_insert
  │    → kernel.is_invariant_operation(event_type, actor_type)
  │    → RAISE EXCEPTION se agente + operação invariante
  │
  ▼
scp-worker (Node.js — apps/scp-worker)
  │
  │  8. Polling cada 500ms: SELECT ... WHERE status='pending' FOR UPDATE SKIP LOCKED
  │  9. bus.publish(row.envelope) → NATS JetStream
  │  10. UPDATE status='published', published_at=now()
  │      (ou status='failed' após MAX_ATTEMPTS=5)
  │
  ▼
NATS JetStream
  │
  │  11. Consumers subscrevem subjects por event_type
  │  12. kernel.audit_log gravado por consumer dedicado
  │
  ▼
Downstream consumers (futuro: Workflow Engine, AI Copilot, etc.)
```

## O que é testado automaticamente

### MX10 — RLS cross-tenant (`pnpm test:isolation`)

Arquivo: `apps/scp-worker/__tests__/rls-isolation.test.ts`

| Tabela                    | fail-closed           | isolamento A vs B |
| ------------------------- | --------------------- | ----------------- |
| `kernel.companies`        | ✓ (rls.test.ts)       | ✓ (rls.test.ts)   |
| `kernel.scp_outbox`       | ✓ (rls.test.ts)       | ✓ (rls.test.ts)   |
| `kernel.files`            | ✓                     | ✓                 |
| `kernel.people`           | ✓                     | ✓                 |
| `kernel.chat_channels`    | ✓                     | ✓                 |
| `kernel.settings`         | ✓ (via company scope) | ✓                 |
| `kernel.audit_log`        | ✓ (sem SELECT policy) | —                 |
| `kernel.staff_access_log` | —                     | —                 |

`kernel.is_invariant_operation`: 6 testes (agent bloqueia, human permite, desconhecido passa).

### MX11 — Pipeline SCP (`pnpm test:isolation`)

Arquivo: `apps/scp-worker/__tests__/scp-pipeline.test.ts`

| Etapa                                    | Teste                                                 |
| ---------------------------------------- | ----------------------------------------------------- |
| Escrita no outbox (simula Edge Function) | ✓ service_role INSERT, status=pending                 |
| Preservação do envelope                  | ✓ todos os campos obrigatórios presentes              |
| Idempotência por event_id                | ✓ duplicata rejeitada                                 |
| Processamento (simula worker)            | ✓ FOR UPDATE SKIP LOCKED, transição pending→published |
| Falha após MAX_ATTEMPTS                  | ✓ status=failed, last_error preservado                |
| Bloqueio invariante (trigger DB)         | ✓ agent+deactivated/deleted → RAISE EXCEPTION         |
| Human passa pelo trigger                 | ✓ platform.person.deactivated com actor human         |
| Cross-tenant: service_role lê todas      | ✓                                                     |
| Cross-tenant: authenticated sem contexto | ✓ 0 rows                                              |

## O que requer runtime (não testado em CI automatizado)

| Etapa                                    | Razão                                             | Como validar manualmente               |
| ---------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| JWT real do Supabase Auth                | Precisa de Supabase rodando + usuário autenticado | `pnpm dev:db` + login no browser       |
| Chamada HTTP real à Edge Function        | Precisa de `supabase functions serve` ou deploy   | `supabase functions serve scp-publish` |
| NATS JetStream publishing                | Precisa de NATS rodando                           | `docker compose up nats` + scp-worker  |
| Realtime no browser (canal subscription) | Precisa de Supabase Realtime                      | Teste manual no browser                |

## Execução dos testes

```bash
# Inicia Supabase local
pnpm dev:db

# Roda testes de isolamento + pipeline
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres \
  pnpm test:isolation

# Resultado esperado:
# ✓ RLS isolation — kernel.companies (5 testes)
# ✓ RLS isolation — kernel.scp_outbox (2 testes)
# ✓ RLS isolation — kernel.files (3 testes)
# ✓ RLS isolation — kernel.people (3 testes)
# ✓ RLS isolation — kernel.chat_channels (3 testes)
# ✓ RLS isolation — kernel.settings (2 testes)
# ✓ DB function — kernel.is_invariant_operation (6 testes)
# ✓ RLS isolation — kernel.audit_log (1 teste)
# ✓ RLS isolation — kernel.staff_access_log (1 teste)
# ✓ SCP pipeline — escrita no outbox (3 testes)
# ✓ SCP pipeline — transições de status pelo worker (3 testes)
# ✓ SCP pipeline — falha após max tentativas (1 teste)
# ✓ SCP pipeline — trigger bloqueia operações invariantes (3 testes)
# ✓ SCP pipeline — isolamento cross-tenant no outbox (2 testes)
```

## Invariantes validados mecanicamente

- **[INV] Fundamentação 10.1** — Agente não pode emitir operações de demissão, exclusão de dados ou suspensão de tenant. Validado por: Edge Function (HTTP 403) + trigger DB (RAISE EXCEPTION) + `kernel.is_invariant_operation()`.
- **[INV] Fundamentação 8.10** — Outbox atômico: dado e evento na mesma transação. Validado por: edge function usa adminClient + service_role para INSERT atômico; scp-worker usa FOR UPDATE SKIP LOCKED para garantia de exactly-once.
- **[INV] P4** — Multi-tenant por RLS: authenticated sem contexto → 0 rows. Validado por: todos os testes fail-closed.
- **[INV] ADR-0020** — Browser não escreve diretamente no outbox. Edge Function é a única via. Validado por: RLS policy: authenticated pode INSERT mas não SELECT no outbox; service_role (Edge Fn) é quem insere com envelope completo.

## Lacunas conhecidas e cronograma

| Lacuna                               | Impacto                            | Sprint   |
| ------------------------------------ | ---------------------------------- | -------- |
| Playwright E2E com browser real      | Alto (valida JWT + CORS + Edge Fn) | Sprint 8 |
| Teste de NATS consumer (audit_log)   | Médio                              | Sprint 8 |
| Load test do outbox (throughput)     | Baixo (SLO é Sprint 9+)            | Sprint 9 |
| Teste de reconexão NATS (scp-worker) | Médio                              | Sprint 8 |
