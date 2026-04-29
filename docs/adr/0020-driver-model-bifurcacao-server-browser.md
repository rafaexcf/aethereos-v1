# ADR-0020 — Driver Model: bifurcação server/browser

**Status:** Aceito
**Data:** 2026-04-29
**Autores:** Equipe Aethereos + Claude Sonnet 4.6 (assistido)
**Subordinado a:** ADR-0001, ADR-0014, ADR-0015, ADR-0016

---

## Contexto

O Sprint 3 declarou o Driver Model "empiricamente validado contra Local + Cloud" (M24,
`DRIVER_MODEL_VALIDATION.md`). A validação foi feita com mocks rotulados "local" e "cloud"
— nenhum driver cloud real foi testado em dois contextos de execução distintos.

O Sprint 6.5 / MX1 expôs a bifurcação real: `SupabaseDatabaseDriver`
(`packages/drivers-supabase/src/database/`) usa `import postgres from "postgres"` — pg client
nativo Node.js. A `shell-commercial` é uma **Vite SPA que roda no browser**. Importar o driver
Node.js no browser produz erro fatal de runtime (`Buffer is not defined`, módulo `net`, etc.).

O Sprint 6.5 / MX2 criou `SupabaseBrowserDataDriver` para resolver o sintoma imediato. Esta ADR
formaliza a bifurcação, declara suas regras e documenta por que a decisão é correta.

### Por que a bifurcação é inevitável

1. **PostgreSQL não é acessível diretamente do browser** em produção (firewall, TLS, sem support
   ao protocolo binário pg via TCP a partir de WebSocket ou Fetch).
2. **Node.js `postgres`/Drizzle exigem APIs que não existem no browser** (`net`, `Buffer`,
   `crypto` nativo, etc.).
3. **Supabase PostgREST** (`@supabase/supabase-js`) é o proxy HTTP que expõe o banco para
   clientes browser de forma segura, com RLS enforçado via JWT.
4. **Transações atômicas browser↔PostgreSQL são impossíveis**: `@supabase/supabase-js` não
   expõe `BEGIN`/`COMMIT`; qualquer transação real exige código server-side.

---

## Decisão

O Driver Model tem **dois ramos paralelos por contexto de execução**. Ambos implementam
a interface canônica `DatabaseDriver` (`packages/drivers/src/interfaces/database.ts`) mas com
**capabilities diferentes**:

### Ramo Server (Node.js)

- **Implementação:** `SupabaseDatabaseDriver` em `packages/drivers-supabase/src/database/`
- **Runtime:** Node.js 20+, Edge Functions (Deno), `apps/scp-worker`, Server Actions Next.js
- **Mecanismo:** `postgres` npm package + Drizzle ORM + `SET LOCAL app.current_company_id`
- **Capabilities:**
  - `transaction()` real com atomicidade PostgreSQL
  - `withTenant()` via `SET LOCAL` — RLS enforçado no nível de sessão
  - Escrita direta em `kernel.scp_outbox` (possui permissão `service_role`)
  - Acesso a tabelas restritas (ex: `kernel.companies` sem filtro por `company_id`)

### Ramo Browser

- **Implementação:** `SupabaseBrowserDataDriver` em `packages/drivers-supabase/src/data/`
- **Runtime:** Browser (Vite SPA), `apps/shell-base`, `apps/shell-commercial`
- **Mecanismo:** `@supabase/supabase-js` com anon key + JWT do usuário logado
- **Capabilities:**
  - `withTenant()` armazena contexto local — RLS enforçado via JWT (não via `SET LOCAL`)
  - Realtime via `subscribeToTable()` (Supabase Realtime WebSocket)
  - **NÃO** tem `transaction()` real — operações atômicas exigem Edge Function server-side
  - **NÃO** pode escrever em `kernel.scp_outbox` diretamente (RLS bloqueia `authenticated` users)
  - **NÃO** pode acessar tabelas sem filtro por `company_id` (exceto via RLS + staff claim)

### Regra de emissão SCP do browser

Operações de escrita que exigem outbox SCP são feitas via **Supabase Edge Functions** que:

1. Recebem POST HTTP com JWT do usuário no header `Authorization`
2. Verificam JWT e extraem `user_id`, `company_id`
3. Abrem transação com `service_role` client
4. Executam escrita de domínio + INSERT em `kernel.scp_outbox` na mesma transação
5. Retornam `{ event_id, correlation_id }` para o browser

Código de Edge Functions: `supabase/functions/<nome>/index.ts` (TypeScript Deno).

### Mapeamento por camada e contexto

| Contexto de execução       | Driver                      | Transação atômica | Outbox direto | Realtime |
| -------------------------- | --------------------------- | :---------------: | :-----------: | :------: |
| Browser — Camada 0         | `LocalDatabaseDriver` (IDB) |   ✗ (eventual)    |       ✗       |    ✗     |
| Browser — Camada 1         | `SupabaseBrowserDataDriver` |         ✗         |       ✗       |    ✓     |
| Node.js — scp-worker       | `SupabaseDatabaseDriver`    |         ✓         |       ✓       |    ✗     |
| Node.js — Server Actions   | `SupabaseDatabaseDriver`    |         ✓         |       ✓       |    ✗     |
| Deno — Edge Functions      | `SupabaseDatabaseDriver`\*  |         ✓         |       ✓       |    ✗     |
| Node.js — comercio.digital | `SupabaseDatabaseDriver`    |         ✓         |       ✓       |    ✗     |

\*Edge Functions usam `@supabase/supabase-js` com `service_role` key — comportamento equivalente
ao `SupabaseDatabaseDriver` para fins de outbox, mas sem Drizzle ORM (queries via PostgREST).

---

## Alternativas rejeitadas

### A1 — Forçar tudo em SSR (Next.js universal)

Tornar `shell-commercial` um app Next.js para reusar `SupabaseDatabaseDriver` em Server
Components.

**Rejeitado:** Viola ADR-0014 [INV] e ADR-0016 — shells são Vite PWA por design. SSR
introduz tempo de hidratação, requer servidor sempre-on, e quebra o modelo local-first da
Camada 0. O custo de manutenção de dois paradigmas (Vite + Next.js) no monorepo é alto.

### A2 — Conectar PostgreSQL direto do browser via WebSocket

Usar `@electric-sql/pglite` ou proxy WebSocket para expor protocolo PostgreSQL no browser.

**Rejeitado:** PGlite roda um banco SQLite in-memory (não o Supabase Postgres). Proxy
WebSocket expõe o banco a ataques CSRF, força port-forwarding em produção e viola modelo
de segurança do Supabase. Não escala para multi-tenant.

### A3 — Driver único isomórfico com polyfills

Criar um driver único que detecta o ambiente e usa `postgres` em Node.js e `@supabase/supabase-js`
no browser via `if (typeof window !== 'undefined')`.

**Rejeitado:** Duplica complexidade sem ganho. Cada branch precisa ser testada separadamente
de qualquer forma. Imports condicionais de módulos Node.js quebram o bundle Vite mesmo com
tree-shaking (o analisador estático detecta o import). Melhor separação explícita.

---

## Consequências

### Positivas

- **Clareza:** cada ramo tem responsabilidades bem definidas; não há ambiguidade sobre qual driver
  usar onde.
- **Deploy independente:** browser e server evoluem em ritmos diferentes sem acoplamento.
- **Segurança:** surface de ataque do ramo browser é limitada ao que o RLS permite via JWT.
- **Testabilidade:** cada ramo pode ser testado com ferramentas apropriadas (vitest no browser,
  node:test ou vitest/node no server).

### Negativas / trade-offs

- **Duas implementações a manter:** mudanças na interface `DatabaseDriver` precisam ser
  propagadas para ambos os ramos.
- **Edge Functions como ponte obrigatória:** toda escrita que exige atomicidade domínio+outbox
  no browser requer uma Edge Function dedicada — overhead de deploy e latência de rede.
- **Testes de integração mais complexos:** cada feature de escrita tem dois caminhos a testar
  (browser via Edge Function + server via driver direto).
- **`correlation_id` deve ser propagado explicitamente** no body do POST para Edge Functions
  (não há propagação automática de contexto OTel cross-process via HTTP sem instrumentação).

---

## Regras operacionais

Estas regras são verificáveis em CI e devem ser adicionadas ao `CLAUDE.md`:

1. Apps que rodam **no browser** (`apps/shell-base/`, `apps/shell-commercial/`) usam apenas
   `SupabaseBrowserDataDriver` (entry `@aethereos/drivers-supabase/browser`). Nunca importam
   `SupabaseDatabaseDriver` ou `postgres` diretamente.
2. Apps **server-side** (`apps/scp-worker/`, `apps/comercio-digital/`, Edge Functions) usam
   `SupabaseDatabaseDriver` (entry padrão `@aethereos/drivers-supabase`). Nunca importam
   `@supabase/supabase-js` em código de domínio (apenas dentro de `packages/drivers-supabase/`).
3. Toda escrita no browser que gera evento SCP **deve** passar por Edge Function — nunca
   emitir diretamente via `KernelPublisher` no browser (requer Node.js + NATS).
4. `correlation_id` deve ser enviado explicitamente no body do POST para Edge Functions.
5. Edge Functions **nunca** expõem `SUPABASE_SERVICE_ROLE_KEY` em responses — apenas `event_id`
   e `correlation_id` retornam ao browser.

---

## Referências

- `packages/drivers/src/interfaces/database.ts` — interface canônica `DatabaseDriver`
- `packages/drivers-supabase/src/database/` — ramo server
- `packages/drivers-supabase/src/data/supabase-browser-data-driver.ts` — ramo browser
- `packages/kernel/src/scp/publisher.ts` — `KernelPublisher` (server-only)
- `supabase/functions/` — Edge Functions (caminho de emissão SCP do browser)
- ADR-0016 — Camada 1 arquitetura cloud-first (parcialmente revisada por esta ADR)
- Sprint 6.5 Auditoria — `docs/SPRINT_6_5_AUDITORIA.md` (motivação desta ADR)
