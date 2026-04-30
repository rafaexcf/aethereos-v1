# SPRINT REDESIGN-1 — Aplicação do DESIGN.md

> **Tipo:** Sprint dedicado a aplicar o novo design system canônico (`DESIGN.md`) em todo o `shell-commercial`.
>
> Não adiciona features. Refaz a camada visual de Camada 1 do zero usando os tokens canônicos definidos em `DESIGN.md`.
>
> **Estimativa:** 8-14 horas. Custo: $80-130.

---

## CONTEXTO

### Por que este sprint

Sessão anterior (Sprint 12 + Cirúrgicos 12.1 e 12.2) restaurou funcionamento de todos os apps após bug do `flex-1` em pai não-flex. Sprint paralelo (commits `9b89604` e `535f699`) tentou aplicar redesign macOS Tahoe ("liquid glass, aurora wallpaper") **mas validação visual humana confirmou que o redesign NÃO está visível em browser** — UI permanece com aparência anterior.

Em vez de continuar tentativas pontuais, este sprint:

1. Adota `DESIGN.md` (na raiz do repo) como **canon visual definitivo**
2. Investiga por que mudanças de design dos commits anteriores não chegam ao browser
3. Aplica TODO o design system de uma vez, com método

### O que existe na raiz do projeto

- **`DESIGN.md`** — documento canônico com tokens CSS, padrões de componentes, regras de movimento, modos light/dark, regras de acessibilidade, anti-patterns. Ler PRIMEIRO antes de qualquer ação.

### Estado atual do código relevante para visual

- `apps/shell-commercial/src/styles/` — provavelmente tem `globals.css` ou `tokens.css` que precisa ser substituído
- `apps/shell-commercial/src/components/os/` — TopBar, TabBar, Dock, AppFrame, AppLoader, ErrorBoundary, OnboardingWizard
- `apps/shell-commercial/src/apps/mesa/MesaApp.tsx` — Mesa com ícones
- `apps/shell-commercial/src/apps/*/index.tsx` — 10 apps (Drive, Pessoas, Chat, Settings, RH, Magic Store, Governança, Auditoria, Mesa, Copilot)
- `packages/ui-shell/src/components/app-shell/` — AppShell (sidebar + main)
- `apps/shell-commercial/vite.config.ts` — config do Vite (com VitePWA)

### Pontos de atenção descobertos em sessões anteriores

1. **PWA pode estar cacheando bundle antigo.** VitePWA registra service worker em produção; em dev é `devOptions: disabled` mas service worker antigo pode persistir.
2. **`apps/shell-commercial/lib/app-registry.ts`** existe mas é legado (não usado pelo registry novo em `src/apps/registry.ts`). Verificar se algum import ainda usa.
3. **Múltiplas instâncias Vite zumbi** acontecem após restarts. Sempre `pkill -9 -f vite` antes de subir.
4. **Browser cache agressivo**. Sempre testar em **aba anônima nova** com **DevTools → Network → "Disable cache"** marcado.
5. **`@aethereos/ui-shell`** importado por 8 apps — mudanças no `<AppShell>` afetam todos eles.

---

## REGRAS INVIOLÁVEIS

**R1.** **Ler `DESIGN.md` na íntegra antes de tocar em qualquer código.** Não é template, é canon. Toda decisão sai de lá.

**R2.** Se algo no código atual viola o `DESIGN.md`, refazer. Não preservar implementações antigas por compatibilidade.

**R3.** Commit por etapa: `style(<scope>): <descrição> (REDESIGN-1 ETAPA-N)`.

**R4.** Validação visual humana é gate obrigatório no fim. Não declarar fechado sem humano abrir browser e confirmar.

**R5.** Não criar features novas. Não adicionar campos. Não mexer em lógica de stores ou queries.

**R6.** Manter compatibilidade funcional: nenhum app pode quebrar funcionalmente como consequência do restyle.

**R7.** Light/Dark/System: implementar **todos os 3 modos** desde o início. Não deixar "Light pra depois".

**R8.** Tokens CSS canônicos vivem em **um único arquivo** (`apps/shell-commercial/src/styles/tokens.css`). Nada de cores hardcoded em componentes. Se precisar de cor nova, vai pro `DESIGN.md` primeiro.

**R9.** Tailwind v4 + `@theme` config-less. Variáveis CSS são fonte de verdade.

**R10.** Não fazer push pra origin sem aprovação humana após validação visual.

---

## ROADMAP

### ETAPA 0 — Investigar por que redesign anterior não está visível (1h)

**Antes** de aplicar novo design, descobrir o que está bloqueando a visibilidade das mudanças anteriores. Senão o novo design vai ter o mesmo problema.

Investigações obrigatórias:

1. **Ver os commits do redesign Tahoe** (`9b89604`, `535f699`) — `git show <hash> --stat` e `git show <hash>` para entender exatamente o que foi mudado.

2. **Browser cache / Service Worker:**

```bash
grep -rn "registerSW\|VitePWA\|ServiceWorker" apps/shell-commercial/src/ apps/shell-commercial/index.html apps/shell-commercial/vite.config.ts
ls -la apps/shell-commercial/dist/ 2>/dev/null
ls -la apps/shell-commercial/public/sw.js 2>/dev/null
```

3. **CSS está sendo importado?**

```bash
grep -rn "import.*\.css" apps/shell-commercial/src/main.tsx apps/shell-commercial/src/styles/
```

4. **Mudanças do redesign foram em arquivo importado?**

```bash
git diff a803d1c..535f699 -- apps/shell-commercial/src/styles/
git diff a803d1c..535f699 -- apps/shell-commercial/src/components/os/
```

Documentar achados em `REDESIGN_DIAGNOSIS.md` na raiz. Se descobrir bloqueador (ex: service worker servindo bundle velho), resolver antes de prosseguir. Possíveis fixes:

- `unregister` de service workers pré-existentes via código
- `clearCache` no main.tsx em dev mode
- Limpar `node_modules/.vite` cache
- Remover `apps/shell-commercial/dist/` se existir

Commit: `chore(redesign): diagnostico cache+sw antes de aplicar design (REDESIGN-1 ETAPA-0)`

---

### ETAPA 1 — Tokens canônicos + Tailwind theme (1.5h)

Substituir camada de tokens por implementação fiel ao `DESIGN.md` seções 3 (Tokens), 4 (Tipografia), 6 (Movimento).

1. Criar/substituir `apps/shell-commercial/src/styles/tokens.css` com **todas** as variáveis das seções 3.1 a 3.8 do `DESIGN.md`. Light + Dark.

2. Criar `apps/shell-commercial/src/styles/globals.css` que importa tokens.css + reset + classes utility canônicas.

3. Tailwind v4: adicionar `@theme` block consumindo variáveis CSS para que classes Tailwind reflitam tokens.

4. Adicionar Inter font via Fontsource:

```bash
pnpm add --filter=@aethereos/shell-commercial @fontsource-variable/inter
```

E import em `main.tsx`.

5. Implementar **Theme Provider** em `apps/shell-commercial/src/lib/theme-provider.tsx`:
   - Estado: `'dark' | 'light' | 'system'`
   - Persistência localStorage `aethereos-theme`
   - Sincroniza com `prefers-color-scheme` quando system
   - Aplica `data-theme="X"` no `<html>`

6. Theme toggle em Configurações (não criar novo, adicionar à app `configuracoes` existente)

Commit: `style(tokens): canonical tokens.css + theme provider light/dark/system (REDESIGN-1 ETAPA-1)`

---

### ETAPA 2 — Mesa + Aurora background (1h)

`DESIGN.md` seção 7.

1. Atualizar `apps/shell-commercial/src/apps/mesa/MesaApp.tsx`:
   - Background com aurora gradient (CSS multilayer radial-gradient)
   - Animação `aurora-shift` 30s ease-in-out alternate
   - Respeitar `prefers-reduced-motion` (parar animação)

2. Wallpapers customizados (existem no `mesaStore.ts`) sobrepoem aurora se selecionados.

3. Ícones de Mesa: 80×80 com radius-md, label embaixo em text-caption, hover com leve scale (1.05) + bg-[var(--bg-surface-hover)]

Commit: `style(mesa): aurora background + ícones canônicos (REDESIGN-1 ETAPA-2)`

---

### ETAPA 3 — TopBar + TabBar (glass-subtle) (1h)

`DESIGN.md` seções 5.2 e 5.3.

1. `TopBar.tsx`:
   - Altura 44px, glass-subtle
   - Conteúdo: logo Aethereos (texto bold) → company switcher (dropdown com nome empresa) → notificações + avatar
   - Sem borda inferior visível
   - `position: sticky top-0 z-50`

2. `TabBar.tsx`:
   - Altura 36px, mesmo glass-subtle
   - Tabs com radius-md, gap 4px
   - Tab ativa: glass-fill-strong + ícone colorido
   - Inativa: ícone semi-transparente
   - Botão close on-hover
   - Drag-drop @dnd-kit (já existe — preservar)

Commit: `style(top-bar): glass-subtle TopBar + TabBar canônicos (REDESIGN-1 ETAPA-3)`

---

### ETAPA 4 — Dock (glass-default) (1h)

`DESIGN.md` seção 5.5.

1. `Dock.tsx`:
   - Posição: fixed bottom-4 left-1/2 -translate-x-1/2
   - Glass-default
   - Altura 64px, padding lateral 12px
   - Ícones 48×48, magnification até 64×64 on-hover (framer-motion spring config existente)
   - Indicador app aberto: dot embaixo (3×3px, cor do app)
   - Separador opcional entre seções (linha vertical 1px)
   - Respeitar `prefers-reduced-motion` (sem magnification)

Manter `data-testid="dock-app-{id}"` que já existe (validado em testes E2E).

Commit: `style(dock): glass-default Dock + magnification canônica (REDESIGN-1 ETAPA-4)`

---

### ETAPA 5 — AppFrame + estados base (45min)

`DESIGN.md` seção 5.6.

1. `AppFrame.tsx`:
   - Container `h-full` (NÃO `flex-1` — bug histórico já consertado, manter)
   - Background `var(--bg-elevated)`
   - Border-radius `var(--radius-xl)` no top
   - Padding interno: 0
   - TabPane com transition de entrada (opacity 0→1, 150ms)

2. `AppLoader.tsx`:
   - Skeleton respeitando glass material
   - Spinner Lucide `Loader2` em cor do app, animação spin

3. `ErrorBoundary.tsx`:
   - Fallback usa glass-strong, ícone `AlertCircle`, mensagem clara, botão "Recarregar app" e "Reportar bug"
   - Sempre logar `console.error` no catch (não silenciar)

Commit: `style(app-frame): canonical AppFrame + loader + error boundary (REDESIGN-1 ETAPA-5)`

---

### ETAPA 6 — AppShell (sidebar + main) (1h)

`DESIGN.md` seção 5.7.

1. `packages/ui-shell/src/components/app-shell/`:
   - Sidebar 220px, glass-subtle, padding 12px 8px
   - Sidebar items 34px altura, radius-md, hover glass-fill
   - Item ativo: glass-fill-strong + ícone colorido
   - Main area `flex-1`, padding 24px
   - Scroll vertical interno na main

8 apps usam — mudança propaga.

Commit: `style(ui-shell): AppShell canônico glass + sidebar tokens (REDESIGN-1 ETAPA-6)`

---

### ETAPA 7 — Primitivas UI (Button, Input, Select, etc) (1.5h)

`DESIGN.md` seções 5.8, 5.9.

Criar/atualizar em `apps/shell-commercial/src/components/ui/`:

- `button.tsx` — variants: primary, secondary, tertiary, destructive
- `input.tsx` — text, email, password, search
- `select.tsx` — dropdown nativo estilizado
- `checkbox.tsx`
- `radio.tsx`
- `switch.tsx` (toggle)
- `textarea.tsx`
- `label.tsx`
- `badge.tsx`

Usar Radix primitives onde fizer sentido (já são deps via shadcn). Customizar visual com tokens.

Commit: `style(ui): primitivas canônicas (button/input/select/checkbox/...) (REDESIGN-1 ETAPA-7)`

---

### ETAPA 8 — Cards, Tabelas, Modais, Drawers (1.5h)

`DESIGN.md` seções 5.10, 5.11, 5.12.

Criar primitivas reusáveis:

- `card.tsx` (CardRoot, CardHeader, CardContent, CardFooter)
- `table.tsx` (Table, Thead, Tbody, Tr, Th, Td)
- `dialog.tsx` (modal com overlay glass-strong) — Radix Dialog
- `drawer.tsx` (lateral, slide from right) — Radix Dialog com `right: 0`
- `toast.tsx` — notification glass-default
- `popover.tsx` — Radix Popover

Cada componente respeita tokens, animações framer-motion onde aplicável.

Commit: `style(ui): cards, tabelas, modais, drawers canônicos (REDESIGN-1 ETAPA-8)`

---

### ETAPA 9 — Aplicar nos 8 apps (drive, pessoas, chat, configuracoes, rh, magic-store, governanca, auditoria) (2-3h)

Para cada app:

1. Remover cores hardcoded (`bg-zinc-800`, `text-violet-400`, etc)
2. Substituir por classes consumindo tokens (`bg-[var(--bg-surface)]`, `text-[var(--text-primary)]`)
3. Substituir botões/inputs/cards/tables locais pelas primitivas da ETAPA 7-8
4. Validar que app abre, lista carrega, formulários funcionam (smoke test funcional)

Apps com mais retrabalho esperado:

- **RH** (Sprint 12 — usa muitas cores hardcoded, 5 tabs no form, drawer detail)
- **Magic Store** (Sprint 12 — cards com badges, drawer)
- **Drive** (sidebar de pastas, lista de arquivos, breadcrumb)
- **Configurações** (forms longos, theme toggle entra aqui)

Commits separados:

- `style(drive): aplicar design canônico (REDESIGN-1 ETAPA-9.1)`
- `style(pessoas): aplicar design canônico (REDESIGN-1 ETAPA-9.2)`
- ... etc

---

### ETAPA 10 — Onboarding Wizard + Login + Register (1h)

Telas fora do shell mas que precisam respeitar design system:

- `routes/login.tsx`
- `routes/register.tsx`
- `routes/select-company.tsx`
- `components/os/OnboardingWizard.tsx`
- `routes/staff.tsx`

Aplicar tokens, primitivas, glass background/aurora se aplicável.

Commit: `style(routes): login, register, select-company, staff, onboarding canônicos (REDESIGN-1 ETAPA-10)`

---

### ETAPA 11 — Validação final + commit consolidado (45min)

1. Build limpo:

```bash
cd ~/Projetos/aethereos
pkill -9 -f vite 2>/dev/null
rm -rf apps/shell-commercial/node_modules/.vite
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

Os E2E podem precisar ajustes em seletores se as classes mudaram. Verificar e corrigir testes (não as features).

4. Atualizar `SPRINT_LOG.md` com seção do REDESIGN-1 e KNOWN_LIMITATIONS se houver pendências.

5. Commit final: `chore: encerramento sprint redesign-1 — design system canônico aplicado`

---

## VALIDAÇÃO VISUAL HUMANA OBRIGATÓRIA

Após todas as etapas, antes de declarar fechado:

Humano vai abrir browser anônimo, login, e validar:

- [ ] **Mesa tem aurora background visível** (gradient indigo/purple/blue/pink suave)
- [ ] **Aurora anima sutilmente** (não estática)
- [ ] **Glass material visível** em TopBar, Dock, drawers (translucidez perceptível com blur)
- [ ] **Modo Dark default** está aplicado
- [ ] **Toggle de tema** em Configurações funciona — Light, Dark, System
- [ ] **Light mode** tem aurora suave + glass claro, texto preto legível
- [ ] **TopBar** sem borda inferior, transparente sobre Mesa
- [ ] **Dock** flutuante com magnification suave
- [ ] **TabBar** mostra apps abertos com cor distintiva
- [ ] **Drive, Pessoas, Chat, Configurações, RH, Magic Store** abrem com UI consistente (mesmo padrão visual)
- [ ] **Botões primary/secondary/destructive** distinguíveis
- [ ] **Inputs** com focus ring visível
- [ ] **Modais e drawers** com backdrop blur
- [ ] **Tipografia Inter** carregada (verificar via DevTools → Computed → font-family)
- [ ] **Sem cores hardcoded** óbvias (rosa choque, azul-bootstrap, etc)
- [ ] **Acessibilidade**: contraste OK em ambos os modos, focus rings em elementos interativos

Se algum item falhar, voltar para etapa correspondente.

---

## SE ALGO QUEBRAR FUNCIONALMENTE

`R6` é regra inflexível: nenhum app pode quebrar funcionalmente. Se redesign de um app quebrar fluxo (ex: form de RH não submete, Drive não lista arquivos), tem 2 opções:

1. Investigar e consertar — provavelmente regressão local de markup
2. Reverter commit específico daquele app, deixar como dívida em `KNOWN_LIMITATIONS.md`, prosseguir com outros apps

Não bloquear sprint inteiro por um app quebrado.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint REDESIGN-1 (aplicação do DESIGN.md) no Aethereos.

Antes de qualquer ação:
1. Ler DESIGN.md na raiz (canon visual)
2. cat REDESIGN_DIAGNOSIS.md (se existir)
3. git log --oneline -15
4. Identificar última ETAPA concluída
5. Continuar dali

Lembrar:
- DESIGN.md é canon, não preservar implementação anterior
- Light + Dark + System desde o começo
- Validação visual humana é gate obrigatório
- Sem features novas, sem mexer em lógica
- Testes E2E podem precisar ajuste de seletor após mudanças visuais
- Não push para origin sem aprovação humana
```

Salve este arquivo como `SPRINT_REDESIGN_1_PROMPT.md` na raiz do projeto antes de começar.
