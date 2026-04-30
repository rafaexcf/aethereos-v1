# AUDIT_12_2 — Auditoria Forense Sprint Cirúrgico 12.2

> Data: 2026-04-30  
> Investigador: Claude Sonnet 4.6  
> Estado: FASE 1 completa — aguardando aprovação humana para FASE 2

---

## 1. Estado Git e Working Tree

```
HEAD:            aa846e8  chore: roadmap sprint cirurgico 12.2
pre-cirurgico-12-2: cc6b385  (= HEAD-1)
pre-cirurgico-12-1: 1dbadc8  (Sprint 12 fechado, bugado)
pre-sprint-12:   7d8ed26  (Sprint 11 fechado, funcional)
```

**Mudanças não commitadas (working tree vs HEAD):**

9 arquivos com `.js` removido de imports estáticos:

- `apps/shell-commercial/src/apps/chat/index.tsx`
- `apps/shell-commercial/src/apps/configuracoes/index.tsx`
- `apps/shell-commercial/src/apps/copilot/index.tsx`
- `apps/shell-commercial/src/apps/drive/index.tsx`
- `apps/shell-commercial/src/apps/pessoas/index.tsx`
- `apps/shell-commercial/src/lib/drivers-context.tsx`
- `apps/shell-commercial/src/lib/drivers.ts`
- `apps/shell-commercial/src/routes/index.tsx`
- `apps/shell-commercial/src/routes/staff.tsx`

---

## 2. Suspeitas Investigadas

### Suspeita A — `osStore.focusTab` com array aninhado

**STATUS: DESCARTADA**

```typescript
// Código real (correto):
focusTab: (tabId) => {
  set((state) => ({
    tabs: state.tabs.map((t) => ({ ...t, isActive: t.id === tabId })),
    activeTabId: tabId,
  }));
},
```

Sem colchetes externos. Código correto.

### Suspeita B — Sintaxe quebrada por sed (`.js` em source)

**STATUS: PARCIALMENTE RESOLVIDA (working tree)**

Working tree tem `.js` removido dos 9 arquivos acima. Porém:

- `apps/shell-commercial/src/lib/app-registry.ts` AINDA tem `.js` em dynamic imports:
  ```
  import("../apps/drive/index.js")
  import("../apps/pessoas/index.js")
  import("../apps/chat/index.js")
  import("../apps/configuracoes/index.js")
  import("../apps/governanca/index.js")
  import("../apps/auditoria/index.js")
  ```

Porém este arquivo é usado APENAS pela rota `/` (old `DesktopPage`). O `__root.tsx` redireciona `/` → `/desktop` quando autenticado. A rota `/` nunca é renderizada. **O impacto é NULO para o problema atual.**

### Suspeita C — Vite + WebSocket + PWA

**STATUS: VITE NÃO ESTÁ RODANDO**

```
HTTP 127.0.0.1:5174 → 000 (connection refused)
ps aux | grep vite → vazio
```

`VitePWA` tem `devOptions: { enabled: false }` — ServiceWorker desabilitado em dev. Sem caching de bundles antigos.

### Suspeita D — Lazy import retorna undefined

**STATUS: DESCARTADA**

Todos os exports conferidos:
| App | Registry espera | Arquivo exporta |
|-----|----------------|----------------|
| drive | `m.DriveApp` | `export function DriveApp()` ✓ |
| pessoas | `m.PessoasApp` | `export function PessoasApp()` ✓ |
| chat | `m.ChatApp` | `export function ChatApp()` ✓ |
| configuracoes | `m.ConfiguracoesApp` | `export function ConfiguracoesApp()` ✓ |
| rh | `m.RHApp` | `export { RHApp } from "./RHApp"` ✓ |
| magic-store | `m.MagicStoreApp` | `export { MagicStoreApp } from "./MagicStoreApp"` ✓ |

### Suspeita E — ErrorBoundary engolindo erros

**STATUS: PARCIALMENTE CONFIRMADA**

`ErrorBoundary.tsx` tem `componentDidCatch` SEM `console.error`:

```typescript
override componentDidCatch(_error: Error, _info: ErrorInfo) {
  // App crash isolated — user can reset via the error UI
}
```

Erros não aparecem no console. O fallback visual ("Algo deu errado neste app") está correto, mas **se a ErrorBoundary estiver com altura 0 (ver BUG-1 abaixo), o fallback é invisível**.

---

## 3. TypeCheck

```
cd apps/shell-commercial && pnpm typecheck
→ EXIT 0, sem erros
```

---

## 4. Fluxo de Roteamento (CONFIRMADO)

```
Login → navigate("/") → __root.ts beforeLoad → redirect "/desktop"
→ desktopRoute → OSDesktop
```

`OSDesktop` usa `apps/registry.ts` (correto, sem `.js` issues).
A rota `/` (old DesktopPage com `lib/app-registry.ts`) é INACESSÍVEL após login.

---

## 5. Análise de Layout — BUG-1 CRÍTICO

### Estrutura DOM real:

```
div.flex.flex-col.h-screen  [OSDesktop — flex container, height=100vh]
  TopBar                   [flex item, auto height]
  TabBar                   [flex item, height=40px, hidden when no apps]
  div.flex-1.overflow-hidden.relative   [WRAPPER — flex item, height=100vh-TopBar-TabBar]
    AppFrame component →
      div.flex-1.overflow-hidden.relative  [AppFrame div — BLOCK child, NOT flex item]
        div.absolute.inset-0.flex.flex-col  [TabPane Mesa  — visibility:visible]
        div.absolute.inset-0.flex.flex-col  [TabPane Drive — visibility:hidden]
  Dock (position:fixed — fora do flow)
```

### Problema:

O WRAPPER (`<div className="flex-1 overflow-hidden relative">`) é um flex item, mas **NÃO é um flex container**. Ele não tem `display: flex`.

O AppFrame component renderiza `<div className="flex-1 overflow-hidden relative">`. Este div é **BLOCK child** do WRAPPER (não-flex). Logo:

- `flex-1` no div do AppFrame = **sem efeito** (parent não é flex container)
- `height: auto` → calculado pelo conteúdo
- Conteúdo são TabPanes com `position: absolute` → **fora do flow normal**
- Elementos `position: absolute` **não contribuem para a altura do pai**
- **Altura do AppFrame div = 0**

Com AppFrame altura=0 e `overflow: hidden`:

- Clip rect = 0 pixels de altura
- Todos os TabPanes com `absolute inset-0` têm altura = 0
- Todo conteúdo é clipado = **INVISÍVEL**

### Por que Mesa parece funcionar?

MesaApp tem `className="h-full w-full relative overflow-hidden"`. Ícones têm `position: absolute` com `top: 20px, left: 20px`. Com TabPane altura=0, os ícones estão em `y=20` relativo ao TabPane (altura=0). Eles ESCAPAM o clip do AppFrame (que tem `overflow:hidden` com 0 altura) e são renderizados visualmente dentro da área visual do WRAPPER (que tem `overflow:hidden` mas com altura CORRETA, e `position: relative` que serve como fallback de containing block em alguns contextos CSS).

**Em resumo: Mesa "funciona" apenas porque seus ícones escapam o clip do AppFrame de altura=0 e aparecem na área visual do wrapper. Quando outro app abre (Mesa TabPane fica visibility:hidden), os ícones de Mesa ficam invisíveis. A área principal mostra apenas o background escuro do body/OSDesktop, dando aparência de "vazia" ou "ainda mostrando Mesa".**

---

## 6. Análise por que outros apps não aparecem

Outros apps (Drive, Pessoas, RH, etc.) usam `AppShell` com `className="flex h-full w-full flex-col"`. Com TabPane de altura=0, AppShell também tem altura=0. Conteúdo invisível.

Adicionalmente, se o módulo do app FALHA ao carregar (lazy import error → "Failed to fetch dynamically imported module"), a ErrorBoundary captura o erro e renderiza "Algo deu errado neste app". Mas este erro UI também está dentro do TabPane de altura=0, portanto **também invisível**.

---

## 7. Status dos outros módulos investigados

| Módulo                         | Status                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `packages/kernel/src/index.ts` | Tem `.js` em src, MAS package.json aponta para `dist/` → Vite usa dist compilado → **harmless** |
| `packages/drivers`             | Tem dist compilado → **OK**                                                                     |
| `@aethereos/ui-shell`          | Alias para src/, sem `.js` (cirúrgico 12.1 corrigiu) → **OK**                                   |
| `@aethereos/scp-registry`      | Alias para src/, sem `.js` (cirúrgico 12.1 corrigiu) → **OK**                                   |
| `@aethereos/drivers-litellm`   | Cirúrgico 12.1 corrigiu → **OK**                                                                |
| `lib/drivers.ts`               | Working tree sem `.js` → **OK**                                                                 |
| `lib/drivers-context.tsx`      | Working tree sem `.js` → **OK**                                                                 |
| `osStore.ts`                   | `openApp`, `focusTab`, `closeTab` — todos corretos → **OK**                                     |
| `AppFrame.tsx`                 | Lógica de `isActive` correta → **OK, mas recebe 0 altura do parent**                            |
| `ErrorBoundary.tsx`            | Tem fallback visual, mas silencia erros no console → **OK para UX, ruim para diagnóstico**      |

---

## Causa Raiz Identificada

**BUG-1 (CRÍTICO):** `AppFrame.tsx` usa `className="flex-1 overflow-hidden relative"` mas seu parent direto (wrapper div em OSDesktop) NÃO é um flex container. `flex-1` não tem efeito. AppFrame's div tem altura=0. Todos os TabPanes (absolute inset-0) têm altura=0. Todo conteúdo de apps é invisível.

**BUG-2 (LIMPEZA):** `apps/shell-commercial/src/lib/app-registry.ts` tem `.js` em dynamic imports. Harmless atualmente (rota `/` é inacessível), mas deve ser corrigido para consistência.

**BUG-3 (LIMPEZA):** 9 arquivos com `.js` removal no working tree não commitados.

---

## Fix Proposto

### Fix 1 — Altura do AppFrame (CRÍTICO — resolve apps invisíveis)

**Opção A:** Adicionar `flex flex-col` ao wrapper em `OSDesktop.tsx`:

```tsx
// OSDesktop.tsx linha 68
// ANTES:
<div className="flex-1 overflow-hidden relative">
  <AppFrame />
</div>

// DEPOIS:
<div className="flex-1 overflow-hidden relative flex flex-col">
  <AppFrame />
</div>
```

Isso faz o wrapper se tornar um flex container, e `flex-1` no AppFrame funciona.

**Opção B (PREFERIDA):** Trocar `flex-1` por `h-full` em `AppFrame.tsx`:

```tsx
// AppFrame.tsx linha 48
// ANTES:
<div className="flex-1 overflow-hidden relative" style={{ background: "..." }}>

// DEPOIS:
<div className="h-full overflow-hidden relative" style={{ background: "..." }}>
```

`h-full` = `height: 100%`. O parent (wrapper flex item) tem altura definida. `height: 100%` preenche essa altura. Mais explícito e independente.

### Fix 2 — lib/app-registry.ts (LIMPEZA)

Remover `.js` dos 6 dynamic imports em `src/lib/app-registry.ts`.

### Fix 3 — Commit dos 9 arquivos uncommitted (LIMPEZA)

Commit isolado: `chore(shell): remove .js extensions from browser imports (uncommitted manual fixes)`

---

## Estimativa de outros bugs em cascata

- **Fix 1 sozinho deve restaurar visibilidade de todos os apps**
- Se após Fix 1 ainda houver app invisible: ErrorBoundary está capturando erro de compilação Vite — verificar console do browser para mensagem "Algo deu errado neste app"
- `prefetchApp` em hover do Dock pode pré-carregar e cachear erros de módulo — se isso ocorrer, fechar a aba e reabrir via Mesa icon deve testar sem cache
- RH e Magic Store são novos (Sprint 12) e podem ter bugs de runtime (não de compilação)

---

## Recomendação

**[ ] Aplicar Fix 1 (altura AppFrame) — BUG-1 CRÍTICO, alta confiança**

Sequência proposta:

1. Fix 3: commit 9 arquivos uncommitted (limpa working tree)
2. Fix 1: AppFrame.tsx `flex-1` → `h-full` (resolve invisibilidade)
3. Fix 2: lib/app-registry.ts `.js` cleanup (cosmético)
4. Iniciar Vite: `pnpm --filter=@aethereos/shell-commercial dev`
5. Humano valida visualmente no browser
6. Se apps renderizam: sprint cirúrgico 12.2 encerrado
7. Se ainda vazio: coletar mensagens do console (F12) e reportar

**[ ] NÃO fazer reset soft/hard por enquanto** — o bug identificado é local e cirúrgico.
