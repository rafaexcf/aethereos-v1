# FIX — Apps falhando com "Failed to fetch dynamically imported module"

## Problema

Todos os apps nativos falham ao abrir com erro:
Failed to fetch dynamically imported module: http://127.0.0.1:5174/src/apps/bloco-de-notas/index.tsx

Isso acontece para TODOS os apps, nao apenas bloco-de-notas.

## Diagnostico ja feito

1. Os arquivos existem em apps/shell-commercial/src/apps/\*/index.tsx
2. Os exports nomeados BATEM com o que COMPONENT_MAP espera (ex: BlocoDeNotasApp, CalculadoraApp, etc.)
3. COMPONENT_MAP e APP_REGISTRY parecem DUPLICADOS no registry.ts (ambos tem React.lazy imports)
4. Vite dev server esta rodando em http://127.0.0.1:5174

## Causas provaveis

1. APP_REGISTRY (array antigo) e COMPONENT_MAP (novo) coexistem com React.lazy imports duplicados para os mesmos modulos — pode causar conflito no Vite module graph
2. APP_REGISTRY deveria ter sido reduzido ou removido no Sprint 21, mas pode ter ficado com imports ativos
3. Vite HMR pode estar com cache stale — tentar restart primeiro

## Acoes — em ordem

### Acao 1 — Restart Vite e testar

Kill o processo Vite, limpar cache, reiniciar:
rm -rf apps/shell-commercial/node_modules/.vite
pnpm --filter shell-commercial dev

Se funcionar: o problema era cache stale, nao precisa de fix no codigo.

### Acao 2 — Verificar duplicacao no registry.ts

Abrir apps/shell-commercial/src/apps/registry.ts e verificar:

- COMPONENT_MAP tem imports React.lazy para todos os apps
- APP_REGISTRY (abaixo) TAMBEM tem imports React.lazy para os mesmos apps?
- Se sim: APP_REGISTRY deve usar makePlaceholder() ou referenciar COMPONENT_MAP, NAO duplicar imports

Fix: APP_REGISTRY deve ter component: COMPONENT_MAP[id] ?? makePlaceholder(name)
Isso elimina imports duplicados.

### Acao 3 — Verificar como AppFrame resolve o componente

Se o Sprint 21 MX114 (appRegistryStore) mudou como apps sao renderizados, verificar:

- AppFrame.tsx: como decide qual component renderizar?
- Usa appRegistryStore.getApp(id).component? Ou ainda usa APP_REGISTRY direto?
- Se usa o store: o store esta populando component corretamente do COMPONENT_MAP?
- Se nao esta: o merge entre DB metadata e COMPONENT_MAP pode estar quebrado

### Acao 4 — Verificar o merge no appRegistryStore

O store deve fazer:

1. Carregar metadata do banco (kernel.app_registry)
2. Para cada app: verificar se COMPONENT_MAP[app.id] existe
3. Se existe: app.component = COMPONENT_MAP[app.id]
4. Se nao existe e entry_mode=iframe: app.component = IframeAppFrame
5. Se nao existe e entry_mode=weblink: app.component = null (abre em nova aba)

Se o merge nao esta acontecendo ou esta usando undefined como component, o React.lazy vai falhar.

### Acao 5 — Se nada funcionar

Reverter Sprint 21 completo:
git revert --no-commit HEAD~5..HEAD
git commit -m "revert: sprint 21 — app registry migration broke dynamic imports"

E reportar o que deu errado.

## Regras

- pnpm typecheck && pnpm lint devem passar apos fix
- Rodar pnpm test:e2e:full apos fix para validar 33+ E2E
- Se o fix exigir mudanca no registry.ts: commitar como fix(shell): resolve dynamic import failures (MX117)
- NAO adicionar features novas — apenas corrigir o bug

## Gate final

pnpm typecheck && pnpm lint
set -a; source tooling/e2e/.env.local; set +a
pnpm test:e2e:full
