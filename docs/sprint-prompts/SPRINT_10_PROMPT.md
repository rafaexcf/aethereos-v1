# SPRINT 10 — Foundation visual: paradigma OS de V2 → V1

> **Tipo:** Sprint de portagem. Traz o paradigma visual do V2 (TopBar + TabBar + Dock + Mesa + AppFrame + design tokens) para dentro da arquitetura do V1 (TanStack Router + Edge Functions + Driver Model bifurcado + RLS).
>
> **NÃO traz features de negócio.** Não toca em RH, CNPJ, BrasilAPI, employees. Isso vem em Sprint 11.
> **NÃO copia código verbatim.** Copia spec executável. Adapta stack: Wouter → TanStack Router, Express REST → Edge Function, framer-motion fica.
>
> **Estimativa:** 8-12 horas. Custo: $50-90.

---

## CONTEXTO

V2 (`~/Projetos/aethereos-v2/`) tem o paradigma OS visual maduro: TopBar (macOS-like com avatar/notif/empresa), TabBar (Chrome-like com drag-drop e pinned tabs), Dock (macOS-like com magnification framer-motion + portal context-menu + tooltips), Mesa (desktop com ícones drag-drop + widgets persistidos + 9 wallpapers), e AppFrame que renderiza app da tab ativa.

V1 (este repo, `~/Projetos/aethereos`) tem a fundação arquitetural correta: Driver Model bifurcado, Edge Functions atômicas, RLS multi-tenant, Outbox SCP atômico, 13/13 testes E2E Playwright validados, design tokens já existentes em `apps/shell-commercial`.

**Sprint 10 traz V2 visual para V1 sem features novas.** Após Sprint 10, V1 deve ter, ao logar, a mesma sensação visual do V2 — mesma TopBar com macOS feel, mesma TabBar com Chrome+Arc híbrido, Dock com magnification idêntica, Mesa como tab pinned, capacidade de abrir os apps já existentes em V1 (Drive, Pessoas, Chat, Configurações) como tabs no novo paradigma.

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code no V1 (`~/Projetos/aethereos`). V2 (`~/Projetos/aethereos-v2`) é apenas **referência de leitura** — você NÃO escreve em V2, NÃO commita em V2, NÃO instala dependências em V2.

### Leituras obrigatórias antes de tocar em código

**Em V1:**

- `CLAUDE.md` — fundamentos do projeto V1
- `SPRINT_LOG.md` — histórico de sprints (especialmente 9.5 e 9.6)
- `apps/shell-commercial/src/routes/__root.tsx` — root layout atual
- `apps/shell-commercial/src/routes/index.tsx` ou similar — rota principal pós-login
- `apps/shell-commercial/src/styles/` — estilos atuais
- `apps/shell-commercial/src/lib/auth/` — auth client, session
- `apps/shell-commercial/package.json` — deps disponíveis
- `apps/shell-commercial/src/components/` — listar tudo
- ADR-0014 a 0022 — decisões arquiteturais cravadas

**Em V2 (referência):**

- `~/Projetos/aethereos-v2/CLAUDE.md` — paradigma OS articulado
- `~/Projetos/aethereos-v2/DESIGN-POLISH-PROMPT.md` — design tokens completos
- `~/Projetos/aethereos-v2/artifacts/aethereos/src/components/os/TopBar.tsx`
- `~/Projetos/aethereos-v2/artifacts/aethereos/src/components/os/TabBar.tsx`
- `~/Projetos/aethereos-v2/artifacts/aethereos/src/components/os/Dock.tsx`
- `~/Projetos/aethereos-v2/artifacts/aethereos/src/components/os/AppFrame.tsx`
- `~/Projetos/aethereos-v2/artifacts/aethereos/src/components/os/OSDesktop.tsx`
- `~/Projetos/aethereos-v2/artifacts/aethereos/src/stores/osStore.ts`
- `~/Projetos/aethereos-v2/artifacts/aethereos/src/stores/mesaStore.ts`
- `~/Projetos/aethereos-v2/artifacts/aethereos/src/apps/registry.ts`
- `~/Projetos/aethereos-v2/artifacts/aethereos/src/styles/tokens.css`
- `~/Projetos/aethereos-v2/artifacts/aethereos/src/apps/mesa/` — implementação de Mesa
- `~/Projetos/aethereos-v2/artifacts/aethereos/src/types/os.ts` — tipos OSApp, OSTab, MesaItem

### Confirmação obrigatória (escrever no chat antes de qualquer código)

1. Lista das deps de V2 que precisam entrar em V1 (provável: `framer-motion`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `lucide-react`)
2. Diferenças de stack a reconciliar:
   - V2 usa Wouter → V1 usa TanStack Router (rotas vão precisar ser ajustadas)
   - V2 fala com Express direto → V1 fala com Supabase via Driver Model + Edge Functions (mesa layout precisa ir para `kernel.mesa_layouts` ou similar)
   - V2 tem 19 apps → V1 tem 4-5 apps reais (Drive, Pessoas, Chat, Configurações, Copilot). Apps inexistentes ficam stub com tela "em breve"
3. Seu plano de tradução de `osStore.ts` (Wouter-agnostic, mas usa `crypto.randomUUID` e `localStorage` — tudo browser-native, sem mudanças)
4. Como vai persistir mesa layout: tabela `kernel.mesa_layouts` com `user_id`, `company_id`, `layout jsonb`, `wallpaper text`. Migration nova.
5. Decisão sobre **R5 do CLAUDE.md** (sem `framer-motion`): este sprint **viola intencionalmente** R5 porque V2 todo é construído sobre framer-motion (Dock magnification, transições). Justificar no chat: "Sprint 10 adiciona framer-motion como exceção arquitetural justificada por paradigma OS — registrar ADR-0023".

---

## REGRAS INVIOLÁVEIS

**R1.** Commit por milestone com mensagem estruturada `feat(os-shell): <descrição> (MX<N>)`.
**R2.** Milestone só começa após anterior ter critério de aceite e commit.
**R3.** Após 3 tentativas de fix de bug específico, marcar BLOQUEADO, registrar em `KNOWN_LIMITATIONS.md`, pular.
**R4.** Nova dep exige justificativa em commit message + atualização em `package.json` correta.
**R5.** Bloqueios mantidos: sem `next` em shells, sem `inngest`, sem `@clerk/*`, sem `prisma`. **EXCEÇÃO:** `framer-motion` permitido neste sprint, registrar via ADR-0023.
**R6.** Antes de cada commit: `pnpm typecheck && pnpm lint`. Antes do encerramento: gates triplos (`ci:full` + `test:smoke` + `test:e2e:full`).
**R7.** Atualize `SPRINT_LOG.md` ao fim de cada milestone.
**R8.** Não execute fora de `~/Projetos/aethereos`. Não escreva em `~/Projetos/aethereos-v2` (somente leitura).
**R9.** Ao perceber contexto cheio: pare, escreva pickup point.

**R10. ESPECÍFICO 10 — Fidelidade visual:**

- O resultado precisa parecer V2 ao olhar. Cores, espaçamentos, tipografia, animações.
- Tokens do `~/Projetos/aethereos-v2/artifacts/aethereos/src/styles/tokens.css` são **fonte da verdade**. Copie para V1.
- Magnification do Dock é **macOS-like** (spring physics framer-motion), não simples scale CSS.
- TabBar é **Chrome+Arc híbrido** com drag-drop via `@dnd-kit/sortable`.
- Mesa é **tab pinned, nunca fecha**. Wallpaper persistido em backend (não localStorage).
- Tooltip do Dock aparece após 600ms hover, sai via portal (`createPortal`).

**R11. ESPECÍFICO 10 — Sem features novas:**

- Apps que existem em V1 (Drive, Pessoas, Chat, Configurações, Copilot): mantém implementação atual, só envolve em AppFrame.
- Apps que não existem em V1 (Comércio Digital, LOGITIX, ERP, RH, CRM, Magic Store, Admin, Empresas): **ficam stub** com componente `<AppPlaceholder>` mostrando "Em breve — Sprint 11/12".
- **NÃO** implementa fluxo de cadastro CNPJ. **NÃO** implementa onboarding wizard. **NÃO** toca em employees, profiles, company_users (tabelas de Sprint 11).

**R12. ESPECÍFICO 10 — Refactor de roteamento:**

- Hoje V1 provavelmente tem rotas separadas para cada app (`/drive`, `/people`, `/chat`, etc.) via TanStack Router.
- Após Sprint 10, navegação principal entre apps é **via Zustand `osStore.openApp(appId)`**, não mais via router.
- TanStack Router fica restrito a: `/login`, `/select-company`, `/desktop` (rota única que renderiza OSDesktop), `/staff/*`. Apps individuais NÃO têm rota própria.

---

## ARQUIVO DE LOG

Adicione ao `SPRINT_LOG.md`:

```markdown
---

# Sprint 10 — Foundation visual: paradigma OS V2 → V1

Início: <timestamp ISO>
Modelo: Claude Code (Sprint 10 N=1)

## Origem

Decisão estratégica do humano em 2026-04-30: V2 é spec visual, V1 é destino arquitetural.
Sprint 10 porta paradigma OS de V2 (TopBar/TabBar/Dock/Mesa/AppFrame) para V1.

## Confirmação inicial

[5 pontos respondidos]

## Histórico de milestones (Sprint 10)

[preenchido conforme avança]
```

Commit antes de prosseguir.

---

## ROADMAP DE MILESTONES

### MX38 — Design tokens + dependências de UI

**Objetivo:** estabelecer fundação visual.

**Tarefas:**

1. Adicionar deps em `apps/shell-commercial/package.json`:
   - `framer-motion` (ADR-0023 justifica)
   - `@dnd-kit/core`
   - `@dnd-kit/sortable`
   - `@dnd-kit/utilities`
2. Criar `apps/shell-commercial/src/styles/tokens.css` copiando integralmente de `~/Projetos/aethereos-v2/artifacts/aethereos/src/styles/tokens.css` (ler com `cat` para pegar tudo).
3. Importar `tokens.css` em `apps/shell-commercial/src/main.tsx` ou root css.
4. Adicionar `Inter` font no `index.html`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
   <link
     href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
     rel="stylesheet"
   />
   ```
5. Aplicar `font-family: var(--font-sans)` no body.
6. Criar ADR-0023 em `docs/adr/0023-framer-motion-paradigma-os.md`:
   - Decisão: framer-motion entra como exceção a R5 do CLAUDE.md
   - Razão: Dock magnification + TabBar drag transitions + AppFrame fade são impraticáveis sem
   - Alternativas consideradas: CSS-only (não suporta spring physics), Motion One (nicho, comunidade pequena)
   - Custo: ~50KB gzipped, escopo limitado a `apps/shell-commercial`
7. Atualizar CLAUDE.md mencionando exceção do framer-motion para shell-commercial.

**Critério de aceite:**

```bash
pnpm install
pnpm typecheck
# ambos EXIT 0
grep -E "framer-motion|@dnd-kit" apps/shell-commercial/package.json
# 4 linhas
```

Commit: `feat(os-shell): tokens + deps fundacao visual (MX38)`

---

### MX39 — Tipos + Zustand `osStore`

**Objetivo:** core do paradigma OS sem componentes ainda.

**Tarefas:**

1. Criar `apps/shell-commercial/src/types/os.ts` adaptando de V2:

   ```typescript
   export interface OSApp {
     id: string;
     name: string;
     icon: string; // lucide-react icon name
     color: string;
     component: React.LazyExoticComponent<...>;
     showInDock: boolean;
     closeable: boolean;
     hasInternalNav: boolean;
     requiresCompany?: boolean;
     requiresAdmin?: boolean;
     alwaysEnabled?: boolean;
   }

   export interface OSTab {
     id: string;
     appId: string;
     title: string;
     isActive: boolean;
     isPinned: boolean;
   }

   export interface MesaItem {
     id: string;
     type: 'icon' | 'widget';
     appId: string;
     position: { x: number; y: number };
     size: { w: number; h: number };
     config: Record<string, unknown>;
     zIndex: number;
     locked?: boolean;
   }
   ```

2. Criar `apps/shell-commercial/src/stores/osStore.ts` adaptando de V2:
   - Mantém estrutura: `tabs`, `activeTabId`, `dockOrder`, `hiddenDockApps`
   - `openApp(appId, title)`, `closeTab(tabId)`, `focusTab(tabId)`, `reorderTabs`, `setDockOrder`, `toggleDockApp`
   - `aiModalOpen` + `toggleAIModal` / `openAIModal` / `closeAIModal` (Copilot reuse — V1 já tem CopilotDrawer)
   - `localStorage` keys: `aethereos-dock-order`, `aethereos-hidden-dock-apps` (mantém V2 keys)
3. **NÃO** criar mesaStore ainda — depende de tabela mesa_layouts (MX42).

**Critério de aceite:**

```bash
pnpm typecheck
pnpm lint
# ambos EXIT 0
```

Commit: `feat(os-shell): tipos os.ts + osStore zustand (MX39)`

---

### MX40 — App registry com apps reais V1 + stubs

**Objetivo:** registrar todos apps do paradigma V2 em V1, mas reusar implementações reais V1.

**Tarefas:**

1. Criar `apps/shell-commercial/src/apps/registry.ts` com lista completa de apps (espelhando V2):
   - Mesa, Dashboard, Comércio Digital, LOGITIX, ERP, RH, Drive, Notes, Calendar, Messaging, CRM Vendas, Projects, Magic Store, All Apps, Suporte, Settings, Empresas, Admin, AE AI
2. Para cada app:
   - Apps reais V1 (Drive, Pessoas/RH, Chat/Messaging, Configurações/Settings, Copilot/AE AI): `component: React.lazy(() => import('@/apps/<app>/<App>App'))` apontando para implementação atual de V1
   - Apps que não existem em V1: `component: React.lazy(() => import('@/components/AppPlaceholder'))` passando props com `appName`
3. Criar `apps/shell-commercial/src/components/AppPlaceholder.tsx`:
   ```tsx
   export function AppPlaceholder({
     appName,
     sprintTarget,
   }: {
     appName: string;
     sprintTarget?: string;
   }) {
     return (
       <div className="h-full flex items-center justify-center text-center">
         <div>
           <h2 className="text-[22px] font-semibold text-[var(--text-primary)]">
             {appName}
           </h2>
           <p className="text-[14px] text-[var(--text-secondary)] mt-2">
             Em breve — {sprintTarget ?? "próximos sprints"}
           </p>
         </div>
       </div>
     );
   }
   ```
4. Helpers: `getApp(id)`, `getVisibleDockApps(...)`, `prefetchApp(appId)`, `isAppEnabled(...)`, `appIdToModule()` — todos adaptados de V2.
5. Mover `apps/shell-commercial/src/apps/<app>/` se necessário para layout V2-like (mesa/, drive/, settings/, etc.).

**Critério de aceite:**

```bash
pnpm typecheck
pnpm dev # subir e ver console sem erros
```

Commit: `feat(os-shell): app registry + placeholder + reorganizacao apps (MX40)`

---

### MX41 — TopBar + AppFrame + AppPlaceholder

**Objetivo:** cascalho do OS visual.

**Tarefas:**

1. Criar `apps/shell-commercial/src/components/os/TopBar.tsx` adaptando de V2:
   - Height 38px, bg `var(--bg-base)`, border-bottom subtle
   - Esquerda: logo `Aethereos` + nome empresa atual (do `tenantStore`/`useTenant()` que V1 deve ter)
   - Direita: relógio (atualiza a cada minuto), separador, sino de notificações (count badge), avatar com dropdown (Perfil, Configurações, Sair)
   - Dropdown style: bg-elevated, border glass, radius lg, shadow lg, blur heavy
   - Animação: spring scale + opacity
   - **NÃO inclua TopBarSearch (gooey filter)** — esse componente do V2 é decorativo, fora de escopo
2. Criar `apps/shell-commercial/src/components/os/AppFrame.tsx`:
   - Renderiza tab ativa via `useOSStore()`
   - `<Suspense>` com `<AppLoader />` (skeleton)
   - `<ErrorBoundary>` que isola crash do app sem derrubar OS
   - `key={activeTab.id}` para forçar remount ao trocar tab
3. Criar `apps/shell-commercial/src/components/os/AppLoader.tsx`:
   - Skeleton com sidebar (220px) + breadcrumb + cards placeholder se app tem `hasInternalNav`
   - Caso simples: ícone do app centralizado pulsando
4. Criar `apps/shell-commercial/src/routes/desktop.tsx` (TanStack Router) que:
   - Verifica auth + active company (redirect para `/login` ou `/select-company` se faltar)
   - Renderiza `<OSDesktop />` (próxima milestone)

**Critério de aceite:**

```bash
pnpm typecheck && pnpm lint
pnpm dev
# Acessar http://127.0.0.1:5174/desktop
# Espera ver TopBar com 38px, logo, nome empresa, relógio, sino, avatar
# Resto da tela ainda em branco (Mesa/Dock/TabBar virão depois)
```

Commit: `feat(os-shell): TopBar + AppFrame + AppLoader (MX41)`

---

### MX42 — Mesa store + tabela mesa_layouts + Mesa app

**Objetivo:** Mesa funcional como tab pinned com persistência.

**Tarefas:**

1. Migration `supabase/migrations/<timestamp>_mesa_layouts.sql`:
   ```sql
   create table kernel.mesa_layouts (
     user_id uuid references auth.users(id) on delete cascade,
     company_id uuid references kernel.companies(id) on delete cascade,
     layout jsonb default '[]'::jsonb not null,
     wallpaper text default 'default' not null,
     updated_at timestamptz default now() not null,
     primary key (user_id, company_id)
   );
   alter table kernel.mesa_layouts enable row level security;
   create policy "mesa_layouts: tenant + self" on kernel.mesa_layouts
     for all to authenticated
     using (company_id = kernel.current_company_id() and user_id = auth.uid())
     with check (company_id = kernel.current_company_id() and user_id = auth.uid());
   grant select, insert, update, delete on kernel.mesa_layouts to authenticated;
   ```
2. Aplicar migration: `supabase db reset` (em local). Confirmar tabela existe.
3. Criar `apps/shell-commercial/src/stores/mesaStore.ts` adaptando de V2:
   - State: `layout`, `wallpaper`, `isLoading`, `hasLoaded`, `showWidgetGallery`
   - `fetchLayout()` agora usa `SupabaseBrowserDataDriver` (driver V1) em vez de Express REST
   - `updateLayout()` faz upsert via driver com debounce 1s
   - Wallpapers: copiar lista do V2 (default, aurora, ocean, midnight, minimal, nebula, forest, sunset)
   - **Excluir wallpaper `aether`** (depende de imagem `/Wallpapers/aether.png` que V1 não tem) — adicionar dívida em KNOWN_LIMITATIONS para Sprint 11+
   - Default wallpaper = `default` (gradient cosmos)
   - DEFAULT_LAYOUT: 6 ícones de apps + 1 widget clock (espelhar V2)
4. Criar `apps/shell-commercial/src/apps/mesa/MesaApp.tsx`:
   - Usa `useMesaStore()`, renderiza wallpaper como background full-screen
   - Renderiza `MesaItem`s (icons + widgets) com posição absoluta
   - DesktopIcon: clica → `osStore.openApp(item.appId)`
   - **NÃO implementar drag-drop, resize, widget gallery completos** — apenas grid estático com ícones funcionais. Drag-drop entra em Sprint 11 ou cirúrgico futuro.
5. Adicionar Mesa como tab pinned padrão em `osStore` (já está em INITIAL_TABS).

**Critério de aceite:**

```bash
pnpm typecheck && pnpm lint
docker exec supabase_db_aethereos psql -U postgres -c "\d kernel.mesa_layouts"
# tabela existe
pnpm dev
# acessar /desktop
# espera ver Mesa com wallpaper + ícones de apps clicáveis
```

Commit: `feat(os-shell): mesa store + tabela layouts + Mesa app (MX42)`

---

### MX43 — TabBar com drag-drop

**Objetivo:** TabBar Chrome+Arc híbrido funcional.

**Tarefas:**

1. Criar `apps/shell-commercial/src/components/os/TabBar.tsx` adaptando de V2:
   - Height 40px, bg-base, border-bottom subtle
   - Cada tab: 32px altura, padding horizontal 12px, gap 6px ícone-texto
   - Tab ativa: bg glass-bg, border glass-border, shadow-sm, ícone full opacity com cor app
   - Tab inativa: transparent, texto tertiary, hover bg glass-bg-hover
   - Tab pinned (Mesa): só ícone, 36px width, sem ×, não closeable
   - Botão × no hover (não closeable se pinned)
   - `@dnd-kit/core` + `@dnd-kit/sortable` + `useSortable` + `SortableContext` com `horizontalListSortingStrategy`
   - Drag: opacity 0.5 + transform CSS
   - Click → `focusTab(tab.id)`, click no × → `closeTab(tab.id)`
2. Integrar TabBar no `OSDesktop`.

**Critério de aceite:**

```bash
pnpm dev
# 1. Logar
# 2. Ver Mesa como tab pinned (única tab)
# 3. Cliques nos icones de Mesa abrem novas tabs
# 4. Arrastar tabs reordena
# 5. Botão × fecha tab não-pinned
# 6. Mesa não tem × (pinned)
```

Commit: `feat(os-shell): TabBar com drag-drop (MX43)`

---

### MX44 — Dock com magnification framer-motion

**Objetivo:** Dock macOS-like.

**Tarefas:**

1. Criar `apps/shell-commercial/src/components/os/Dock.tsx` adaptando de V2:
   - **Implementação completa** com framer-motion: `useMotionValue`, `useTransform`, `useSpring`
   - Container: position fixed bottom 8px, centered horizontal
   - Background glass-bg + backdrop-blur heavy + border glass-border + radius dock + shadow dock
   - Ícones: base 44px, magnification: hover 1.35, vizinho 1.15, vizinho-de-vizinho 1.05
   - Spring config: `mass: 0.1, stiffness: 150, damping: 12` (do V2)
   - `prefetchApp(app.id)` em `onMouseEnter`
   - Tooltip via `createPortal` (delay 600ms)
   - Dot indicador app aberto: bolinha 4px abaixo do ícone, cor app se tab ativa
   - Separador: div vertical 1px×28px antes de Magic Store
   - Click → `openApp(appId, title)`
2. Não implementar context-menu (right-click) ainda — fora de escopo.

**Critério de aceite:**

```bash
pnpm dev
# 1. Dock aparece embaixo do desktop
# 2. Hover faz icone crescer com spring physics
# 3. Vizinhos crescem proporcionalmente
# 4. Tooltip aparece após 600ms
# 5. Click abre app como tab
```

Commit: `feat(os-shell): Dock com magnification framer-motion (MX44)`

---

### MX45 — OSDesktop integrando tudo + roteamento atualizado

**Objetivo:** desktop completo, navegação principal por osStore.

**Tarefas:**

1. Criar `apps/shell-commercial/src/components/os/OSDesktop.tsx`:
   ```tsx
   export function OSDesktop() {
     return (
       <div className="h-screen w-screen overflow-hidden flex flex-col">
         <TopBar />
         <TabBar />
         <div className="flex-1 overflow-hidden relative">
           <AppFrame />
         </div>
         <Dock />
       </div>
     );
   }
   ```
2. Atualizar `apps/shell-commercial/src/routes/__root.tsx` ou similar para que rota `/desktop` use OSDesktop.
3. **Remover** rotas de apps individuais do TanStack Router que existirem (`/drive`, `/people`, `/chat`, `/settings`).
4. Migrar links/redirects que apontavam para essas rotas para abrir via `osStore.openApp(appId)`.
5. Routes restantes: `/login`, `/select-company`, `/desktop` (com Mesa default), `/staff/*`.

**Critério de aceite:**

```bash
pnpm typecheck && pnpm lint && pnpm test:smoke
# todos EXIT 0
pnpm dev
# Caminho completo:
# 1. /login → ana.lima@meridian.test / Aethereos@2026!
# 2. → /desktop
# 3. Vê TopBar + Mesa + Dock
# 4. Click no Drive na Dock → tab Drive aparece, Drive renderiza
# 5. Click no Pessoas/RH → tab abre
# 6. Click em Comércio Digital → tab abre, mostra placeholder "Em breve — Sprint 12"
# 7. Click no Mesa na TabBar volta para Mesa (tab pinned)
```

Commit: `feat(os-shell): OSDesktop integrado + roteamento atualizado (MX45)`

---

### MX46 — E2E Playwright atualizado + encerramento

**Objetivo:** validar paradigma OS via testes E2E.

**Tarefas:**

1. Atualizar `tooling/e2e/tests/login.spec.ts`: após login, esperar elemento `[data-testid="os-desktop"]` ou `[role="topbar"]`.
2. Atualizar `tooling/e2e/tests/drive.spec.ts`: em vez de navegar para `/drive`, simular click no ícone Drive da Dock e esperar tab abrir.
3. Adicionar test novo `tooling/e2e/tests/os-shell.spec.ts`:
   - **Test 1:** TopBar renderiza com nome da empresa após login
   - **Test 2:** Mesa aparece como tab pinned (não tem botão ×)
   - **Test 3:** Click no Drive da Dock abre tab Drive
   - **Test 4:** Click no × da tab Drive fecha tab e volta para Mesa
   - **Test 5:** Reorder tabs via drag (skipif `--no-headed`)
4. Atualizar `MANUAL_SMOKE_TEST.md` com fluxo de paradigma OS.
5. Gates triplos:

```bash
pnpm ci:full > /tmp/s10_ci.log 2>&1; echo "ci EXIT: $?"
pnpm test:smoke > /tmp/s10_smoke.log 2>&1; echo "smoke EXIT: $?"
set -a; source tooling/e2e/.env.local; set +a
pnpm test:e2e:full > /tmp/s10_e2e.log 2>&1; echo "e2e EXIT: $?"
# OS TRÊS DEVEM SER 0
```

Commit final: `chore: encerramento sprint 10 — paradigma OS V2 → V1`

Mensagem: "SPRINT 10 ENCERRADO. Triple gate verde. Foundation visual completa: TopBar + TabBar + Dock + Mesa + AppFrame integrados. Apps reais V1 (Drive, Pessoas, Chat, Settings, Copilot) acessíveis via Dock. Apps de Sprints 11/12 com placeholders. Aguardando validação manual humana e Sprint 11 (cadastro CNPJ + RH)."

---

## TÉRMINO DO SPRINT

Pare aqui. Não inicie Sprint 11.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint 10 (Foundation visual: paradigma OS V2 → V1) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (seção "Sprint 10")
3. Rode: git log --oneline -15 && git status
4. Identifique a próxima milestone MX38-MX46 não concluída
5. Continue a partir dela

Lembrar:
- V2 (~/Projetos/aethereos-v2) é APENAS leitura. Nunca escrever em V2.
- Este sprint NÃO traz features novas (RH, CNPJ, BrasilAPI ficam para Sprint 11).
- Apps que não existem em V1 viram placeholders.
- framer-motion permitido aqui (ADR-0023).
- Sprint só fecha com gates triplos EXIT 0.

Roadmap em SPRINT_10_PROMPT.md na raiz.
```

Salve este arquivo como `SPRINT_10_PROMPT.md` na raiz do projeto antes de começar.
