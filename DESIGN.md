# DESIGN.md — Aethereos Design System

> **Documento canônico extraído do V2 em produção.** Baseado em análise direta do código de `~/Projetos/aethereos-v2/artifacts/aethereos/` (tokens.css, index.css, components/os, components/app-shell, components/ui, apps/registry).
>
> Toda decisão visual em Camada 1 (`shell-commercial`) e em apps Camada 2 derivados deve respeitar este documento. Mudanças no design system são feitas via PR específica que atualiza este arquivo + commit referenciando.
>
> Se houver código que viola estas regras, é dívida técnica.
>
> **Inspiração:**
>
> - **Dark mode:** macOS Sequoia + Linear + Vercel + Raycast (escuro slate-tinted, premium, glass sutil)
> - **Light mode:** Notion + Apple (off-white acinzentado, soft, suave)

---

## 1. Filosofia visual

### 1.1 Princípios

1. **OS-first, não SaaS-first.** Aethereos é um sistema operacional no navegador. Hierarquia visual replica conceitos de OS — Mesa, Dock, TabBar, TopBar. Usuário sente-se em ambiente coerente, não em sequência de páginas.

2. **Dark default, Light first-class.** Aethereos abre em dark mode. Light é alternativa equivalente, com tokens próprios e qualidade ao mesmo nível.

3. **Glass sutil, não vibrante.** Glass material existe (Sequoia-style), com baixa opacidade. Em dark: `rgba(255,255,255,0.03)`. Em light: `rgba(0,0,0,0.025)`. É refinamento, não decoração.

4. **TopBar e TabBar SÓLIDAS** — sem backdrop-blur. Apenas Dock, dropdowns, modais e popovers usam glass.

5. **Profundidade através de camadas.** Em dark: `bg-base #0f151b → bg-elevated #191d21 → bg-surface #272d35`. Glass elements flutuam sobre.

6. **Movimento contextual.** Spring-based easing, framer-motion. Não anima sem propósito.

7. **Conteúdo é o protagonista.** Glass material é meio, não fim.

8. **Brasileiro discreto.** Espaçamento confortável, equilíbrio sóbrio.

### 1.2 O que NÃO é Aethereos

- ❌ Skeumorphism
- ❌ Flat puro
- ❌ Apple Tahoe (aurora colorida vibrante full-screen, TopBar com blur)
- ❌ Cyberpunk neon
- ❌ Bootstrap
- ❌ Light com preto puro #000 (cansa vista) — usar 0.92 alpha
- ❌ Dark com cinza claro (#222) — não é dark, é "cinza"

---

## 2. Modos: Dark e Light

### 2.1 Default e toggle

- **Default:** Dark (primeira visita sem preferência)
- **Toggle:** Dark ↔ Light, em Settings + ícone Sun/Moon no TopBar
- **Persistência:** `localStorage` chave `aethereos-theme` (`'dark'` | `'light'`) + sync com `kernel.user_preferences.theme` quando logado
- **System mode** (segue OS): evolução futura v2.1

### 2.2 Implementação

- Classe no `<html>`: `dark` (default) ou nada/`light`
- shadcn/ui usa `:is(.dark *)` selector — funciona com classe
- ThemeProvider lê localStorage no mount, aplica classe, expõe `setTheme(theme)`

### 2.3 Anti-flash on load

Script inline no `<head>` ANTES do bundle JS:

```html
<script>
  (function () {
    var t = localStorage.getItem("aethereos-theme") || "dark";
    document.documentElement.classList.add(t);
  })();
</script>
```

---

## 3. Tokens CSS — V2 reais

⚠️ **Estes valores são extraídos do `tokens.css` e `index.css` reais do V2 em produção.** Não inventar.

### 3.1 Tokens primários — DARK

```css
:root.dark,
html.dark,
html:not(.light) {
  /* Backgrounds (slate-tinted, NÃO preto puro) */
  --bg-base: #0f151b; /* Mesa, sidebars, AppFrame */
  --bg-elevated: #191d21; /* AppContent, cards, modais */
  --bg-surface: #272d35; /* hover, inputs, header de tabela */
  --bg-overlay: rgba(0, 0, 0, 0.6);

  /* Glass (white com baixa opacidade) */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-bg-hover: rgba(255, 255, 255, 0.06);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-hover: rgba(255, 255, 255, 0.12);
  --glass-blur: 24px;
  --glass-blur-heavy: 40px;

  /* Text */
  --text-primary: rgba(255, 255, 255, 0.95);
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-tertiary: rgba(255, 255, 255, 0.35);
  --text-disabled: rgba(255, 255, 255, 0.2);

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.1);
  --border-hover: rgba(255, 255, 255, 0.15);
  --border-focus: rgba(37, 99, 235, 0.5);

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
  --shadow-dock:
    0 8px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.06);
}
```

### 3.2 Tokens primários — LIGHT (Notion/Apple style)

```css
:root,
html.light {
  /* Backgrounds (off-white acinzentado) */
  --bg-base: #fafaf9; /* Mesa, sidebars */
  --bg-elevated: #ffffff; /* AppContent, cards (branco puro) */
  --bg-surface: #f4f4f3; /* hover, inputs, header tabela */
  --bg-overlay: rgba(0, 0, 0, 0.4);

  /* Glass (black com baixa opacidade — inverso do dark) */
  --glass-bg: rgba(0, 0, 0, 0.025);
  --glass-bg-hover: rgba(0, 0, 0, 0.05);
  --glass-border: rgba(0, 0, 0, 0.08);
  --glass-border-hover: rgba(0, 0, 0, 0.12);
  --glass-blur: 24px;
  --glass-blur-heavy: 40px;

  /* Text (não preto puro) */
  --text-primary: rgba(0, 0, 0, 0.92);
  --text-secondary: rgba(0, 0, 0, 0.6);
  --text-tertiary: rgba(0, 0, 0, 0.4);
  --text-disabled: rgba(0, 0, 0, 0.25);

  /* Borders */
  --border-subtle: rgba(0, 0, 0, 0.05);
  --border-default: rgba(0, 0, 0, 0.08);
  --border-hover: rgba(0, 0, 0, 0.12);
  --border-focus: rgba(37, 99, 235, 0.5);

  /* Shadows mais visíveis (light precisa pra ter profundidade) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --shadow-dock: 0 8px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.06);
}
```

### 3.3 Tokens compartilhados (idênticos em ambos modos)

```css
:root,
html.light,
html.dark {
  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-dock: 22px;

  /* Transitions */
  --transition-fast: 120ms ease;
  --transition-default: 200ms ease;
  --transition-slow: 300ms ease;
  --transition-spring: 400ms cubic-bezier(0.16, 1, 0.3, 1);

  /* App colors (cravadas V2 — usar EXATAMENTE estas) */
  --color-mesa: #64748b; /* slate */
  --color-dashboard: #64748b; /* slate (ou primary blue na hover) */
  --color-comercio: #f0fc05; /* amarelo flúor */
  --color-logitix: #059669; /* emerald */
  --color-erp: #7c3aed; /* violet */
  --color-rh: #8b5cf6; /* violet (NÃO emerald!) */
  --color-notes: #eab308; /* amber */
  --color-calendar: #0ea5e9; /* sky */
  --color-drive: #06b6d4; /* cyan */
  --color-messaging: #06b6d4; /* cyan */
  --color-crm-vendas: #f97316; /* orange */
  --color-projects: #8b5cf6; /* violet */
  --color-magic-store: #0ea5e9; /* sky */
  --color-administrativo: #f59e0b; /* amber (app "Gestor") */
  --color-support: #64748b; /* slate */
  --color-settings: #64748b; /* slate */
  --color-empresas: #06b6d4; /* cyan (admin only) */
  --color-admin: #ef4444; /* red (admin only) */
  --color-ae-ai: #8b5cf6; /* violet — Copilot Aethereos */
  --color-neutral: #64748b;

  /* Status semantic */
  --status-success: #10b981;
  --status-warning: #f59e0b;
  --status-error: #ef4444;
  --status-info: #3b82f6;

  /* Typography */
  --font-sans:
    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui,
    sans-serif;
  --font-display: "Outfit", "Inter", sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", "Fira Code", monospace;
}
```

⚠️ **Atenção a cores em light:** algumas (ex: `--color-comercio #f0fc05` amarelo flúor) podem perder contraste em fundo branco. Pendência caso-a-caso na ETAPA 10 — não bloqueia sprint.

### 3.4 Tokens HSL para shadcn/Tailwind v4

```css
/* DARK */
:root.dark,
html.dark {
  --background: 210 24% 8%; /* ≈ #0f151b */
  --foreground: 0 0% 95%;
  --card: 215 9% 12%; /* ≈ #191d21 */
  --card-foreground: 0 0% 95%;
  --card-border: 0 0% 15%;
  --popover: 220 10% 18%; /* ≈ #272d35 */
  --popover-foreground: 0 0% 95%;
  --popover-border: 0 0% 15%;
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  --secondary: 215 9% 14%;
  --secondary-foreground: 0 0% 95%;
  --muted: 215 9% 17%;
  --muted-foreground: 0 0% 55%;
  --accent: 215 9% 17%;
  --accent-foreground: 0 0% 95%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 95%;
  --border: 0 0% 100% / 0.1;
  --input: 0 0% 100% / 0.1;
  --ring: 217 91% 60% / 0.5;
  --sidebar: 210 24% 7%;
  --sidebar-foreground: 0 0% 95%;
  --sidebar-border: 0 0% 100% / 0.08;
  --sidebar-primary: 217 91% 60%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 215 9% 17%;
  --sidebar-accent-foreground: 0 0% 95%;
  --sidebar-ring: 217 91% 60% / 0.5;
  --radius: 0.625rem;
}

/* LIGHT */
:root,
html.light {
  --background: 60 5% 98%; /* ≈ #fafaf9 */
  --foreground: 0 0% 8%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 8%;
  --card-border: 0 0% 90%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 8%;
  --popover-border: 0 0% 90%;
  --primary: 217 91% 50%;
  --primary-foreground: 0 0% 100%;
  --secondary: 60 5% 95%;
  --secondary-foreground: 0 0% 8%;
  --muted: 60 5% 92%;
  --muted-foreground: 0 0% 40%;
  --accent: 60 5% 92%;
  --accent-foreground: 0 0% 8%;
  --destructive: 0 72% 50%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 0% / 0.08;
  --input: 0 0% 0% / 0.08;
  --ring: 217 91% 50% / 0.5;
  --sidebar: 60 5% 96%;
  --sidebar-foreground: 0 0% 8%;
  --sidebar-border: 0 0% 0% / 0.06;
  --sidebar-primary: 217 91% 50%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 60 5% 92%;
  --sidebar-accent-foreground: 0 0% 8%;
  --sidebar-ring: 217 91% 50% / 0.5;
  --radius: 0.625rem;
}
```

### 3.5 Tailwind v4 — `@theme inline`

```css
@theme inline {
  --font-sans:
    "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui,
    sans-serif;
  --font-display: "Outfit", sans-serif;

  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-sidebar: hsl(var(--sidebar));
  --color-sidebar-foreground: hsl(var(--sidebar-foreground));
  --color-sidebar-border: hsl(var(--sidebar-border));
  --color-sidebar-primary: hsl(var(--sidebar-primary));

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

---

## 4. Tipografia

### 4.1 Fonts

- **Inter** (`--font-sans`): corpo, UI, inputs, botões. Pesos 400, 500, 600, 700.
- **Outfit** (`--font-display`): h1-h6, hero. Pesos 400, 500, 600, 700, 800.
- **JetBrains Mono** (`--font-mono`): código, IDs, kbd.

```html
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

### 4.2 Hierarquia (V2 real)

| Uso                | Tamanho                  | Peso    | Font             |
| ------------------ | ------------------------ | ------- | ---------------- |
| Display (hero)     | 56px / -1.5px tracking   | 700-800 | Outfit           |
| H1 (page title)    | 28-32px                  | 700     | Outfit           |
| H2 (section title) | 20-22px                  | 600     | Outfit           |
| H3 (sub-section)   | 18px                     | 600     | Outfit           |
| AppHeader title    | **18px**                 | 600     | Outfit/Inter     |
| H4 (card title)    | 15px                     | 600     | Inter            |
| Body large         | 14-15px                  | 400     | Inter            |
| **Body (default)** | **13px**                 | **400** | **Inter**        |
| Tab text           | 12px                     | 500     | Inter            |
| Sidebar item       | 13px                     | 500     | Inter            |
| Caption            | 11px                     | 400-500 | Inter            |
| Tooltip            | 11-12px                  | 500     | Inter            |
| Label uppercase    | 10-11px / 0.5px tracking | 600     | Inter, uppercase |
| Kbd                | 9-10px                   | 400     | JetBrains Mono   |

**Default 13px** (Linear/Sequoia density).

---

## 5. Componentes — Padrões V2 reais

### 5.1 OSDesktop (root)

```tsx
<div
  className="flex flex-col h-screen w-screen overflow-hidden"
  style={{ background: "var(--bg-base)" }}
>
  <TopBar onSearchClick={() => setPaletteOpen(true)} />
  <div className="flex-1 flex flex-col overflow-hidden relative">
    <TabBar />
    <AppFrame />
  </div>
  <Dock />
  <AEAIModal />
  {needsOnboarding && <OnboardingWizard />}
  <CommandPalette open={paletteOpen} onClose={closePalette} />
</div>
```

**Ctrl+K / Cmd+K** abre CommandPalette globalmente. Esc fecha.

### 5.2 TopBar (49px, SÓLIDA)

⚠️ **Altura 49px** (V2 real). Sem backdrop-blur.

```tsx
<div
  className="flex-none flex items-center justify-between select-none z-50"
  style={{
    height: 49,
    paddingLeft: 16,
    paddingRight: 16,
    background: 'var(--bg-base)',
    borderBottom: '1px solid var(--border-subtle)',
  }}
>
```

**Esquerda:** Logo "ÆTHEREOS" 15px font-bold tracking-tight + "Enterprise OS v1.0.1" 10px com **GradientText animado** (linear-gradient #3b82f6 → #a855f7 → #ec4899, duration 3s, repeat infinity).

**Direita** (gap 8px):

1. **Dropdown CNPJ** com 3 seções: "Empresa ativa" / "Filiais" / "Grupo Econômico"
   - Trigger: `flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[var(--glass-bg-hover)]`, ícone Building2 14px + CNPJ formatado 11px font-medium + ChevronDown
   - Dropdown content: max-h-420px, com headers uppercase 10px tracking-wider tertiary
2. **Separador vertical** (1px × 18px, var(--border-subtle))
3. **TopBarSearch** animada (gooey filter SVG + particles + gradient sweep + shimmer + kbd ⌘K)
   - Width: 120px → 180px on hover (spring stiffness 400 damping 25)
   - Trigger Ctrl+K abre CommandPalette
4. **Messenger button** (MessageCircle 18px strokeWidth 1.8) — 32×32, hover bg-white/[0.06]
5. **Notifications button** (Bell 18px) com badge ponto vermelho 8px ring 2px var(--bg-base)
6. **Avatar** 26px com border 1px var(--border-subtle); fallback gradient slate + iniciais

### 5.3 TabBar (40px)

```tsx
<div
  style={{
    height: 40,
    background: hasOpenApps ? 'var(--bg-base)' : 'transparent',
    borderBottom: hasOpenApps ? '1px solid var(--border-subtle)' : 'none',
    padding: '0 8px',
    gap: 4,
  }}
>
```

**Tab sortable (drag-drop @dnd-kit):**

- Height 32px, radius-md (10px)
- **Pinned (Mesa):** mostra texto **"Home"** 11px font-medium, padding 0 10px, sem ×
- **Não-pinned:** padding 0 12px, gap 6px, max-w-160px (com ícone 14px cor-app + título 12px font-medium truncate max-w-120px + × 14px aparece on-hover)
- **Inativa:** transparent (border 1px transparent se não-pinned, var(--glass-border) se pinned)
- **Ativa:** `background: var(--glass-bg)`, `border: 1px solid var(--glass-border)`, `boxShadow: var(--shadow-sm)`. **Sem borda inferior colorida.**
- Hover não-ativa: bg var(--glass-bg-hover)

**Lógica especial:**

- Tab Mesa (pinned) **escondida** quando não há outros apps
- Quando Mesa ativa: TabBar fica `absolute top-0 left-0 right-0 z-10` (sobreposta na Mesa)
- Quando há apps abertos: `flex-none relative z-0` (parte do flex)

**Direita** (spacer empurra):

- Botão "Widgets" (texto 11px font-medium em pill `h-7 px-2.5 rounded-md border-glass-border`) — só visível quando Mesa ativa

### 5.4 Mesa

Subcomponentes V2:

- `MesaApp.tsx` (root)
- `DesktopGrid.tsx` (grid principal, drag-drop dos ícones)
- `DesktopIcon.tsx` (ícone individual 80×80, label embaixo)
- `WallpaperPicker.tsx` (modal seleção wallpaper)
- `WidgetGallery.tsx` (modal galeria widgets)
- `AppPicker.tsx` (modal escolher app pra adicionar à Mesa)
- `widgets/`: NoteWidget, WeatherWidget, CalendarWidget, EventsWidget

**Wallpapers:**

| ID         | Dark                                                                                          | Light                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `default`  | `radial-gradient(ellipse at top, #1a1a3e 0%, #0a0a1a 50%, #050510 100%)`                      | `radial-gradient(ellipse at top, #f4f4f0 0%, #fafaf9 50%, #ffffff 100%)`                      |
| `aurora`   | `radial-gradient(ellipse at bottom left, #0a1628 0%, #0d1b2a 30%, #1a0a2e 70%, #0a0a14 100%)` | `radial-gradient(ellipse at bottom left, #f0f4ff 0%, #fff0f8 30%, #f8f0ff 70%, #fafaff 100%)` |
| `ocean`    | `linear-gradient(160deg, #0c1929 0%, #0a2540 40%, #061a2e 100%)`                              | `linear-gradient(160deg, #ecf3ff 0%, #e0f0ff 40%, #f0f8ff 100%)`                              |
| `midnight` | `radial-gradient(circle at 30% 20%, #1a1040 0%, #0a0a18 60%, #050508 100%)`                   | `radial-gradient(circle at 30% 20%, #f0e8ff 0%, #fafaf9 60%, #ffffff 100%)`                   |
| `minimal`  | `#0f151b`                                                                                     | `#fafaf9`                                                                                     |
| `mesh`     | mesh dark sutil (azul/roxo/verde)                                                             | mesh light pastel sutil (rosa/azul/lilás)                                                     |

**Wallpaper é estático** (não anima).

**DesktopIcon:**

- Container 56×56 com `bg-[var(--glass-bg)]`, `border 1px var(--glass-border)`, `radius-lg`
- Ícone 48px cor-do-app
- Hover: `bg-[var(--glass-bg-hover)]`, `border-glass-border-hover`, `shadow-sm`, `scale(1.05)`
- Selected: ring 2px var(--border-focus) + bg blue/0.1
- Label `text-[11px] font-medium`, max-w-72px text-center truncate, text-shadow contextual:
  - Dark: `0 1px 3px rgba(0,0,0,0.8)`
  - Light: `0 1px 2px rgba(255,255,255,0.8)`
- Spacing grid 90×100
- Stagger fade-in ao aparecer

### 5.5 Dock (80px, magnification 48→72)

⚠️ **Altura 80px**, `bottom-8` (V2 real). Magnification 48→72px (não 44→64).

**Container:**

```tsx
<motion.div
  onMouseMove={(e) => mouseX.set(e.pageX)}
  onMouseLeave={() => mouseX.set(Infinity)}
  className="flex items-end gap-3 rounded-2xl bg-background/90 dark:bg-[#0f151b]/90 backdrop-blur-2xl shadow-2xl border border-border/50 px-4 pb-4 h-20"
>
```

- Position: `fixed bottom-8 left-1/2 -translate-x-1/2 z-50`
- Hidden em mobile (`hidden md:block`), substituído por `DockMobile` (vertical expand)
- Background: `bg-background/90 dark:bg-[#0f151b]/90` + `backdrop-blur-2xl`
- Border: `border border-border/50`
- Radius: `rounded-2xl` (= radius-xl ~16-20px)
- Shadow: `shadow-2xl`
- Padding: `px-4 pb-4`
- Gap entre ícones: 3 (12px Tailwind = 0.75rem)
- Items align-end (ícones crescem para cima)

**Magnification (Framer Motion):**

- `useTransform(distance, [-150, 0, 150], [48, 72, 48])` — width/height
- `useTransform(distance, [-150, 0, 150], [24, 36, 24])` — icon
- `useSpring(transform, { mass: 0.1, stiffness: 150, damping: 12 })`
- Container NÃO muda tamanho — ícones crescem
- Respeitar `prefers-reduced-motion`

**DockIcon:**

- aspectSquare flex items-center justify-center
- Radius `rounded-xl` (~12-14px)
- Ícone Lucide 24px strokeWidth 1.5 cor `text-muted-foreground`
- **Hover classes específicas por app id** (mapa HOVER_CLASSES):
  ```typescript
  'comercio': 'hover:text-yellow-500 hover:bg-yellow-500/20'
  'logitix': 'hover:text-emerald-500 hover:bg-emerald-500/20'
  'erp': 'hover:text-violet-500 hover:bg-violet-500/20'
  'magic-store': 'hover:text-fuchsia-500 hover:bg-fuchsia-500/20'
  'rh': 'hover:text-violet-500 hover:bg-violet-500/20'
  'admin': 'hover:text-red-500 hover:bg-red-500/20'
  'drive': 'hover:text-cyan-500 hover:bg-cyan-500/20'
  'crm-vendas': 'hover:text-orange-500 hover:bg-orange-500/20'
  'support': 'hover:text-green-500 hover:bg-green-500/20'
  // ... ver registry completo
  ```

**Limelight indicator (tab ativa):**

```tsx
<motion.div
  layoutId="limelight-bar"
  className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-[4px] rounded-full bg-primary shadow-[0_20px_15px_var(--primary)]"
/>
<div className="absolute -top-1 left-1/2 -translate-x-1/2 w-[120%] h-10 [clip-path:polygon(10%_100%,30%_0,70%_0,90%_100%)] bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
```

Barra horizontal 32×4px primary com glow + cone gradient apontando pra baixo. `layoutId` permite Framer Motion animar transição entre tabs.

**Tooltip:** `-top-10 left-1/2 rounded-md border-border/50 bg-popover px-2 py-1 text-xs font-medium shadow-lg z-50` com fade in/out (duration 0.15).

**Prefetch:** `onMouseEnter` dispara `prefetchApp(app.id)` (Set evita download duplo).

**Context menu (right-click):** popup com "Abrir" + "Adicionar na Mesa".

```tsx
background: "rgba(30, 30, 40, 0.95)";
backdropFilter: "blur(40px)";
border: "1px solid rgba(255,255,255,0.12)";
boxShadow: "0 16px 48px rgba(0,0,0,0.5)";
```

**DockMenuIcon (3 pontos EllipsisVertical):**

- Mesma magnification dos outros ícones
- Click abre popup com:
  - "Ocultar dock" (texto vermelho)
  - "Todos os Apps" (abre app `all-apps`)
  - "Suporte" (texto verde)
- Quando dock hidden: aparece botão "Mostrar dock" `fixed bottom-4 left-1/2`

**DockDashboardMenu:** Dashboard tem submenu próprio com 3 itens (Visão Geral, Métricas, Atividade) via portal.

**DockMobile (`<md:hidden`):**

- Position: `fixed bottom-4 right-4`
- Botão hamburger LayoutGrid 10×10 rounded-full
- Apps expandem verticalmente em fade up + stagger 50ms

### 5.6 AppFrame

```tsx
<div
  className="flex-1 overflow-hidden relative"
  style={{ background: "var(--bg-base)" }}
>
  {tabs.map((tab) => (
    <TabPane
      key={tab.id}
      tabId={tab.id}
      appId={tab.appId}
      isActive={tab.id === activeTabId}
    />
  ))}
</div>
```

**TabPane (memoizado):**

```tsx
<div
  className="absolute inset-0 flex flex-col"
  style={{
    visibility: isActive ? "visible" : "hidden",
    pointerEvents: isActive ? "auto" : "none",
    zIndex: isActive ? 1 : 0,
  }}
>
  {enabled ? (
    <ErrorBoundary onReset={handleReset}>
      <Suspense fallback={<AppLoader appId={appId} />}>
        <AppComponent />
      </Suspense>
    </ErrorBoundary>
  ) : (
    <AppDisabledScreen appId={appId} />
  )}
</div>
```

**Estado preservado** — `visibility: hidden` em vez de unmount. Não perde scroll, form values, etc.

### 5.7 AppLoader (skeleton estrutural V2 — copiar exato)

⚠️ **Inviolável.** Para apps com `hasInternalNav: true`:

```tsx
<div className="flex h-full w-full overflow-hidden">
  {/* Sidebar skeleton */}
  <div
    className="flex flex-col shrink-0"
    style={{
      width: 220,
      background: "var(--bg-base)",
      borderRight: "1px solid var(--border-subtle)",
      padding: "12px 8px",
    }}
  >
    {/* App header skeleton */}
    <div className="flex items-center gap-3 px-2 mb-4">
      <div
        className="w-9 h-9 rounded-xl animate-pulse shrink-0"
        style={{ backgroundColor: `${app.color}25` }}
      />
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-16 rounded bg-white/8 animate-pulse" />
        <div className="h-2.5 w-24 rounded bg-white/5 animate-pulse" />
      </div>
    </div>
    {/* Nav items skeleton */}
    <div className="flex flex-col gap-1">
      {[108, 88, 96, 72, 104].map((w, i) => (
        <div
          key={i}
          className="flex items-center gap-2 animate-pulse"
          style={{
            height: 34,
            padding: "0 10px",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div className="w-4 h-4 rounded bg-white/6 shrink-0" />
          <div className="h-3 rounded bg-white/6" style={{ width: w }} />
        </div>
      ))}
    </div>
  </div>

  {/* Content skeleton */}
  <div
    className="flex-1 flex flex-col overflow-hidden"
    style={{ background: "var(--bg-elevated)" }}
  >
    {/* Breadcrumb skeleton */}
    <div
      className="shrink-0 px-5 pt-4 pb-3"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-12 rounded bg-white/6 animate-pulse" />
        <div className="h-2.5 w-2 rounded bg-white/4 animate-pulse" />
        <div className="h-2.5 w-20 rounded bg-white/6 animate-pulse" />
      </div>
    </div>
    {/* Content area skeleton */}
    <div className="flex-1 overflow-hidden px-6 py-5">
      <div className="max-w-[1100px] mx-auto space-y-4">
        <div className="h-6 w-48 rounded bg-white/6 animate-pulse" />
        <div className="h-3 w-72 rounded bg-white/4 animate-pulse" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-5 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 rounded bg-white/6" />
                  <div className="h-2.5 w-56 rounded bg-white/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
</div>
```

Para apps simples (`hasInternalNav: false`):

```tsx
<div
  className="flex-1 flex flex-col items-center justify-center gap-3"
  style={{ background: "var(--bg-base)" }}
>
  <Icon size={40} style={{ color: app.color, opacity: 0.5 }} />
  <p className="text-white/30 text-sm">Carregando {app.name}...</p>
</div>
```

(Em light mode, ajustar `text-white/30` para `text-black/40` via classes utility com tema.)

### 5.8 AppDisabledScreen (módulo não ativado)

⚠️ Quando app requer empresa e não está habilitado:

```tsx
<div
  className="flex-1 flex flex-col items-center justify-center gap-5 p-8"
  style={{ background: "var(--bg-base)" }}
>
  <div className="relative">
    <div
      className="w-20 h-20 rounded-2xl flex items-center justify-center"
      style={{ backgroundColor: (app?.color ?? "#64748b") + "15" }}
    >
      <Icon
        size={36}
        style={{ color: app?.color ?? "#64748b", opacity: 0.4 }}
      />
    </div>
    <div
      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
      style={{
        background: "var(--bg-elevated)",
        border: "2px solid var(--bg-base)",
      }}
    >
      <Lock size={14} className="text-white/30" />
    </div>
  </div>

  <div className="text-center max-w-sm">
    <h2
      className="text-[16px] font-semibold mb-1.5"
      style={{ color: "var(--text-primary)" }}
    >
      {app?.name} não está ativado
    </h2>
    <p
      className="text-[13px] leading-relaxed"
      style={{ color: "var(--text-secondary)" }}
    >
      Este aplicativo não está habilitado para a sua empresa. Acesse o Magic
      Store para ativá-lo.
    </p>
  </div>

  <button
    onClick={() => openApp("magic-store", "Magic Store")}
    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0ea5e9]/15 border border-[#0ea5e9]/20 text-[#0ea5e9] text-[13px] font-medium hover:bg-[#0ea5e9]/25 transition-colors cursor-pointer"
  >
    <Store size={15} strokeWidth={1.5} />
    Ir ao Magic Store
  </button>
</div>
```

### 5.9 AppShell (app interno com sidebar)

**AppLayout** (composição):

```tsx
<div className="flex h-full w-full overflow-hidden">
  <AppSidebar items={...} activeItem={...} appColor={app.color} collapsed onToggle />
  <AppContent>{children}</AppContent>
</div>
```

**AppSidebar:**

- Width: 220px (collapsed: 56px) — toggle com PanelLeftClose/PanelLeftOpen
- Background: `var(--bg-base)` (mais escuro que conteúdo)
- Border-right: 1px var(--border-subtle)
- Padding: 12px 8px
- Botão toggle no fim (16px ícone, h-10)

**SidebarButton (item):**

```tsx
<button
  style={{
    height: 34,
    padding: "0 10px",
    borderRadius: "var(--radius-md)",
    gap: 8,
    ...(isActive ? { backgroundColor: `${appColor}1a` } : {}), // 10% alpha
  }}
>
  <span
    style={{
      width: 16,
      height: 16,
      color: isActive ? appColor : "var(--text-tertiary)",
    }}
  >
    {item.icon}
  </span>
  <span
    className="text-[13px] font-medium truncate flex-1"
    style={{ color: isActive ? appColor : "var(--text-secondary)" }}
  >
    {item.label}
  </span>
  {item.badge > 0 && (
    <span
      className="rounded-full text-[11px] font-medium leading-none px-1.5 py-0.5"
      style={{ background: "var(--glass-bg)", color: "var(--text-secondary)" }}
    >
      {item.badge}
    </span>
  )}
</button>
```

⚠️ **NÃO há border-left 2px no item ativo.** Active state é apenas `bg ${appColor}1a` (~6.6% alpha) + ícone/texto cor-app.

Hover não-ativo: `bg-[var(--glass-bg-hover)]`.

**Groups:** items podem ter `group: 'string'`. Header do grupo: `text-[10px] uppercase tracking-wider font-semibold tertiary` com margin-top 12px.

**AppContent:**

```tsx
<div
  className="flex-1 overflow-y-auto"
  style={{ background: "var(--bg-elevated)", padding: "24px 24px 144px 24px" }}
>
  <div className="max-w-[1200px] mx-auto">{children}</div>
</div>
```

⚠️ **Padding bottom 144px** pra acomodar Dock embaixo (80px + margem).

Scrollbar custom 6px:

```css
.flex-1.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.flex-1.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}
.flex-1.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.14);
}
```

**AppHeader (interno do app, no children do AppContent):**

```tsx
<div
  className="flex justify-between items-center pb-4 mb-6"
  style={{ borderBottom: "1px solid var(--border-subtle)" }}
>
  <div>
    <h1
      className="text-[18px] font-semibold"
      style={{ color: "var(--text-primary)" }}
    >
      {title}
    </h1>
    {subtitle && (
      <p
        className="text-[13px] mt-0.5"
        style={{ color: "var(--text-secondary)" }}
      >
        {subtitle}
      </p>
    )}
  </div>
  {actions && <div className="flex items-center gap-2">{actions}</div>}
</div>
```

### 5.10 OnboardingWizard (4 steps)

Overlay: `bg-black/70 backdrop-blur-[24px]`, full inset.

Card: `max-w-xl`, bg-elevated, border-glass, radius-xl, shadow-lg.

**4 Steps cravados:**

1. **Sua Empresa** (Building2): Nome Fantasia + Telefone
2. **Endereço** (MapPin): CEP (com BrasilAPI lookup) + Número + Logradouro + Bairro + Cidade + UF
3. **Produtos** (Package): Search NCM com 3 botões (Compro/Vendo/Ambos), lista selecionados
4. **Tudo pronto!** (Rocket): summary + CTA "Começar a usar"

**Progress dots:**

- Completed: círculo 5×5 azul #2563eb com Check size 10 white
- Active: círculo 10×10 azul + ping animation opacity 0.4
- Future: círculo 1.5×1.5 var(--text-tertiary)
- Linha conectando: 16×1px azul se completed, var(--border-subtle) se future

**Step icon header:** circle 10×10 com `linear-gradient(135deg, #2563eb, #3b82f6)` + ícone 18px white.

**Inputs:** h-10 text-[13px], `bg: var(--bg-surface), border: var(--border-default), radius-md`.

**Botões footer:**

- "Voltar" ghost
- "Próximo" / "Começar a usar": h-9 px-5 text-[13px] font-medium white com `linear-gradient(to right, #2563eb, #1d4ed8)`
- "Pular" (step 2 → 3 only) link tertiary

**Animações:** entre steps `AnimatePresence mode="wait"` com `initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}`.

Step 4: Rocket 28px white em circle 16×16 com gradient + ping animation opacity 0.2.

### 5.11 CommandPalette (Ctrl+K)

Modal full-screen `fixed inset-0 z-[200] pt-[18vh]`.

**Backdrop:** `bg-black/60 backdrop-blur-md`.

**Modal:**

```tsx
<motion.div
  className="relative z-10 w-full max-w-[580px] rounded-2xl overflow-hidden"
  initial={{ opacity: 0, scale: 0.95, y: -20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95, y: -20 }}
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
  style={{
    background: 'rgba(15, 21, 27, 0.98)',  // dark only — adaptar light com white/0.98
    border: '1px solid rgba(139, 92, 246, 0.15)',  // purple sutil
    boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 80px rgba(139,92,246,0.08), 0 0 0 1px rgba(255,255,255,0.05)',
  }}
>
```

**Animações decorativas:**

- Animated gradient border glow (boxShadow inset purple/pink alterando, duration 4s)
- Top shimmer line (1/3 width purple→pink, sweeping `x: ['-100%', '400%']`, duration 3s)

**Conteúdo:**

- Search input: `h-12 text-[14px]`, ícone Search 16px tertiary (vira Sparkles purple quando query) + `kbd ESC` 10px right
- Divisor 1px white/[0.06]
- CommandList max-h-[320px] p-2
- CommandGroup heading: `text-[10px] font-semibold uppercase tracking-wider tertiary px-2 py-1.5`
- CommandItem: `flex gap-3 px-3 py-2.5 rounded-xl text-[13px]`
  - Apps: ícone 8×8 com `bg: ${color}20` + Lucide 15px cor-app + nome
  - Actions: ícone 15px + nome
  - Logout: red-400/70 → red-400 selected
- Footer: `border-t border-white/[0.06] px-4 py-2.5`, kbd ↑↓ navegar, ↵ abrir, ⌘K busca

### 5.12 AEAIModal (Cmd+K — concorrente — V2 tem ambos)

⚠️ **V2 tem AMBOS** AEAIModal e CommandPalette com Cmd+K. Conflito potencial. No V1, manter só CommandPalette com Cmd+K e AEAIModal com outro shortcut (sugestão: Cmd+J ou botão dedicado no Dock).

Estrutura V2:

- Overlay: `bg-black/70 backdrop-blur-[12px]`
- Container: `max-w-3xl` flex-col, `maxHeight: calc(100vh - 120px)`
- Subcomponentes: `ChatArea` (mensagens scrollables) + `GlowingInputBar` (input com glow animado)

### 5.13 Botões (V2 são Replit-style)

V2 usa shadcn customizado com `hover-elevate active-elevate-2`:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary-border",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border-destructive-border",
        outline:
          "border [border-color:var(--button-outline)] shadow-xs active:shadow-none",
        secondary:
          "border bg-secondary text-secondary-foreground border border-secondary-border",
        ghost: "border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
  },
);
```

⚠️ **`hover-elevate active-elevate-2` são utilities Replit** que aplicam pseudo-overlay para hover/active states. No V1, **substituir por classes nativas**:

```tsx
// hover-elevate equivalente:
"hover:brightness-110 active:brightness-95 active:scale-[0.98] transition-all duration-150";
```

Variantes explicitadas (V1):

**Primary:**

```tsx
"px-4 h-9 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-[13px] font-medium border border-blue-700 transition-all duration-150";
```

**Secondary:**

```tsx
"px-4 h-9 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] font-medium hover:bg-[var(--bg-surface)] active:scale-[0.98] transition-all duration-150";
```

**Outline:**

```tsx
"px-4 h-9 rounded-md border border-[var(--border-default)] bg-transparent text-[var(--text-primary)] text-[13px] font-medium hover:bg-[var(--glass-bg-hover)] active:scale-[0.98] transition-all duration-150";
```

**Ghost:**

```tsx
"px-3 h-9 rounded-md bg-transparent border border-transparent text-[var(--text-secondary)] text-[13px] font-medium hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] transition-all duration-150";
```

**Destructive:**

```tsx
"px-4 h-9 rounded-md bg-red-600/10 border border-red-600/20 text-red-400 dark:text-red-400 text-[13px] font-medium hover:bg-red-600/20 active:scale-[0.98] transition-all duration-150";
```

**Link:** `text-blue-500 underline-offset-4 hover:underline text-[13px] font-medium`

**Sizes** (min-h, V2 real):

- `sm`: min-h-8 px-3 text-xs
- `default`: min-h-9 px-4
- `lg`: min-h-10 px-8
- `icon`: h-9 w-9

**Disabled:** `opacity-50 pointer-events-none`

### 5.14 Inputs

```tsx
<input className="w-full h-9 px-3 rounded-md bg-[var(--bg-surface)] border border-[var(--border-default)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--border-focus)] focus:ring-1 focus:ring-blue-600/30 focus:outline-none transition-colors duration-120" />
```

**Variantes V2:**

- Onboarding: h-10 text-[13px] com style explícito
- Forms gerais: h-9

**Label:** `text-[12px] font-medium var(--text-secondary)` — Onboarding usa 12px, não 11px uppercase.

**Erro:** `border-red-500 ring-1 ring-red-500/30` + mensagem `text-[11px] text-red-400 mt-1`.

### 5.15 Cards

```tsx
<div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-5 transition-all duration-150">
```

**Hover (clicável):** `hover:border-[var(--border-hover)] hover:shadow-sm hover:-translate-y-px`

### 5.16 Tabelas (DataTable)

```tsx
<table>
  <thead>
    <tr className="bg-[var(--bg-surface)]">
      <th className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] px-4 py-3 text-left">
        ...
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--glass-bg-hover)] transition-colors duration-120">
      <td className="text-[13px] text-[var(--text-primary)] px-4 py-3">...</td>
    </tr>
  </tbody>
</table>
```

### 5.17 Badges

```tsx
className =
  "rounded-full px-2 py-0.5 text-[11px] font-medium inline-flex items-center gap-1";
```

**Variantes:**

- success: `bg-green-500/15 text-green-700 dark:text-green-400`
- warning: `bg-amber-500/15 text-amber-700 dark:text-amber-400`
- error: `bg-red-500/15 text-red-700 dark:text-red-400`
- info: `bg-blue-500/15 text-blue-700 dark:text-blue-400`
- neutral: `bg-[var(--glass-bg)] text-[var(--text-secondary)]`

### 5.18 Dialogs / Modais

**Overlay:** `bg-black/60 backdrop-blur-md fixed inset-0 z-50`. Em light: `bg-black/40`.

**Content:**

```tsx
className =
  "bg-[var(--bg-elevated)] border border-[var(--glass-border)] rounded-xl shadow-[var(--shadow-lg)] max-w-[640px] w-full p-6";
```

**Animação:** scale 0.95→1 + opacity 0→1, `transition-spring`.

**Header:** title h2 (18-20px font-semibold) + close button × top-right.

**Footer:** `pt-4 border-t border-[var(--border-subtle)]`, botões alinhados à direita.

### 5.19 Drawers

Mesmo padrão Dialog mas:

- Position: `fixed right-0 top-0 h-full`
- Width: 480-640px
- Border-radius: 0
- Animação: slide-in da direita `translateX(100%) → 0`

### 5.20 Toasts

```tsx
className =
  "bg-[var(--bg-elevated)] border border-[var(--glass-border)] rounded-lg shadow-[var(--shadow-lg)] p-3 px-4 max-w-[380px]";
```

- Position: `fixed bottom-4 right-4 z-50`
- Auto-dismiss: 5s success, 8s warning/error
- Animação: slide-in da direita

### 5.21 Empty States (shadcn primitive)

V2 usa primitive shadcn `Empty / EmptyHeader / EmptyMedia / EmptyTitle / EmptyDescription / EmptyContent`:

```tsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <Users />
    </EmptyMedia>
    <EmptyTitle>Nenhum colaborador</EmptyTitle>
    <EmptyDescription>
      Cadastre o primeiro colaborador da sua empresa.
    </EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button>Criar colaborador</Button>
  </EmptyContent>
</Empty>
```

Container Empty: `flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-balance rounded-lg border-dashed p-6 text-center md:p-12`.

### 5.22 Skeleton (primitive shadcn — V2 trivial)

```tsx
<Skeleton className="h-4 w-32" />
// = <div className="animate-pulse rounded-md bg-primary/10 h-4 w-32" />
```

Pra skeleton estrutural (apps), usar diretamente com tokens var(--bg-surface) + animate-pulse — ver seção 5.7.

---

## 6. Movimento

### 6.1 Tokens

| Token                  | Valor                                 | Uso                          |
| ---------------------- | ------------------------------------- | ---------------------------- |
| `--transition-fast`    | `120ms ease`                          | Hover de botão, color shifts |
| `--transition-default` | `200ms ease`                          | Tab switch, content fade     |
| `--transition-slow`    | `300ms ease`                          | Layout shifts                |
| `--transition-spring`  | `400ms cubic-bezier(0.16, 1, 0.3, 1)` | Modals, drawers, springs     |

### 6.2 Framer Motion configs canônicos

```typescript
// Dock magnification
const SPRING_CONFIG = { mass: 0.1, stiffness: 150, damping: 12 };

// Tooltip / Modal entrance
{ type: 'spring', stiffness: 400, damping: 25 }

// Stagger lista
transition={{ delay: idx * 0.05, duration: 0.2 }}

// Tab pinning entrance
{ duration: 0.15 }
```

### 6.3 Theme toggle animation

```css
html {
  transition:
    background-color 200ms ease,
    color 200ms ease;
}
body,
body * {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-duration: 200ms;
  transition-timing-function: ease;
}
```

⚠️ Não aplicar em `*` global — performance.

### 6.4 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

E no JS, desabilitar magnification do Dock.

---

## 7. Estados de carregamento (UI/UX rules cravadas — V2)

### 7.1 Skeleton estrutural — não genérico

⚠️ **Inviolável.** TODA tela carregando via `React.lazy` ou query DEVE ter skeleton que reproduz **estrutura real** do layout final.

V2 implementou esta regra **diretamente no AppFrame** — copiar o `AppLoader` da seção 5.7 literal.

### 7.2 Prefetch de chunks no Dock

⚠️ **Inviolável.** TODO app no `APP_REGISTRY` DEVE ter entrada em `APP_PREFETCH`:

```typescript
const APP_PREFETCH: Record<string, () => Promise<unknown>> = {
  mesa: () => import("./mesa/MesaApp"),
  dashboard: () => import("./dashboard/DashboardApp"),
  // ... TODOS os apps
};

const prefetchedApps = new Set<string>();

export function prefetchApp(appId: string): void {
  if (prefetchedApps.has(appId)) return;
  const loader = APP_PREFETCH[appId];
  if (loader) {
    prefetchedApps.add(appId);
    loader().catch(() => prefetchedApps.delete(appId));
  }
}
```

`onMouseEnter` no DockIcon dispara `prefetchApp(app.id)`.

### 7.3 Suspense com `key`

⚠️ **Inviolável.** TODO `<Suspense>` que envolve conteúdo dinâmico DEVE ter `key`:

```tsx
<Suspense key={activeId} fallback={<SectionFallback />}>
  {renderSection(activeId)}
</Suspense>
```

### 7.4 Títulos consistentes

⚠️ **Inviolável.** Loading/error/success têm o **mesmo título**:

```tsx
const title = "Drive Minha Empresa";
if (isLoading)
  return (
    <>
      <h2>{title}</h2>
      <Skeleton />
    </>
  );
if (isError)
  return (
    <>
      <h2>{title}</h2>
      <ErrorState onRetry={refetch} />
    </>
  );
return (
  <>
    <h2>{title}</h2>
    <Content data={data} />
  </>
);
```

### 7.5 Estados obrigatórios

| Estado  | Quando                          |
| ------- | ------------------------------- |
| Loading | Antes dos dados                 |
| Error   | Falha de query/API (com retry)  |
| Empty   | Sucesso mas sem dados (com CTA) |
| Success | Conteúdo real                   |

---

## 8. APP_REGISTRY (V2 cravado — 19 apps)

```typescript
export const APP_REGISTRY: OSApp[] = [
  {
    id: "mesa",
    name: "Mesa",
    icon: "Monitor",
    color: "#64748b",
    showInDock: false,
    closeable: false,
    hasInternalNav: false,
    alwaysEnabled: true,
  },
  {
    id: "dashboard",
    name: "Dashboard",
    icon: "LayoutDashboard",
    color: "#64748b",
    showInDock: true,
    closeable: true,
    hasInternalNav: false,
  },
  {
    id: "comercio",
    name: "Comércio Digital",
    icon: "ShoppingCart",
    color: "#f0fc05",
    showInDock: true,
    requiresCompany: true,
    hasInternalNav: true,
  },
  {
    id: "logitix",
    name: "LOGITIX",
    icon: "Truck",
    color: "#059669",
    showInDock: true,
    requiresCompany: true,
    hasInternalNav: true,
  },
  {
    id: "erp",
    name: "ERP",
    icon: "BarChart3",
    color: "#7C3AED",
    showInDock: true,
    requiresCompany: true,
    hasInternalNav: true,
  },
  {
    id: "rh",
    name: "Recursos Humanos",
    icon: "Users",
    color: "#8B5CF6",
    showInDock: true,
    requiresCompany: true,
    hasInternalNav: true,
  },
  {
    id: "notes",
    name: "Notas",
    icon: "StickyNote",
    color: "#eab308",
    showInDock: false,
    requiresCompany: true,
    hasInternalNav: false,
  },
  {
    id: "calendar",
    name: "Agenda",
    icon: "Calendar",
    color: "#0ea5e9",
    showInDock: false,
    requiresCompany: true,
    hasInternalNav: false,
  },
  {
    id: "drive",
    name: "Drive",
    icon: "HardDrive",
    color: "#06b6d4",
    showInDock: true,
    requiresCompany: true,
    hasInternalNav: false,
  },
  {
    id: "messaging",
    name: "Mensagens",
    icon: "MessageCircle",
    color: "#06b6d4",
    showInDock: true,
    requiresCompany: true,
    hasInternalNav: false,
  },
  {
    id: "crm-vendas",
    name: "CRM Vendas",
    icon: "TrendingUp",
    color: "#f97316",
    showInDock: true,
    requiresCompany: true,
    hasInternalNav: true,
  },
  {
    id: "projects",
    name: "Projetos",
    icon: "FolderKanban",
    color: "#8b5cf6",
    showInDock: true,
    requiresCompany: true,
    hasInternalNav: true,
  },
  {
    id: "magic-store",
    name: "Magic Store",
    icon: "Store",
    color: "#0ea5e9",
    showInDock: true,
    requiresCompany: true,
    hasInternalNav: true,
    alwaysEnabled: true,
  },
  {
    id: "all-apps",
    name: "Todos os Apps",
    icon: "AppWindow",
    color: "#64748b",
    showInDock: false,
    hasInternalNav: false,
    alwaysEnabled: true,
  },
  {
    id: "support",
    name: "Suporte",
    icon: "HelpCircle",
    color: "#64748b",
    showInDock: false,
    hasInternalNav: false,
    alwaysEnabled: true,
  },
  {
    id: "administrativo",
    name: "Gestor",
    icon: "Briefcase",
    color: "#f59e0b",
    showInDock: true,
    requiresCompany: true,
    hasInternalNav: true,
  },
  {
    id: "settings",
    name: "Configurações",
    icon: "Settings",
    color: "#64748b",
    showInDock: true,
    hasInternalNav: true,
    alwaysEnabled: true,
  },
  {
    id: "empresas",
    name: "Empresas",
    icon: "Building2",
    color: "#06b6d4",
    showInDock: true,
    requiresAdmin: true,
    hasInternalNav: true,
  },
  {
    id: "admin",
    name: "Admin",
    icon: "Shield",
    color: "#ef4444",
    showInDock: true,
    requiresAdmin: true,
    hasInternalNav: true,
  },
];
```

**APP_TO_MODULE legacy SCP:**

```typescript
export const APP_TO_MODULE: Record<string, string> = {
  comercio: "comercio_digital",
};
```

**Flags:**

- `showInDock` — visível no Dock?
- `requiresCompany` — precisa de empresa ativa pra abrir?
- `requiresAdmin` — só platform admin?
- `closeable` — pode fechar tab?
- `hasInternalNav` — tem AppShell sidebar?
- `alwaysEnabled` — sempre disponível (ignora module enable)?
- `opensAsModal` (não no registry exemplo, mas usado no Dock pra `ae-ai`) — abre como modal em vez de tab

---

## 9. Acessibilidade

### 9.1 Contraste

**Dark:**

- text-primary (0.95 white) sobre bg-base #0f151b: > 16:1 ✅ AAA
- text-secondary (0.55) sobre bg-base: > 7:1 ✅ AAA
- text-tertiary (0.35): > 4.5:1 ✅ AA
- ⚠️ Nunca usar text-disabled (0.2) como texto principal

**Light:**

- text-primary (0.92 black) sobre bg-base #fafaf9: > 14:1 ✅ AAA
- text-secondary (0.6) sobre bg-base: > 7:1 ✅ AAA
- text-tertiary (0.4): > 4.5:1 ✅ AA

### 9.2 Focus visible

```css
:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
```

### 9.3 Aria labels

- Botão fechar tab: `aria-label="Fechar Drive"`
- Ícone do dock: `aria-label="Drive"` + `data-testid="dock-app-drive"`
- Toggle tema: `aria-label="Alternar para modo claro"` (em dark) com `aria-pressed={theme === 'dark'}`
- Toggle sidebar: `aria-label="Recolher sidebar"` ou `aria-label="Expandir sidebar"`

### 9.4 Keyboard

- Tab order respeitada
- Esc fecha modal/drawer/CommandPalette
- Cmd+K / Ctrl+K abre CommandPalette
- Enter ativa CTA primário
- ↑↓ navega listas e CommandPalette

---

## 10. Responsividade

```
sm: 640px    md: 768px    lg: 1024px    xl: 1280px    2xl: 1536px
```

**Aethereos é desktop-first.**

### 10.1 Mobile (<768px)

- TopBar: padding reduzido, esconde nome empresa
- TabBar: escondida (um app por vez)
- Dock: **DockMobile** dedicado — bottom-right, hamburger LayoutGrid + expand vertical, ícones 10×10 rounded-full, sem magnification
- Mesa: escondida — abre direto no Dashboard
- AppSidebar: drawer toggle por hamburger
- AppContent: padding 16px

### 10.2 Tablet (768-1024px)

- TopBar completa
- TabBar: tabs só ícone
- Dock: ícones reduzidos, magnification 1.15 max
- AppSidebar: collapsed (56px) com expand on hover

### 10.3 Desktop (>1024px)

Padrão completo.

---

## 11. Iconografia

### 11.1 Library

**lucide-react** padrão.

| Contexto       | Tamanho | StrokeWidth |
| -------------- | ------- | ----------- |
| Default        | 20px    | 1.5         |
| Dock           | 24px    | 1.5         |
| Sidebar item   | 16px    | 1.5         |
| TopBar (ações) | 18px    | 1.8         |
| TabBar tab     | 14px    | 1.5         |
| Badge          | 12px    | 1.5         |

### 11.2 Cor

- Inativo: `var(--text-tertiary)` ou `var(--text-secondary)`
- Ativo / hover: cor do app
- Disabled: `var(--text-disabled)`

### 11.3 Tipos especiais (Dock)

App pode ter:

- `iconType: 'lucide'` (default — usa nome do icon)
- `iconType: 'gif'` + `iconSrc` (URL gif, escala 2x, glow pulse)
- `iconType: 'image'` + `iconSrc` (URL imagem, escala 1.375x, rounded-xl)

### 11.4 Emojis

Permitidos em Magic Store, chat, status, onboarding, empty states com moderação.

---

## 12. Imagens e ilustrações

### 12.1 Avatares

- Square com `rounded-full`
- Fallback: gradient slate (`bg-gradient-to-br from-slate-500 to-slate-700`) + iniciais 11px font-semibold white
- Tamanhos: 24, 26, 32, 40, 56, 80
- Border: `1px solid var(--border-subtle)`

### 12.2 Logos de empresa

- Upload no Onboarding wizard (futuro V2 integration)
- Fallback: nome da empresa em texto + cor derivada

### 12.3 Empty states

Usar primitive `<Empty>` (5.21).

---

## 13. Anti-patterns

**Não fazer:**

1. ❌ `bg-blue-500` direto — sempre via tokens
2. ❌ `bg-zinc-900`, `bg-gray-800` — usar tokens
3. ❌ Sombras pesadas em superfícies não-flutuantes
4. ❌ Border solid sem alpha
5. ❌ Animações em loop (pulse, bounce) exceto loaders/skeletons
6. ❌ Tooltips em hover de elementos óbvios
7. ❌ Modal sobre modal
8. ❌ Cores neon
9. ❌ Border-radius < 6px em componentes principais
10. ❌ Botões só com ícone sem aria-label
11. ❌ Fonts genéricas em vez de Inter/Outfit
12. ❌ **TopBar com backdrop-blur** (regra V2)
13. ❌ **TabBar com borda inferior colorida** (Sequoia, não Chrome)
14. ❌ **Sidebar item ativo com border-left** (V2 usa só bg cor-app/0.1)
15. ❌ **Skeleton genérico** ("Carregando..." em tela vazia)
16. ❌ Suspense sem `key` em conteúdo dinâmico
17. ❌ Títulos diferentes em loading vs success
18. ❌ Spinner em área grande
19. ❌ Light com preto puro #000
20. ❌ Dark com cinza claro (#222)
21. ❌ App novo sem entrada em `APP_PREFETCH`
22. ❌ Aurora colorida vibrante full-screen (não somos Tahoe)

---

## 14. Implementação técnica

### 14.1 Stack

- **CSS variables:** `apps/shell-commercial/src/styles/tokens.css`
- **Tailwind v4** com `@theme inline` em `globals.css`
- **shadcn/ui** primitivas customizadas com tokens
- **framer-motion** para animações
- **lucide-react** para ícones
- **@dnd-kit** para drag-drop (TabBar, Mesa)
- **Inter + Outfit + JetBrains Mono** via Google Fonts

### 14.2 ThemeProvider

```tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("aethereos-theme") as Theme | null;
    setThemeState(stored ?? "dark");
  }, []);

  const setTheme = (newTheme: Theme) => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(newTheme);
    localStorage.setItem("aethereos-theme", newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
```

### 14.3 Estrutura de arquivos

```
apps/shell-commercial/src/
├── styles/
│   ├── tokens.css          # variáveis CSS dark + light
│   ├── globals.css         # imports + @theme inline + reset
│   └── animations.css      # keyframes (shimmer, glow, marquee)
├── components/
│   ├── ui/                 # shadcn primitives (button, input, card, dialog, ...)
│   ├── os/                 # OS components (TopBar, TabBar, Dock, Mesa, ...)
│   └── app-shell/          # AppLayout, AppSidebar, AppContent, AppHeader
├── lib/
│   └── theme/
│       ├── theme-provider.tsx
│       └── theme-toggle.tsx
└── apps/
    ├── registry.ts         # APP_REGISTRY + APP_PREFETCH + isAppEnabled
    └── <app-id>/           # cada app
```

---

## 15. Manutenção

- Cosméticas: ajustar variable em `tokens.css` (ambos blocos) → propaga
- Estruturais: atualizar este `DESIGN.md` primeiro, depois código
- Conflitos com features: 80% feature errada, 20% design system precisa evoluir
- **Validar em ambos modos** antes de merge

---

## 16. Glossário

| Termo                     | Significado                                                                     |
| ------------------------- | ------------------------------------------------------------------------------- |
| **Glass / Glassmorphism** | Material translúcido sutil (3% opacity dark / 2.5% light)                       |
| **Sequoia-style**         | Inspiração macOS Sequoia (dark mode)                                            |
| **Notion/Apple-light**    | Inspiração light mode (off-white acinzentado)                                   |
| **Mesa**                  | Área de trabalho principal                                                      |
| **Dock**                  | Barra flutuante de atalhos                                                      |
| **TabBar**                | Barra de tabs ativas                                                            |
| **TopBar**                | Barra superior sólida (não glass)                                               |
| **AppFrame**              | Container que renderiza app ativo                                               |
| **AppShell**              | AppLayout + AppSidebar + AppContent                                             |
| **AppHeader**             | Header interno do app (título + ações)                                          |
| **AE AI / AEAIModal**     | Copilot Aethereos (modal full-screen)                                           |
| **CommandPalette**        | Cmd+K spotlight (busca apps + ações)                                            |
| **Limelight**             | Indicador da tab ativa no Dock (barra + cone gradient)                          |
| **HOVER_CLASSES**         | Mapa de cores específicas por app id no Dock                                    |
| **APP_REGISTRY**          | Registry central de apps                                                        |
| **APP_PREFETCH**          | Map de apps → import dinâmico                                                   |
| **APP_TO_MODULE**         | Map legacy SCP (comercio → comercio_digital)                                    |
| **ThemeProvider**         | Context React que gerencia dark/light                                           |
| **TabPane**               | Wrapper memoizado de cada app no AppFrame (visibility hidden em vez de unmount) |
| **AppDisabledScreen**     | Tela quando app requer empresa e módulo não está ativo                          |

---

## 17. Versão

**v3.0** — Canon V2-real extraído via análise direta do código. Abril 2026.

Histórico:

- v1.0: Tahoe/aurora animada (descartada — conceito divergente)
- v2.0: V2-based aproximado (incompleto — não cobria tudo)
- **v3.0: V2-real verbatim com light mode estendido (canon atual)**

Mudanças futuras:

- v3.1: Adicionar System mode (segue OS)
- v3.2: Wallpapers customizados upload
- v4.0: Camada 2 (apps SaaS standalone com identidades visuais próprias)
