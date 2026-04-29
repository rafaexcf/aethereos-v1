# ADR-0016 — Arquitetura da Camada 1: Cloud-First com Simetria de Stack

**Status:** Aceito  
**Data:** 2026-04-29  
**Autores:** Equipe Aethereos + Claude Sonnet 4.6 (assistido)  
**Subordinado a:** ADR-0001, ADR-0014, ADR-0015

---

## Contexto

A Camada 0 (`apps/shell-base`) foi entregue no Sprint 2: Vite 6, React 19, TanStack Router, Zustand, Tailwind v4, Driver Model com implementações locais (SQLite WASM, OPFS, BroadcastChannel, LocalAuth).

A Camada 1 (`apps/shell-commercial`) é a versão proprietária, multi-tenant, cloud-first. Ela deve:

1. Reusar o mesmo kernel (`packages/kernel`) sem modificação
2. Substituir os drivers locais por implementações cloud (Supabase, NATS)
3. Adicionar fluxos que exigem backend: auth federado, RLS por company, eventos SCP persistidos
4. Manter simetria de stack para facilitar manutenção e desenvolvimento com IA

A decisão central: **a Camada 1 não é um fork da Camada 0 — é o mesmo kernel com drivers diferentes**.

---

## Decisão

### 1. Stack simétrica: mesma base, diferentes drivers

| Camada | App                | Runtime                             | Auth Driver                 | DB Driver                           | Event Driver                     |
| ------ | ------------------ | ----------------------------------- | --------------------------- | ----------------------------------- | -------------------------------- |
| 0      | `shell-base`       | Vite 6 + React 19 + TanStack Router | `LocalAuthDriver`           | `LocalDatabaseDriver` (SQLite WASM) | `BroadcastChannelEventBusDriver` |
| 1      | `shell-commercial` | Vite 6 + React 19 + TanStack Router | `SupabaseBrowserAuthDriver` | `SupabaseDatabaseDriver`            | `NatsEventBusDriver`             |

O kernel, SCP registry, UI shell e permissões são **idênticos** em ambas as camadas.

### 2. Supabase Auth como IdP central (OAuth 2.1 + OIDC + PKCE)

- Anon key no browser (PKCE flow, persistSession)
- Custom access token hook injeta `companies[]` e `active_company_id` em cada JWT
- `db-pre-request` hook (`kernel.set_tenant_context_from_jwt`) popula `app.current_company_id` automaticamente em todo request PostgREST
- Sem Clerk, sem Auth0, sem Keycloak na Camada 1 (reservado para federação enterprise F3+)

### 3. Multi-tenancy via RLS por `company_id`

- `kernel.tenant_memberships`: um user pode ser owner/admin/member de N empresas
- Todas as tabelas de domínio têm `company_id NOT NULL` e política RLS fail-closed
- `kernel.current_company_id()` retorna NULL sem contexto → 0 linhas (seguro por padrão)
- Criação de empresa: Edge Function `create-company` chama `public.create_company_for_user()` — função SECURITY DEFINER que garante atomicidade company + membership + evento outbox

### 4. Outbox Pattern desde o dia 1

- `kernel.scp_outbox`: tabela de outbox com `status = 'pending'` → `scp-worker` publica para NATS JetStream
- Edge Functions e código de domínio inserem no outbox dentro da mesma transação
- Zero risco de evento perdido se NATS ficar indisponível

### 5. Embed Protocol v1

- `?embed=true` ativa modo sem header/dock
- `postMessage({ type: 'embed.ready', version: '1' })` para o host
- CSP `frame-ancestors` configurável por ambiente
- Protocolo documentado em `docs/architecture/EMBED_PROTOCOL.md`

---

## Consequências

**Positivas:**

- Mesmos testes unitários do kernel cobrem Camada 0 e Camada 1 (provado em M24)
- Desenvolvedores conhecem apenas um padrão de stack (Vite + React + TanStack)
- RLS fail-closed elimina classe de bugs de vazamento de dados cross-tenant
- Outbox garante idempotência de eventos mesmo em falhas de rede

**Negativas / Trade-offs:**

- Latência de UI depende de Supabase Auth (token refresh, JWT expiry 900s)
- Edge Functions Deno são um runtime diferente de Node.js (curva de aprendizado)
- O browser bundle inclui `@supabase/supabase-js` (~350 KB raw), mas comprime bem (128 KB gzip)

**Riscos residuais:**

- `getCompanyClaims()` decodifica JWT no browser (sem verificação de assinatura) — aceitável porque o backend sempre verifica via Supabase Auth antes de executar qualquer operação
- O `db-pre-request` hook exige que o PostgREST local tenha `ALTER ROLE authenticator` configurado — documentado no runbook

---

## Alternativas Rejeitadas

### Next.js App Router para shell-commercial

Rejeitado porque:

- Quebraria a simetria de stack entre Camada 0 e Camada 1
- SSR não é necessário para um OS de browser (nenhum benefício SEO)
- CLAUDE.md bloqueia `next` em `apps/shell-*` [INV]

### Múltiplas instâncias por tenant (sub-domínios)

Rejeitado porque:

- Complexidade operacional muito maior (DNS, certificados, deploy por tenant)
- RLS é suficiente para isolamento multi-tenant no nível de banco
- Arquitetura de sub-domínios reservada para Camada 2 (verticais)

### Prisma ORM

Rejeitado (bloqueado): Drizzle é a decisão cravada [INV] em ADR-0014.

### Injeção de context.company_id via header HTTP (sem JWT claims hook)

Rejeitado porque:

- O browser não deve ser a fonte autoritativa do company_id — deve vir do IdP
- JWT claims hook garante que o servidor valida o contexto antes de qualquer query

---

## Mapeamento Simétrico Camada 0 ↔ Camada 1

```
packages/kernel/         ← MESMO código (zero if(camada) — provado em M24)
packages/drivers/        ← MESMAS interfaces
packages/scp-registry/   ← MESMO registro
packages/ui-shell/       ← MESMOS componentes

apps/shell-base/         ← Camada 0: LocalDriver*
  └── drivers-local/     ←   SQLite WASM, OPFS, BroadcastChannel, LocalAuth

apps/shell-commercial/   ← Camada 1: SupabaseDriver*
  └── drivers-supabase/  ←   Supabase Auth, Postgres, Storage, pgvector
```

---

## Referências

- [ADR-0014 — Stack definitiva e Driver Model](0014-resolucao-stack-vs-analise-externa.md)
- [ADR-0015 — Camada 0 arquitetura local-first](0015-camada-0-arquitetura-local-first.md)
- [DRIVER_MODEL_VALIDATION.md](../architecture/DRIVER_MODEL_VALIDATION.md) — prova empírica M24
- [EMBED_PROTOCOL.md](../architecture/EMBED_PROTOCOL.md) — protocolo embed M23
- [Fundamentação v4.3](../AETHEREOS_FUNDAMENTACAO_v4_3.md) — P1, P4, P5, P11
