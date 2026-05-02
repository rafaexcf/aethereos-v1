# Aethereos OS — Design System (V2-real)

> **Versão:** 2.0.0  
> **Atualizado:** 2026-05-01  
> **Status:** Sistema canônico do shell-commercial. Usado pelo app Configurações
> e pela Magic Store. Toda nova feature de UI no OS deve seguir esses padrões.  
> **Inspiração:** macOS Tahoe / Sonoma (System Settings + App Store) +
> Google Play web. Liquid Glass + Concentric Corners + Glass Borders.

Este documento define **tokens, primitivos, layout, espaçamento, tipografia,
cores, componentes e padrões de interação** que todo app dentro do shell
deve respeitar. Os valores aqui são os **reais extraídos do código** —
mudanças no design começam aqui antes de ir pra implementação.

---

## 1. Filosofia

- **Liquid Glass**: backgrounds com translucidez (`rgba` + `backdrop-filter`)
  sobre uma camada base. Borda sutil sempre visível pra dar contorno.
- **Concentric Corners**: raios internos sempre menores que o externo do
  container que os contém. SettingGroup card raio 12 → SettingRow interno
  sem raio (herda); botão dentro de SettingGroup raio 8.
- **Hierarquia tipográfica clara**: ContentHeader (título de página) →
  SectionLabel (uppercase 11px) → label do row (13px) → sublabel (11px
  tertiary).
- **Acentos por categoria**: ícone container com cor semântica do
  domínio do app (Conta=indigo, Sistema=cyan, etc).
- **Sem opaco puro**: backgrounds usam `rgba` com transparência pra
  respeitar o tema do OS.
- **Animações curtas (≤ 200ms)**: nunca passa disso pra interação UI.
  Spring/physics só em paradigma OS (Dock magnification — ADR-0023).

---

## 2. Tokens (CSS variables — `apps/shell-commercial/src/styles/tokens.css`)

### 2.1 Backgrounds

| Token           | Dark      | Light     | Uso                                                                        |
| --------------- | --------- | --------- | -------------------------------------------------------------------------- |
| `--bg-base`     | `#0f151b` | `#fafaf9` | Fundo padrão (raro — quase tudo é elevated)                                |
| `--bg-elevated` | `#191d21` | `#ffffff` | **Fundo do conteúdo dentro de apps** (mais claro que sidebar p/ contraste) |
| `--bg-deep`     | `#060912` | `#f3f3f0` | Camadas mais profundas (TopBar, Dock atrás de blur)                        |

### 2.2 Texto

| Token              | Dark                     | Light              | Uso                                        |
| ------------------ | ------------------------ | ------------------ | ------------------------------------------ |
| `--text-primary`   | `rgba(255,255,255,0.92)` | `rgba(0,0,0,0.88)` | Títulos, valores de input, label principal |
| `--text-secondary` | `rgba(255,255,255,0.65)` | `rgba(0,0,0,0.60)` | Body text, sublabels longos                |
| `--text-tertiary`  | `rgba(255,255,255,0.45)` | `rgba(0,0,0,0.42)` | Placeholders, captions, disabled           |

### 2.3 Bordas (glass)

| Valor inline             | Uso                                         |
| ------------------------ | ------------------------------------------- |
| `rgba(255,255,255,0.05)` | Divider entre rows internos de SettingGroup |
| `rgba(255,255,255,0.06)` | Divider entre seções, ContentHeader bottom  |
| `rgba(255,255,255,0.07)` | Border externa de cards/tiles               |
| `rgba(255,255,255,0.10)` | Border de inputs, buttons secundários       |
| `rgba(255,255,255,0.12)` | Border de hover ou destaque sutil           |
| `rgba(255,255,255,0.18)` | Border de tile interativo no hover          |

### 2.4 Acentos

| Cor                      | Uso                                                                   |
| ------------------------ | --------------------------------------------------------------------- |
| `#6366f1` (indigo-500)   | **Accent primário** — botões PrimaryButton, focus rings, active state |
| `rgba(99,102,241, 0.88)` | PrimaryButton background idle                                         |
| `rgba(99,102,241, 0.65)` | Border focus de input                                                 |
| `rgba(99,102,241, 0.12)` | Box-shadow do focus ring                                              |
| `#818cf8` (indigo-400)   | Ícone Conta, avatar gradient highlight                                |
| `#a5b4fc` (indigo-300)   | Texto de botão secundário indigo                                      |
| `#63f27e` (custom green) | Toggle ON track                                                       |
| `#34d399` (emerald-400)  | Status success (Disponível, Ativa, Em conformidade)                   |
| `#fbbf24` (amber-400)    | Status warning/beta                                                   |
| `#f87171` (red-400)      | Status danger, DangerButton                                           |
| `#22d3ee` (cyan-400)     | Ícone Empresa, Privacidade                                            |
| `#a78bfa` (violet-400)   | Ícone Customização                                                    |
| `#94a3b8` (slate-400)    | Ícone neutro/sistema                                                  |

### 2.5 Status tones (3 variants)

```ts
success:  { fg: "#34d399", bg: "rgba(16,185,129,0.14)", border: "rgba(16,185,129,0.28)" }
warning:  { fg: "#fbbf24", bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.28)" }
neutral:  { fg: "var(--text-tertiary)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.10)" }
danger:   { fg: "#f87171", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.18)" }
```

### 2.6 Wallpapers (CSS vars)

`--wallpaper-{id}`: imagem ou gradient bundlado. Renderizado pelo
OSDesktop atrás de tudo + repetido pela MesaApp (sincronizado via
mesaStore). TopBar e TabBar com transparência mostram o wallpaper.

---

## 3. Tipografia

Famílias (de `tokens.css`):

- `--font-sans` = Inter + system-ui (default body)
- `--font-display` = Outfit + Inter (headers)
- `--font-mono` = JetBrains Mono (IDs, código, slugs)

| Elemento                         | Size      | Weight    | Family    | Letter           | Line       | Cor                    |
| -------------------------------- | --------- | --------- | --------- | ---------------- | ---------- | ---------------------- |
| **PageTitle** (h1 hero)          | `26px`    | `700`     | display   | `-0.03em`        | `1.15`     | text-primary           |
| **SectionTitle** (h2)            | `17px`    | `700`     | display   | `-0.02em`        | `1.2`      | text-primary           |
| **CardTitle** (h3)               | `14-16px` | `600`     | sans      | `-0.01em`        | `1.25`     | text-primary           |
| **SectionLabel** (uppercase)     | `11px`    | `600`     | sans      | `0.07em`         | —          | text-tertiary          |
| **NavSectionLabel**              | `10px`    | `600`     | sans      | `0.07em`         | —          | text-tertiary          |
| **NavItem**                      | `13px`    | `400→500` | sans      | —                | —          | text-secondary→primary |
| **AppIdentity** (sidebar header) | `14px`    | `600`     | display   | `-0.02em`        | —          | text-primary           |
| **SettingRow label**             | `13px`    | `400`     | sans      | —                | —          | text-primary           |
| **SettingRow sublabel**          | `11px`    | `400`     | sans      | —                | `1.4`      | text-tertiary          |
| **Input value**                  | `13px`    | `400`     | sans/mono | —                | —          | text-primary           |
| **Body**                         | `13-14px` | `400`     | sans      | —                | `1.55-1.6` | text-secondary         |
| **Caption**                      | `11-12px` | `400`     | sans      | —                | —          | text-tertiary          |
| **Button primary**               | `13px`    | `500-600` | sans      | —                | —          | `#fff`                 |
| **Button secondary**             | `12-13px` | `500`     | sans      | —                | —          | text-primary           |
| **Badge**                        | `10-12px` | `500-600` | sans      | uppercase 0.02em | —          | contextual             |
| **Code/mono**                    | `11-12px` | `400`     | mono      | —                | —          | text-secondary         |

`SectionLabel` sempre uppercase com `letter-spacing: 0.07em`. Headers
nunca usam mono. Mono reservado pra IDs, slugs e URLs.

---

## 4. Espaçamento (grid de 4px)

| Token     | Px   | Uso                                                         |
| --------- | ---- | ----------------------------------------------------------- |
| `space-1` | `4`  | Gap mínimo interno (badges, ícone+texto curto)              |
| `space-2` | `8`  | Gap entre sublabel/label, padding sm, gap entre Save+badges |
| `space-3` | `12` | Padding sidebar items, gap header sidebar                   |
| `space-4` | `16` | Padding user card, padding lateral SettingRow               |
| `space-5` | `20` | Gap entre seções dentro de uma tab (`flex-col gap-20`)      |
| `space-6` | `24` | Margin após ContentHeader, padding bottom ContentHeader     |
| `space-7` | `28` | **Padding lateral content area** (`28px 28px 160px`)        |
| `space-8` | `36` | Gap entre seções major (Magic Store featured page)          |

**Padding bottom obrigatório do scroll container: 160px** (clearance do
Dock — ver `docs/runbooks/dock-clearance.md` ou regra registrada na
auto-memory).

---

## 5. Animações

| Contexto                      | Duration         | Easing  |
| ----------------------------- | ---------------- | ------- |
| Nav item hover/select         | `120ms`          | `ease`  |
| Button hover                  | `120ms`          | `ease`  |
| Border-color/box-shadow focus | `120ms`          | `ease`  |
| Background change             | `120-160ms`      | `ease`  |
| Card lift hover               | `160-200ms`      | `ease`  |
| Sidebar collapse/expand       | `250ms`          | `ease`  |
| Toggle thumb slide            | `200ms`          | `ease`  |
| Save state feedback           | `2000ms timeout` | instant |

Sem framer-motion fora do paradigma OS (só Dock magnification — ADR-0023).
Para apps de domínio, transitions inline ou Tailwind.

---

## 6. Layout estrutural (app com sidebar)

```
┌──────────────────────────────────────────────────────────────┐
│  SIDEBAR (228-239px)         │  CONTENT AREA                  │
│  bg: rgba(15,21,27,0.82)     │  bg: var(--bg-elevated)        │
│  border-right: 1px glass     │  padding: 28px 28px 160px      │
│  display: flex column         │  max-width: 1095px (centered)  │
│                              │                                │
│  [App identity 50px]         │  [Breadcrumb 12px]             │
│  [Search 38px]               │  margin-bottom: 20px           │
│  [Nav scrollable flex-1]     │                                │
│    SECTIONLABEL              │  [ContentHeader 56px icon +   │
│    NavItem                   │   title 26px + subtitle]       │
│    NavItem                   │  margin-bottom: 28px           │
│    SECTIONLABEL              │  paddingBottom: 24             │
│    NavItem                   │  border-bottom 0.06            │
│                              │                                │
│  [Optional footer link]      │  [SectionLabel 11px upper]    │
│                              │  margin-bottom: 8              │
│                              │  ┌───────────────────────────┐ │
│                              │  │ SettingGroup (card 12px)  │ │
│                              │  │ ───────────────────────── │ │
│                              │  │ SettingRow (44px min)     │ │
│                              │  │ ───────────────────────── │ │
│                              │  │ SettingRow                │ │
│                              │  └───────────────────────────┘ │
│                              │  margin-top: 20 (próxima seção)│
└──────────────────────────────┴────────────────────────────────┘
                  (Toggle collapse: círculo 28px na borda)
```

### 6.1 Sidebar wrapper

```css
/* Animated wrapper (controla a largura) */
width:        228px (collapsed: 48px)
flex-shrink:  0
overflow:     hidden
transition:   width 250ms ease

/* aside interno */
width:        100%
height:       100%
background:   rgba(15,21,27,0.82)
border-right: 1px solid rgba(255,255,255,0.06)
display:      flex
flex-direction: column
overflow-y:   auto
```

### 6.2 Sidebar — App identity (cabeçalho)

```css
display:        flex
align-items:    center
gap:            10
padding:        16px 14px 12px
border-bottom:  1px solid rgba(255,255,255,0.06)
background:     hover rgba(255,255,255,0.03), active rgba(255,255,255,0.04)
cursor:         pointer
text-align:     left
width:          100%
transition:     background 120ms ease

/* ícone */
size:           18
strokeWidth:    1.6
color:          var(--text-primary)

/* label */
fontSize:       14
fontWeight:     600
color:          var(--text-primary)
letterSpacing:  -0.02em
fontFamily:     var(--font-display)
```

### 6.3 Sidebar — Search

```css
/* container */
padding:        10px 10px 4px

/* input */
width:          100%
background:     rgba(255,255,255,0.05)
border:         1px solid rgba(255,255,255,0.08)
border-radius:  8
padding:        6px 10px 6px 28px (left padding pra ícone)
font-size:      12
color:          var(--text-primary)
outline:        none
transition:     border-color 120ms ease

/* ícone (Search 13px, strokeWidth 1.8) */
position:       absolute, left 9, top 50% translateY(-50%)
color:          var(--text-tertiary)
pointer-events: none

/* focus */
border-color:   rgba(99,102,241,0.50)

/* anti-autofill */
autoComplete="off" + name único + data-1p-ignore + data-lpignore
+ data-form-type="other" + spellCheck={false}
```

### 6.4 Sidebar — NavSectionLabel

```css
font-size:      10px
font-weight:    600
color:          var(--text-tertiary)
letter-spacing: 0.07em
text-transform: uppercase
padding:        10px 8px 4px

/* margin-top entre seções */
section[0] = 4
section[n] = 8
```

### 6.5 Sidebar — NavItem

```css
display:         flex
align-items:     center
gap:             10
width:           100%
padding:         6px 8px
border-radius:   8
margin-bottom:   2
text-align:      left
cursor:          pointer
transition:      background 120ms, color 120ms, border-color 120ms

/* states */
default:  background transparent,            color text-secondary, font-weight 400, border 1px transparent
hover:    background rgba(255,255,255,0.05), color text-primary
selected: background rgba(255,255,255,0.08), color text-primary, font-weight 500, border 1px rgba(255,255,255,0.06)

/* Icon (lucide) */
size:        15
strokeWidth: 1.8
color:       currentColor
```

### 6.6 Sidebar — Modo colapsado (icon-only)

```css
/* wrapper width */
SIDEBAR_ICON_W: 48

/* nav layout */
display:        flex column
align-items:    center
padding:        12px 0
gap:            2
flex:           1

/* ícone button */
width:          36
height:         36
border-radius:  8
display:        flex center

/* selected/hover idêntico ao expanded */
default:  bg transparent, color text-secondary
hover:    bg rgba(255,255,255,0.05), color text-primary
selected: bg rgba(255,255,255,0.08), color text-primary, border 1px rgba(255,255,255,0.08)

/* icon size 16, strokeWidth 1.8 */
/* tooltip via title="..." attribute */
```

### 6.7 Sidebar — Toggle collapse/expand

Botão circular flutuante na borda direita da sidebar:

```css
position:        absolute
left:            (collapsed ? 48 : 239) - 14   /* centro na borda */
top:             50%
transform:       translateY(-50%)
transition:      left 250ms ease
zIndex:          10
width:           28
height:          28
border-radius:   50%
background:      rgba(15,21,27,0.95)
border:          1px solid rgba(255,255,255,0.10)
color:           var(--text-tertiary)

/* hover */
background:      rgba(40,55,80,0.95)
borderColor:     rgba(255,255,255,0.20)
color:           var(--text-primary)

/* ícones (size 16, strokeWidth 1.8) */
collapsed → PanelLeftOpen
expanded  → PanelLeftClose
```

### 6.8 Content area

```css
flex:         1
overflow-y:   auto
padding:      28px 28px 160px        /* top/sides 28, bottom 160 (Dock clearance) */
background:   var(--bg-elevated)

/* container interno */
max-width:    1095   /* ou 1180 em apps com mais grid */
margin:       0 auto
```

---

## 7. Componentes primitivos

### 7.1 ContentHeader

Cabeçalho da página/tab (com ícone semântico do app).

```css
display:        flex
align-items:    center
gap:            18
margin-bottom:  28
padding-bottom: 24
border-bottom:  1px solid rgba(255,255,255,0.06)

/* Icon container */
width:          56
height:         56
border-radius:  16
background:     iconBg (ex: "rgba(99,102,241,0.22)")
border:         1px solid rgba(255,255,255,0.08)

/* Icon (lucide) */
size:           28
strokeWidth:    1.5
color:          iconColor (ex: "#818cf8")

/* Title h1 */
fontSize:       26
fontWeight:     700
color:          var(--text-primary)
letterSpacing:  -0.03em
fontFamily:     var(--font-display)
lineHeight:     1.15

/* Subtitle */
fontSize:       13
color:          var(--text-secondary)
margin-top:     4
lineHeight:     1.4
```

### 7.2 Breadcrumb (no topo do content)

```css
display:        flex
align-items:    center
gap:            6
margin-bottom:  20

/* Root crumb (botão) */
display:        flex
align-items:    center
gap:            6
padding:        0
background:     transparent
border:         none
color:          var(--text-tertiary)
cursor:         pointer (default se na home)
transition:     color 120ms

hover:          color text-secondary

  /* Icon */
  size:         13
  strokeWidth:  1.6
  color:        currentColor

  /* Label */
  fontSize:     12

/* Separator (ChevronRight) */
size:           12
strokeWidth:    1.8
color:          var(--text-tertiary)
opacity:        0.6

/* Current page */
fontSize:       12
fontWeight:     500
color:          var(--text-secondary)
```

### 7.3 SectionLabel

Etiqueta de seção (uppercase tertiary).

```css
font-size:      11
font-weight:    600
color:          var(--text-tertiary)
letter-spacing: 0.07em
text-transform: uppercase
margin-bottom:  8
```

### 7.4 SettingGroup (card container)

```css
border-radius:  12
background:     rgba(255,255,255,0.04)
border:         1px solid rgba(255,255,255,0.07)
overflow:       hidden    /* respeita raio nos rows internos */
```

### 7.5 SettingRow

```css
display:           flex
align-items:       center
justify-content:   space-between
min-height:        44
padding:           11px 16px
gap:               12
border-bottom:     1px solid rgba(255,255,255,0.05) (none se last)

/* Label area (left) */
display:           flex column
gap:               2
min-width:         0

  /* Label */
  fontSize:        13
  color:           var(--text-primary)

  /* Sublabel */
  fontSize:        11
  color:           var(--text-tertiary)

/* Control area (right) */
display:           flex
align-items:       center
gap:               8
flex-shrink:       0
```

### 7.6 SettingInput

```css
width:           220   /* padrão; pode variar */
background:      rgba(255,255,255,0.06)   /* readonly: rgba(255,255,255,0.03) */
border:          1px solid rgba(255,255,255,0.10)   /* readonly: 0.05 */
border-radius:   8
padding:         7px 11px
font-size:       13   /* mono: 12 */
font-family:     inherit   /* mono: var(--font-mono) */
color:           var(--text-primary)   /* readonly: text-secondary */
cursor:          text   /* readonly: not-allowed */
outline:         none
transition:      border-color 120ms, box-shadow 120ms

:focus (não readonly)
  border-color:  rgba(99,102,241,0.65)
  box-shadow:    0 0 0 3px rgba(99,102,241,0.12)
```

### 7.7 SettingSelect

Idêntico ao SettingInput. `<option>` com `background: "#1e2530"`
para não vazar default do navegador.

### 7.8 Toggle (switch macOS)

```css
/* Track */
position:        relative
width:           44
height:          24
border-radius:   12
border:          none
padding:         0
cursor:          pointer
transition:      background 200ms ease
flex-shrink:     0

off:  background rgba(255,255,255,0.15)
on:   background #63f27e

/* Thumb */
position:        absolute
top:             2
left:            0
display:         block
width:           20
height:          20
border-radius:   10
background:      #ffffff
box-shadow:      0 1px 3px rgba(0,0,0,0.35)
transition:      transform 200ms ease

off:  transform translateX(2px)
on:   transform translateX(22px)
```

`role="switch" aria-checked={on}`.

### 7.9 Badge (status pill)

```css
border-radius:   999
padding:         3px 10px
font-size:       12   /* ou 10-11 em status pills compactos */
font-weight:     500-600

variants:
  success:  bg rgba(16,185,129,0.14), color #34d399
  warning:  bg rgba(245,158,11,0.14), color #fbbf24
  neutral:  bg rgba(255,255,255,0.06), color text-tertiary
```

Versão Magic Store inclui border + uppercase + ícone Check no
"Disponível":

```css
display:         inline-flex
align-items:     center
gap:             4
padding:         3px 8px
border-radius:   999
font-size:       10
font-weight:     600
letter-spacing:  0.02em
text-transform:  uppercase
border:          1px solid {tone.border}
```

### 7.10 InlineButton (secundário inline em SettingRow)

```css
background:      rgba(255,255,255,0.06)   /* danger: rgba(239,68,68,0.12) */
border:          1px solid rgba(255,255,255,0.10)   /* danger: 0.20 */
border-radius:   8
padding:         6px 14px
font-size:       12
font-weight:     500
color:           var(--text-primary)   /* danger: #f87171 */
cursor:          pointer
transition:      background 120ms

hover:           rgba(255,255,255,0.11)   /* danger: rgba(239,68,68,0.20) */
```

### 7.11 PrimaryButton (CTA)

```css
background:      rgba(99,102,241,0.88)
border:          none
border-radius:   8
padding:         8px 20px
font-size:       13
font-weight:     500-600
color:           #ffffff
cursor:          pointer
transition:      background 120ms, opacity 120ms

hover:           #6366f1
disabled:        opacity 0.45, cursor not-allowed
```

Variante hero (Magic Store): padding `10px 18-22px`, font-weight `600`,
border-radius `10`, hover `#4f46e5`.

### 7.12 SaveRow

Wrapper que alinha botão de salvar à direita:

```css
display:         flex
justify-content: flex-end
margin-top:      14   /* quando precisa de respiro do conteúdo acima */
```

### 7.13 SaveLabel (estado do botão)

3 estados visuais dentro do PrimaryButton:

- `idle` → label original
- `saving` → `<Loader2 size={13} className="animate-spin" /> Salvando…`
- `saved` → `<Check size={13} /> Salvo!`
- `error` → label original (estado externo trata erro)

### 7.14 MonoCode (pílula código inline)

```css
display:         block
background:      rgba(255,255,255,0.03)
border:          1px solid rgba(255,255,255,0.05)
border-radius:   8
padding:         7px 11px
font-size:       11
font-family:     var(--font-mono)
color:           var(--text-secondary)
max-width:       280
overflow:        hidden
text-overflow:   ellipsis
white-space:     nowrap
```

### 7.15 ImageUploadCard (avatar / logo)

Card horizontal com preview circular ou square + título + helper +
botões Trocar/Remover. Validação de MIME + 2MB no cliente. Loading
spinner overlay durante upload.

```css
display:         flex
align-items:     center
gap:             18
padding:         18
border-radius:   12
background:      rgba(255,255,255,0.04)
border:          1px solid rgba(255,255,255,0.07)

/* Preview (circle 50% ou square radius 12) */
width: 72, height: 72, overflow: hidden
fallback bg: linear-gradient(135deg, rgba(99,102,241,0.85), rgba(30,41,80,0.95))
border: 1px solid rgba(255,255,255,0.12)

/* Botões */
"Trocar" / "Enviar arquivo": secondary glass (igual InlineButton)
"Remover":                    danger variant (vermelho)
```

### 7.16 BentoTile (TILE_BASE)

Base de tile usada no bento da home:

```css
background:      rgba(255,255,255,0.04)
border:          1px solid rgba(255,255,255,0.07)
border-radius:   14
padding:         16
display:         flex column
min-height:      0
overflow:        hidden
```

Tiles clicáveis ganham hover:

- background → `rgba(255,255,255,0.06)`
- border → `rgba(255,255,255,0.14)`
- (opcional) `transform: translateY(-1px)`

---

## 8. Padrões de cards de listagem (Magic Store)

### 8.1 AppIconBox (squircle macOS-style)

Container colorido com gradient interno + glow:

```css
width:           {size}    /* 44 / 52 / 56 / 64 / 72 / 88 */
height:          {size}
border-radius:   {radius}  /* 10 / 14 / 16 / 18 / 20 / 22 */
background:      linear-gradient(140deg, {color}38, {color}12)
border:          1px solid {color}40
box-shadow:      0 4px 16px {color}1a
display:         flex center
flex-shrink:     0

/* Icon */
size:            round(boxSize * 0.5)
strokeWidth:     1.6
color:           {color}
```

Padrão de tamanhos:

- Compact row: 40 / radius 10 / icon 16
- Card sm: 44 / radius 12 / icon 22
- Card md: 52 / radius 14 / icon 26
- Card lg: 64 / radius 18 / icon 32
- Hero card: 72 / radius 20 / icon 36
- Detail hero: 88 / radius 22 / icon 44

### 8.2 AppCard (grid card)

```css
display:         flex column
gap:             14
padding:         16-22 (md=18)
background:      rgba(255,255,255,0.03)
border:          1px solid rgba(255,255,255,0.06)
border-radius:   16
text-align:      left
cursor:          pointer
transition:      bg 200ms, border 200ms, transform 200ms, shadow 200ms

hover:
  background:    rgba(255,255,255,0.06)
  border-color:  rgba(255,255,255,0.12)
  transform:     translateY(-2px)
  box-shadow:    0 12px 32px rgba(0,0,0,0.25)

/* coming_soon */ opacity: 0.78

/* Estrutura interna:
 * - Top row: AppIconBox + StatusBadge
 * - Title (14-16px / 600 / -0.01em)
 * - Description (11-12px / tertiary / line-clamp 2)
 * - Tags (auto): 10px / padding 2x7 / radius 6 / glass border
 */
```

### 8.3 CompactRow (lista densa)

```css
display:         flex
align-items:     center
gap:             14
padding:         12px 16
border-bottom:   1px solid rgba(255,255,255,0.05)
background:      transparent
cursor:          pointer
transition:      background 160ms

hover: background rgba(255,255,255,0.04)

/* AppIconBox 40 / radius 10 */
/* Title 13 / 600 + StatusBadge inline */
/* Description 11 / tertiary / line-clamp 1 */
/* ChevronRight 14 / strokeWidth 1.8 / tertiary à direita */
```

### 8.4 HorizontalCarousel

```css
/* Container */
position:        relative

/* Track */
display:         grid
grid-auto-flow:  column
grid-auto-columns: minmax(260px, 1fr)
gap:             14
overflow-x:      auto
scroll-snap-type: x mandatory
scrollbar-width: none
padding-bottom:  4

/* Children */
scroll-snap-align: start

/* Botões prev/next (circulares, semi-overhang) */
position:        absolute
left/right:      -14
top:             50%
transform:       translateY(-50%)
width:           32, height: 32
border-radius:   50%
background:      rgba(15,21,27,0.95)
border:          1px solid rgba(255,255,255,0.10)
box-shadow:      0 6px 16px rgba(0,0,0,0.35)
opacity:         0.85 (hover 1)
icons:           Chevron* size 14 strokeWidth 2
```

### 8.5 FeaturedHero (card grande gradient)

```css
position:        relative
overflow:        hidden
border-radius:   20
padding:         28
background:      linear-gradient(125deg, {color}26 0%, rgba(15,21,27,0.55) 60%, rgba(6,9,18,0.85) 100%), var(--bg-base)
border:          1px solid rgba(255,255,255,0.07)
box-shadow:      0 16px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)

/* Glow decorativo */
::after {
  position: absolute, right: -80, top: -80
  width: 320, height: 320, border-radius: 50%
  background: radial-gradient(circle, {color}38 0%, transparent 70%)
  filter: blur(40px)
  pointer-events: none
}

/* Content max-width: 620
 * - Eyebrow (11px / 600 / accent / uppercase)
 * - AppIconBox 72/20 + h1 28px display + StatusBadge
 * - Description (14 / secondary / 1.55)
 * - CTAs: PrimaryButton + secondary glass
 */
```

### 8.6 InfoRow (sidebar de detalhe)

```css
display:         flex column
gap:             3

label:           font-size 10, color text-tertiary
value:           font-size 12, color text-primary
                 (mono optional para IDs)
```

---

## 9. Cores de ícones por categoria semântica

| Área/contexto            | Background container      | Icon color |
| ------------------------ | ------------------------- | ---------- |
| Conta / Indigo           | `rgba(99,102,241, 0.22)`  | `#818cf8`  |
| Empresa / Cyan           | `rgba(6,182,212, 0.22)`   | `#22d3ee`  |
| Dados/Privacidade / Cyan | `rgba(6,182,212, 0.22)`   | `#22d3ee`  |
| Notificações / Amber     | `rgba(245,158,11, 0.22)`  | `#fbbf24`  |
| Plano / Emerald          | `rgba(16,185,129, 0.22)`  | `#34d399`  |
| Customização / Violet    | `rgba(139,92,246, 0.22)`  | `#a78bfa`  |
| Aparência / Pink         | `rgba(236,72,153, 0.22)`  | `#f472b6`  |
| Mesa / Rose              | `rgba(244,63,94, 0.22)`   | `#fb7185`  |
| Sistema/Sobre / Slate    | `rgba(100,116,139, 0.22)` | `#94a3b8`  |
| Integrações / Orange     | `rgba(249,115,22, 0.22)`  | `#fb923c`  |

Sempre 22% alpha no background, ícone em hex sólido.

---

## 10. Padrões de interação

### 10.1 Auto-save com debounce

Toda configuração textual ou seletiva deve ter auto-save de 1500ms
(profile) ou 800ms (preferências curtas como lang, idioma, prefs):

```ts
const initializedRef = useRef(false);  // gate pra não salvar no mount
const timerRef = useRef<...>(null);
const fieldRef = useRef(field);  // refs pra capturar últimas values

function triggerAutoSave() {
  if (!initializedRef.current) return;
  setSaveState("saving");
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(async () => {
    await driver.upsert(...);
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  }, 1500);
}
```

### 10.2 Save explícito (form com botão)

Quando há campo crítico (senha) ou múltiplos campos relacionados:
PrimaryButton via `<SaveRow>`. Estado `idle | saving | saved | error`
trocado via `<SaveLabel>`.

### 10.3 Anti-autofill em search inputs

Inputs de busca DENTRO do app NÃO devem aceitar autofill do navegador
(causa filter inesperado quando usuário abre tab com password fields):

```jsx
<input
  type="search"
  name="ae-{app}-search"
  autoComplete="off"
  autoCorrect="off"
  autoCapitalize="off"
  spellCheck={false}
  data-1p-ignore="true"
  data-lpignore="true"
  data-form-type="other"
  ...
/>
```

### 10.4 Password fields

```jsx
<input
  type={show ? "text" : "password"}
  autoComplete="new-password"
  data-1p-ignore="true"
  data-lpignore="true"
  ...
/>
```

### 10.5 File upload

- Validação client-side ANTES do upload: MIME type + tamanho (2 MB
  para avatar/logo, 5 MB para wallpaper)
- `await syncDataClientSession(drivers)` antes de chamar storage
  (workaround conhecido de SupabaseBrowserDataDriver — ver comentário
  no código)
- Upload com `upsert: true`, path estável (`<id>.<ext>`) para
  sobrescrever sem acumular
- `getPublicUrl` + `?v={Date.now()}` pra cache-bust após upload
- Atualização imediata da store/UI via callback

### 10.6 Loading inline

Spinner via `<Loader2 size={13|14|16|18} className="animate-spin" />`.
Cor `currentColor` ou contextual.

### 10.7 Empty states

```jsx
<div
  style={{
    display: "flex column",
    alignItems: "center",
    gap: 10,
    padding: 60,
    color: "var(--text-tertiary)",
  }}
>
  <Icon size={40} strokeWidth={1.4} />
  <p style={{ fontSize: 13 }}>Mensagem amigável.</p>
</div>
```

---

## 11. AppShell (wrapper de toda app)

Apps usam `AppShell` de `@aethereos/ui-shell` que provê:

- Header opcional (title + subtitle + actions)
- Sidebar opcional (slot, largura customizável)
- Content area (children)
- StatusBar opcional

```jsx
<AppShell
  title="Magic Store"
  subtitle="Apps e módulos do ecossistema Aethereos"
  sidebarWidth={228-239}
  sidebar={<MyAppSidebar ... />}
>
  {/* main content scrollable */}
</AppShell>
```

Se o app tiver sidebar customizada (ex: Configurações), pode dispensar
`AppShell` e montar layout próprio respeitando os mesmos tokens.

---

## 12. Anti-patterns (NUNCA)

- ❌ Emojis como ícones de nav (não escalam, não acessíveis, não
  adaptam ao tema). Use lucide-react.
- ❌ `font-size > 14px` em sidebar.
- ❌ Borders de card com opacidade > 0.12 (fica pesado demais).
- ❌ Background opaco puro em cards (quebra profundidade).
- ❌ Hover transition > 200ms (parece lagado).
- ❌ Box-shadow com spread alto em elementos dentro de janelas
  (reservar para modais/popups).
- ❌ Tokens não-existentes como `var(--accent)` ou `var(--accent-dim)`.
  Indigo é hardcoded `#6366f1` ou `rgba(99,102,241, *)`.
- ❌ Padding bottom < 160px no scroll container (Dock cobre).
- ❌ framer-motion fora do paradigma OS (ADR-0023 bloqueia em packages
  e em apps de domínio).
- ❌ Importar supabase-js direto. Usar `drivers.data.getClient()` com
  comentário justificando.
- ❌ Cores hardcoded em texto (`color: "#fff"`). Sempre tokens
  (`var(--text-primary)`).
- ❌ `console.log` em código de produção.
- ❌ Botão de save full-width fora de mobile.

---

## 13. Apps que aplicam este design system

- ✅ **Configurações** (`apps/configuracoes/`) — implementação canônica
- ✅ **Magic Store** (`apps/magic-store/`) — segue rigorosamente para
  cards, sidebar, primitivos

Próximas migrations: Drive, Pessoas, Chat, RH, Governança, Auditoria.

---

## 14. Onde mudar

- **Tokens (cores, fontes, raios globais)**: `apps/shell-commercial/src/styles/tokens.css`
- **Wallpapers**: tokens.css + `apps/shell-commercial/src/stores/mesaStore.ts`
- **Primitivos compartilhados**: por enquanto inline em cada app. Se
  surgir necessidade real de compartilhar entre 3+ apps, extrair para
  `packages/ui-shell/src/primitives/`.
- **Este documento**: bumpa versão (V2.0.0 → V2.x.0) ao adicionar
  novos primitivos. Mudanças em tokens existentes sempre via ADR.
