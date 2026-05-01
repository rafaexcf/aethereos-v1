# DESIGN.md — Aethereos Design System

> **Documento canônico.** Toda decisão visual em Camada 1 (`shell-commercial`) e em apps Camada 2 derivados deve respeitar este documento. Mudanças no design system são feitas via PR específica que atualiza este arquivo + commit referenciando.
>
> Este documento é o canon. Se houver código que viola estas regras, é dívida técnica (não verdade alternativa).
>
> **Inspiração:**
>
> - **Dark mode:** macOS Sequoia + Linear + Vercel + Raycast (escuro, premium, glass sutil)
> - **Light mode:** Notion + Apple (off-white acinzentado, soft, suave)

---

## 1. Filosofia visual

### 1.1 Princípios fundamentais

1. **OS-first, não SaaS-first.** Aethereos é um sistema operacional no navegador, não um dashboard. Hierarquia visual replica conceitos de OS desktop — Mesa (área de trabalho), Dock (barra de apps), TabBar (tabs ativas), TopBar (menu global). O usuário deve sentir-se em um ambiente coerente, não em uma sequência de páginas.

2. **Dark default, Light first-class.** Aethereos abre em dark mode. Light mode é alternativa equivalente (não fallback), com tokens próprios e qualidade visual ao mesmo nível.

3. **Glass sutil, não vibrante.** Glass material existe (Sequoia-style), mas com baixa opacidade. Em dark: white com 3% opacity. Em light: black com baixa opacity. É refinamento, não efeito decorativo. Usado em Dock, dropdowns, popovers, modais. **TopBar é sólida em ambos os modos — sem blur.**

4. **Profundidade através de camadas, não de sombras pesadas.** Em dark, hierarquia vem de mais escuro → mais claro nas camadas. Em light, mais claro → mais branco. Glass elements flutuam sobre o resto.

5. **Movimento contextual, não decorativo.** Animações servem propósitos: feedback, transição de estado, hierarquia. Spring-based easing.

6. **Conteúdo é o protagonista.** Glass material e UI são meios pra destacar conteúdo.

7. **Brasileiro discreto.** Não decorativo, não barroco. Espaçamento confortável. Equilíbrio sóbrio.

### 1.2 O que NÃO é Aethereos

- ❌ Skeumorphism
- ❌ Flat puro (cores chapadas sem profundidade)
- ❌ Apple Tahoe (aurora colorida vibrante full-screen, TopBar com blur)
- ❌ Cyberpunk neon
- ❌ Pastel orgânico saturado
- ❌ Bootstrap (botões azul-padrão sem refinamento)
- ❌ Light mode high-contrast (preto puro #000 sobre branco puro #fff cansa vista)
- ❌ Dark mode com fundo cinza claro (#222 não é dark, é "cinza")

---

## 2. Modos: Dark e Light

### 2.1 Default e toggle

- **Default:** Dark (primeira visita sem preferência salva)
- **Toggle:** botão Dark ↔ Light em Settings (app `configuracoes`)
- **Persistência:** `localStorage` chave `aethereos-theme` (valores: `'dark'` | `'light'`) + sincronizado com `kernel.user_preferences.theme` quando logado
- **System mode** (segue OS): evolução futura v2.1, não v2.0

### 2.2 Implementação

- Classe no `<html>`: `dark` (default) ou `light`
- shadcn/ui usa `:is(.dark *)` selector — funciona com classe
- Tokens divergem em `:root` (light) e `.dark` (dark) — invertendo a convenção shadcn padrão
- ThemeProvider em React hooks lê localStorage no mount, aplica classe, expõe `setTheme(theme)`

### 2.3 Sem flash on load (FOIT/FOUC)

Script inline no `<head>` antes do bundle JS:

```html
<script>
  (function () {
    var t = localStorage.getItem("aethereos-theme") || "dark";
    document.documentElement.classList.add(t);
  })();
</script>
```

Sem isso, página carrega em light (default CSS), JS lê localStorage e troca pra dark — flash visível.

---

## 3. Tokens CSS

Todos os componentes consomem variáveis CSS, **nunca cores hard-coded**.

Estrutura: dois conjuntos de tokens convivem:

- **Tokens nomeados em rgba/hex** — fonte primária, mais legível.
- **Tokens HSL para shadcn/Tailwind v4** — convertidos pra HSL pra integração com `@theme inline`.

### 3.1 Tokens primários — DARK (default)

```css
:root.dark,
html.dark {
  /* Backgrounds */
  --bg-base: #09090b; /* fundo Mesa, sidebars */
  --bg-elevated: #111113; /* cards, conteúdo de apps, modais */
  --bg-surface: #18181b; /* hover, inputs, header de tabela */
  --bg-overlay: rgba(0, 0, 0, 0.6); /* overlay de modais */

  /* Glass (white com baixa opacidade) */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-bg-hover: rgba(255, 255, 255, 0.06);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-hover: rgba(255, 255, 255, 0.12);
  --glass-blur: 24px;
  --glass-blur-heavy: 40px;

  /* Text (white com decay) */
  --text-primary: rgba(255, 255, 255, 0.95);
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-tertiary: rgba(255, 255, 255, 0.35);
  --text-disabled: rgba(255, 255, 255, 0.2);

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.1);
  --border-hover: rgba(255, 255, 255, 0.15);
  --border-focus: rgba(37, 99, 235, 0.5);

  /* Shadows mais discretas (dark tem profundidade nativa) */
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
  /* Backgrounds (off-white acinzentado, Notion/Apple-style) */
  --bg-base: #fafaf9; /* fundo Mesa, sidebars (off-white) */
  --bg-elevated: #ffffff; /* cards, conteúdo de apps, modais (branco puro) */
  --bg-surface: #f4f4f3; /* hover, inputs (off-white mais escuro) */
  --bg-overlay: rgba(0, 0, 0, 0.4); /* overlay de modais */

  /* Glass (black com baixa opacidade — inverso do dark) */
  --glass-bg: rgba(0, 0, 0, 0.025);
  --glass-bg-hover: rgba(0, 0, 0, 0.05);
  --glass-border: rgba(0, 0, 0, 0.08);
  --glass-border-hover: rgba(0, 0, 0, 0.12);
  --glass-blur: 24px;
  --glass-blur-heavy: 40px;

  /* Text (black com decay — não preto puro #000) */
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

### 3.3 Tokens compartilhados (idênticos em ambos os modos)

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

  /* App colors (cravadas, mesmo em ambos modos — saturação alta) */
  --color-comercio: #f0fc05; /* amarelo flúor — Comércio Digital */
  --color-logitix: #059669; /* verde — LOGITIX */
  --color-erp: #7c3aed; /* roxo — ERP */
  --color-admin: #ef4444; /* vermelho — Governança/Admin */
  --color-appstore: #0ea5e9; /* sky — Magic Store */
  --color-drive: #06b6d4; /* cyan — Drive */
  --color-pessoas: #8b5cf6; /* violet — Pessoas/CRM */
  --color-chat: #06b6d4; /* cyan — Chat */
  --color-rh: #10b981; /* emerald — RH */
  --color-copilot: #8b5cf6; /* violet — AE AI Copilot */
  --color-auditoria: #f59e0b; /* amber — Auditoria */
  --color-settings: #64748b; /* slate — Configurações */
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

⚠️ **Importante:** algumas cores de app podem precisar ajuste em light (ex: amarelo flúor `#f0fc05` perde contraste em fundo branco). Ajuste será caso-a-caso na ETAPA 10 com validação visual; por enquanto manter as mesmas e documentar pendência.

### 3.4 Tokens HSL para shadcn/Tailwind v4 — DARK

```css
:root.dark,
html.dark {
  --background: 240 6% 4%; /* ≈ #09090b */
  --foreground: 0 0% 95%;
  --card: 240 5% 7%; /* ≈ #111113 */
  --card-foreground: 0 0% 95%;
  --card-border: 0 0% 15%;
  --popover: 240 5% 10%; /* ≈ #18181b */
  --popover-foreground: 0 0% 95%;
  --popover-border: 0 0% 15%;
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 4% 12%;
  --secondary-foreground: 0 0% 95%;
  --muted: 240 4% 15%;
  --muted-foreground: 0 0% 55%;
  --accent: 240 4% 15%;
  --accent-foreground: 0 0% 95%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 95%;
  --border: 0 0% 100% / 0.1;
  --input: 0 0% 100% / 0.1;
  --ring: 217 91% 60% / 0.5;
  --sidebar: 240 5% 6%;
  --sidebar-foreground: 0 0% 95%;
  --sidebar-border: 0 0% 100% / 0.08;
  --sidebar-primary: 217 91% 60%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 240 4% 15%;
  --sidebar-accent-foreground: 0 0% 95%;
  --sidebar-ring: 217 91% 60% / 0.5;
  --radius: 0.625rem;
}
```

### 3.5 Tokens HSL — LIGHT

```css
:root,
html.light {
  --background: 60 5% 98%; /* ≈ #fafaf9 */
  --foreground: 0 0% 8%; /* ≈ rgba(0,0,0,0.92) — não preto puro */
  --card: 0 0% 100%; /* branco puro pra cards */
  --card-foreground: 0 0% 8%;
  --card-border: 0 0% 90%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 8%;
  --popover-border: 0 0% 90%;
  --primary: 217 91% 50%; /* azul um pouco mais escuro pra contraste */
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
  --sidebar: 60 5% 96%; /* mais escuro que content (que é branco) */
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

### 3.6 Tailwind v4 — `@theme inline`

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

### 3.7 Espaçamento

Tailwind padrão (`p-1=4px ... p-12=48px`).

Pads container: 16-24px. Margens entre seções: 24-32px. Gap em listas: 8-12px.

---

## 4. Tipografia

### 4.1 Fonts

- **Inter** (`--font-sans`): corpo, UI, inputs, botões. Pesos: 400, 500, 600, 700.
- **Outfit** (`--font-display`): h1-h6, hero. Pesos: 400, 500, 600, 700, 800.
- **JetBrains Mono** (`--font-mono`): código, IDs.

Carregar via Google Fonts no `index.html`:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

### 4.2 Hierarquia tipográfica

| Uso                | Tamanho                | Peso    | Font             |
| ------------------ | ---------------------- | ------- | ---------------- |
| Display (hero)     | 56px / -1.5px tracking | 700-800 | Outfit           |
| H1 (page title)    | 28-32px                | 700     | Outfit           |
| H2 (section title) | 20-22px                | 600     | Outfit           |
| H3 (sub-section)   | 18px                   | 600     | Outfit           |
| H4 (card title)    | 15px                   | 600     | Inter            |
| Body large         | 15px                   | 400     | Inter            |
| **Body (default)** | **13px**               | **400** | **Inter**        |
| Body small         | 12px                   | 400     | Inter            |
| Caption            | 11px                   | 400-500 | Inter            |
| Label uppercase    | 11px / 0.5px tracking  | 600     | Inter, uppercase |

**Default do app é 13px** (Linear/Sequoia density).

### 4.3 Pesos

- 400 Regular — corpo
- 500 Medium — labels, links, items destacados
- 600 Semibold — H4, CTAs
- 700 Bold — H1-H3 (Outfit), display
- 800 Extra Bold — só hero

**Nunca usar** 100, 200, 300.

---

## 5. Componentes — Padrões canônicos

### 5.1 TopBar (Sequoia — SÓLIDA em ambos modos)

⚠️ **Regra cravada V2: TopBar NÃO tem backdrop-blur. É sólida.** Vale para dark e light.

- Height: **38px**
- Background: `var(--bg-base)` sólido (em ambos modos — em light é `#fafaf9`, em dark é `#09090b`)
- Border-bottom: `1px solid var(--border-subtle)`
- Padding horizontal: 16px

**Esquerda:**

- Logo "Ae" em badge 24px com gradient sutil azul-roxo
- "Aethereos" texto 13px font-medium
- Separador vertical (1px × 16px, `var(--border-subtle)`)
- Nome empresa: `text-[13px] font-medium var(--text-primary)`, truncate `max-w-[200px]`
- Dropdown de empresas se múltiplas

**Direita** (gap 8px):

- Relógio: `text-[13px] font-medium var(--text-secondary)` HH:mm
- Separador
- Sino notificações Bell 18px (badge ponto 8px se unread)
- **Toggle Theme:** ícone `Sun` (em dark) ou `Moon` (em light), 18px secondary, hover primary, click alterna
- Avatar 26px

### 5.2 Dropdowns (canônico — usar em todos)

- Background: `var(--bg-elevated)` (não glass — apenas elementos flutuantes-sobre-tudo são glass)
- Border: `1px solid var(--glass-border)`
- Border-radius: `var(--radius-lg)`
- Shadow: `var(--shadow-lg)`
- Backdrop-filter: `blur(var(--glass-blur-heavy))` (40px)
- Items: padding 8px 12px, radius `var(--radius-sm)`, hover `bg-[var(--glass-bg-hover)]`
- Animação: `scale(0.97) + opacity 0 → scale(1) + opacity 1`, spring

### 5.3 TabBar

- Height: 40px
- Background: `var(--bg-base)`
- Border-bottom: `1px solid var(--border-subtle)`
- Padding: 0 8px

**Cada tab:**

- Height: 32px (margin vertical auto)
- Padding: 0 12px
- Border-radius: `var(--radius-md)`
- Gap: 6px
- Ícone: 14px, cor do app
- Texto: `text-[12px] font-medium`, truncate `max-w-[120px]`
- Botão ×: 14px, aparece on-hover

**Tab inativa:** transparent, texto tertiary, hover glass-bg-hover.

**Tab ativa:** glass-bg + border glass-border + shadow-sm + ícone full opacity color do app. ⚠️ NÃO usar borda inferior colorida.

**Tab pinned (Mesa):** só ícone, width 36px.

**Botão [+]:** Plus 14px tertiary, hover glass-bg-hover.

**Overflow:** scroll horizontal, scrollbar oculta.

### 5.4 Mesa (desktop premium)

Background: `var(--bg-base)` + um dos 6 wallpapers gradientes — **com versões dark e light separadas**.

| ID         | Dark gradient                                                                 | Light gradient                                                                |
| ---------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `default`  | `radial-gradient(ellipse at top, #1a1a3e 0%, #0a0a1a 50%, #050510 100%)`      | `radial-gradient(ellipse at top, #f4f4f0 0%, #fafaf9 50%, #ffffff 100%)`      |
| `aurora`   | `radial-gradient(ellipse at bottom left, #0a1628, #0d1b2a, #1a0a2e, #0a0a14)` | `radial-gradient(ellipse at bottom left, #f0f4ff, #fff0f8, #f8f0ff, #fafaff)` |
| `ocean`    | `linear-gradient(160deg, #0c1929 0%, #0a2540 40%, #061a2e 100%)`              | `linear-gradient(160deg, #ecf3ff 0%, #e0f0ff 40%, #f0f8ff 100%)`              |
| `midnight` | `radial-gradient(circle at 30% 20%, #1a1040, #0a0a18, #050508)`               | `radial-gradient(circle at 30% 20%, #f0e8ff, #fafaf9, #ffffff)` (= "morning") |
| `minimal`  | `#09090b` (sólido)                                                            | `#fafaf9` (sólido)                                                            |
| `mesh`     | mesh dark (azul/roxo/verde escuros)                                           | mesh light (rosa/azul/lilás pastel sutil)                                     |

**Wallpaper é estático** (não anima). Versão automática conforme tema ativo.

**DesktopIcon:**

- Container 56px × 56px com `bg-[var(--glass-bg)]`, `border 1px var(--glass-border)`, `radius var(--radius-lg)`
- Ícone interno: 48px, cor do app
- Hover: glass-bg-hover + glass-border-hover + shadow-sm + scale(1.05)
- Selected: ring 2px border-focus + bg blue/0.1
- Label: `text-[11px] font-medium var(--text-primary)`, text-shadow para legibilidade
  - Dark: `text-shadow: 0 1px 3px rgba(0,0,0,0.8)`
  - Light: `text-shadow: 0 1px 2px rgba(255,255,255,0.8)`
- Spacing: grid 90×100
- Stagger fade-in ao aparecer

### 5.5 Dock (Sequoia)

**Container:**

- Position: `fixed bottom-2 left-1/2 -translate-x-1/2`
- Background: `var(--glass-bg)` + `backdrop-filter: blur(40px)`
- Border: `1px solid var(--glass-border)`
- Border-radius: `var(--radius-dock)` (22px)
- Shadow: `var(--shadow-dock)`
- Padding: 4px 8px
- Gap: 2px

**Ícones:**

- Base: 44px transparent
- Lucide 24px cor do app
- Hover individual sem magnification: glass-bg-hover

**Magnification (Framer Motion):**

- Hover: scale(1.35)
- Vizinhos imediatos: scale(1.15)
- Vizinhos 2º grau: scale(1.05)
- Spring: stiffness 400, damping 25
- Container NÃO muda tamanho
- Respeitar `prefers-reduced-motion`

**Dot indicador (app aberto):** 4px, cor secondary; tab ativa: cor do app.

**Separador:** vertical 1px × 28px subtle, antes de Magic Store e Admin.

**Tooltip:** 600ms delay, bg-elevated + border-glass + radius-sm + shadow-md + 11px primary.

**Prefetch (regra obrigatória):** `onMouseEnter` no DockIcon → `prefetchApp(app.id)`. Set evita download duplo.

### 5.6 AppFrame

- Container: `h-full` (NÃO `flex-1` — bug histórico Sprint 12 corrigido)
- Background: transparent
- Padding: 0
- TabPane: opacity 0→1, 150ms

### 5.7 AppShell (sidebar + main)

**AppSidebar:**

- Width: **220px** (collapsible 56px)
- Background: `var(--bg-base)` (mais escuro/claro que conteúdo)
- Border-right: `1px solid var(--border-subtle)`
- Padding: 12px 8px

**Sidebar items:**

- Height: 34px
- Padding: 0 10px
- Radius: `var(--radius-md)`
- Gap: 8px
- Ícone: 16px, tertiary
- Texto: `text-[13px] font-medium secondary`
- Hover: glass-bg-hover, texto primary
- **Ativo:** bg cor-do-app/0.1 + border-left 2px cor-do-app + ícone e texto cor-do-app
- Badge: pill glass-bg, `text-[11px] font-medium`

**AppContent:**

- Background: `var(--bg-elevated)`
- Padding: 24px
- Max-width interna: 1200px
- Scrollbar estilizada

**AppHeader:**

- Flex justify-between, align-center
- Título: `text-[18px] font-semibold primary`
- Ações ghost ou outline
- Border-bottom subtle, pad-bottom 16px, mb 24px

### 5.8 Botões

**Primary:**

```tsx
className =
  "px-4 h-9 rounded-[var(--radius-md)] bg-gradient-to-b from-blue-600 to-blue-700 text-white text-[13px] font-medium hover:brightness-110 active:scale-[0.98] transition-[120ms]";
```

**Secondary:**

```tsx
className =
  "px-4 h-9 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-[13px] font-medium hover:bg-[var(--glass-bg-hover)] active:scale-[0.98] transition-[120ms]";
```

**Ghost:**

```tsx
className =
  "px-3 h-9 rounded-[var(--radius-md)] bg-transparent text-[var(--text-secondary)] text-[13px] font-medium hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] transition-[120ms]";
```

**Danger:**

```tsx
className =
  "px-4 h-9 rounded-[var(--radius-md)] bg-red-600/10 text-red-400 dark:text-red-400 light:text-red-700 text-[13px] font-medium hover:bg-red-600/20 active:scale-[0.98] transition-[120ms]";
```

**Disabled:** `opacity-40 cursor-not-allowed pointer-events-none`

**Tamanhos:** sm h-8 / md h-9 / lg h-10

### 5.9 Inputs

```tsx
className =
  "w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-blue-600/15 focus:outline-none transition-[120ms]";
```

- Height: 36px
- Label acima: `text-[11px] font-semibold uppercase tracking-wide tertiary`
- Erro: `border-red-500 ring-2 ring-red-500/20`

### 5.10 Cards

```tsx
className =
  "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 transition-[120ms]";
```

**Hover:** `hover:border-[var(--border-hover)] hover:shadow-sm hover:-translate-y-px`

### 5.11 Tabelas

```tsx
<table className="w-full">
  <thead>
    <tr className="bg-[var(--bg-surface)]">
      <th className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] px-4 py-3 text-left">
        ...
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--glass-bg-hover)] transition-[120ms]">
      <td className="text-[13px] text-[var(--text-primary)] px-4 py-3">...</td>
    </tr>
  </tbody>
</table>
```

### 5.12 Badges

```tsx
className = "rounded-full px-2 py-0.5 text-[11px] font-medium";
```

**Variantes** (mesmas em ambos modos):

- success: `bg-green-500/15 text-green-700 dark:text-green-400`
- warning: `bg-amber-500/15 text-amber-700 dark:text-amber-400`
- error: `bg-red-500/15 text-red-700 dark:text-red-400`
- info: `bg-blue-500/15 text-blue-700 dark:text-blue-400`
- neutral: `bg-[var(--glass-bg)] text-[var(--text-secondary)]`

### 5.13 Dialogs / Modais

**Overlay:** `bg-black/60 backdrop-blur-md fixed inset-0` (em light: `bg-black/40`)

**Content:**

```tsx
className =
  "bg-[var(--bg-elevated)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] max-w-[640px] w-full p-6";
```

- Header: title (h2 18-20px) + close button
- Footer: pad-top 16px, border-top, botões direita
- Animação: scale(0.95) + opacity 0 → scale(1) + opacity 1, spring

### 5.14 Drawers (lateral)

Mesmo padrão Dialog, mas:

- Position: `fixed right-0 top-0 h-full`
- Width: 480-640px
- Border-radius: 0
- Animação: slide-in `translateX(100%) → 0`

### 5.15 Toasts

```tsx
className =
  "bg-[var(--bg-elevated)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-3 px-4 max-w-[380px]";
```

- Position: `fixed bottom-4 right-4`
- Auto-dismiss: 5s success, 8s warning/error
- Animação: slide-in da direita

---

## 6. Movimento e animações

### 6.1 Princípios

- **Tokens fixos:** fast 120ms, default 200ms, slow 300ms, spring 400ms cubic-bezier(0.16, 1, 0.3, 1)
- **Não animar background-color e color em simultâneo** (jittery)
- **Sempre Framer Motion** para enter/exit

### 6.2 Casos comuns

| Caso               | Token         | Detalhes                                            |
| ------------------ | ------------- | --------------------------------------------------- |
| Hover botão        | fast          | transition fast                                     |
| Active/click       | scale 0.98    | imediato                                            |
| Tab switch         | default       | opacity 0→1                                         |
| Modal/Drawer enter | spring        | scale + opacity                                     |
| Card hover lift    | fast          | translateY(-1px) + shadow                           |
| Toast in/out       | spring        | translateX(100%) → 0                                |
| Dock magnification | spring 400/25 | per-icon scale                                      |
| Stagger lista      | 50ms delay    | useStaggerChildren                                  |
| **Theme toggle**   | default 200ms | bg, border, text, shadow simultâneos com transition |
| Skeleton           | animate-pulse | nunca spinner em área grande                        |

### 6.3 Theme toggle animation

Transição entre dark e light precisa ser suave (não flash):

```css
html {
  transition:
    background-color 200ms ease,
    color 200ms ease;
}
* {
  transition-property:
    background-color, border-color, color, fill, stroke, box-shadow;
  transition-duration: 200ms;
  transition-timing-function: ease;
}
```

⚠️ Cuidado: aplicar em `*` é caro em árvores grandes. Limite o seletor a `body, body *` ou aplique seletivamente em containers principais.

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

---

## 7. Estados de carregamento (regras inviolá­veis)

### 7.1 Skeleton estrutural — não genérico

⚠️ **Inviolável:** TODA tela que carrega via `React.lazy` ou query DEVE ter skeleton que reproduz a **estrutura real** do layout final. NÃO usar loader genérico.

- Apps com `hasInternalNav: true`: sidebar 220px + breadcrumb + cards placeholder
- Apps simples: ícone do app + texto "Carregando" centralizado
- Suspense interno: `SectionFallback` com blocos `animate-pulse`

**Tokens skeleton (consciente do tema):**

| Uso             | Dark                  | Light                 |
| --------------- | --------------------- | --------------------- |
| Background base | `bg-white/5`          | `bg-black/5`          |
| Background leve | `bg-white/4`          | `bg-black/4`          |
| Card skeleton   | `bg-white/[0.03]`     | `bg-black/[0.03]`     |
| Border          | `border-white/[0.05]` | `border-black/[0.05]` |

Ou criar utility classes que respeitam tema:

```css
.skeleton-bg {
  @apply bg-black/5 dark:bg-white/5;
}
.skeleton-bg-card {
  @apply bg-black/[0.03] dark:bg-white/[0.03];
}
.skeleton-border {
  @apply border-black/[0.05] dark:border-white/[0.05];
}
```

**Animação:** `animate-pulse`. Radius: `rounded-xl` (cards) ou `rounded` (textos).

**Nunca mostrar texto real no skeleton** — apenas blocos cinza animados.

### 7.2 Prefetch de chunks no Dock

⚠️ **Inviolável:** TODO app no `APP_REGISTRY` DEVE ter entrada em `APP_PREFETCH` em `registry.ts`.

- `onMouseEnter` no DockIcon → `prefetchApp(app.id)`
- Set `prefetchedApps` evita download duplo
- Falha silenciosa, retry no próximo hover

### 7.3 Suspense com `key`

⚠️ **Inviolável:** TODO `<Suspense>` que envolve conteúdo dinâmico DEVE ter `key` vinculada ao identificador ativo.

```tsx
// CORRETO
<Suspense key={activeId} fallback={<SectionFallback />}>
  {renderSection(activeId)}
</Suspense>
```

### 7.4 Títulos consistentes loading/error/success

⚠️ **Inviolável:** título idêntico em TODOS os estados.

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

```tsx
if (isLoading) return <SkeletonFiel />;
if (error) return <ErrorState onRetry={refetch} />;
if (!data?.length) return <EmptyState />;
return <Conteudo data={data} />;
```

---

## 8. Acessibilidade

### 8.1 Contraste — DARK

- text-primary (0.95 white) sobre bg-base: > 16:1 ✅ AAA
- text-secondary (0.55) sobre bg-base: > 7:1 ✅ AAA
- text-tertiary (0.35): > 4.5:1 ✅ AA
- ⚠️ Nunca usar text-disabled (0.2) como texto principal

### 8.2 Contraste — LIGHT

- text-primary (0.92 black) sobre bg-base (#fafaf9): > 14:1 ✅ AAA
- text-secondary (0.6) sobre bg-base: > 7:1 ✅ AAA
- text-tertiary (0.4) sobre bg-base: > 4.5:1 ✅ AA
- ⚠️ Nunca usar text-disabled (0.25) como texto principal

### 8.3 Focus visible

```css
:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
```

### 8.4 Aria labels

- Botão fechar tab: `aria-label="Fechar Drive"`
- Ícone do dock: `aria-label="Drive"` + `data-testid="dock-app-drive"`
- Toggle tema: `aria-label="Alternar para modo claro"` (em dark) ou `aria-label="Alternar para modo escuro"` (em light)
- Pressed state: `aria-pressed={theme === 'dark'}`

### 8.5 Keyboard navigation

- Tab order respeitada em modais (focus trap)
- Esc fecha modal/drawer
- Enter ativa CTA primário
- ↑↓ navega listas

---

## 9. Responsividade

```
sm: 640px    md: 768px    lg: 1024px    xl: 1280px    2xl: 1536px
```

**Aethereos é desktop-first.**

### 9.1 Mobile (<768px)

- TopBar: padding reduzido, esconde nome empresa
- TabBar: **escondida** (um app por vez via Dock)
- Dock: bottom nav fixa 5 ícones max, sem magnification, height 56px
- Mesa: **escondida** — abre direto no Dashboard ou último app
- AppSidebar: drawer toggle por hamburger
- AppContent: padding 16px
- Modais: full screen

### 9.2 Tablet (768-1024px)

- TopBar completa
- TabBar: tabs só ícone
- Dock: ícones 36px, magnification reduzida (1.15 max)
- AppSidebar: colapsada (56px), expand on hover
- Cards: 2 colunas

### 9.3 Desktop (>1024px)

Padrão completo.

---

## 10. Iconografia

### 10.1 Library

**lucide-react** padrão.

| Contexto | Tamanho | Stroke |
| -------- | ------- | ------ |
| Default  | 20px    | 1.5    |
| Dock     | 24px    | 1.5    |
| Sidebar  | 16px    | 1.5    |
| TopBar   | 18px    | 1.5    |
| TabBar   | 14px    | 1.5    |
| Badge    | 12px    | 1.5    |

### 10.2 Cor

- Inativo: tertiary ou secondary
- Ativo / hover: cor do app
- Disabled: text-disabled

### 10.3 Emojis

**Permitidos** em contextos casuais (Magic Store, chat, status, onboarding, empty states) com moderação.

---

## 11. Imagens e ilustrações

### 11.1 Avatares

- Square com `rounded-full`
- Fallback: iniciais + cor derivada do hash do nome (HSL hue, sat 60%, light 45%)
- Tamanhos: 24, 32, 40, 56, 80
- Border: `1px solid var(--border-subtle)`
- Ring on hover: `ring-2 ring-blue-500/30`

### 11.2 Logos de empresa

- Upload no Onboarding wizard
- PNG 256×256
- Fallback: nome em texto (Outfit semibold) + cor derivada

### 11.3 Empty states

```tsx
<div className="flex flex-col items-center justify-center py-16">
  <Icon size={48} className="text-[var(--text-tertiary)] mb-4" />
  <h3 className="text-[18px] font-semibold text-[var(--text-primary)] mb-2">
    Nenhum funcionário cadastrado
  </h3>
  <p className="text-[13px] text-[var(--text-secondary)] mb-6 max-w-md text-center">
    Cadastre o primeiro colaborador da sua empresa para começar.
  </p>
  <Button variant="primary">Criar primeiro colaborador</Button>
</div>
```

---

## 12. Anti-patterns

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
11. ❌ Fonts genéricas (Arial, Helvetica) em vez de Inter/Outfit
12. ❌ TopBar com backdrop-blur (regra V2)
13. ❌ Aurora colorida vibrante full-screen (não somos Tahoe)
14. ❌ Skeleton genérico ("Carregando..." centralizado)
15. ❌ Suspense sem `key` em conteúdo dinâmico
16. ❌ Títulos diferentes em loading vs success
17. ❌ Spinner em área grande (use skeleton)
18. ❌ **Light mode com preto puro #000** (cansa vista) — usar 0.92 alpha
19. ❌ **Dark mode com cinza claro #444** (não é dark, é "cinza") — usar #09090b base
20. ❌ Cores hardcoded com sufixo `dark:` — usar tokens

---

## 13. Implementação técnica

### 13.1 Stack

- **CSS variables** em `apps/shell-commercial/src/styles/tokens.css`
- **Tailwind v4** com `@theme inline` em `globals.css`
- **shadcn/ui** primitivas customizadas com tokens
- **framer-motion** para animações
- **lucide-react** para ícones
- **Inter + Outfit + JetBrains Mono** via Google Fonts
- **ThemeProvider** custom (não next-themes — não usamos Next no shell)

### 13.2 ThemeProvider — implementação

```tsx
// apps/shell-commercial/src/lib/theme/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  // Read on mount (script inline no <head> já aplicou class, aqui só sincroniza state)
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

### 13.3 Estrutura de arquivos

```
apps/shell-commercial/src/
├── styles/
│   ├── tokens.css       # variáveis CSS (light + dark)
│   ├── globals.css      # @import tokens + tailwind + @theme + reset
│   └── animations.css   # keyframes (shimmer, glow)
├── components/
│   ├── ui/              # primitivas (button, input, card, dialog)
│   └── os/              # OS components (TopBar, Dock, TabBar, Mesa)
└── lib/
    └── theme/
        ├── theme-provider.tsx
        └── theme-toggle.tsx  # botão usado em TopBar
```

### 13.4 Como adicionar novo componente

1. Verificar se já existe primitiva em `components/ui/`
2. Se não, criar consumindo tokens (sem cores hardcoded)
3. Documentar variants no JSDoc
4. **Validar em ambos modos** (dark + light) antes de commit

---

## 14. Manutenção

### 14.1 Cosméticas

- Ajustar variable em `tokens.css` (ambos blocos dark + light) → propaga
- Não criar variable por capricho

### 14.2 Estruturais

- Atualizar este `DESIGN.md` primeiro
- Implementar respeitando tokens
- PR referenciando seção
- Testar em ambos modos antes de mergear

### 14.3 Conflitos com features

- 80%: feature está errada, ajustar feature
- 20%: design system precisa evoluir, propor mudança aqui

---

## 15. Glossário

| Termo                     | Significado                                                       |
| ------------------------- | ----------------------------------------------------------------- |
| **Glass / Glassmorphism** | Material translúcido sutil (3% opacity dark / 2.5% opacity light) |
| **Sequoia-style**         | Inspiração visual de macOS Sequoia (dark mode)                    |
| **Notion/Apple-light**    | Inspiração visual do light mode (off-white acinzentado, soft)     |
| **Mesa**                  | Área de trabalho principal (analogia desktop)                     |
| **Dock**                  | Barra flutuante de atalhos pra apps                               |
| **TabBar**                | Barra de tabs ativas (analogia browser)                           |
| **TopBar**                | Barra superior sólida (não glass)                                 |
| **AppFrame**              | Container que renderiza app ativo                                 |
| **AppShell**              | Wrapper sidebar + main para apps com nav interna                  |
| **AE AI**                 | Copilot Aethereos (drawer/modal)                                  |
| **APP_REGISTRY**          | Registry central de apps                                          |
| **APP_PREFETCH**          | Map de apps → função de import dinâmico                           |
| **ThemeProvider**         | Context React que gerencia tema dark/light                        |

---

## 16. Versão

**v2.0** — Canon V2-based com dark + light modes. Abril 2026.

Histórico:

- v1.0: Tahoe/aurora animada (descartada — não chegou ao browser, conceito divergente)
- v2.0: Sequoia/Linear/Vercel/Raycast premium escuro + Notion/Apple light (canon atual)

Mudanças futuras:

- v2.1: System mode (segue OS, prefere-color-scheme)
- v2.2: Wallpapers customizados upload
- v3.0: revisão completa para Camada 2 (apps SaaS standalone)
