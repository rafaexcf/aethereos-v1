# SPRINT REDESIGN-1 — Aplicação do DESIGN.md V2-real

> **Tipo:** Sprint dedicado a aplicar o design system canônico V2-real (`DESIGN.md` v3.0) em todo o `shell-commercial`. Inclui dark + light mode com toggle.
>
> Base: análise direta do código V2 em `~/Projetos/aethereos-v2/artifacts/aethereos/` — tokens reais, componentes reais, wireframes reais.
>
> Não adiciona features. Refaz a camada visual de Camada 1 do zero.
>
> **Estimativa:** 14-20 horas. Custo: $140-200.

---

## CONTEXTO

### Por que este sprint

V2 do Aethereos tem design system maduro, completo e em produção: macOS Sequoia + Linear + Vercel + Raycast. Premium dark slate-tinted, glass sutil, TopBar sólida, prefetch chunks, skeleton estrutural, command palette, dock magnification.

Sprint anterior (commits `9b89604` e `535f699`) tentou aplicar redesign Tahoe — descartado.

DESIGN.md v3.0 agora é canon, baseado em análise verbatim do V2. Inclui light mode (Notion/Apple style) como extensão.

### V2 referência viva

`~/Projetos/aethereos-v2/artifacts/aethereos/` — código que funciona em produção.

Quando útil, consultar:

- `src/styles/tokens.css` — tokens primários
- `src/index.css` — tokens HSL + @theme inline + animations
- `src/components/os/` — TopBar/TabBar/Dock/AppFrame/Mesa/Onboarding/CommandPalette/AEAIModal
- `src/components/app-shell/` — AppLayout/AppSidebar/AppContent/AppHeader
- `src/components/ui/` — shadcn primitives
- `src/apps/registry.ts` — APP_REGISTRY + APP_PREFETCH

V2 NÃO tem light mode — você está estendendo. Tokens light estão no DESIGN.md.

### Pontos de atenção

1. PWA cache (VitePWA service worker) — investigar antes de codar
2. `apps/shell-commercial/lib/app-registry.ts` é legado, verificar
3. `pkill -9 -f vite` antes de subir
4. Testar em **aba anônima** com **Disable cache**
5. `@aethereos/ui-shell` afeta 8 apps
6. Bug histórico AppFrame: sempre `h-full`, não `flex-1` sem pai flex
7. **AppDisabledScreen** não existe em V1 — precisa criar

---

## REGRAS INVIOLÁVEIS

**R1.** Ler `DESIGN.md` (v3.0) na íntegra antes de tocar em qualquer código.

**R2.** Refazer código que viola o `DESIGN.md`. Não preservar implementações antigas.

**R3.** Commit por etapa: `style(<scope>): <descrição> (REDESIGN-1 ETAPA-N)`.

**R4.** Validação visual humana é gate obrigatório no fim, em **AMBOS modos**.

**R5.** Sem features novas. Sem mexer em lógica de stores/queries.

**R6.** Manter compatibilidade funcional.

**R7.** **Dark + Light desde o início.** Theme Provider, toggle — tudo na ETAPA 1.

**R8.** Tokens canônicos em **um** arquivo (`apps/shell-commercial/src/styles/tokens.css`). Nada hardcoded.

**R9.** Tailwind v4 + `@theme inline`. Variáveis CSS são fonte de verdade.

**R10.** **TopBar SÓLIDA** (sem backdrop-blur) em ambos modos.

**R11.** **TabBar sem borda inferior colorida** na tab ativa.

**R12.** **Sidebar item ativo** apenas com `bg ${appColor}1a` + ícone/texto cor-app — sem border-left 2px.

**R13.** **Skeleton estrutural** copiando o `AppLoader` literal do V2 (DESIGN.md 5.7).

**R14.** **Prefetch chunks no Dock** obrigatório — todo app no `APP_REGISTRY` em `APP_PREFETCH`.

**R15.** **Suspense com `key`** em conteúdo dinâmico.

**R16.** **Títulos consistentes** loading/error/success.

**R17.** **AppDisabledScreen** criado e usado quando módulo não ativo.

**R18.** **Validar em AMBOS modos** antes de cada commit.

**R19.** Sem push pra origin sem aprovação humana.

**R20.** **Cmd+K abre CommandPalette** (não AEAIModal). AEAIModal usa outro shortcut ou botão dedicado.

---

## ROADMAP

### ETAPA 0 — Diagnóstico (1h)

```bash
# Commits do redesign Tahoe
git show 9b89604 --stat && git show 535f699 --stat

# Cache / Service Worker
grep -rn "registerSW\|VitePWA\|ServiceWorker" apps/shell-commercial/src/ apps/shell-commercial/index.html apps/shell-commercial/vite.config.ts
ls -la apps/shell-commercial/dist/ apps/shell-commercial/node_modules/.vite/ 2>/dev/null

# CSS importado?
grep -rn "import.*\.css" apps/shell-commercial/src/main.tsx apps/shell-commercial/src/styles/

# Diff dos commits Tahoe
git diff a803d1c..535f699 -- apps/shell-commercial/src/styles/ apps/shell-commercial/src/components/os/ apps/shell-commercial/src/apps/mesa/
```

Documentar em `REDESIGN_DIAGNOSIS.md`. Possíveis fixes:

- Unregister service workers
- `clearCache` em dev
- Remover `node_modules/.vite/` e `dist/`
- Confirmar import do CSS no `main.tsx`

Commit: `chore(redesign): diagnostico antes de aplicar (REDESIGN-1 ETAPA-0)`

---

### ETAPA 1 — Tokens + ThemeProvider + Toggle (2h)

DESIGN.md seções 3, 14.2.

1. **Criar `apps/shell-commercial/src/styles/tokens.css`** com:
   - Tokens primários DARK (3.1)
   - Tokens primários LIGHT (3.2)
   - Tokens compartilhados (3.3) — radius, transitions, app colors, status, fonts

2. **Criar `apps/shell-commercial/src/styles/globals.css`:**

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap");
@import "./tokens.css";
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

/* HSL tokens dark */
:root.dark,
html.dark {
  /* DESIGN.md 3.4 dark */
}

/* HSL tokens light */
:root,
html.light {
  /* DESIGN.md 3.4 light */
}

@theme inline {
  /* DESIGN.md 3.5 */
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    font-family: var(--font-sans);
    background-color: var(--bg-base);
    color: var(--text-primary);
    @apply antialiased;
  }
  html {
    transition:
      background-color 200ms ease,
      color 200ms ease;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: var(--font-display);
    @apply font-bold tracking-tight;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

/* Skeleton helper utilities (consciente do tema) */
.skeleton-bg {
  @apply bg-black/5 dark:bg-white/5;
}
.skeleton-bg-card {
  @apply bg-black/[0.03] dark:bg-white/[0.03];
}
.skeleton-border {
  @apply border-black/[0.05] dark:border-white/[0.05];
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

3. **Anti-flash no `index.html` head:**

```html
<script>
  (function () {
    var t = localStorage.getItem("aethereos-theme") || "dark";
    document.documentElement.classList.add(t);
  })();
</script>
```

4. **`apps/shell-commercial/src/lib/theme/theme-provider.tsx`** seguindo DESIGN.md 14.2.

5. **`apps/shell-commercial/src/lib/theme/theme-toggle.tsx`:**

```tsx
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  const label =
    theme === "dark" ? "Alternar para modo claro" : "Alternar para modo escuro";

  return (
    <button
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={theme === "dark"}
      className="flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--glass-bg-hover)]"
      style={{ width: 32, height: 32, color: "var(--text-secondary)" }}
    >
      <Icon size={18} strokeWidth={1.8} />
    </button>
  );
}
```

6. No `main.tsx`: importar `globals.css`, wrap App em `<ThemeProvider>`. NÃO duplicar `classList.add('dark')` — script inline já fez.

7. Validação visual humana antes de prosseguir:
   - Tema dark funciona (background `#0f151b`)
   - Toggle (no Settings ou TopBar) alterna pra light (`#fafaf9`)
   - Sem flash on reload
   - Persistência localStorage

Commit: `style(theme): tokens V2-real dark+light + ThemeProvider + Toggle (REDESIGN-1 ETAPA-1)`

---

### ETAPA 2 — Mesa + Wallpapers gradientes (1.5h)

DESIGN.md seção 5.4.

1. Wallpapers como CSS variables `--wallpaper-{id}` que mudam por tema:

```css
html.dark {
  --wallpaper-default: radial-gradient(
    ellipse at top,
    #1a1a3e 0%,
    #0a0a1a 50%,
    #050510 100%
  );
}
html.light {
  --wallpaper-default: radial-gradient(
    ellipse at top,
    #f4f4f0 0%,
    #fafaf9 50%,
    #ffffff 100%
  );
}
/* etc para aurora, ocean, midnight, minimal, mesh */
```

2. `MesaApp.tsx` aplica wallpaper selecionado via `var(--wallpaper-${id})`.

3. `WallpaperPicker.tsx` modal pra trocar (já existe em `mesaStore.ts`?). Senão criar.

4. **DesktopIcon** (5.4):
   - Container 56×56 glass-bg + glass-border + radius-lg
   - Ícone interno 48px cor-app
   - Hover: glass-bg-hover + scale(1.05) + shadow-sm
   - Label 11px font-medium com text-shadow contextual ao tema
   - Spacing grid 90×100
   - Stagger fade-in

5. (Opcional) Widgets: NoteWidget, WeatherWidget, CalendarWidget, EventsWidget — V2 já tem, mas pode adiar pra Sprint 13+

Commit: `style(mesa): wallpapers dark+light + DesktopIcon canônico (REDESIGN-1 ETAPA-2)`

---

### ETAPA 3 — TopBar (49px sólida + busca animada + CNPJ dropdown) (2h)

DESIGN.md seção 5.2.

⚠️ Esta etapa é grande — TopBar V2 é sofisticada (19KB).

1. **Container** 49px height, var(--bg-base) sólido, border-bottom subtle.

2. **Esquerda:** Logo "ÆTHEREOS" 15px font-bold + GradientText "Enterprise OS v1.0.1" 10px (componente reusável).

3. **Direita** (gap 8px):
   - **Dropdown CNPJ** com 3 seções (Empresa ativa, Filiais, Grupo Econômico)
   - Separador vertical 1px × 18px
   - **TopBarSearch** animada (gooey filter + particles + gradient sweep + shimmer)
   - **Messenger button** (MessageCircle 18px)
   - **Notifications dropdown** (Bell 18px + badge ponto vermelho)
   - **ThemeToggle** (Sun/Moon)
   - **Avatar dropdown** com Configurações + Sair

4. Dropdowns seguem padrão de glass-blur-heavy + bg-elevated + glass-border.

5. **GradientText** componente em `components/ui/gradient-text.tsx`:

```tsx
export function GradientText({ text, className, gradient, transition }: {...}) {
  return (
    <motion.span
      className={cn('bg-clip-text text-transparent', className)}
      style={{ backgroundImage: gradient, backgroundSize: '200% auto' }}
      animate={{ backgroundPosition: ['0% center', '200% center'] }}
      transition={transition}
    >
      {text}
    </motion.span>
  );
}
```

Commit: `style(top-bar): 49px sólida + search animada + CNPJ dropdown + theme toggle (REDESIGN-1 ETAPA-3)`

---

### ETAPA 4 — TabBar (40px) (45min)

DESIGN.md seção 5.3.

1. Container 40px var(--bg-base) + border-bottom subtle (quando há apps abertos), `padding 0 8px gap 4`.
2. Tabs 32px radius-md.
3. **Pinned (Mesa) mostra "Home" texto** (não só ícone).
4. Não-pinned: ícone 14px cor-app + título 12px font-medium truncate max-w-120 + × 14px on-hover.
5. Inativa: transparent + texto tertiary.
6. Ativa: glass-bg + glass-border + shadow-sm + texto primary + ícone full opacity. **Sem borda inferior colorida.**
7. Lógica: Tab Mesa pinned esconde quando não há outros apps. TabBar fica `absolute top-0 z-10 transparent` quando Mesa ativa.
8. Drag-drop @dnd-kit (preservar do V1).
9. **Botão Widgets** (texto 11px em pill h-7 px-2.5 border-glass) à direita quando Mesa ativa.

Commit: `style(tab-bar): 40px com Mesa pinned "Home" + Widgets button (REDESIGN-1 ETAPA-4)`

---

### ETAPA 5 — Dock (80px com magnification 48→72 + limelight + menus) (2h)

DESIGN.md seção 5.5. **Componente mais complexo — 26KB no V2.**

1. **Container** 80px height, `bottom-8 left-1/2 -translate-x-1/2`, `bg-background/90 dark:bg-[#0f151b]/90 backdrop-blur-2xl shadow-2xl border border-border/50 rounded-2xl px-4 pb-4`. Hidden em mobile.

2. **DockIcon** com magnification:
   - `useTransform(distance, [-150, 0, 150], [48, 72, 48])` width/height
   - `useTransform(distance, [-150, 0, 150], [24, 36, 24])` icon
   - `useSpring({ mass: 0.1, stiffness: 150, damping: 12 })`
   - Container align-end (ícones crescem pra cima)
   - Tooltip com fade in/out 0.15s
   - Prefetch onMouseEnter
   - Right-click context menu (Abrir, Adicionar na Mesa)

3. **Limelight indicator** (tab ativa): barra horizontal 8×4 primary + cone gradient apontando.

4. **Hover classes específicas por app id** (mapa HOVER_CLASSES — DESIGN.md 5.5).

5. **DockMenuIcon** (3 pontos EllipsisVertical):
   - Same magnification
   - Click abre popup: "Ocultar dock" (red), "Todos os Apps", "Suporte" (green)

6. **Hidden state:** botão "Mostrar dock" `fixed bottom-4 left-1/2`.

7. **DockDashboardMenu:** Dashboard tem submenu (Visão Geral / Métricas / Atividade) via portal.

8. **DockMobile** (`<md:hidden`): hamburger LayoutGrid bottom-right + expand vertical com stagger.

9. **APP_PREFETCH** em `apps/shell-commercial/src/apps/registry.ts` cobrindo TODOS apps.

Manter `data-testid="dock-app-{id}"` (E2E).

Commit: `style(dock): 80px magnification 48→72 + limelight + menus + prefetch (REDESIGN-1 ETAPA-5)`

---

### ETAPA 6 — AppFrame + AppLoader + AppDisabledScreen + ErrorBoundary (1.5h)

DESIGN.md seções 5.6, 5.7, 5.8.

1. **`AppFrame.tsx`:**

```tsx
<div className="flex-1 overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
  {tabs.map((tab) => <TabPane key={tab.id} ... />)}
</div>
```

2. **`TabPane`** memoizado com `visibility: hidden` + `pointerEvents: none` (não unmount).

3. **`AppLoader`** com skeleton estrutural — copiar literal de DESIGN.md 5.7.

4. **`AppDisabledScreen`** novo componente (DESIGN.md 5.8) — quando `app.requiresCompany && !isAppEnabled`:
   - Ícone 36px com bg cor-app/15 em circle 80×80
   - Lock 14px no canto bottom-right
   - "X não está ativado" h2 16px primary
   - Descrição 13px secondary
   - CTA "Ir ao Magic Store" sky-500/15

5. **`ErrorBoundary`:** bg-elevated + glass-border + radius-xl + AlertCircle red + "Recarregar app" + "Reportar bug".

6. `isAppEnabled(app, enabledModules, isAdmin)` helper em `registry.ts`.

Commit: `style(app-frame): TabPane visibility + skeleton estrutural + AppDisabledScreen (REDESIGN-1 ETAPA-6)`

---

### ETAPA 7 — AppShell (AppLayout + AppSidebar + AppContent + AppHeader) (1.5h)

DESIGN.md seção 5.9.

1. `packages/ui-shell/src/components/app-shell/`:

**AppLayout:** flex h-full w-full overflow-hidden + AppSidebar + AppContent.

**AppSidebar:** 220px (collapsible 56px), bg-base, border-right subtle, padding 12px 8px. Toggle no fim com PanelLeftClose/Open. Items 34px com **active state apenas como `bg ${appColor}1a` + ícone/texto cor-app** (R12 — sem border-left). Groups com header uppercase 10px tertiary.

**AppContent:** flex-1 overflow-y-auto, bg-elevated, **padding 24 24 144 24** (R: bottom 144px pra dock). Max-width 1200px. Scrollbar custom 6px.

**AppHeader (interno do app):** flex justify-between, h1 18px font-semibold primary + subtitle 13px secondary, ações direita ghost/outline, border-bottom subtle pad-bottom 16 mb-6.

8 apps usam — propaga.

Commit: `style(ui-shell): AppLayout/Sidebar/Content/Header V2 (REDESIGN-1 ETAPA-7)`

---

### ETAPA 8 — Primitivas UI (Button, Input, Badge, Card, etc) (2h)

DESIGN.md seções 5.13, 5.14, 5.15, 5.17, 5.21, 5.22.

Criar/atualizar em `apps/shell-commercial/src/components/ui/`:

- **`button.tsx`** — variants default/destructive/outline/secondary/ghost/link, sizes sm/default/lg/icon. **NÃO usar `hover-elevate`** (Replit-only). Usar `hover:brightness-110 active:scale-[0.98]` com tokens.
- **`input.tsx`** — h-9, bg-surface, border-default, focus border-focus + ring blue/30
- **`label.tsx`** — text-[12px] font-medium secondary
- **`badge.tsx`** — variantes success/warning/error/info/neutral
- **`card.tsx`** — CardRoot, CardHeader, CardContent, CardFooter
- **`empty.tsx`** — Empty/EmptyHeader/EmptyMedia/EmptyTitle/EmptyDescription/EmptyContent (copiar exato de V2)
- **`skeleton.tsx`** — `animate-pulse rounded-md bg-primary/10`
- **`select.tsx`**, **`checkbox.tsx`**, **`radio.tsx`**, **`switch.tsx`**, **`textarea.tsx`** — Radix-based

⚠️ Validar **em ambos modos** — destructive, badges precisam funcionar em fundo dark e light.

Commit: `style(ui): primitivas V2 dark+light validadas (REDESIGN-1 ETAPA-8)`

---

### ETAPA 9 — Tabelas, Dialogs, Drawers, Toasts, Popover, DropdownMenu, Command (1.5h)

DESIGN.md seções 5.16, 5.18, 5.19, 5.20, 5.11.

- **`table.tsx`** — header bg-surface uppercase 11px tertiary, rows border-bottom subtle hover glass-bg-hover
- **`dialog.tsx`** — overlay bg-black/60 backdrop-blur-md (em light: bg-black/40) + content bg-elevated glass-border radius-xl shadow-lg. Spring entrada.
- **`drawer.tsx`** — slide-in da direita 480/640px
- **`toast.tsx`** — bottom-right 380px max-w
- **`popover.tsx`** — Radix
- **`dropdown-menu.tsx`** — Radix com glass-blur-heavy
- **`command.tsx`** — base shadcn pra CommandPalette

Animações framer-motion. Validar ambos modos.

Commit: `style(ui): tabelas, dialogs, drawers, toasts, popovers (REDESIGN-1 ETAPA-9)`

---

### ETAPA 10 — CommandPalette (Cmd+K) (1h)

DESIGN.md seção 5.11. **Componente novo no V1.**

1. Criar `apps/shell-commercial/src/components/os/CommandPalette.tsx` baseado em V2.
2. Modal `fixed inset-0 z-[200] pt-[18vh]` + backdrop bg-black/60 blur-md.
3. Container max-w-[580px] rounded-2xl com style purple sutil (`rgba(139,92,246,0.15)` border).
4. Animated gradient border glow + top shimmer line.
5. Search input + Sparkles quando query + kbd ESC.
6. CommandGroups: Apps + Ações.
7. Items com ícone 8×8 (bg cor-app/20) + nome 13px.
8. Footer com kbd ↑↓ navegar / ↵ abrir / ⌘K busca.
9. Ctrl+K / Cmd+K abre globalmente em `OSDesktop.tsx`.

⚠️ **Conflito Cmd+K:** V2 tem AEAIModal e CommandPalette com mesmo shortcut. No V1, **CommandPalette ganha Cmd+K**, AEAIModal usa botão dedicado no Dock OU Cmd+J.

Commit: `feat(command-palette): Cmd+K spotlight novo em V1 (REDESIGN-1 ETAPA-10)`

---

### ETAPA 11 — Onboarding Wizard (4 steps) (1.5h)

DESIGN.md seção 5.10.

1. Overlay bg-black/70 backdrop-blur-[24px].
2. Card max-w-xl bg-elevated glass-border radius-xl shadow-lg.
3. **Progress dots** com Check em completed, ping em active, dot pequeno em future + linha 16px.
4. Step icon 10×10 circle gradient azul + ícone 18px white.
5. **Step 0 (Empresa):** Nome Fantasia + Telefone.
6. **Step 1 (Endereço):** CEP + Número + Logradouro + Bairro + Cidade + UF (com BrasilAPI lookup).
7. **Step 2 (Produtos):** Search NCM com 3 botões (Compro/Vendo/Ambos) + lista selecionados.
8. **Step 3 (Tudo pronto!):** Rocket pulse + summary + CTA "Começar a usar".
9. Botões footer: Voltar (ghost), Próximo (gradient blue), Pular (link tertiary só no step 2 → 3).
10. AnimatePresence mode="wait" com slide horizontal entre steps.

Commit: `style(onboarding): wizard 4-steps V2 com BrasilAPI + NCM search (REDESIGN-1 ETAPA-11)`

---

### ETAPA 12 — Aplicar nos 8 apps existentes V1 (3-4h)

V1 tem 10 apps; foco visual em 8: Drive, Pessoas, Chat, Configurações, RH, Magic Store, Governança, Auditoria.

Para cada app:

1. Remover cores hardcoded (`bg-zinc-800`, `text-violet-400`)
2. Substituir por tokens (`bg-[var(--bg-surface)]`, `text-[var(--text-primary)]`)
3. Aplicar primitivas das ETAPAS 8-9
4. Skeleton estrutural via `AppLoader` (R13)
5. `key` em Suspense interno (R15)
6. Título consistente loading/error/success (R16)
7. Sidebar items com active state V2-style (R12)
8. Validar smoke + **AMBOS modos**

Commits separados:

- `style(drive): aplicar V2 (REDESIGN-1 ETAPA-12.1)`
- `style(pessoas): aplicar V2 (REDESIGN-1 ETAPA-12.2)`
- `style(chat): aplicar V2 (REDESIGN-1 ETAPA-12.3)`
- `style(configuracoes): aplicar V2 + Theme toggle UI (REDESIGN-1 ETAPA-12.4)`
- `style(rh): aplicar V2 (REDESIGN-1 ETAPA-12.5)`
- `style(magic-store): aplicar V2 (REDESIGN-1 ETAPA-12.6)`
- `style(governanca): aplicar V2 (REDESIGN-1 ETAPA-12.7)`
- `style(auditoria): aplicar V2 (REDESIGN-1 ETAPA-12.8)`

⚠️ Cores de app em light: amarelo flúor `#f0fc05` (Comércio) pode perder contraste. Documentar pendência se ajuste não trivial.

---

### ETAPA 13 — Login + Register + Staff (1h)

- `routes/login.tsx` — card centered max-w-sm bg-elevated glass-border radius-xl shadow-lg padding 32px
- `routes/register.tsx` — same + preview CNPJ card glass quando válido
- `routes/select-company.tsx`
- `routes/staff.tsx`

Aplicar tokens, primitivas. Validar ambos modos.

Commit: `style(routes): login/register/select-company/staff canônicos (REDESIGN-1 ETAPA-13)`

---

### ETAPA 14 — Validação final (45min)

1. Build limpo:

```bash
pkill -9 -f vite 2>/dev/null
rm -rf apps/shell-commercial/node_modules/.vite apps/shell-commercial/dist 2>/dev/null
pnpm --filter=@aethereos/shell-commercial build 2>&1 | tail -20
```

2. Subir:

```bash
nohup pnpm --filter=@aethereos/shell-commercial dev > /tmp/redesign-final.log 2>&1 &
sleep 12
curl -s -o /dev/null -w "Shell HTTP: %{http_code}\n" http://127.0.0.1:5174/
```

3. Gates:

```bash
pnpm ci:full
pnpm test:smoke
set -a; source tooling/e2e/.env.local; set +a; pnpm test:e2e:full
```

E2E pode precisar ajustes de seletor.

4. Atualizar `SPRINT_LOG.md` + `KNOWN_LIMITATIONS.md`.

5. Commit final: `chore: encerramento sprint redesign-1 V2-real aplicado dark+light`

---

## VALIDAÇÃO VISUAL HUMANA OBRIGATÓRIA

Validar **em AMBOS modos** (toggle no TopBar).

### Modo Dark (default)

#### Críticos

- [ ] **Background slate-tinted** `#0f151b` (não preto puro)
- [ ] **TopBar 49px SÓLIDA** sem blur, com logo "ÆTHEREOS" + GradientText "Enterprise OS v1.0.1"
- [ ] **Dock 80px** com magnification suave 48→72px + limelight indicator na tab ativa
- [ ] **Drive + RH + Magic Store** abrem com visual consistente

#### Visual

- [ ] Mesa com 6 wallpapers (default/aurora/ocean/midnight/minimal/mesh)
- [ ] DesktopIcons 56×56 glass + label legível com text-shadow
- [ ] TabBar tab ativa em glass-bg + cor-app no ícone (sem borda inferior colorida)
- [ ] Tab Mesa pinned mostra "Home" texto
- [ ] **Sidebar item ativo** com `bg ${appColor}1a` + texto/ícone cor-app (sem border-left)
- [ ] AppContent padding bottom 144px (não cobre Dock)
- [ ] AppHeader com border-bottom subtle
- [ ] Dock context menu (right-click): Abrir, Adicionar na Mesa
- [ ] Dock 3-pontos menu: Ocultar dock, Todos os Apps, Suporte
- [ ] **AppDisabledScreen** quando módulo não ativo (CTA Magic Store)
- [ ] **CommandPalette Cmd+K** abre com busca animada + apps + ações
- [ ] Onboarding wizard 4 steps com progress dots + transições

### Modo Light

Toggle pra Light. Validar:

#### Críticos

- [ ] **Background off-white** `#fafaf9` (não branco puro)
- [ ] **TopBar SÓLIDA branca** sem blur
- [ ] **Dock visível** com glass black 2.5% + magnification
- [ ] Apps com visual consistente

#### Visual

- [ ] Wallpapers light (versões claras)
- [ ] DesktopIcons label com text-shadow branco
- [ ] Cards bg branco puro + border subtle
- [ ] Texto preto não puro (rgba 0,0,0,0.92)
- [ ] Sidebar mais escura que conteúdo branco

### UX rules (ambos modos)

- [ ] **Skeleton estrutural** (sidebar 220px + breadcrumb + cards)
- [ ] **Prefetch funciona** — hover Dock → app abre instantâneo na 2ª vez
- [ ] **Suspense com key** — sem flash anterior ao trocar seção
- [ ] **Títulos consistentes** loading/error/success

### Tipografia

- [ ] Inter no corpo
- [ ] Outfit nos h1-h3 e ÆTHEREOS
- [ ] JetBrains Mono em kbd shortcuts

### Funcional

- [ ] Login funciona
- [ ] CRUD em RH funciona
- [ ] Magic Store cards + drawer
- [ ] Onboarding wizard avança e completa
- [ ] Drive lista files
- [ ] Logout funciona
- [ ] Cmd+K abre CommandPalette

### Persistência

- [ ] Toggle no TopBar alterna instantaneamente
- [ ] Refresh mantém tema (sem flash)
- [ ] localStorage `aethereos-theme` persistido

### Acessibilidade

- [ ] Toggle Theme tem aria-label correto e aria-pressed
- [ ] `prefers-reduced-motion` desabilita magnification
- [ ] Focus rings visíveis em todos os botões/inputs
- [ ] Contraste OK em ambos modos (text-tertiary ≥ 4.5:1 sobre bg-base)

Se algum item falhar, voltar para etapa correspondente.

---

## SE ALGO QUEBRAR FUNCIONALMENTE

R6 inflexível. Se app quebrar:

1. Investigar e consertar
2. Reverter commit específico, dívida em `KNOWN_LIMITATIONS.md`, prosseguir

Não bloquear sprint inteiro por um app quebrado.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint REDESIGN-1 (V2-real dark+light) no Aethereos.

Antes de qualquer ação:
1. Lê DESIGN.md inteiro na raiz (canon V2-real v3.0)
2. Lê SPRINT_LOG.md
3. cat REDESIGN_DIAGNOSIS.md (se existir)
4. git log --oneline -15
5. Identifica última ETAPA concluída
6. Continua dali

Lembrar:
- DESIGN.md v3.0 é canon V2-real (extraído do código V2 verbatim)
- Default DARK, toggle Dark/Light em Settings + TopBar
- TopBar SÓLIDA sem blur, 49px
- TabBar tab ativa SEM borda inferior colorida
- Sidebar item ativo SEM border-left, só bg cor-app/0.1
- Dock 80px com magnification 48→72 + limelight
- CommandPalette Cmd+K (componente novo no V1)
- AppDisabledScreen (componente novo no V1)
- Skeleton estrutural literal de DESIGN.md 5.7
- Prefetch chunks no Dock obrigatório
- Suspense com key
- Validação humana em AMBOS modos
- Sem features novas, sem mexer em lógica
- Sem push pra origin sem aprovação humana

V2 referência viva em ~/Projetos/aethereos-v2/artifacts/aethereos/
V2 NÃO tem light mode — light é extensão neste sprint.
```

Salvar como `SPRINT_REDESIGN_1_PROMPT.md` na raiz do projeto.
