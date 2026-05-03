# ADR-0028 — Magic Store: relaxar CHECK enum de `kernel.company_modules`

**Status:** Proposto
**Data:** 2026-05-03
**Sprint:** 12 — Continuidade de OS (Magic Store catálogo aberto)
**Subordinado a:** ADR-0014, ADR-0016, ADR-0017, ADR-0024
**Rigidez:** [DEC]

---

## Contexto

`kernel.company_modules` (migração `20260430000025_company_modules.sql`) foi criada com CHECK enum fechada para ~10 módulos verticais conhecidos:

```sql
CHECK (module IN ('commerce-digital', 'logitix', 'kwix', 'autergon', ...))
```

Essa restrição era apropriada quando o conjunto de "módulos instaláveis" era exatamente as verticais Camada 2 conhecidas pelo CLAUDE.md. ADR-0024 redefiniu Magic Store como **launcher** que lista também módulos opcionais Camada 1 e atalhos para web apps externos (AI weblinks, jogos, Puter, productivity apps).

O Sprint 12 ampliou o catálogo para 27+ entries em `apps/shell-commercial/src/data/magic-store-catalog.ts`. A maioria desses IDs (`weblink-claude`, `weblink-chatgpt`, `puter`, `game-2048`, etc.) não são verticais B2B — são entradas heterogêneas do launcher. O CHECK enum bloqueia o INSERT desses IDs.

Além disso, RLS original era SELECT-only — Magic Store precisa fazer INSERT/DELETE para "instalar/desinstalar" módulos, escopado por `company_id`.

---

## Decisão

Substituir o CHECK enum estrito por um **format check** regex e expandir RLS:

### Migração

`supabase/migrations/20260503000007_kernel_company_modules_catalog.sql`:

1. `DROP CONSTRAINT company_modules_module_check` (a CHECK enum antiga).
2. `ADD CONSTRAINT company_modules_module_format_check CHECK (module ~ '^[a-z0-9][a-z0-9_-]{0,63}$')`.
3. Adiciona policies de **INSERT, UPDATE, DELETE** em `kernel.company_modules` para `authenticated` filtradas por `company_id = current_company_id` + permissão de admin.
4. Cria índice `(company_id, module)` para queries de "está instalado?".

### Catálogo passa a ser source-of-truth no client

`apps/shell-commercial/src/data/magic-store-catalog.ts` é um JSON estático versionado em git. Magic Store renderiza apenas itens do catálogo; a tabela só guarda referência ao `module ID`. Se um ID estiver na tabela mas não no catálogo (ex: módulo descontinuado), Magic Store ignora silenciosamente — sem quebra.

### App e hook

- App: `apps/shell-commercial/src/apps/magic-store/MagicStoreApp.tsx`
- Hook: `apps/shell-commercial/src/apps/magic-store/useInstalledModules.ts`

---

## Alternativas rejeitadas

### A1 — Manter CHECK enum e expandir manualmente a cada novo módulo

**Rejeitado:** cada nova entrada do catálogo exigiria migração SQL. Catálogo cresce semanalmente — fricção desproporcional. Viola P3 (configuração supera código).

### A2 — Tabela separada `kernel.module_catalog` com FK

Criar tabela de catálogo no banco, e `company_modules.module` vira FK.

**Rejeitado por ora:** o catálogo é estático e versionado em git (parte da release do shell). Tabela duplicaria isso e exigiria seed migration a cada release. Reconsiderar quando o catálogo virar dinâmico (ex: marketplace com módulos de terceiros submetendo entries).

### A3 — Sem CHECK algum (apenas TEXT livre)

**Rejeitado:** sem regex, abre porta para IDs com whitespace, caracteres unicode, length absurda. Format check é o mínimo de sanidade.

### A4 — Reverter Magic Store para listar só verticais Camada 2

**Rejeitado:** contraria ADR-0024 (Magic Store como launcher heterogêneo) e a UX desejada (lista única de "apps que dá para usar no OS" incluindo links externos).

---

## Consequências

### Positivas

- Catálogo cresce sem migração SQL.
- Magic Store funcional com 27+ entries.
- RLS completa (CRUD por empresa) — antes era SELECT-only.

### Negativas / trade-offs

- **Perda da safety do enum** — typo no `module` ID (ex: `'weblink-claudee'`) passa pelo banco. Mitigado por:
  - Catálogo em TypeScript com tipo `ModuleId = (typeof CATALOG)[number]['id']` no client.
  - Magic Store só insere via `useInstalledModules.install(catalogEntry)` que aceita objeto do catálogo, não string livre.
  - Format check regex bloqueia ao menos lixo sintático.
- IDs órfãos podem se acumular (módulo do catálogo é removido em release nova, mas linhas antigas permanecem). Aceitável: ignorar silenciosamente custa zero, garbage collection futura possível via job manual.

---

## Regras operacionais

1. INSERT em `kernel.company_modules` **sempre** parte de uma entry do catálogo TypeScript — nunca string mágica em código.
2. Adicionar nova entry no catálogo é mudança de código (PR), não escrita direta no banco.
3. Nova categoria de entrada (ex: "skin theme", "icon pack") exige decisão de produto sobre se entra no mesmo catálogo ou em tabela separada — não estender `module` para categorias semanticamente distintas.
4. CI deve manter alerta se aparecer query `INSERT INTO kernel.company_modules` fora de `useInstalledModules`.

---

## Referências

- Migração nova: `supabase/migrations/20260503000007_kernel_company_modules_catalog.sql`
- Migração original: `supabase/migrations/20260430000025_company_modules.sql`
- Catálogo: `apps/shell-commercial/src/data/magic-store-catalog.ts`
- App: `apps/shell-commercial/src/apps/magic-store/MagicStoreApp.tsx`
- Hook: `apps/shell-commercial/src/apps/magic-store/useInstalledModules.ts`
- ADR-0017 — comercio.digital primeiro SaaS standalone (define Camada 2)
- ADR-0024 — Camada 1 pura vs Camada 2 vertical (define Magic Store como launcher)
