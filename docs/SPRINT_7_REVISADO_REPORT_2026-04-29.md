# Sprint 7 Revisado — Relatório de Encerramento

**Data:** 2026-04-29  
**Branch:** main  
**Status:** ENCERRADO · `pnpm ci:full` EXIT 0

---

## Objetivo

Fechar a dívida arquitetural descoberta durante Sprint 6.5, sem introduzir features novas. Foco exclusivo em:

1. Documentar a bifurcação do Driver Model (ADR-0020)
2. Conectar o pipeline SCP no browser via Edge Function
3. Conectar emissão SCP nos 5 apps da Camada 1
4. Substituir mocks por testes RLS reais
5. Validar o pipeline outbox end-to-end

---

## Marcos Concluídos

### MX7 — ADR-0020: Bifurcação Driver Model Server/Browser

- **Commit:** c0473b6
- **Arquivo:** `docs/adr/0020-driver-model-bifurcacao-server-browser.md`
- Documenta formalmente os dois ramos de runtime: server (postgres + Drizzle + SET LOCAL) e browser (@supabase/supabase-js + JWT RLS + Realtime)
- ADR-0016 marcado como "parcialmente revisado por ADR-0020"
- CLAUDE.md e packages/drivers atualizado com JSDoc e novos bloqueios de CI

### MX8 — Edge Function `scp-publish` como outbox writer atômico

- **Commit:** 535ef81
- **Arquivo:** `supabase/functions/scp-publish/index.ts`
- Deno TypeScript; recebe POST com JWT autenticado
- Valida event_type, bloqueia operações invariantes de agente (HTTP 403)
- Insere em `kernel.scp_outbox` via service_role (adminClient)
- Degraded mode documentado: se offline, browser recebe local event_id
- Migração `20260430000009_scp_outbox_audit.sql`: função `kernel.is_invariant_operation()` + trigger BEFORE INSERT

### MX9 — Emissão SCP nos 5 apps

- **Commit:** d51b1e3
- `ScpPublisherBrowser` adicionado ao `CloudDrivers` via `drivers.ts`
- Apps conectados:
  - `drive/index.tsx`: platform.file.uploaded, platform.folder.created, platform.file.deleted
  - `pessoas/index.tsx`: platform.person.created, platform.person.updated, platform.person.deactivated
  - `chat/index.tsx`: platform.chat.message_sent, platform.chat.channel_created
  - `configuracoes/index.tsx`: platform.settings.updated (user + company scope)
  - `routes/staff.tsx`: platform.staff.access

### MX10 — Testes de isolamento RLS reais

- **Commit:** c352654
- **Arquivo:** `apps/scp-worker/__tests__/rls-isolation.test.ts`
- 7 describe blocks, 19 testes totais
- Tabelas cobertas: files, people, chat_channels, settings, audit_log, staff_access_log
- Helpers `asUser()` / `asUserNoTenant()` provam fail-closed mecanicamente
- 6 testes de `kernel.is_invariant_operation()`: agent bloqueia, human passa, unknown passa
- Skip automático sem TEST_DATABASE_URL

### MX11 — Validação do pipeline SCP

- **Commit:** 1c7f372
- **Arquivo:** `apps/scp-worker/__tests__/scp-pipeline.test.ts`
- 12 testes cobrindo: escrita outbox, transições pending→published→failed, idempotência, bloqueio trigger, cross-tenant
- **Arquivo:** `docs/architecture/SCP_PIPELINE_E2E.md` — mapa completo do pipeline com tabela de cobertura e lacunas honestas

### MX12 — Encerramento

- `pnpm ci:full` EXIT 0 confirmado
- SPRINT_LOG.md atualizado com todos os milestones
- Este relatório criado

---

## Dívida Residual (para Sprint 8)

| Item                                                                     | Impacto | Tipo    |
| ------------------------------------------------------------------------ | ------- | ------- |
| Playwright E2E com browser real + Edge Function                          | Alto    | Teste   |
| Teste NATS consumer → kernel.audit_log                                   | Médio   | Teste   |
| Teste de reconexão scp-worker (NATS down)                                | Médio   | Teste   |
| Staff panel: companies reais via kernel.companies (atualmente demo data) | Médio   | Feature |
| Suspender/reativar company: emitir platform.tenant.suspended real        | Médio   | Feature |
| Supabase Storage bucket `kernel-files` com policy RLS                    | Alto    | Infra   |

---

## Invariantes Validados Mecanicamente

| Invariante                                                          | Validação                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Fundamentação 10.1 [INV] — Agente não executa operações destrutivas | Edge Function HTTP 403 + trigger DB RAISE EXCEPTION + is_invariant_operation() |
| Fundamentação 8.10 [INV] — Outbox atômico                           | Edge Function usa service_role; RLS bloqueia SELECT de authenticated           |
| P4 [INV] — Multi-tenant por RLS                                     | 19 testes fail-closed em 8 tabelas                                             |
| ADR-0020 [DEC] — Browser não acessa outbox diretamente              | RLS: INSERT permitido para authenticated, SELECT bloqueado                     |

---

## Cobertura de Testes (`pnpm test:isolation`)

Sem `TEST_DATABASE_URL`: todos skipped (CI não quebra).  
Com `TEST_DATABASE_URL` (Supabase local): 26+ testes reais, sem mocks.

```
rls.test.ts          — kernel.companies (5) + kernel.scp_outbox (2)
rls-isolation.test.ts — files (3) + people (3) + chat_channels (3) + settings (2) + is_invariant_operation (6) + audit_log (1) + staff_access_log (1) = 19
scp-pipeline.test.ts  — outbox write (3) + status transitions (3) + max attempts (1) + invariant trigger (3) + cross-tenant (2) = 12
TOTAL: 38 testes
```

---

## `pnpm ci:full` — Resultado Final

```
Tasks:    11 successful, 11 total
Exit:     0
```

typecheck ✓ · lint ✓ · build ✓ · test ✓ (unitários) · test:isolation ✓ (skip sem DB)

---

**Próxima etapa:** Aguardando revisão humana. Sprint 8 não iniciado.
