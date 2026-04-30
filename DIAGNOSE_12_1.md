# DIAGNOSE_12_1.md — Sprint Cirúrgico 12.1

Gerado em sessão de diagnóstico.

---

## Sumário executivo

Todos os 7 apps que não renderizavam (Drive, Pessoas, Chat, Settings, RH, Magic Store, Governança) compartilham o import de `AppShell` de `@aethereos/ui-shell`. A raiz da falha em cascata era `packages/ui-shell/src/index.ts` exportando com extensão `.js` em contexto de source file com alias Vite.

---

## Bugs confirmados

### BUG-1 — ui-shell com imports .js (CAUSA RAIZ da tela em branco)

**Arquivo:** `packages/ui-shell/src/index.ts` e sub-módulos  
**Sintoma:** Todos os apps que importam `AppShell` de `@aethereos/ui-shell` renderizavam tela vazia. Copilot (único que não usa ui-shell) funcionava.  
**Causa:** `vite.config.ts` tem alias `@aethereos/ui-shell → packages/ui-shell/src/index.ts`. Vite processa os source files e encontra `from "./components/app-shell/index.js"`. Ao tentar resolver esse módulo em modo dev ESM, falha silenciosamente.  
**Fix:** Remover extensão `.js` de todos os imports relativos em `packages/ui-shell/src/`.  
**Status:** ✅ APLICADO (working tree, não commitado)  
**Arquivos corrigidos:** `src/index.ts`, `src/hooks/index.ts`, `src/hooks/use-theme.ts`, `src/primitives/index.ts`, `src/theme/theming.ts`

---

### BUG-2 — vite.config.ts com alias inválido `@aethereos/db-types`

**Arquivo:** `apps/shell-commercial/vite.config.ts`  
**Sintoma:** Alias aponta para `packages/db-types/src/index.ts` que NÃO EXISTE.  
**Causa:** Alias foi adicionado incorretamente durante debug. Nenhum código importa `@aethereos/db-types`, então é dead code mas potencialmente causa warning de path inválido.  
**Fix:** Remover esse alias do vite.config.ts.  
**Status:** A APLICAR (FIX-2)

---

### BUG-3 — scp-registry com imports .js (alias Vite → source)

**Arquivo:** `packages/scp-registry/src/` (múltiplos arquivos)  
**Sintoma:** Mesmo padrão do BUG-1. Vite resolve `@aethereos/scp-registry` via alias para source. Source tem imports `.js`.  
**Causa:** Arquivos afetados: `src/index.ts` (11 imports .js), `src/registry.ts` (4), `src/helpers.ts` (3), `src/schemas/envelope.ts` (1).  
**Fix:** Remover extensão `.js` de todos os imports relativos em `packages/scp-registry/src/`.  
**Status:** A APLICAR (FIX-3)

---

### BUG-4 — drivers-litellm com imports .js (package.json → source)

**Arquivo:** `packages/drivers-litellm/src/index.ts`  
**Sintoma:** `package.json` de drivers-litellm exporta via `./src/index.ts` (sem dist). Vite carrega source e encontra `from "./litellm-driver.js"`.  
**Causa:** Sem dist/ e sem Vite alias, o node_modules resolve direto para source via `"import": "./src/index.ts"`.  
**Fix:** Remover extensão `.js` de `src/index.ts`.  
**Status:** A APLICAR (FIX-4)

---

### BUG-5 — RH hooks usam `.eq("deleted_at", null)` em vez de `.is("deleted_at", null)`

**Arquivos:** `apps/shell-commercial/src/apps/rh/hooks/useEmployees.ts` (linhas 27, 73)  
**Sintoma:** Console mostra `employees?select=*&deleted_at=eq.null 400 Bad Request`.  
**Causa:** Supabase PostgREST espera `deleted_at=is.null` para verificação de NULL. `.eq(col, null)` gera `col=eq.null` que PostgREST trata como comparação de string → erro de tipo em coluna timestamp → HTTP 400.  
**Fix:** Mudar `.eq("deleted_at", null)` → `.is("deleted_at", null)` nos dois pontos.  
**Status:** A APLICAR (FIX-5)  
**NOTA:** `SupabaseBrowserDataDriver.from()` já aplica `.schema("kernel")` internamente (linha 60 do driver). Os grants `kernel.employees → authenticated` estão corretos (104 tabelas, SELECT/INSERT/UPDATE/DELETE). O 400 NÃO é de permissão — é de sintaxe PostgREST.

---

## Bugs descartados

### Grants kernel para authenticated

Schema USAGE: `authenticated = true` ✅  
Table grants em todas as 26 tabelas kernel: `authenticated` tem CRUD completo ✅  
→ **NÃO É BUG**

### Schema errado nas queries do RH

O `SupabaseBrowserDataDriver.from(table)` já aplica `(client as any).schema("kernel").from(table)` ✅  
→ **NÃO É BUG** (o driver trata isso)

### drivers-supabase/browser sem dist

`packages/drivers-supabase/dist/browser.js` EXISTE ✅  
Package.json exports `./browser → dist/browser.js` ✅  
→ **NÃO É BUG**

### drivers, kernel sem alias no Vite

Ambos têm `dist/index.js` e package.json com exports apontando para `dist/` ✅  
→ **NÃO É BUG** — Vite usa dist via node_modules

---

## Pacotes com .js imports mas que NÃO precisam de fix para browser

Os seguintes pacotes têm `.js` nos imports fonte, mas são resolvidos via dist/ (compilado):

- `packages/drivers/` — dist/index.js existe ✅
- `packages/drivers-supabase/` — dist/index.js e dist/browser.js existem ✅
- `packages/kernel/` — dist/index.js existe ✅
- `packages/observability/` — não importado pelo shell-commercial browser
- `packages/drivers-nats/`, `drivers-langfuse/`, `drivers-unleash/` — server-only

---

## Dívidas técnicas (não corrigir neste sprint)

- **Multiple GoTrueClient instances**: Warning amarelo no console. Múltiplas chamadas a `createClient()`. Não crítico. Registrado em KNOWN_LIMITATIONS.
- **Vite alias @aethereos/scp-registry**: Aponta para source mas dist existe. Remover alias seria mais limpo, mas requer rebuild do dist para garantir atualidade. Deixar como está — funciona com .js fix aplicado.

---

## Ordem de aplicação dos fixes

1. FIX-1: Commit das mudanças ui-shell já em working tree
2. FIX-2: Remover alias db-types do vite.config.ts + commit
3. FIX-3: Remover .js imports do scp-registry/src/ + commit
4. FIX-4: Remover .js imports do drivers-litellm/src/index.ts + commit
5. FIX-5: Corrigir .eq → .is em useEmployees.ts + commit

Após todos os fixes: restart Vite + gates triplos.
