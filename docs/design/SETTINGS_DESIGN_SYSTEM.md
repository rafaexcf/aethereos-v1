# Settings Design System — macOS Tahoe Inspired

**Versão:** 1.0.0  
**Criado em:** 2026-04-30  
**Decisão:** REDESIGN-1, aplicado primeiro em `apps/shell-commercial/src/apps/configuracoes/`  
**Escopo de reutilização:** Qualquer app do OS que use layout sidebar + conteúdo (Drive, RH, ERP, etc.)

---

## 1. Referência de design

Inspirado em **macOS Tahoe (macOS 26) — System Settings**:

- "Liquid Glass" translucency: blur + rgba sobre camada de fundo
- Sidebar com grupos de seção, ícones em containers coloridos arredondados
- Content area com "Setting Groups" (cards com linhas separadas por dividers internos)
- Hierarquia tipográfica clara: section label → row label → helper text
- Concentric corners: raios internos menores que externos, alinhados

Adaptações para tema dark do Aethereos V2-real:

- Backgrounds baseados nos tokens `--bg-*` do projeto
- Accent color: indigo `#6366f1` em lugar do azul sistema da Apple
- Glass borders: `rgba(255,255,255,0.07-0.10)` em vez de dividers opacos

---

## 2. Layout estrutural

```
┌──────────────────────────────────────────────────────────────┐
│  SIDEBAR (220px fixo)        │  CONTENT AREA (flex-1)        │
│                              │                               │
│  ┌──────────────────────┐    │  padding: 28px               │
│  │  [avatar 40×40]      │    │  max-width: 580px (centered)  │
│  │  email / empresa     │    │                               │
│  └──────────────────────┘    │  [ContentHeader 22px/700]     │
│                              │  margin-bottom: 24px          │
│  SEÇÃO (10px/600/upper)      │                               │
│  ┌──────────────────────┐    │  [SectionLabel 11px/600/upper]│
│  │ [ic 28×28] Label     │    │  margin-bottom: 8px           │
│  │ [ic 28×28] Label  ← │    │  ┌─────────────────────────┐  │
│  └──────────────────────┘    │  │  SettingGroup (card)     │  │
│                              │  │  ─────────────────────   │  │
│  SEÇÃO                       │  │  SettingRow (44px min)   │  │
│  ┌──────────────────────┐    │  │  ─────────────────────   │  │
│  │ [ic] Label           │    │  │  SettingRow              │  │
│  └──────────────────────┘    │  └─────────────────────────┘  │
│                              │  margin-top: 24px             │
└──────────────────────────────┴───────────────────────────────┘
```

---

## 3. Sidebar

### 3.1 Container

```css
width:        220px
background:   rgba(15, 21, 27, 0.82)          /* ~var(--bg-base) com 82% opac */
border-right: 1px solid rgba(255,255,255,0.06) /* var(--border-subtle) */
overflow-y:   auto
padding-top:  0
```

### 3.2 User Card (topo da sidebar)

```css
padding:       16px
display:       flex
gap:           12px
align-items:   center
border-bottom: 1px solid rgba(255,255,255,0.06)
margin-bottom: 8px

/* Avatar */
width:         40px
height:        40px
border-radius: 50%
background:    linear-gradient(135deg, rgba(99,102,241,0.85), rgba(30,41,80,0.95))
border:        1px solid rgba(255,255,255,0.12)
font-size:     14px / weight 700

/* Email text */
font-size:     12px
font-weight:   600
color:         var(--text-primary)

/* Company sub-text */
font-size:     11px
color:         var(--text-tertiary)
display:       flex + Building2 icon size=10
```

### 3.3 Section Label (categoria)

```css
font-size:      10px
font-weight:    600
color:          var(--text-tertiary)
letter-spacing: 0.07em
text-transform: uppercase
padding:        16px 16px 5px    /* 1ª seção: padding-top: 10px */
```

### 3.4 Nav Item

```css
/* Container */
display:       flex
align-items:   center
gap:           10px
width:         100%
padding:       6px 12px           /* vertical 6, horizontal 12 */
margin:        1px 0
border-radius: 8px                /* concentric: menor que o card (12px) */
transition:    background 120ms ease, color 120ms ease
cursor:        pointer
border:        none
text-align:    left

/* Label */
font-size:     13px
font-weight:   400 (unsel) / 500 (sel)
letter-spacing: -0.01em

/* Estados */
default:  background transparent,               color var(--text-secondary)
hover:    background rgba(255,255,255,0.05),    color var(--text-primary)
selected: background rgba(255,255,255,0.08),    color var(--text-primary)
          border: 1px solid rgba(255,255,255,0.06) (sutil)
```

### 3.5 Icon Container (macOS rounded square)

```css
width:         28px
height:        28px
border-radius: 8px                /* igual ao nav item */
display:       flex
align-items:   center
justify-content: center
flex-shrink:   0

/* Icon */
size:          15px
strokeWidth:   1.8
```

### 3.6 Cores dos ícones por categoria

| Seção / Item | Icon Container bg       | Icon color |
| ------------ | ----------------------- | ---------- |
| Perfil       | rgba(99,102,241, 0.22)  | #818cf8    |
| Empresa      | rgba(6,182,212, 0.22)   | #22d3ee    |
| Plano        | rgba(16,185,129, 0.22)  | #34d399    |
| Sistema      | rgba(100,116,139, 0.22) | #94a3b8    |
| Integrações  | rgba(245,158,11, 0.22)  | #fbbf24    |

---

## 4. Content Area

### 4.1 Container

```css
flex:         1
overflow-y:   auto
padding:      28px
background:   var(--bg-base)  /* #0f151b dark */
```

### 4.2 Content Header (título da seção ativa)

```css
font-size:    20px
font-weight:  700
color:        var(--text-primary)
letter-spacing: -0.03em
margin-bottom: 24px
font-family:  var(--font-display)
```

### 4.3 Section Label (acima de um grupo de cards)

```css
font-size:      11px
font-weight:    600
color:          var(--text-tertiary)
letter-spacing: 0.07em
text-transform: uppercase
margin-bottom:  8px
```

Espaçamento entre blocos (SectionLabel + SettingGroup): `margin-top: 20px` no 2° bloco em diante.

### 4.4 SettingGroup (card container)

```css
border-radius:    12px
background:       rgba(255,255,255,0.04)   /* ~var(--glass-bg) */
border:           1px solid rgba(255,255,255,0.07)
overflow:         hidden                   /* respeitar border-radius nos filhos */
```

### 4.5 SettingRow (linha dentro do card)

```css
/* Container */
display:       flex
align-items:   center
justify-content: space-between
min-height:    44px
padding:       11px 16px
gap:           12px

/* Divider entre linhas (não na última) */
border-bottom: 1px solid rgba(255,255,255,0.05)

/* Label area (lado esquerdo) */
display:       flex-col
gap:           2px

  /* Label principal */
  font-size:   13px
  font-weight: 400
  color:       var(--text-primary)

  /* Sublabel / helper */
  font-size:   11px
  color:       var(--text-tertiary)
  margin-top:  2px

/* Control area (lado direito) */
display:       flex
align-items:   center
gap:           8px
flex-shrink:   0
```

---

## 5. Primitivos de controle

### 5.1 SettingInput

```css
background:   rgba(255,255,255,0.06)
border:       1px solid rgba(255,255,255,0.10)
border-radius: 8px
padding:      7px 11px
font-size:    13px
color:        var(--text-primary)
width:        220px             /* padrão; pode variar */
outline:      none

:focus
  border-color: rgba(99,102,241,0.65)
  box-shadow:   0 0 0 3px rgba(99,102,241,0.12)
```

### 5.2 SettingInput readonly/disabled

```css
background:   rgba(255,255,255,0.03)
border:       1px solid rgba(255,255,255,0.05)
color:        var(--text-secondary)
cursor:       not-allowed
```

### 5.3 SettingInput monospace (para IDs, slugs, URLs)

```css
/* igual ao 5.1 + */
font-family:  var(--font-mono)
font-size:    12px
```

### 5.4 SettingSelect

```css
/* igual ao SettingInput */
/* appearance: none; custom seta opcional */
```

### 5.5 Toggle (macOS style)

```css
/* Track */
width:         44px
height:        24px
border-radius: 12px
border:        none
cursor:        pointer
transition:    background 200ms ease

off: background rgba(255,255,255,0.15)
on:  background #6366f1

/* Thumb */
position:      absolute
top:           2px
width:         20px
height:        20px
border-radius: 10px
background:    #ffffff
transition:    transform 200ms ease

off: transform translateX(2px)
on:  transform translateX(20px)
```

### 5.6 Badge de status

```css
/* Ativo / Em conformidade */
background:   rgba(16,185,129, 0.14)
color:        #34d399
border-radius: 999px
padding:      3px 10px
font-size:    12px
font-weight:  500

/* Em breve */
background:   rgba(255,255,255,0.06)
color:        var(--text-tertiary)
border-radius: 999px
padding:      3px 10px
font-size:    12px

/* Trial / Warning */
background:   rgba(245,158,11, 0.14)
color:        #fbbf24
/* (mesmas medidas) */
```

### 5.7 SettingButton (ação secundária inline)

```css
background:    rgba(255,255,255,0.06)
border:        1px solid rgba(255,255,255,0.10)
border-radius: 8px
padding:       6px 14px
font-size:     12px
font-weight:   500
color:         var(--text-primary)
cursor:        pointer
transition:    background 120ms ease

:hover
  background: rgba(255,255,255,0.11)
```

### 5.8 PrimaryButton (salvar / ação principal)

```css
background:    rgba(99,102,241,0.88)
border-radius: 8px
padding:       8px 20px
font-size:     13px
font-weight:   500
color:         #ffffff
border:        none
cursor:        pointer
transition:    background 120ms ease

:hover  background: #6366f1
:disabled  opacity: 0.45, cursor: not-allowed
```

### 5.9 DangerButton (ações destrutivas)

```css
background:    rgba(239,68,68,0.12)
border:        1px solid rgba(239,68,68,0.20)
border-radius: 8px
padding:       6px 14px
font-size:     12px
font-weight:   500
color:         #f87171
cursor:        pointer

:hover  background: rgba(239,68,68,0.20)
```

### 5.10 Progress Bar (uso de recursos)

```css
/* Track */
height:        5px
border-radius: 999px
background:    rgba(255,255,255,0.08)
overflow:      hidden

/* Fill */
height:        100%
border-radius: 999px
transition:    width 400ms ease

pct ≤ 50%:  background #6366f1   (indigo)
pct ≤ 80%:  background #f59e0b   (amber)
pct > 80%:  background #ef4444   (red)
```

---

## 6. Tipografia resumida

| Elemento            | Tamanho | Peso    | Cor                    | Outros                        |
| ------------------- | ------- | ------- | ---------------------- | ----------------------------- |
| ContentHeader       | 20px    | 700     | text-primary           | letter: -0.03em, font-display |
| SectionLabel        | 11px    | 600     | text-tertiary          | uppercase, spacing: 0.07em    |
| NavSectionLabel     | 10px    | 600     | text-tertiary          | uppercase, spacing: 0.07em    |
| NavItem label       | 13px    | 400→500 | text-secondary→primary |                               |
| SettingRow label    | 13px    | 400     | text-primary           |                               |
| SettingRow sublabel | 11px    | 400     | text-tertiary          |                               |
| Badge / status      | 12px    | 500     | contextual             |                               |
| Code / mono         | 12px    | 400     | text-secondary         | font-mono                     |
| Caption             | 11px    | 400     | text-tertiary          |                               |
| Button primary      | 13px    | 500     | #fff                   |                               |
| Button secondary    | 12px    | 500     | text-primary           |                               |

Família padrão: `var(--font-sans)` = Inter + system-ui  
Display (headers): `var(--font-display)` = Outfit + Inter  
Mono: `var(--font-mono)` = JetBrains Mono

---

## 7. Espaçamento (grid de 4px)

| Token   | Valor | Uso                                    |
| ------- | ----- | -------------------------------------- |
| space-1 | 4px   | gap mínimo interno                     |
| space-2 | 8px   | gap entre sublabel e label, padding sm |
| space-3 | 12px  | padding item nav, gap sidebar          |
| space-4 | 16px  | padding user card, padding setting row |
| space-5 | 20px  | gap entre grupos no content            |
| space-6 | 24px  | margin após ContentHeader              |
| space-7 | 28px  | padding content area                   |

---

## 8. Animação / Transições

| Contexto                 | Duration       | Easing  |
| ------------------------ | -------------- | ------- |
| Nav item hover/select    | 120ms          | ease    |
| Toggle flip              | 200ms          | ease    |
| Input focus ring         | 120ms          | ease    |
| Button hover             | 120ms          | ease    |
| Save feedback ("Salvo!") | 2000ms timeout | instant |

Sem framer-motion dentro de apps (reservado ao OS shell).

---

## 9. Agrupamento nav — Settings específico

```
CONTA
  Perfil        (UserCircle,  indigo)
  Empresa       (Building2,   cyan)

ASSINATURA
  Plano         (CreditCard,  emerald)

AVANÇADO
  Sistema       (SlidersHorizontal, slate)
  Integrações   (Plug,        amber)
```

---

## 10. Regras de reutilização em outros apps

Quando outro app precisar de layout sidebar + content (ex: Drive, RH):

1. Importar os primitivos tipográficos e de espaçamento deste documento
2. Manter sidebar width padrão **220px** (ajustável se necessário, mínimo 180px)
3. Usar sempre o padrão SettingGroup + SettingRow para listas de configurações/propriedades
4. Ícone container sempre **28×28, radius 8px** com cor semântica do app
5. ContentHeader sempre **20px/700/display** com margin-bottom 24px
6. Nunca usar background opaco puro na sidebar — sempre rgba com transparência para respeitar o tema
7. Toda ação destrutiva usa DangerButton (vermelho) — nunca misturar vermelho com ações neutras
8. Botão primário de save: sempre `align-self: flex-end` ou `flex-start` dependendo do contexto, nunca full-width a não ser em mobile

---

## 11. Não fazer (anti-patterns identificados)

- ❌ Emojis como ícones nav (não escalam, não são acessíveis, não adaptam ao tema)
- ❌ Font-size > 14px no sidebar
- ❌ Borders de card com opacidade > 0.12 (fica pesado demais)
- ❌ Background de card opaco (quebra a sensação de profundidade)
- ❌ Hover com transição > 200ms (parece lagado)
- ❌ `box-shadow` com spread muito alto em elementos dentro de janelas (reservar para modais/popups)
- ❌ Usar `var(--accent)` ou `var(--accent-dim)` — esses tokens não existem nos tokens V2-real; usar valores rgba diretos de indigo
