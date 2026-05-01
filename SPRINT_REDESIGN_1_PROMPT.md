# SPRINT REDESIGN-1 — Aplicação do DESIGN.md (V2-based, dark + light)

> **Tipo:** Sprint dedicado a aplicar o design system canônico V2-based (`DESIGN.md` v2.0) em todo o `shell-commercial`. Inclui dark + light mode com toggle.
>
> Não adiciona features. Refaz a camada visual de Camada 1 do zero usando tokens canônicos.
>
> **Estimativa:** 10-16 horas. Custo: $100-160.

---

## CONTEXTO

### Por que este sprint

V2 do Aethereos (em `~/Projetos/aethereos-v2`) já tem design system maduro testado em produção: macOS Sequoia + Linear + Vercel + Raycast. Premium dark, glass sutil, TopBar sólida, prefetch de chunks, skeleton estrutural.

Sprint anterior tentou aplicar redesign macOS Tahoe (commits `9b89604` e `535f699`) mas:

1. Mudanças não chegaram ao browser
2. Conceito Tahoe (aurora animada vibrante, glass com saturate 180%) é divergente do que V2 provou funcionar

Decisão: **descartar Tahoe, aplicar V2 canon. Adicionar light mode (Notion/Apple style) já neste sprint.**

DESIGN.md v2.0 já reflete essas decisões — dark default, light first-class, toggle Dark/Light.

### V2 está em `~/Projetos/aethereos-v2` para referência

Quando útil, consultar:

- `artifacts/aethereos/src/index.css` — CSS real do V2 em produção (só dark)
- `DESIGN-POLISH-PROMPT.md` — prompt original
- `docs/UI-UX-RULES.md` — regras de skeleton/prefetch/Suspense
- `docs/AUDIT-RESULTADOS.md` — auditorias

V2 é referência, não código pra copiar literal — adapte ao contexto V1. ⚠️ V2 NÃO tem light mode — você está estendendo.

### Pontos de atenção descobertos em sessões anteriores

1. PWA pode estar cacheando bundle antigo (VitePWA service worker)
2. `apps/shell-commercial/lib/app-registry.ts` é legado, verificar imports
3. Múltiplas instâncias Vite zumbi após restarts — sempre `pkill -9 -f vite` antes de subir
4. Browser cache agressivo — testar em **aba anônima** com **DevTools → Network → "Disable cache"**
5. `@aethereos/ui-shell` importado por 8 apps — mudanças propagam
6. Bug histórico AppFrame — sempre `h-full`, nunca `flex-1` sem pai flex

---

## REGRAS INVIOLÁVEIS

**R1.** **Ler `DESIGN.md` (v2.0) na íntegra antes de tocar em qualquer código.** É canon V2-based, NÃO Tahoe. Toda decisão sai dele.

**R2.** Se algo no código atual viola o `DESIGN.md`, refazer. Não preservar implementações antigas.

**R3.** Commit por etapa: `style(<scope>): <descrição> (REDESIGN-1 ETAPA-N)`.

**R4.** Validação visual humana é gate obrigatório no fim. Não declarar fechado sem humano abrir browser e confirmar **em ambos os modos**.

**R5.** Não criar features novas. Não mexer em lógica de stores ou queries.

**R6.** Manter compatibilidade funcional: nenhum app pode quebrar.

**R7.** **Dark + Light desde o início.** Tokens, ThemeProvider, toggle — tudo. Não adiar light pra depois.

**R8.** Tokens CSS canônicos em `apps/shell-commercial/src/styles/tokens.css`. Nada hardcoded.

**R9.** Tailwind v4 + `@theme inline`. Variáveis CSS são fonte de verdade.

**R10.** **TopBar é SÓLIDA** em ambos modos (sem backdrop-blur). Regra cravada V2.

**R11.** **Skeleton estrutural obrigatório** — NÃO usar loader genérico.

**R12.** **Prefetch de chunks no Dock obrigatório** — todo app no `APP_REGISTRY` em `APP_PREFETCH`.

**R13.** **Suspense com `key`** sempre que envolve conteúdo dinâmico.

**R14.** **Títulos consistentes** loading/error/success.

**R15.** **Validar em AMBOS modos** antes de cada commit (não só dark).

**R16.** Não fazer push pra origin sem aprovação humana após validação visual.

---

## ROADMAP

### ETAPA 0 — Investigar por que redesign anterior não está visível (1h)

Investigações:

```bash
# Ver os commits do redesign Tahoe
git show 9b89604 --stat
git show 535f699 --stat

# Cache / Service Worker
grep -rn "registerSW\|VitePWA\|ServiceWorker" apps/shell-commercial/src/ apps/shell-commercial/index.html apps/shell-commercial/vite.config.ts
ls -la apps/shell-commercial/dist/ 2>/dev/null
ls -la apps/shell-commercial/node_modules/.vite/ 2>/dev/null | head

# CSS está sendo importado?
grep -rn "import.*\.css" apps/shell-commercial/src/main.tsx apps/shell-commercial/src/styles/

# Mudanças do redesign foram em arquivo importado?
git diff a803d1c..535f699 -- apps/shell-commercial/src/styles/
git diff a803d1c..535f699 -- apps/shell-commercial/src/components/os/
git diff a803d1c..535f699 -- apps/shell-commercial/src/apps/mesa/
```

Documentar achados em `REDESIGN_DIAGNOSIS.md` na raiz.

Possíveis fixes:

- Unregister service workers via main.tsx
- `clearCache` em dev
- Remover `apps/shell-commercial/node_modules/.vite/`
- Remover `apps/shell-commercial/dist/` se existir
- Confirmar que `globals.css` é importado por `main.tsx`

Commit: `chore(redesign): diagnostico cache+sw antes de aplicar design (REDESIGN-1 ETAPA-0)`

---

### ETAPA 1 — Tokens canônicos + ThemeProvider + Toggle (2h)

DESIGN.md seções 2, 3, 13.2.

**1. Criar `apps/shell-commercial/src/styles/tokens.css`** com:

- Tokens primários DARK (seção 3.1)
- Tokens primários LIGHT (seção 3.2)
- Tokens compartilhados (seção 3.3) — radius, transitions, app colors, status, fonts
- Tokens HSL DARK (seção 3.4)
- Tokens HSL LIGHT (seção 3.5)

**2. Criar `apps/shell-commercial/src/styles/globals.css`:**

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap");
@import "./tokens.css";
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* das seção 3.6 do DESIGN.md */
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
  /* Skeleton helper classes (DESIGN.md 7.1) */
  .skeleton-bg {
    @apply bg-black/5 dark:bg-white/5;
  }
  .skeleton-bg-card {
    @apply bg-black/[0.03] dark:bg-white/[0.03];
  }
  .skeleton-border {
    @apply border-black/[0.05] dark:border-white/[0.05];
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
```

**3. Adicionar script inline no `index.html` head (anti-flash):**

```html
<script>
  (function () {
    var t = localStorage.getItem("aethereos-theme") || "dark";
    document.documentElement.classList.add(t);
  })();
</script>
```

**4. Criar `apps/shell-commercial/src/lib/theme/theme-provider.tsx`** seguindo DESIGN.md 13.2.

**5. Criar `apps/shell-commercial/src/lib/theme/theme-toggle.tsx`:**

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
      className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] transition-[120ms]"
    >
      <Icon size={18} />
    </button>
  );
}
```

**6. No `main.tsx`:**

- Importar `globals.css`
- Wrap App em `<ThemeProvider>`
- Não chamar `classList.add('dark')` aqui — script inline no `<head>` já fez isso

Commit: `style(theme): tokens dark+light + ThemeProvider + Toggle (REDESIGN-1 ETAPA-1)`

**Validação visual humana antes de prosseguir:** abrir browser, confirmar:

- Tema dark funciona (background `#09090b`)
- Toggle alterna pra light (background `#fafaf9`)
- Sem flash on reload
- Persistência: refresh mantém tema escolhido

---

### ETAPA 2 — Mesa + 6 wallpapers gradientes (dark + light) (1.5h)

DESIGN.md seção 5.4.

1. `MesaApp.tsx`: 6 wallpapers gradientes estáticos com **versões dark e light**.
2. CSS variables `--wallpaper-X` que mudam por tema:

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
/* repetir pra aurora, ocean, midnight, minimal, mesh */
```

3. Selector de wallpaper em Configurações (existe em `mesaStore.ts`?). Se não existir UI, criar dropdown simples no app `configuracoes`.

4. **DesktopIcon** (5.4):
   - Container 56×56 glass-bg + glass-border + radius-lg
   - Ícone interno 48px
   - Hover scale(1.05) + shadow-sm
   - Label com text-shadow adaptado por tema
   - Stagger fade-in

Commit: `style(mesa): wallpapers dark+light + DesktopIcon canônico (REDESIGN-1 ETAPA-2)`

---

### ETAPA 3 — TopBar (sólida em ambos modos) + Theme Toggle integrado (1h)

DESIGN.md seções 5.1, 5.2.

1. `TopBar.tsx`:
   - Height 38px, bg-base SÓLIDO (sem blur)
   - Border-bottom subtle
   - Esquerda: badge "Ae" 24px gradient + nome empresa + dropdown
   - Direita: relógio + sino notificações + **ThemeToggle** (importar de `lib/theme/theme-toggle`) + avatar

2. Dropdowns (5.2): bg-elevated + glass-border + radius-lg + shadow-lg + blur-heavy 40px backdrop. Items hover glass-bg-hover.

Commit: `style(top-bar): sólida + theme toggle integrado (REDESIGN-1 ETAPA-3)`

---

### ETAPA 4 — TabBar (45min)

DESIGN.md seção 5.3.

1. Height 40px, bg-base, border-bottom subtle
2. Tabs 32px, radius-md
3. Inativa: transparent + tertiary; hover glass-bg-hover
4. Ativa: glass-bg + glass-border + shadow-sm + ícone full opacity cor do app
5. Pinned: só ícone 36px
6. Botão [+]: Plus tertiary
7. Drag-drop @dnd-kit (preservar)
8. Animação spring nas entradas

Commit: `style(tab-bar): tabs Sequoia-style com glass em ativa (REDESIGN-1 ETAPA-4)`

---

### ETAPA 5 — Dock + Prefetch (1h)

DESIGN.md seção 5.5 + regra R12.

1. Container glass-bg + blur-heavy + border + radius-dock + shadow-dock
2. Ícones 44px com Lucide 24px cor app
3. Magnification spring 400/25 (vizinhos 1.15, 2º grau 1.05, hover 1.35)
4. Respeitar `prefers-reduced-motion`
5. Dot indicador app aberto
6. Separadores antes de Magic Store e Admin
7. Tooltip 600ms delay

8. **PREFETCH (R12):**
   - Em `apps/shell-commercial/src/apps/registry.ts`, adicionar `APP_PREFETCH` map
   - `onMouseEnter` no DockIcon dispara `prefetchApp(app.id)`
   - Set `prefetchedApps` evita download duplo
   - Cobrir TODOS apps do `APP_REGISTRY`

Manter `data-testid="dock-app-{id}"` (validado E2E).

Commit: `style(dock): glass + magnification + prefetch chunks (REDESIGN-1 ETAPA-5)`

---

### ETAPA 6 — AppFrame + AppLoader + ErrorBoundary (1h)

DESIGN.md seção 5.6 + regras R11, R13, R14.

1. `AppFrame.tsx`: `h-full`, transparent bg, padding 0, TabPane opacity 0→1 150ms
2. **`AppLoader.tsx` — SKELETON ESTRUTURAL** (R11):
   - Apps com `hasInternalNav: true`: skeleton sidebar 220px + breadcrumb + cards placeholder
   - Apps simples: ícone + "Carregando" centralizado
   - Usar utility classes `.skeleton-bg`, `.skeleton-bg-card`, `.skeleton-border`
3. `ErrorBoundary.tsx`: bg-elevated + border-glass + radius-xl + shadow-lg + AlertCircle red + "Recarregar app" + "Reportar bug"
4. `SectionFallback.tsx` componente reutilizável pra Suspense interno

Commit: `style(app-frame): skeleton estrutural + error boundary canônicos (REDESIGN-1 ETAPA-6)`

---

### ETAPA 7 — AppShell (sidebar + main) (1h)

DESIGN.md seção 5.7.

1. `packages/ui-shell/src/components/app-shell/`:
   - AppSidebar 220px (collapsible 56px), bg-base, border-right subtle
   - Items 34px, radius-md, hover glass-bg-hover
   - **Ativo:** bg cor-do-app/0.1 + border-left 2px cor-do-app
   - AppContent bg-elevated, padding 24px, max-width 1200px
   - AppHeader título 18px + ações + border-bottom subtle

8 apps usam — propaga.

Commit: `style(ui-shell): AppShell V2 com active app-colored (REDESIGN-1 ETAPA-7)`

---

### ETAPA 8 — Primitivas UI (Button, Input, Select, etc) (1.5h)

DESIGN.md seções 5.8, 5.9.

Criar/atualizar em `apps/shell-commercial/src/components/ui/`:

- `button.tsx` — variants primary/secondary/ghost/danger; sizes sm/md/lg
- `input.tsx`
- `select.tsx` — Radix
- `checkbox.tsx`
- `radio.tsx`
- `switch.tsx` — Radix
- `textarea.tsx`
- `label.tsx`
- `badge.tsx` — variantes success/warning/error/info/neutral

⚠️ **Validar em ambos modos** — variantes danger e badges precisam ter cores que funcionam tanto em fundo escuro quanto claro.

Commit: `style(ui): primitivas canônicas dark+light validadas (REDESIGN-1 ETAPA-8)`

---

### ETAPA 9 — Cards, Tabelas, Modais, Drawers, Toasts (1h)

DESIGN.md seções 5.10-5.15.

- `card.tsx` (CardRoot/Header/Content/Footer)
- `table.tsx` — header bg-surface uppercase 11px tertiary
- `dialog.tsx` — overlay bg-black/60 (em light bg-black/40) + content
- `drawer.tsx` — slide-in da direita, 480/640px
- `toast.tsx` — bottom-right
- `popover.tsx` — Radix

Animações framer-motion. Validar ambos modos.

Commit: `style(ui): cards, tabelas, modais, drawers, toasts canônicos (REDESIGN-1 ETAPA-9)`

---

### ETAPA 10 — Aplicar nos 8 apps (2-3h)

Para cada app:

1. Remover cores hardcoded (`bg-zinc-800`, `text-violet-400`)
2. Substituir por tokens (`bg-[var(--bg-surface)]`, `text-[var(--text-primary)]`)
3. Substituir botões/inputs/cards/tables locais pelas primitivas
4. Aplicar skeleton estrutural (R11)
5. Aplicar `key` em Suspense interno (R13)
6. Manter título consistente (R14)
7. Validar smoke + **validar em ambos modos**

Apps:

- `style(drive): aplicar V2 (REDESIGN-1 ETAPA-10.1)`
- `style(pessoas): aplicar V2 (REDESIGN-1 ETAPA-10.2)`
- `style(chat): aplicar V2 (REDESIGN-1 ETAPA-10.3)`
- `style(configuracoes): aplicar V2 + adicionar toggle theme (REDESIGN-1 ETAPA-10.4)` — esta etapa também crava UI do toggle em settings
- `style(rh): aplicar V2 (REDESIGN-1 ETAPA-10.5)`
- `style(magic-store): aplicar V2 (REDESIGN-1 ETAPA-10.6)`
- `style(governanca): aplicar V2 (REDESIGN-1 ETAPA-10.7)`
- `style(auditoria): aplicar V2 (REDESIGN-1 ETAPA-10.8)`

⚠️ **Atenção a cores de app em light:** algumas (ex: amarelo flúor `#f0fc05` Comércio) podem perder contraste em fundo branco. Documentar pendência em `KNOWN_LIMITATIONS.md` se ajuste não trivial — não bloquear sprint.

---

### ETAPA 11 — Login + Register + Onboarding + Staff (1h)

- `routes/login.tsx` — card centered max-w-sm, bg-elevated, border-glass, radius-xl, padding 32px
- `routes/register.tsx` — same + preview CNPJ card
- `routes/select-company.tsx`
- `components/os/OnboardingWizard.tsx` — overlay bg-black/70 backdrop-blur-xl + card + progress dots + AnimatePresence
- `routes/staff.tsx`

Aplicar tokens, primitivas. Validar ambos modos.

Commit: `style(routes): login, register, select-company, staff, onboarding canônicos (REDESIGN-1 ETAPA-11)`

---

### ETAPA 12 — Validação final + commit consolidado (45min)

1. Build limpo:

```bash
cd ~/Projetos/aethereos
pkill -9 -f vite 2>/dev/null
rm -rf apps/shell-commercial/node_modules/.vite
rm -rf apps/shell-commercial/dist 2>/dev/null
pnpm --filter=@aethereos/shell-commercial build 2>&1 | tail -20
```

2. Subir Vite limpo:

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

E2E pode precisar ajuste de seletores. Corrigir testes (não features).

4. Atualizar `SPRINT_LOG.md` com seção REDESIGN-1.

5. Atualizar `KNOWN_LIMITATIONS.md` se houver pendências (cores de app em light, etc).

6. Commit final: `chore: encerramento sprint redesign-1 — V2 design system + light mode aplicados`

---

## VALIDAÇÃO VISUAL HUMANA OBRIGATÓRIA

⚠️ **Validar em AMBOS modos.**

Humano abre browser anônimo, login, e valida:

### Modo Dark (default)

#### Críticos (4 itens)

- [ ] **Background dark sólido** (`#09090b`) com gradient sutil nos cantos
- [ ] **TopBar SÓLIDA** sem blur (linha sutil embaixo)
- [ ] **Dock visível com glass blur 40px** + magnification suave
- [ ] **Drive + RH + Magic Store** abrem com visual consistente

#### Visual

- [ ] Mesa com 6 wallpapers selecionáveis
- [ ] DesktopIcons com glass + label legível + hover scale
- [ ] TabBar tab ativa em glass-bg + cor do app
- [ ] Dock dot indicador nos apps abertos
- [ ] Tooltip Dock após 600ms hover
- [ ] Separadores no Dock
- [ ] AppShell sidebar mais escura que conteúdo
- [ ] Item ativo na sidebar com border-left 2px cor app

### Modo Light

Toggle pra Light mode. Validar:

#### Críticos

- [ ] **Background off-white** (`#fafaf9`) com gradient sutil nos cantos
- [ ] **TopBar SÓLIDA** branca sem blur
- [ ] **Dock visível** com glass black 2.5% opacity + magnification
- [ ] **Drive + RH + Magic Store** abrem com visual consistente

#### Visual

- [ ] Wallpapers light (versões claras dos 6)
- [ ] DesktopIcons com glass adaptado + label com text-shadow branco
- [ ] TabBar tab ativa em glass black
- [ ] AppShell sidebar mais escura que conteúdo (que é branco puro)
- [ ] Cards bg branco puro com border subtle
- [ ] Texto preto (não puro #000) sobre fundo claro

### Toggle e persistência

- [ ] Toggle no TopBar alterna instantaneamente
- [ ] Refresh mantém tema escolhido (sem flash)
- [ ] localStorage `aethereos-theme` persistido

### UX rules (ambos modos)

- [ ] **Skeleton estrutural** (não loader genérico) em cada app
- [ ] **Prefetch funciona** — hover no Dock → app abre instantâneo na 2ª vez
- [ ] **Suspense com key** — sem flash de conteúdo anterior
- [ ] **Títulos consistentes** loading/error/success

### Tipografia e cor

- [ ] Inter renderiza no corpo
- [ ] Outfit renderiza nos h1-h3
- [ ] Sem cores neon
- [ ] Sem cores hardcoded (`bg-zinc-X` etc)
- [ ] Contraste OK em ambos modos
- [ ] Focus rings visíveis

### Funcional

- [ ] Login funciona
- [ ] CRUD em RH funciona
- [ ] Magic Store cards + drawer
- [ ] Onboarding wizard avança
- [ ] Drive lista files
- [ ] Logout funciona

### Acessibilidade

- [ ] Toggle Theme tem aria-label correto e aria-pressed
- [ ] `prefers-reduced-motion` desabilita magnification

Se algum item falhar, voltar para etapa correspondente.

---

## SE ALGO QUEBRAR FUNCIONALMENTE

R6 é regra inflexível. Se algum app quebrar:

1. Investigar e consertar
2. Reverter commit específico daquele app, dívida em `KNOWN_LIMITATIONS.md`, prosseguir

Não bloquear sprint inteiro por um app quebrado.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint REDESIGN-1 (V2-based dark+light) no Aethereos.

Antes de qualquer ação:
1. Lê DESIGN.md inteiro na raiz (canon V2-based v2.0)
2. Lê SPRINT_LOG.md
3. cat REDESIGN_DIAGNOSIS.md (se existir)
4. git log --oneline -15
5. Identifica última ETAPA concluída
6. Continua dali

Lembrar:
- DESIGN.md v2.0 é canon V2-based dark + light
- Default é DARK, toggle Dark/Light em Settings + TopBar
- TopBar SÓLIDA em ambos modos (regra cravada V2)
- Skeleton estrutural obrigatório
- Prefetch chunks no Dock obrigatório
- Suspense com key em conteúdo dinâmico
- Validação visual humana em AMBOS modos é gate obrigatório
- Sem features novas, sem mexer em lógica
- Sem push para origin sem aprovação humana

Referência V2 viva em ~/Projetos/aethereos-v2 (canon visual, mas só tem dark — light foi extensão neste sprint).
```

Salve este arquivo como `SPRINT_REDESIGN_1_PROMPT.md` na raiz do projeto antes de começar.
