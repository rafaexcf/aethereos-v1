# SPRINT 21 — App Registry no Banco: Migrar de Hardcoded para DB

> **Objetivo:** Apps deixam de ser um array TypeScript hardcoded e passam a viver em kernel.app_registry (banco). Shell carrega metadata do banco, Magic Store le do banco. Component mapping (React.lazy) fica em codigo como lookup leve. Apps iframe/weblink nao precisam de component — shell renderiza frame generico.
> **NAO inclui:** Client SDK, App Bridge, permissoes, Developer Console, staging deploy.
> **Estimativa:** 4-6 horas. Custo: $25-45.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar Sprint 20 documentado
3. git log --oneline -10 — confirmar HEAD
4. apps/shell-commercial/src/apps/registry.ts — APP_REGISTRY (31 apps hardcoded), getApp(), getVisibleDockApps()
5. apps/shell-commercial/src/types/os.ts — interface OSApp (id, name, icon, color, component, showInDock, closeable, hasInternalNav, alwaysEnabled, etc.)
6. apps/shell-commercial/src/data/magic-store-catalog.ts — MAGIC_STORE_CATALOG (611 linhas, tipo MagicStoreApp)
7. apps/shell-commercial/src/stores/installedModulesStore.ts — useIsAppVisible hook
8. kernel.company_modules — 13 modulos distintos instalados

### Estado atual

- 31 apps no APP_REGISTRY (array TS hardcoded com React.lazy components)
- 611 linhas em magic-store-catalog.ts (catalogo visual hardcoded com descricoes, tags, screenshots)
- Dois sources of truth separados: registry (shell runtime) e catalog (Magic Store UI)
- getApp(id) busca no array por id
- Para adicionar um app novo, dev precisa editar 2 arquivos TS e fazer deploy
- Apps iframe/weblink existem no catalogo mas nao tem component no registry

### Arquitetura da solucao

Separar em 3 camadas:

CAMADA A — Banco (kernel.app_registry):

- Toda metadata: id, slug, name, description, long_description, icon, color, category, app_type, entry_mode, entry_url, version, status, pricing_model, permissions, tags, license, developer_name, show_in_dock, closeable, has_internal_nav, always_enabled, opens_as_modal, installable, offline_capable, external_url
- Inclui campos que hoje estao em MagicStoreApp E OSApp (unificados)
- Source of truth para metadata

CAMADA B — Component Map (codigo):

- Lookup leve: Record<string, React.lazy(() => import(...))>
- Apenas apps nativos com componente React precisam de entrada aqui
- Apps iframe: shell renderiza <IframeAppFrame url={entry_url} />
- Apps weblink: shell abre window.open(entry_url)
- Essa camada NAO cresce com apps de terceiros (eles sao iframe/weblink)

CAMADA C — Runtime merge:

- No boot, shell carrega app_registry do banco (SELECT \* WHERE status=published)
- Merge com component map: se app.id tem component, usa. Se nao, usa frame generico.
- Resultado e o mesmo tipo OSApp (ou versao estendida) que Dock/Mesa/Launcher consomem

---

## MILESTONES

### MX111 — Migration: kernel.app_registry

O que fazer:

1. Criar migration para tabela kernel.app_registry:

   CREATE TABLE kernel.app_registry (
   id TEXT PRIMARY KEY,
   slug TEXT NOT NULL UNIQUE,
   name TEXT NOT NULL,
   description TEXT NOT NULL DEFAULT '',
   long_description TEXT NOT NULL DEFAULT '',
   icon TEXT NOT NULL DEFAULT 'Package',
   color TEXT NOT NULL DEFAULT '#64748b',
   category TEXT NOT NULL DEFAULT 'utilities',
   app_type TEXT NOT NULL DEFAULT 'native',
   entry_mode TEXT NOT NULL DEFAULT 'internal',
   entry_url TEXT,
   version TEXT NOT NULL DEFAULT '1.0.0',
   status TEXT NOT NULL DEFAULT 'published',
   pricing_model TEXT NOT NULL DEFAULT 'free',
   permissions TEXT[] NOT NULL DEFAULT '{}',
   tags TEXT[] NOT NULL DEFAULT '{}',
   license TEXT NOT NULL DEFAULT 'proprietary',
   developer_name TEXT NOT NULL DEFAULT 'Aethereos',
   show_in_dock BOOLEAN NOT NULL DEFAULT true,
   closeable BOOLEAN NOT NULL DEFAULT true,
   has_internal_nav BOOLEAN NOT NULL DEFAULT false,
   always_enabled BOOLEAN NOT NULL DEFAULT false,
   opens_as_modal BOOLEAN NOT NULL DEFAULT false,
   installable BOOLEAN NOT NULL DEFAULT true,
   offline_capable BOOLEAN NOT NULL DEFAULT false,
   external_url TEXT,
   install_count INTEGER NOT NULL DEFAULT 0,
   sort_order INTEGER NOT NULL DEFAULT 100,
   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );

   CHECK constraints:
   - app_type IN ('native', 'open_source', 'embedded_external', 'external_shortcut', 'template_app', 'ai_app')
   - entry_mode IN ('internal', 'iframe', 'weblink')
   - status IN ('draft', 'published', 'suspended', 'deprecated')
   - pricing_model IN ('free', 'one_time', 'subscription', 'usage_based')
   - category IN ('vertical', 'optional', 'ai', 'productivity', 'games', 'utilities', 'puter', 'system')

   RLS: SELECT para authenticated (todos da company leem o catalogo global).
   Nao precisa company_id — app_registry e global (igual para todos os tenants).
   INSERT/UPDATE/DELETE apenas para service_role (admin da plataforma).

   Trigger: touch_updated_at em UPDATE.

2. Indice: (status, category) para queries da Magic Store.

Criterio de aceite: Migration aplicada, tabela existe com RLS.

Commit: feat(db): kernel.app_registry — central app metadata table (MX111)

---

### MX112 — Seed: popular app_registry com os 31 apps nativos + catalogo

O que fazer:

1. Unificar dados de APP_REGISTRY (31 entries) + MAGIC_STORE_CATALOG (33 entries) em INSERT statements no seed.

2. Para cada app nativo do registry.ts, criar registro em app_registry com todos os campos mapeados:
   - id, name, icon, color -> direto
   - showInDock -> show_in_dock
   - alwaysEnabled -> always_enabled
   - closeable, hasInternalNav, opensAsModal -> respectivos campos
   - description, longDescription, tags, category -> do catalog
   - entry_mode: 'internal' para nativos
   - app_type: 'native'

3. Para apps que estao no catalogo mas NAO no registry (ex: weblinks AI, jogos puter):
   - entry_mode: 'weblink' ou 'iframe'
   - entry_url: URL do catalogo
   - app_type: conforme tipo

4. Seed via migration (INSERT ... ON CONFLICT DO NOTHING) para ser idempotente.

5. Verificar que todos os 13 module IDs em company_modules existem no app_registry.

Criterio de aceite: SELECT count(\*) FROM kernel.app_registry retorna 33+. Todos os apps do catalogo e registry estao la.

Commit: feat(seed): populate app_registry with all native + catalog apps (MX112)

---

### MX113 — Component Map leve + IframeAppFrame

O que fazer:

1. Refatorar registry.ts:
   - Remover APP_REGISTRY (array grande com metadata)
   - Criar COMPONENT_MAP: Record<string, LazyExoticComponent<ComponentType>>
   - Apenas apps nativos com componente React:
     { mesa: React.lazy(() => import('./mesa/MesaApp')), drive: React.lazy(() => import('./drive/index')), ... }
   - Exportar getComponent(appId): component ou null

2. Criar componente IframeAppFrame:
   - Recebe url: string, appId: string
   - Renderiza <iframe src={url} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
   - Estilo fullscreen dentro do AppFrame
   - Mostra loading enquanto iframe carrega
   - Mostra fallback se iframe falhar (com link "Abrir em nova aba")

3. Criar componente WebLinkOpener:
   - Para apps com entry_mode='weblink': window.open(url, '\_blank')
   - Nao renderiza componente — apenas abre URL

4. Manter getApp() funcional para compatibilidade — mas agora busca do banco (via store/cache) em vez do array.

Criterio de aceite: COMPONENT_MAP compilado, IframeAppFrame renderiza URL em iframe, WebLinkOpener abre URL.

Commit: feat(shell): component map + IframeAppFrame + WebLinkOpener (MX113)

---

### MX114 — AppRegistryStore: carrega apps do banco

O que fazer:

1. Criar store Zustand apps/shell-commercial/src/stores/appRegistryStore.ts:

   Estado:
   - apps: Map<string, AppRegistryEntry> (metadata do banco)
   - isLoading: boolean
   - error: string | null

   Acoes:
   - loadApps(): SELECT \* FROM kernel.app_registry WHERE status='published' ORDER BY sort_order
   - getApp(id): busca no Map
   - getVisibleApps(): filtra por isAppVisible (installed ou alwaysEnabled)
   - getDockApps(): filtra por show_in_dock && isVisible
   - searchApps(query): filtra por name/description/tags

2. Tipo AppRegistryEntry:
   - Todos os campos do banco + resolved component (do COMPONENT_MAP) ou null
   - Campo computado: hasComponent (true se existe no COMPONENT_MAP)

3. Inicializar no boot do desktop (OSDesktop ou DriversContext).

4. Refatorar todos os consumers de APP_REGISTRY para usar o store:
   - Dock -> appRegistryStore.getDockApps()
   - Mesa -> appRegistryStore.getVisibleApps()
   - AppsLauncher -> appRegistryStore.getVisibleApps()
   - Search -> appRegistryStore.searchApps()
   - openApp() -> appRegistryStore.getApp() + resolve component

5. openApp() agora decide:
   - Se hasComponent: renderiza component como tab (comportamento atual)
   - Se entry_mode === 'iframe': renderiza IframeAppFrame como tab
   - Se entry_mode === 'weblink': window.open() (nao cria tab)

Criterio de aceite: Shell boota, carrega apps do banco, Dock/Mesa/Launcher funcionam identicamente ao antes. Apps iframe abrem em tab com iframe.

Commit: feat(shell): appRegistryStore — load apps from DB + merge with components (MX114)

---

### MX115 — Magic Store le do banco

O que fazer:

1. Refatorar MagicStoreApp.tsx:
   - Remover import de MAGIC_STORE_CATALOG
   - Usar appRegistryStore.apps como fonte de dados
   - Manter UI identica (hero, cards, sidebar, detail view, carrossel)
   - Categorias, filtros, busca funcionam sobre dados do banco

2. Install/uninstall continua usando installedModulesStore (sem mudanca).

3. Abrir app: usa entry_mode para decidir (internal/iframe/weblink).

4. Detail view: mostra campos adicionais do banco (license, developer_name, version, permissions preview).

5. Manter teasers de plugins/widgets/integracoes/distros como estao (hardcoded — sao placeholders).

Criterio de aceite: Magic Store renderiza com dados do banco. Instalar/desinstalar funciona. Visual identico.

Commit: feat(magic-store): read from app_registry DB instead of hardcoded catalog (MX115)

---

### MX116 — Testes + limpeza + documentacao

O que fazer:

1. Remover arquivos mortos:
   - apps/shell-commercial/src/data/magic-store-catalog.ts (se nao mais importado)
   - Verificar que nenhum import referencia o catalogo hardcoded

2. Testes:
   - Unit test: appRegistryStore carrega apps mock
   - Unit test: IframeAppFrame renderiza iframe com sandbox
   - E2E: Magic Store lista apps (ja existe, verificar que continua passando)
   - E2E: app nativo abre via Dock (ja existe)

3. Rodar suite completa:
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

4. Resultado esperado: 33+ passed, 0 failed.

5. Atualizar SPRINT_LOG.md com Sprint 21.

6. Atualizar ARCHITECTURE_OVERVIEW.md com nova arquitetura de registry.

Criterio de aceite: 0 imports de hardcoded catalog. Testes passam. Docs atualizados.

Commit: docs: sprint 21 — app registry in database (MX116)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem feat/fix/docs(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. Nova dep exige justificativa em commit.
R5. Bloqueios mantidos: sem next em shells, sem inngest, sem @clerk/\*, sem prisma.
R6. Antes de cada commit: pnpm typecheck && pnpm lint.
R7. Nao execute fora de ~/Projetos/aethereos.
R8. Ao perceber contexto cheio: pare, escreva pickup point.
R9. NAO quebrar os 33+ E2E existentes.
R10. app_registry e GLOBAL — nao tem company_id. Todos os tenants veem o mesmo catalogo. Instalacao e per-company via company_modules.
R11. COMPONENT_MAP so tem apps nativos. Apps iframe/weblink NAO precisam de entrada no component map.
R12. Backward compatibility: getApp(id) deve continuar funcionando durante a transicao. Pode ser wrapper sobre o store.
R13. Se algum app do catalogo hardcoded nao fizer sentido no banco (teaser, coming_soon puro), pode ficar como hardcoded na UI — apenas apps reais vao pro banco.

---

## TERMINO DO SPRINT

Quando MX116 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte o resultado (X passed, Y failed, Z skipped).

3. Pare aqui. Nao inicie Sprint 22.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 21 (App Registry no Banco) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX111-MX116 nao concluida
5. Continue a partir dela

Lembrar:

- Objetivo: migrar APP_REGISTRY e MAGIC_STORE_CATALOG de hardcoded para kernel.app_registry no banco.
- 3 camadas: Banco (metadata) + Component Map (React.lazy) + Runtime merge (store Zustand)
- app_registry e GLOBAL (sem company_id). Instalacao e per-company via company_modules.
- IframeAppFrame para apps iframe. WebLinkOpener para weblinks.
- appRegistryStore substitui APP_REGISTRY em Dock/Mesa/Launcher/MagicStore.
- 33+ E2E existentes nao podem quebrar.

Roadmap em SPRINT_21_PROMPT.md na raiz.
