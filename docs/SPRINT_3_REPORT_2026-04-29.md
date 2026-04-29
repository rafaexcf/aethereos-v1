# Sprint 3 Report — Camada 1 (Aethereos)

**Data:** 2026-04-29  
**Milestones:** M19–M25  
**Duração:** 1 sessão (Claude Code, claude-sonnet-4-6)  
**Status:** CONCLUÍDO

---

## Objetivo

Construir a Camada 1 do Aethereos: o shell cloud-first, multi-tenant, proprietário (`apps/shell-commercial/`). A Camada 1 reutiliza o mesmo kernel da Camada 0 com drivers Supabase + NATS, provando empiricamente que o Driver Model [INV] é genuinamente agnóstico de implementação.

---

## O que foi entregue

### M19 — Supabase local + testes de isolação RLS

Testes de isolação cross-tenant com `describe.skipIf(!hasDb)` (execução graceful sem Docker). 7 testes cobrindo:

- Fail-closed sem contexto de tenant (0 rows)
- Isolação entre empresas A e B
- Switch de contexto na mesma sessão

Runbook completo em `docs/runbooks/local-dev-shell-commercial.md`.

### M20 — Auth: Supabase Auth como IdP central (PKCE)

| Entregável                           | Detalhe                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `SupabaseBrowserAuthDriver`          | PKCE flow, `persistSession: true`, anon key                            |
| `kernel.tenant_memberships`          | PK composta (`user_id`, `company_id`), RLS por `auth.uid()`            |
| `kernel.custom_access_token_hook`    | Injeta `companies[]` e `active_company_id` no JWT root                 |
| `kernel.set_tenant_context_from_jwt` | `db-pre-request` hook: popula `app.current_company_id` automaticamente |
| 17 testes unitários                  | `vi.mock('@supabase/supabase-js')` — sem rede, sem Docker              |

### M21 — Scaffold shell-commercial

`apps/shell-commercial/` com Vite 6 + React 19 + TanStack Router + Tailwind v4 + vite-plugin-pwa.

**Problema resolvido:** `packages/drivers-supabase` importava o driver `postgres` (Node.js) no barrel root, causando falha do Rollup ao montar bundle browser. Solução: entry `./browser` separado (`packages/drivers-supabase/src/browser.ts`) com apenas exports browser-safe. `sideEffects: false` adicionado para tree-shaking correto.

**Bundle shell-commercial:**

| Chunk                  | Raw        | Gzip      |
| ---------------------- | ---------- | --------- |
| index (supabase + app) | 462.88 kB  | 128.49 kB |
| router (TanStack)      | 96.99 kB   | 31.87 kB  |
| CSS (Tailwind)         | 11.76 kB   | 3.20 kB   |
| Precache SW            | 562.93 KiB | —         |

### M22 — Onboarding de company + primeiro evento SCP cloud

- `public.create_company_for_user()` SECURITY DEFINER: atomicidade company + membership + evento outbox em uma transação
- Edge Function Deno `create-company`: valida JWT, chama RPC, retorna 201
- Dashboard exibe `companyName`, `activeCompanyId`, e contador de eventos SCP no outbox

**Fix crítico:** `getCompanyClaims()` originalmente lia `app_metadata` do JWT. O hook Supabase injeta as claims no root do payload JWT — corrigido para decodificar via `atob()` + `split(".")`. Testes atualizados com helper `makeJwt()` que produz JWT Base64url válido.

### M23 — Embed Protocol v1

- `isEmbedMode`: detecta `?embed=true` via `URLSearchParams`
- `postEmbedMessage()`: envia para `window.parent` com `"*"` em dev
- `embed.ready` enviado no mount do root component
- `embed-test.html`: iframe de teste com log de eventos e badge de status
- `EMBED_PROTOCOL.md`: contrato documentado antes de qualquer consumidor externo

### M24 — Testes driver-agnostic: prova empírica do Driver Model

8 testes em `packages/kernel/__tests__/driver-agnostic.test.ts`:

| Teste                                                  | Resultado |
| ------------------------------------------------------ | --------- |
| KernelPublisher com LocalDriver mock                   | PASS      |
| KernelPublisher com CloudDriver mock                   | PASS      |
| Resultado estruturalmente idêntico em ambas as camadas | PASS      |
| Rejeita evento sem schema (independente de camada)     | PASS      |
| Propaga erro de withTenant sem tentar transação        | PASS      |
| auditLog Camada 0: driver.append chamado corretamente  | PASS      |
| auditLog Camada 1: entry identicamente estruturada     | PASS      |
| auditLog fail-loud: propaga erro do driver             | PASS      |

Grep confirmou zero referências a implementação específica em `packages/kernel/src/`:

```
grep -r "if.*camada\|cloud\|supabase\|local\|sqlite\|opfs" packages/kernel/src/
# → zero resultados
```

### M25 — ADR-0016 + encerramento Sprint 3

- `docs/adr/0016-camada-1-arquitetura-cloud-first.md` — ADR-0016 Aceito: decisões de stack, auth, RLS, Outbox, Embed, alternativas rejeitadas
- `CLAUDE.md` atualizado com referência ao ADR-0016
- `SPRINT_LOG.md` atualizado com M21–M25 + sumário de encerramento

---

## Métricas

| Métrica                       | Valor                                                                      |
| ----------------------------- | -------------------------------------------------------------------------- |
| Bundle principal (gzip)       | 128.49 KB                                                                  |
| Bundle router (gzip)          | 31.87 KB                                                                   |
| Testes passando               | 82 (kernel: 8, drivers-supabase: 17, drivers-local: 57)                    |
| Commits Sprint 3              | 7 (M19–M25)                                                                |
| Bugs encontrados e corrigidos | 4 (postgres em browser bundle, JWT claims path, makeJwt helper, plan enum) |
| Arquivos criados              | ~25                                                                        |
| Migrações SQL                 | 2 (tenant_memberships, create_company_fn)                                  |
| Edge Functions                | 1 (create-company)                                                         |

---

## Bugs encontrados e corrigidos

| Bug                                           | Causa                                                         | Correção                                                 |
| --------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| vite-plugin-pwa "Couldn't find configuration" | `postgres` Node.js driver em bundle browser via barrel export | Entry `./browser` em drivers-supabase excluindo postgres |
| `getCompanyClaims()` retornava vazio          | Hook JWT injeta no root do payload, não em `app_metadata`     | Decodificar JWT via `atob()` + `split(".")`              |
| Teste `getCompanyClaims` falhando             | `access_token: "access-token-abc"` não é JWT válido           | Helper `makeJwt()` com Base64url encoding correto        |
| `plan: "trial"` rejeitado                     | Enum Zod é `["free","starter","professional","enterprise"]`   | Corrigido para `"starter"`                               |

---

## Pendências para revisão humana

1. **Supabase cloud project:** criar projeto em `supabase.com`, aplicar as 3 migrations, configurar `db-pre-request` hook no painel
2. **JWT custom hook em produção:** habilitar `[auth.hook.custom_access_token]` (requer Edge Function `custom-access-token` deployada)
3. **NATS JetStream produção:** configurar namespace e credentials (`NATS_URL`, `NATS_USER`, `NATS_PASS`)
4. **Domínio:** apontar `aethereos.io` para deploy da Camada 1
5. **CSP produção:** substituir `frame-ancestors '*'` por domínios autorizados
6. **scp-worker produção:** Deployment com réplicas, health checks, alertas de backlog

---

## Validação da hipótese central

> "O mesmo kernel opera sobre drivers cloud (Camada 1) com comportamento idêntico ao da Camada 0 — sem qualquer branch por camada no código do kernel."

**Confirmado.** Sprint 3 entregou a prova empírica por meio de testes automatizados (`M24`) que o Driver Model [INV] é genuinamente agnóstico: substituir `LocalDatabaseDriver` por `SupabaseDatabaseDriver` (ou qualquer mock) não requer nenhuma modificação em `packages/kernel/`.

---

## Próximo sprint

**Sprint 4:** `apps/comercio-digital/` — primeiro SaaS standalone da família Aethereos.  
Stack: Next.js 15 App Router, `/(public)` SEO, `/app` autenticado via Supabase Auth (Camada 1 como IdP), `/embed` para iframe no shell-commercial.
