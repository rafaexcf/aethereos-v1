# DESIGN.md — Aethereos Design System

> **Documento canônico.** Toda decisão visual em Camada 1 (`shell-commercial`) e em apps Camada 2 derivados deve respeitar este documento. Mudanças no design system são feitas via PR específica que atualiza este arquivo + commit referenciando.
>
> Este documento substitui qualquer convenção visual implícita anterior. Se houver código que viola estas regras, é dívida técnica (não verdade alternativa).
>
> **Inspiração principal:** macOS Tahoe 26 (Apple, 2025) — sistema **Liquid Glass**. Adaptado ao contexto B2B brasileiro e ao paradigma OS-no-browser do Aethereos.

---

## 1. Filosofia visual

### 1.1 Princípios fundamentais

1. **OS-first, não SaaS-first.** Aethereos é um sistema operacional no navegador, não um dashboard. Hierarquia visual replica conceitos de OS desktop — Mesa (área de trabalho), Dock (barra de apps), TabBar (tabs ativas), TopBar (menu global). O usuário deve sentir-se em um ambiente coerente, não em uma sequência de páginas.

2. **Liquid Glass como material primário.** Painéis, controles e elementos elevados usam **glass material** — translúcido, com blur, refração suave, borda sutil. O glass não é um efeito decorativo: é o material padrão. Tudo que flutua sobre o background usa glass.

3. **Profundidade através de camadas, não de sombras pesadas.** Hierarquia visual vem de:
   - Background (Mesa, sólido ou wallpaper)
   - Mid layer (containers de app, semi-transparentes)
   - Glass elements (TopBar, Dock, drawers, popovers, modais)
   - Foreground (texto, ícones, controles ativos)

4. **Movimento contextual, não decorativo.** Animações servem propósitos: feedback de interação, transição de estado, comunicação de hierarquia. Nada anima sem razão.

5. **Conteúdo é o protagonista.** Glass material e UI são meios pra destacar conteúdo. Texto deve ser legível, dados devem ser hierárquicos, ações devem ser claras. Quando glass compete com conteúdo, glass cede.

6. **Brasileiro discreto.** Não decorativo, não barroco. Português direto, ícones diretos, espaçamento confortável. Nem latino "rico em cor", nem norte-americano "spreadsheet em fonte 11px". Equilíbrio sóbrio.

### 1.2 O que NÃO é Aethereos

- **Não é skeumorphism.** Sem ícones desenhados como objetos físicos, sem sombras 3D pesadas, sem texturas de couro/madeira/vidro fotorrealista.
- **Não é flat puro.** Sem cores chapadas sem profundidade, sem retângulos rígidos.
- **Não é "cyberpunk neon".** Sem ciano e roxo neon competindo, sem grids de matrix, sem sci-fi.
- **Não é "pastel orgânico".** Sem cores Lo-Fi, sem ilustrações 3D, sem mascotes.
- **Não é Bootstrap.** Sem botões azul-padrão, sem alerts amarelos, sem cards com border-radius pequeno.

---

## 2. Modos: Light, Dark, System

Aethereos suporta **3 modos via toggle no Settings**:

- **Dark** (padrão inicial — fundo escuro com aurora gradient)
- **Light** (fundo claro com aurora suave)
- **System** (segue OS do usuário)

Toggle do modo persiste em `localStorage` + sincroniza com `kernel.user_preferences.theme` no banco quando logado.

**O modo determina:**

- Background (Mesa)
- Cor de texto
- Tonalidade dos glass elements (mais escuros em dark, mais claros em light)
- Imagens contextuais (logos, ilustrações vão ter variantes)

---

## 3. Tokens CSS — Variáveis canônicas

Todos os componentes consomem variáveis CSS, **nunca cores hard-coded**.

### 3.1 Base — Backgrounds

```css
:root[data-theme="dark"] {
  /* Mesa background — aurora gradient sobre base escura */
  --bg-base: #0a0e1a;
  --bg-aurora-1: #1e1b4b; /* indigo profundo */
  --bg-aurora-2: #312e81; /* indigo médio */
  --bg-aurora-3: #4c1d95; /* purple */
  --bg-aurora-4: #1e3a8a; /* azul */

  /* Mid layer — containers de app */
  --bg-elevated: rgba(20, 24, 38, 0.6);
  --bg-elevated-strong: rgba(20, 24, 38, 0.85);

  /* Surface — cards, popovers internos */
  --bg-surface: rgba(30, 35, 50, 0.7);
  --bg-surface-hover: rgba(40, 45, 65, 0.8);
}

:root[data-theme="light"] {
  --bg-base: #f5f7fb;
  --bg-aurora-1: #c7d2fe; /* indigo claro */
  --bg-aurora-2: #ddd6fe; /* purple claro */
  --bg-aurora-3: #bfdbfe; /* azul claro */
  --bg-aurora-4: #fbcfe8; /* rosa muito claro */

  --bg-elevated: rgba(255, 255, 255, 0.7);
  --bg-elevated-strong: rgba(255, 255, 255, 0.92);

  --bg-surface: rgba(255, 255, 255, 0.85);
  --bg-surface-hover: rgba(255, 255, 255, 0.95);
}
```

### 3.2 Glass — Material translúcido

```css
:root[data-theme="dark"] {
  --glass-fill: rgba(20, 25, 40, 0.55);
  --glass-fill-strong: rgba(20, 25, 40, 0.78);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-strong: rgba(255, 255, 255, 0.14);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --glass-blur: 24px;
  --glass-saturation: 180%;
}

:root[data-theme="light"] {
  --glass-fill: rgba(255, 255, 255, 0.6);
  --glass-fill-strong: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(0, 0, 0, 0.06);
  --glass-border-strong: rgba(0, 0, 0, 0.1);
  --glass-shadow: 0 8px 32px rgba(15, 23, 42, 0.08);
  --glass-blur: 24px;
  --glass-saturation: 180%;
}
```

### 3.3 Text — Hierarquia tipográfica

```css
:root[data-theme="dark"] {
  --text-primary: rgba(248, 250, 252, 1); /* títulos, valores principais */
  --text-secondary: rgba(203, 213, 225, 0.85); /* corpo, descrições */
  --text-tertiary: rgba(148, 163, 184, 0.6); /* auxiliar, labels */
  --text-disabled: rgba(100, 116, 139, 0.4);
  --text-inverse: #0f172a; /* texto sobre cor primária */
}

:root[data-theme="light"] {
  --text-primary: rgba(15, 23, 42, 1);
  --text-secondary: rgba(51, 65, 85, 0.85);
  --text-tertiary: rgba(100, 116, 139, 0.7);
  --text-disabled: rgba(148, 163, 184, 0.5);
  --text-inverse: #ffffff;
}
```

### 3.4 Border / Divider

```css
:root[data-theme="dark"] {
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.1);
  --border-strong: rgba(255, 255, 255, 0.16);
  --border-focus: rgba(99, 102, 241, 0.6); /* indigo */
}

:root[data-theme="light"] {
  --border-subtle: rgba(15, 23, 42, 0.05);
  --border-default: rgba(15, 23, 42, 0.1);
  --border-strong: rgba(15, 23, 42, 0.16);
  --border-focus: rgba(79, 70, 229, 0.4);
}
```

### 3.5 Accent / Brand colors

Aethereos não tem **uma** cor primária. Cada app/contexto tem sua cor de acento (registry do app). Mas a plataforma tem cores globais para ações e feedbacks:

```css
:root {
  /* Cores de marca (universais nos dois modos) */
  --brand-primary: #6366f1; /* indigo 500 — hover/active default */
  --brand-secondary: #8b5cf6; /* violet 500 */
  --brand-tertiary: #06b6d4; /* cyan 500 */

  /* Status semântico */
  --status-success: #10b981; /* emerald */
  --status-warning: #f59e0b; /* amber */
  --status-error: #ef4444; /* red */
  --status-info: #3b82f6; /* blue */

  /* Cores de app (alinhadas com registry.ts) */
  --app-drive: #06b6d4; /* cyan */
  --app-pessoas: #8b5cf6; /* violet */
  --app-chat: #06b6d4; /* cyan */
  --app-rh: #10b981; /* emerald */
  --app-magic-store: #0ea5e9; /* sky */
  --app-settings: #64748b; /* slate */
  --app-copilot: #8b5cf6; /* violet */
  --app-governanca: #ef4444; /* red */
  --app-auditoria: #f59e0b; /* amber */
}
```

### 3.6 Espaçamento

Sistema de **8px**:

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

Pads de container internos: 16-24px. Margens entre seções: 24-32px. Gap em listas: 8-12px.

### 3.7 Radius

```css
:root {
  --radius-sm: 6px; /* botões pequenos, badges */
  --radius-md: 10px; /* inputs, cards menores */
  --radius-lg: 14px; /* cards principais */
  --radius-xl: 20px; /* modais, drawers, AppFrame */
  --radius-2xl: 28px; /* containers grandes */
  --radius-full: 9999px;
}
```

Apple Tahoe usa cantos generosos. Seguimos. **Default é radius-lg.** Não usar radius < md em superfícies primárias.

### 3.8 Shadows

```css
:root[data-theme="dark"] {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 10px 24px rgba(0, 0, 0, 0.45);
  --shadow-xl: 0 20px 48px rgba(0, 0, 0, 0.55);
  --shadow-glow-primary: 0 0 24px rgba(99, 102, 241, 0.35);
}

:root[data-theme="light"] {
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 10px 32px rgba(15, 23, 42, 0.12);
  --shadow-xl: 0 20px 56px rgba(15, 23, 42, 0.16);
  --shadow-glow-primary: 0 0 24px rgba(99, 102, 241, 0.25);
}
```

---

## 4. Tipografia

### 4.1 Font stack

```css
:root {
  --font-sans:
    "Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI",
    system-ui, sans-serif;
  --font-display: "Inter Display", "SF Pro Display", -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
}
```

**Inter** é a font primária (web font auto-hospedada via Fontsource). SF Pro como fallback se sistema Apple. **Não usar fonts genéricas como Arial, Helvetica direto** — fica desalinhado com identidade.

### 4.2 Escala tipográfica

```css
:root {
  /* Display — para titles de seção, marketing */
  --text-display-lg: 56px / 1.1 / -0.02em; /* size / line-height / letter-spacing */
  --text-display-md: 40px / 1.15 / -0.01em;
  --text-display-sm: 32px / 1.2 / -0.01em;

  /* Heading — para titles de app/seção */
  --text-h1: 28px / 1.25 / -0.01em;
  --text-h2: 22px / 1.3 / -0.005em;
  --text-h3: 18px / 1.35 / 0;
  --text-h4: 15px / 1.4 / 0;

  /* Body */
  --text-body-lg: 16px / 1.5 / 0;
  --text-body: 14px / 1.5 / 0; /* default */
  --text-body-sm: 13px / 1.4 / 0;
  --text-caption: 12px / 1.35 / 0;
  --text-label: 11px / 1.3 / 0.02em; /* uppercase labels */
}
```

### 4.3 Pesos

- 400 (Regular) — corpo padrão
- 500 (Medium) — links, labels destacados
- 600 (Semibold) — headings, CTAs
- 700 (Bold) — só pra display ou ênfase forte

**Nunca usar** 100, 200, 300 (extra light) — somem em backgrounds glass.

---

## 5. Componentes — Padrões canônicos

### 5.1 Glass Panel (componente base)

Toda elemento que flutua sobre Mesa usa glass panel:

```tsx
// Padrão Tailwind v4 (com utility classes do tokens)
<div className="bg-[var(--glass-fill)] backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturation)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)]">
```

**Variantes:**

- `glass-subtle` — fundo bem translúcido, blur 16px (TopBar)
- `glass-default` — padrão, blur 24px (Dock, drawers)
- `glass-strong` — mais opaco, blur 32px (modais com conteúdo crítico, formulários)
- `glass-clear` — quase transparente, blur 12px (overlays leves)

### 5.2 TopBar

- Altura: 44px (igual macOS Tahoe)
- Material: `glass-subtle`
- Conteúdo: logo Aethereos (esquerda) → nome empresa com dropdown (centro-esquerda) → notificações + avatar (direita)
- Sem borda inferior visível
- Permanece flutuando, **transparente sobre Mesa**

### 5.3 TabBar

- Altura: 36px
- Posição: abaixo do TopBar, mesmo material
- Tabs com radius-md, pad horizontal 12px, gap 4px entre tabs
- Tab ativa tem `bg-[var(--glass-fill-strong)]` + ícone colorido (cor do app)
- Tab inativa: ícone semi-transparente
- Botão fechar (×) aparece on-hover ou se tab tem foco
- Drag-and-drop via @dnd-kit (já existe)

### 5.4 Mesa

- Background: `var(--bg-base)` + aurora gradient (4 cores em radial-gradient)
- Wallpaper opcional sobreposto (com opacity)
- Ícones: 80×80 (icon-app), com label embaixo, transition-colors em hover
- Posicionamento: absolute, drag-drop pra reposicionar (já existe)
- Padding inicial: 32px do top/left

### 5.5 Dock

- Posição: `fixed bottom-4 left-1/2 -translate-x-1/2`
- Material: `glass-default`
- Altura: 64px, padding lateral 12px
- Ícones: 48×48 default, magnification até 64×64 on-hover
- Indicador de app aberto: dot embaixo do ícone (3×3px, cor do app)
- Magnification: framer-motion spring (mass: 0.1, stiffness: 150, damping: 12)
- Separador entre apps universais e adicionais: linha vertical 1px, `bg-[var(--border-subtle)]`

### 5.6 AppFrame (área principal de cada app)

- Container: `h-full` (NÃO `flex-1` — bug histórico do Sprint 12)
- Background: `var(--bg-elevated)` (translúcido sobre Mesa)
- Border-radius: `var(--radius-xl)` no top (cantos inferiores são da viewport)
- Padding interno: 0 (cada app define seu próprio)

### 5.7 AppShell (sidebar + main)

Apps com navegação interna usam `<AppShell>` do `@aethereos/ui-shell`:

- Sidebar: 220px, `glass-subtle`, padding 12px 8px
- Sidebar items: altura 34px, radius-md, hover `bg-[var(--bg-surface-hover)]`
- Item ativo: `bg-[var(--glass-fill-strong)]` + ícone colorido
- Main area: `flex-1`, padding 24px, scroll vertical interno

### 5.8 Botões

#### Primary

```tsx
<button className="px-4 h-9 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[#5558e3] text-[var(--text-inverse)] text-[14px] font-medium transition-colors shadow-[var(--shadow-glow-primary)]">
```

#### Secondary (ghost glass)

```tsx
<button className="px-4 h-9 rounded-[var(--radius-md)] bg-[var(--glass-fill)] backdrop-blur-md border border-[var(--glass-border)] hover:bg-[var(--glass-fill-strong)] text-[var(--text-primary)] text-[14px] font-medium transition-colors">
```

#### Tertiary (texto)

```tsx
<button className="px-2 h-9 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[14px] font-medium transition-colors">
```

#### Destructive

```tsx
<button className="px-4 h-9 rounded-[var(--radius-md)] bg-[var(--status-error)] hover:bg-[#dc2626] text-white text-[14px] font-medium transition-colors">
```

### 5.9 Inputs

```tsx
<input className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-default)] focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-[14px] transition-colors outline-none">
```

- Altura padrão 36px
- Sempre acompanhado de label acima (text-label, uppercase, tracking-wide)
- Focus ring suave (não pesado)
- Erro: border `var(--status-error)`, mensagem abaixo em text-caption

### 5.10 Cards (em listas, dashboard)

```tsx
<div className="bg-[var(--bg-surface)] backdrop-blur-md border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 hover:bg-[var(--bg-surface-hover)] transition-colors">
```

### 5.11 Tabelas (RH, Pessoas, listagens)

- Background: `var(--bg-elevated)`
- Header row: `bg-[var(--bg-surface)]`, text-label uppercase, sticky top-0
- Rows: `border-b border-[var(--border-subtle)]`, hover `bg-[var(--bg-surface-hover)]`
- Padding célula: 12px 16px
- Texto: text-body
- Ações por row: aparecem on-hover, alinhadas à direita

### 5.12 Modais e Drawers

- Backdrop: `bg-black/40 backdrop-blur-sm` (overlay full-screen)
- Container: `glass-strong`, radius-xl, max-width contextual (sm: 480, md: 640, lg: 880)
- Padding: 24-32px
- Header: title (h2) + close button (×) à direita
- Footer com ações: pad-top 16px, border-top var(--border-subtle), botões alinhados à direita

Drawer (lateral): mesmo padrão, mas `right: 0`, full-height, slide-in from right.

### 5.13 Toasts / Notifications

- Posição: `fixed top-4 right-4` (acima da TopBar)
- Material: `glass-default`
- Largura: 380px
- Padding: 12px 16px
- Auto-dismiss: 5s (success), 8s (warning/error)
- Animação: framer-motion slide-in da direita

---

## 6. Movimento e animações

### 6.1 Princípios

- **Duration default:** 200ms (interações rápidas), 300ms (transições de estado), 450ms (entradas de modal/drawer)
- **Easing:** `cubic-bezier(0.32, 0.72, 0, 1)` (Apple-like spring) ou `ease-out` para entradas, `ease-in` para saídas
- **Não animar:** background-color, color (fica jittery). Animar opacity, transform, filter.

### 6.2 Casos comuns

```typescript
// Entrada de modal/drawer
{ opacity: [0, 1], y: [20, 0] } com duration 300ms ease-out

// Hover em botão / card
transition: 'background-color 200ms ease, transform 200ms ease'

// Tab switch
{ opacity: [0, 1] } com duration 150ms

// Dock magnification
spring config: { mass: 0.1, stiffness: 150, damping: 12 }

// Framer-motion AnimatePresence sempre que componente sai/entra do DOM
```

### 6.3 Reduced motion

Respeitar `prefers-reduced-motion`. Quando ativo:

- Desabilitar magnification do Dock
- Reduzir duration pra 50% ou 0
- Sem aurora animation no background

---

## 7. Aurora Background (assinatura visual da Mesa)

Background da Mesa é um **aurora gradient animado** — característica visual única do Aethereos.

```css
.mesa-aurora {
  background:
    radial-gradient(
      ellipse 80% 60% at 20% 10%,
      var(--bg-aurora-1) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse 70% 50% at 80% 30%,
      var(--bg-aurora-2) 0%,
      transparent 55%
    ),
    radial-gradient(
      ellipse 60% 40% at 50% 70%,
      var(--bg-aurora-3) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse 70% 60% at 90% 90%,
      var(--bg-aurora-4) 0%,
      transparent 55%
    ),
    var(--bg-base);
  animation: aurora-shift 30s ease-in-out infinite alternate;
}

@keyframes aurora-shift {
  0% {
    background-position:
      0% 0%,
      100% 0%,
      50% 100%,
      100% 100%,
      0 0;
  }
  50% {
    background-position:
      5% 5%,
      95% 5%,
      55% 95%,
      95% 95%,
      0 0;
  }
  100% {
    background-position:
      0% 10%,
      90% 10%,
      60% 90%,
      90% 90%,
      0 0;
  }
}
```

Animação muito sutil (30s ciclo, deslocamento mínimo). Não distrai, mas dá sensação de "vivo".

Wallpapers customizados sobrepoem aurora se usuário escolher imagem.

---

## 8. Acessibilidade

### 8.1 Contraste mínimo

- Texto primary sobre fundo: **WCAG AA mínimo 4.5:1**, AAA preferido (7:1)
- Texto secondary: AA 3:1 minimum
- Glass material **sempre** tem fallback opaco se contraste falhar

### 8.2 Focus visible

Todos os elementos interativos tem focus ring claro:

```css
:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}
```

### 8.3 Aria labels

Todos os ícones interativos sem texto têm `aria-label`:

- Botão fechar tab: `aria-label="Fechar Drive"`
- Ícone do dock: `aria-label="Drive"` + `data-testid="dock-app-drive"`
- Toggle de tema: `aria-label="Alternar para modo claro/escuro"`

### 8.4 Keyboard navigation

- Tab order respeitada em modais
- Esc fecha modal/drawer
- Enter ativa CTA primário do form

---

## 9. Responsividade

Breakpoints:

```css
sm: 640px    /* mobile horizontal */
md: 768px    /* tablet */
lg: 1024px   /* desktop pequeno */
xl: 1280px   /* desktop padrão */
2xl: 1536px  /* desktop grande */
```

**Aethereos é desktop-first.** Em < 1024px:

- TabBar passa a scroll horizontal em vez de quebrar linha
- Dock encolhe ícones para 40×40
- Sidebar de AppShell vira drawer toggle

**Em < 640px (mobile):**

- Dock vira menu de hamburger
- TabBar some, vira dropdown "Apps abertos"
- Mesa vira lista vertical de ícones

---

## 10. Iconografia

### 10.1 Library

**lucide-react** como library padrão. Já é dep.

- Tamanho default: 20px
- Tamanho em ícones de Dock: 24px
- Tamanho em sidebar: 16px
- Tamanho em badges: 12px
- Stroke width: 1.5 (default lucide), nunca menor que 1

### 10.2 Cor do ícone

- Inativo: `var(--text-secondary)`
- Ativo / hover: cor do app (var(--app-X))
- Disabled: `var(--text-disabled)`

### 10.3 Emojis em UI

**Permitidos** em contextos casuais (Magic Store cards, mensagens chat, status, onboarding wizard) **mas com moderação**. Nunca em headers de tabela, botões CTA, alertas críticos.

---

## 11. Imagens e ilustrações

### 11.1 Avatares de usuário

- Formato: square com radius-full (círculo)
- Fallback: iniciais do nome em fundo com cor derivada (hash do nome → hue HSL)
- Tamanhos: 24, 32, 40, 56, 80
- Ring on hover: `ring-2 ring-[var(--brand-primary)]/30`

### 11.2 Logos de empresa

- Upload via Onboarding wizard
- Formato armazenado: PNG 256×256
- Fallback: nome da empresa em texto + cor derivada do hash

### 11.3 Empty states

Cada listagem vazia tem:

- Ilustração SVG simples (linha solta, monocromática em var(--text-tertiary))
- Título h3 com mensagem clara ("Nenhum funcionário cadastrado")
- Subtítulo body em text-secondary explicando o que fazer
- CTA primary se aplicável ("Criar primeiro colaborador")

---

## 12. Padrões anti

**Não fazer:**

1. ❌ `bg-blue-500` direto em componentes — sempre via var()
2. ❌ Sombras pesadas (shadow > xl) em superfícies não-flutuantes
3. ❌ Border solid color sem opacity (sempre usar `var(--border-X)` com alpha)
4. ❌ Animações em loop (pulse, bounce) exceto loaders
5. ❌ Tooltips em hover de elementos óbvios
6. ❌ Modal sobre modal (max 1 modal de cada vez)
7. ❌ Cores neon (#00ffff, #ff00ff) ou ácidas
8. ❌ Texto em cor com pouco contraste sobre glass (testar sempre)
9. ❌ Border-radius < 6px em componentes principais
10. ❌ Botões só com ícone sem aria-label

---

## 13. Implementação técnica

### 13.1 Stack

- **CSS variables** definidas em `apps/shell-commercial/src/styles/tokens.css`
- **Tailwind v4** com `@theme` (config-less) consumindo as variáveis
- **shadcn/ui** primitivas customizadas pra usar tokens (não cores defaults do shadcn)
- **framer-motion** para animações complexas
- **lucide-react** para ícones

### 13.2 Estrutura de arquivos

```
apps/shell-commercial/src/
├── styles/
│   ├── tokens.css          # variáveis CSS (este DESIGN.md em código)
│   ├── globals.css         # reset + base + utility classes
│   └── theme.ts            # JS export dos tokens (para framer-motion)
├── components/
│   ├── ui/                 # primitivas shadcn customizadas
│   └── os/                 # componentes de OS (TopBar, Dock, etc)
```

### 13.3 Como adicionar novo componente

1. Verificar se já existe primitiva em `components/ui/` (Button, Input, etc)
2. Se não, criar em `components/ui/<name>.tsx` consumindo tokens
3. Documentar variants no Storybook (futuro) ou no próprio JSDoc do componente
4. Não criar one-off components com cores hardcoded

---

## 14. Mantendo o design system

### 14.1 Mudanças cosméticas

- Ajustar valor de variable em `tokens.css` → propaga pra todo lugar
- Não criar nova variable por capricho — pesar se realmente necessária

### 14.2 Mudanças estruturais (novo componente, novo padrão)

- Atualizar este `DESIGN.md` primeiro
- Implementar componente respeitando os tokens
- PR referenciando seção do DESIGN.md alterada
- Reviewer valida que componente respeita o documento

### 14.3 Conflitos com features

Se uma feature pede algo que viola o design system:

- 80% das vezes a feature está errada — ajustar feature
- 20% das vezes o design system precisa evoluir — propor mudança aqui

---

## 15. Glossário rápido

| Termo                    | Significado                                                   |
| ------------------------ | ------------------------------------------------------------- |
| **Glass / Liquid Glass** | Material translúcido com blur+saturation, base do design      |
| **Aurora**               | Background gradient animado da Mesa, cores indigo/purple/blue |
| **Mesa**                 | Área de trabalho principal (analogia desktop)                 |
| **Dock**                 | Barra flutuante de atalhos pra apps                           |
| **TabBar**               | Barra de tabs ativas (analogia browser)                       |
| **TopBar**               | Barra superior com logo + empresa + ações globais             |
| **AppFrame**             | Container que renderiza o app ativo                           |
| **AppShell**             | Wrapper de sidebar + main para apps com navegação interna     |
| **AE AI**                | Copilot Aethereos (drawer/modal, não TabPane)                 |

---

## 16. Versão

**v1.0** — Definição inicial pós-redesign Tahoe (abril 2026, Sprint 12+).

Mudanças futuras incrementam versão. Histórico em `docs/design-system-changelog.md`.
