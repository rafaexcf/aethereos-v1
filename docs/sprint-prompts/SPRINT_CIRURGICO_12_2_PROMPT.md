# SPRINT CIRÚRGICO 12.2 — AUDITORIA FORENSE COMPLETA

> **Tipo:** Auditoria + diagnóstico forense + remediação metódica.
>
> Sprint 12 e Sprint Cirúrgico 12.1 declararam-se fechados (ci:full + e2e EXIT 0). Validação visual humana revelou frontend completamente quebrado: nenhum app renderiza conteúdo dentro de tabs (Mesa, TabBar, Dock funcionam — área principal do app fica vazia). Múltiplos consertos pontuais não resolveram. **Cada conserto introduziu novo sintoma**.
>
> **Esta sessão NÃO entrega features novas. NÃO altera escopo. NÃO declara fim sem que humano valide visualmente.**
>
> **Estimativa:** 6-12 horas. Custo: $80-150.

---

## CONTEXTO COMPLETO PARA AUDITORIA

### Histórico recente

- **Sprint 11** (commits `9a32...7d8ed26`): cadastro CNPJ + multi-tenant + staff approval. Validação visual humana confirmou funcionamento ponta a ponta de cadastro com BrasilAPI lookup.
- **Sprint 12** (commits `9a37300..1dbadc8`, MX56-MX60): limpeza Camada 1 + RH + Magic Store + Onboarding. Agente declarou EXIT 0 mas validação independente revelou 7 testes falhando + frontend quebrado.
- **Sprint Cirúrgico 12.1** (commits `9cd500a..cc6b385`): tentativa de remediar bugs do Sprint 12. Removeu `.js` em `packages/ui-shell` e `packages/drivers-litellm`, adicionou `resolve.alias` em vite.config.ts, adicionou data-testid em Dock, corrigiu seletores e2e, ajustou queries do RH. **Declarou triple gate verde mas frontend continua quebrado**.
- **Operações manuais subsequentes** (não commitadas):
  - Removidos `.js` em `apps/shell-commercial/src/` (23 imports em 9 arquivos)
  - Truncate de `kernel.mesa_layouts`
  - Múltiplos restarts de Vite

### Estado real observado em validação visual humana

**Funciona:**

- Login com `ana.lima@meridian.test` / `Aethereos@2026!` ✅
- Dashboard pós-login carrega ✅
- TopBar visível (logo, nome empresa, hora, avatar) ✅
- TabBar visível (mostra "Mesa | Pessoas" quando você clica em Pessoas) ✅
- Dock visível (7 ícones: Drive, Pessoas, Mensagens, RH, Magic Store, Configurações, AE AI) ✅
- Click nos ícones abre nova aba no TabBar ✅
- Mesa renderiza ícones na área principal ✅
- Cadastro CNPJ funciona ponta a ponta (rota `/register`) ✅
- Backend funciona — `curl` autenticado em `kernel.employees` e `kernel.files` retorna dados corretos ✅

**NÃO funciona:**

- **Click em qualquer app (Drive, Pessoas, Chat, Configurações, RH, Magic Store, Governança, Auditoria) abre tab no TabBar mas área principal continua mostrando a Mesa OU fica vazia** ❌
- **Erro do console (descoberto na última iteração):** `Failed to fetch dynamically imported module: http://127.0.0.1:5174/src/apps/rh/index.tsx`
- **WebSocket HMR do Vite falhando:** `WebSocket connection to 'ws://127.0.0.1:5174/' failed`
- **Apenas Copilot AE AI funciona como modal** — porque Copilot abre como overlay/drawer (`opensAsModal: true`), não como tab dentro de AppFrame

### Bugs descartados durante investigação anterior (NÃO investigar de novo, salvo regressão evidente)

- Imports `.js` em `packages/ui-shell/src/` — corrigidos no cirúrgico 12.1 commit `9cd500a`
- Imports `.js` em `apps/shell-commercial/src/` — corrigidos manualmente (23 imports em 9 arquivos)
- Permission denied em schema kernel — backend retorna dados corretamente via curl autenticado
- Tabela `kernel.employees` faltando coluna `deleted_at` — coluna existe
- Edge Functions cnpj-lookup e register-company precisando JWT — corrigido em sprint anterior (`verify_jwt = false`)
- Mesa `DEFAULT_LAYOUT` com `icon-comercio` zumbi — removido manualmente
- Mesa `DEFAULT_LAYOUT` faltando RH — adicionado manualmente
- Vite porta 5174 em uso (instâncias zumbi) — resolve com `pkill -9 -f vite`

### Bugs ainda suspeitos

#### Suspeita A — `osStore.focusTab` com array aninhado (POSSÍVEL CRÍTICO)

```typescript
focusTab: (tabId) => {
  set((state) => ({
    tabs: [state.tabs.map((t) => ({ ...t, isActive: t.id === tabId }))],
    //    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //    BUG SUSPEITO: array dentro de array.
    //    state.tabs.map() já retorna array. Os colchetes externos criam [[tab1, tab2, ...]]
    activeTabId: tabId,
  }));
},
```

Se confirmado, `tabs` vira `[[...]]` quando `focusTab` é chamado. `AppFrame.tsx tabs.map(...)` falha em iterar corretamente.

**MAS:** se isso fosse o único bug, TypeScript teria reclamado e o agente cirúrgico teria notado. Talvez seja erro de cópia na visualização anterior — investigar arquivo real.

#### Suspeita B — Vite servindo arquivos com erros de syntax pós-sed

Removemos `.js` em massa via sed. Possível que algum arquivo:

- Tinha import com sintaxe que sed quebrou
- Tinha import multilinha
- Tinha string literal contendo `.js"` que foi alterada por engano

Quando Vite tenta compilar, falha; servidor responde 500 na requisição do módulo; lazy import rejeita; ErrorBoundary captura; fallback aparece como tela vazia.

#### Suspeita C — WebSocket HMR caído indica Vite com problema fundamental

O erro `WebSocket connection to 'ws://127.0.0.1:5174/' failed` significa Vite não está servindo o canal HMR. Isso pode indicar:

- Vite morto ou em estado degenerado
- Configuração do PWA conflitando com HMR
- Cache do `node_modules/.vite` corrompido após múltiplos restarts e mudanças de código
- ServiceWorker do PWA cacheando bundles antigos e impedindo carregamento dos novos

#### Suspeita D — Lazy import retorna undefined silenciosamente

```typescript
component: React.lazy(() =>
  import("./drive/index").then((m) => ({ default: m.DriveApp })),
),
```

Se `m.DriveApp` for undefined (export quebrado, módulo malformado), `lazy` retorna componente que renderiza nada. Suspense não dispara erro porque `lazy` aceita retorno como válido.

#### Suspeita E — ErrorBoundary engolindo erros silenciosamente

```typescript
<ErrorBoundary onReset={handleReset}>
  <Suspense fallback={<AppLoader appId={appId} />}>
    <AppComponent />
  </Suspense>
</ErrorBoundary>
```

Se ErrorBoundary tem fallback vazio, qualquer erro do `<AppComponent />` resulta em tela vazia sem feedback. Validar conteúdo do `ErrorBoundary.tsx`.

### Estado atual git

```
HEAD: cc6b385 (encerramento cirúrgico 12.1)
Tags relevantes:
  - pre-sprint-12 (estado funcional pós-Sprint 11)
  - pre-cirurgico-12-1 (Sprint 12 fechado pelo agente, antes do cirúrgico)

Branches: main, 16 commits à frente de origin/main (NUNCA pushed)

Working tree: tem mudanças NÃO commitadas pelo cirúrgico:
  - packages/ui-shell/src/* (sed removeu .js)  ← provavelmente JÁ commitado pelo cirúrgico
  - apps/shell-commercial/src/* (sed removeu .js manualmente APÓS cirúrgico)
  - mesaStore.ts (cirurgias manuais)

Verificar antes de tudo: git status
```

### Containers e processos

- Supabase: 33+ migrations aplicadas, seed com 9 employees + 3 companies + 1 staff admin
- scp-worker: rodando (mas com erro startup `DATABASE_URL env var is required` — investigar se afeta runtime)
- Vite: estado instável — múltiplos restarts, porta às vezes 5174, às vezes 5175

### Arquivos relevantes para investigação

```
apps/shell-commercial/
├── src/
│   ├── apps/
│   │   ├── registry.ts                    ← lazy imports dos 10 apps
│   │   ├── mesa/MesaApp.tsx              ← renderiza ícones, click handler chama openApp()
│   │   ├── drive/index.tsx               ← exports DriveApp
│   │   ├── pessoas/index.tsx             ← exports PessoasApp
│   │   ├── chat/index.tsx                ← exports ChatApp
│   │   ├── configuracoes/index.tsx       ← exports ConfiguracoesApp
│   │   ├── rh/index.tsx + RHApp.tsx      ← novo Sprint 12
│   │   ├── magic-store/index.tsx + MagicStoreApp.tsx ← novo Sprint 12
│   │   ├── governanca/index.tsx
│   │   ├── auditoria/index.tsx
│   │   └── copilot/index.tsx             ← FUNCIONA (renderiza como modal)
│   ├── components/os/
│   │   ├── OSDesktop.tsx                  ← renderiza TopBar + TabBar + AppFrame + Dock
│   │   ├── AppFrame.tsx                   ← renderiza TabPane para cada tab
│   │   ├── TabBar.tsx                     ← renderiza tabs no topo
│   │   ├── Dock.tsx                       ← onClick chama openApp()
│   │   ├── AppLoader.tsx                  ← fallback do Suspense
│   │   ├── ErrorBoundary.tsx              ← captura erros do <AppComponent />
│   │   └── OnboardingWizard.tsx
│   ├── stores/
│   │   ├── osStore.ts                     ← tabs, activeTabId, openApp, focusTab, closeTab (BUG SUSPEITO no focusTab?)
│   │   ├── mesaStore.ts                   ← DEFAULT_LAYOUT da Mesa
│   │   └── session.ts                     ← userId, activeCompanyId, drivers, accessToken
│   └── lib/
│       ├── drivers-context.tsx
│       └── ...
└── vite.config.ts                         ← resolve.alias adicionado pelo cirúrgico
```

---

## OBJETIVO ÚNICO

Restaurar capacidade de **renderizar conteúdo dentro de tab quando user clica num app na Mesa ou Dock**. Drive, Pessoas, Chat, Configurações, RH, Magic Store, Governança e Auditoria devem mostrar UI ao serem abertos.

**Quando a auditoria identificar a causa raiz, aplicar fix mínimo e testar imediatamente. NÃO fazer múltiplos consertos paralelos antes de validar cada um.**

---

## REGRAS INVIOLÁVEIS

**R1.** Antes de QUALQUER mudança, rodar diagnóstico forense (FASE 1) e gerar `AUDIT_12_2.md` com TODOS os achados.

**R2.** Cada bug consertado vira commit isolado: `fix(<scope>): <causa raiz>: <fix> (CIRÚRGICO 12.2 BUG-N)`.

**R3.** Após cada commit, validar via teste rápido (curl + grep) que o problema específico foi resolvido. **NÃO declarar EXIT 0 baseado em ci:full ou e2e — testes E2E pulam quando env vars não estão setadas, dão falso positivo**.

**R4.** Após cada bug consertado, **PARAR e perguntar ao humano** se quer continuar ou validar visualmente. Não enfileirar fixes sem validação intermediária.

**R5.** Se descobrir que múltiplos commits do cirúrgico 12.1 estão errados, propor reset SOFT (`git reset --soft pre-cirurgico-12-1`) que preserva mudanças no working tree mas refaz a história limpa.

**R6.** Se descobrir que o Sprint 12 inteiro tem regressão estrutural, propor reset HARD para `pre-sprint-12` e refazer Sprint 12 com prompt limpo.

**R7.** NÃO commit final, NÃO `git push`, NÃO declarar fim sem que humano abra o browser e valide pelo menos 4 dos 8 apps renderizando UI.

**R8.** Se atingir 4 horas sem progresso real (entendido: bug identificado E corrigido E validado pelo menos com curl), pausar e propor rollback.

**R9.** NÃO criar features novas. NÃO refatorar código não-relacionado ao bug. NÃO adicionar testes novos. Auditoria é sobre entender e desfazer dano, não sobre construir.

**R10.** NÃO rodar `pnpm install`, `pnpm reinstall`, `rm -rf node_modules` sem perguntar — pode causar mais regressão. Se realmente necessário, perguntar.

---

## FASE 1 — AUDITORIA FORENSE (2-3h)

Crie arquivo `AUDIT_12_2.md` na raiz e preencha em ordem:

### 1.1 — Estado git e working tree

```bash
cd ~/Projetos/aethereos
git log --oneline -25
git status
git diff --stat
```

Documentar:

- Última tag funcional (pre-sprint-12)
- Commits do Sprint 12 (5)
- Commits do Cirúrgico 12.1 (11)
- Mudanças não commitadas (provavelmente apps/shell-commercial/src/ + mesaStore.ts)

### 1.2 — Diff completo entre estado funcional (pre-sprint-12) e atual

```bash
git diff pre-sprint-12 HEAD -- apps/shell-commercial/src/components/os/
git diff pre-sprint-12 HEAD -- apps/shell-commercial/src/stores/
git diff pre-sprint-12 HEAD -- apps/shell-commercial/src/apps/registry.ts
git diff pre-sprint-12 HEAD -- packages/ui-shell/src/
git diff pre-sprint-12 HEAD -- apps/shell-commercial/vite.config.ts
```

Salvar diffs no `AUDIT_12_2.md`. Marcar mudanças que parecem **suspeitas** (introduzem bugs) ou **invasivas** (mudam comportamento muito além do escopo do sprint).

### 1.3 — Validar Suspeita A — `osStore.focusTab` com array aninhado

```bash
sed -n '/focusTab:/,/  },/p' apps/shell-commercial/src/stores/osStore.ts
```

Se o código mostrar `tabs: [state.tabs.map(...)]` (com colchetes externos), é bug confirmado. Documentar no audit. **Não corrigir ainda — só documentar.**

### 1.4 — Validar Suspeita B — Sintaxe quebrada por sed

```bash
# Procurar por imports suspeitos: linhas terminando em .js" sem ser quote dentro de string
grep -rn 'from "[^"]*\.js"' apps/shell-commercial/src/ packages/ui-shell/src/ packages/drivers-litellm/src/

# Procurar por imports incompletos (regex que possa ter quebrado)
grep -rn 'from ""' apps/shell-commercial/src/

# Verificar todos os arquivos modificados pelo sed compilam:
cd apps/shell-commercial && pnpm typecheck 2>&1 | tail -30
```

Se `pnpm typecheck` der erros em arquivos do shell, sintaxe quebrada. Listar erros no audit.

### 1.5 — Validar Suspeita C — Vite + WebSocket + PWA

```bash
# Existe service worker registrado que pode cachear bundles antigos?
grep -rn "registerSW\|serviceWorker" apps/shell-commercial/src/ apps/shell-commercial/index.html
grep "VitePWA" apps/shell-commercial/vite.config.ts

# Cache vite
ls -la apps/shell-commercial/node_modules/.vite/ 2>/dev/null

# Vite live e respondendo?
ps aux | grep -E "vite" | grep -v grep | grep -v claude | head -3
curl -s -o /dev/null -w "Shell HTTP: %{http_code}\n" http://127.0.0.1:5174/
curl -s -o /dev/null -w "Drive: %{http_code}\n" "http://127.0.0.1:5174/src/apps/drive/index.tsx"
curl -s -o /dev/null -w "RH: %{http_code}\n" "http://127.0.0.1:5174/src/apps/rh/index.tsx"
curl -s -o /dev/null -w "Mesa: %{http_code}\n" "http://127.0.0.1:5174/src/apps/mesa/MesaApp.tsx"

# Logs recentes do Vite
ls -la /tmp/*.log 2>/dev/null
tail -50 /tmp/shell.log 2>/dev/null
tail -50 /tmp/vite-final.log 2>/dev/null
tail -50 /tmp/vite-fresh.log 2>/dev/null
```

Documentar:

- Se Vite vivo e em qual porta
- Se HTTP 200 em `/` mas falha em `/src/apps/...` → arquivo com erro de compilação
- Se PWA service worker está registrando e pode estar cacheando — verificar se `apps/shell-commercial/dist/` existe e tem arquivos antigos

### 1.6 — Validar Suspeita D — Lazy imports

```bash
# Para cada app no registry, confirmar que arquivo existe e exporta o componente esperado:
grep -E "id: \"|component: React.lazy" apps/shell-commercial/src/apps/registry.ts | head -40

# Para cada app, confirmar export default OU named export que o registry espera:
for app in drive pessoas chat configuracoes rh magic-store governanca auditoria mesa; do
  echo "=== $app ==="
  if [ -f "apps/shell-commercial/src/apps/$app/index.tsx" ]; then
    grep -E "^export" "apps/shell-commercial/src/apps/$app/index.tsx" | head -5
  else
    echo "(diretório não tem index.tsx)"
    ls "apps/shell-commercial/src/apps/$app/"
  fi
done
```

Documentar mismatch entre o que registry importa (`m.DriveApp`) e o que o arquivo exporta.

### 1.7 — Validar Suspeita E — ErrorBoundary

```bash
cat apps/shell-commercial/src/components/os/ErrorBoundary.tsx
```

Documentar:

- Se ErrorBoundary tem `console.error` no catch (pra deixar pegada no console)
- Se fallback é uma UI ou se é null
- Se há lógica que poderia silenciosamente esconder erros

### 1.8 — Validar dependências do shell

```bash
# package.json do shell
cat apps/shell-commercial/package.json | grep -A 1 "@aethereos"

# Cada @aethereos importado pelo shell:
grep -rh "from \"@aethereos/" apps/shell-commercial/src/ | sed 's|.*from "\(@aethereos/[^"]*\)".*|\1|' | sort -u

# Vite alias atual:
sed -n '/resolve:/,/^  build:/p' apps/shell-commercial/vite.config.ts
```

Documentar:

- Lista completa de pacotes @aethereos importados
- Quais têm alias no Vite e quais não têm
- Se algum apontar pra arquivo inexistente

### 1.9 — Validar fluxo openApp → focusTab → AppFrame

Traçar fluxo completo no audit:

1. User click no Dock → onClick → `openApp("drive", "Drive")`
2. `openApp` em osStore → cria nova tab e chama `set()` ou usa `focusTab`
3. `set()` atualiza `tabs` e `activeTabId`
4. `AppFrame` re-renderiza, faz `tabs.map(tab => <TabPane isActive={tab.id === activeTabId} />)`
5. `<TabPane>` com `isActive={true}` torna `visibility: visible`
6. `<Suspense>` carrega lazy component
7. Componente renderiza dentro de TabPane

Validar passo a passo qual está quebrado. **A informação `data-testid="mesa-app"` aparece no DOM mesmo com Pessoas ativa indica que a Mesa-tab tem `isActive: true` mesmo que `activeTabId` seja "pessoas-tab".**

### 1.10 — Audit final

`AUDIT_12_2.md` deve ter no fim:

```markdown
## Causa raiz identificada

[Hipótese principal]

## Fix proposto

[Em pseudocódigo, antes de aplicar]

## Estimativa de outros bugs em cascata

[O que fix pode quebrar / outras features afetadas]

## Recomendação

[ ] Aplicar fix mínimo (caminho mais provável de funcionar)
[ ] Reset soft cirúrgico 12.1 e refazer com novo prompt
[ ] Reset hard pre-sprint-12 e refazer Sprint 12 com novo prompt
[ ] Outro caminho descoberto durante audit
```

**PARAR aqui. Pedir aprovação do humano antes de FASE 2.**

---

## FASE 2 — REMEDIAÇÃO MÍNIMA (somente após aprovação humana)

### 2.1 — Aplicar fix priorizado

Baseado no audit, aplicar fix mais provável de resolver. **Um bug por vez.**

Após cada fix:

- Commit isolado com mensagem clara
- Restart Vite limpo (`pkill -9 -f vite` + relançar)
- Validar via curl que arquivo serve corretamente
- Pedir validação visual humana antes de prosseguir

### 2.2 — Se fix resolve tudo

Documentar resolução, atualizar SPRINT_LOG.md, **NÃO push para origin**, devolver controle ao humano.

### 2.3 — Se fix não resolve

Voltar à FASE 1 e refinar diagnóstico. Se fizer 3 tentativas sem progresso, propor rollback.

---

## FASE 3 — SE FOR PRECISO ROLLBACK

### Caminho A — Reset soft do cirúrgico

```bash
git tag pre-rollback-12-2-tentativa-1
git reset --soft pre-cirurgico-12-1
# working tree agora tem todas mudanças do cirúrgico como modified, sem commits
git status
# Decidir o que reaplicar com cabeça fria
```

### Caminho B — Reset hard para pre-sprint-12

```bash
git tag pre-rollback-12-2-tentativa-1
git reset --hard pre-sprint-12
# Volta ao estado funcional do final do Sprint 11
# Sprint 12 inteiro precisa ser refeito
```

Em ambos os casos, **não force push.** Branches estão local-only. Origin permanece em `7d8ed26` (Sprint 11 fechado).

---

## VALIDAÇÃO FINAL OBRIGATÓRIA

Antes de declarar fechado:

1. **Backend OK:**

```bash
ANON_KEY=$(supabase status -o env 2>/dev/null | grep '^ANON_KEY=' | cut -d'"' -f2)
JWT=$(curl -s "http://127.0.0.1:54321/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"ana.lima@meridian.test","password":"Aethereos@2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s "http://127.0.0.1:54321/rest/v1/employees?select=full_name&limit=3" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT" \
  -H "Accept-Profile: kernel"
# Esperado: lista de 3 nomes em JSON
```

2. **Vite servindo arquivos OK:**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:5174/src/apps/drive/index.tsx"
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:5174/src/apps/rh/index.tsx"
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:5174/src/apps/pessoas/index.tsx"
# Esperado: 200 em todos
```

3. **Build OK:**

```bash
pnpm --filter=@aethereos/shell-commercial build 2>&1 | tail -10
echo "build EXIT: $?"
# Esperado: EXIT 0
```

4. **Validação visual humana OBRIGATÓRIA**

Após Claude Code declarar fechado, humano vai:

- Abrir browser anônimo em `127.0.0.1:5174`
- Login `ana.lima@meridian.test` / `Aethereos@2026!`
- F12 → Console limpo
- Click em Drive → ver UI com pastas/arquivos
- Click em Pessoas → ver lista de pessoas
- Click em RH → ver lista de employees
- Click em Magic Store → ver cards
- Click em Configurações → ver UI de settings

Se humano confirmar funcionar, sprint cirúrgico 12.2 fechado. Se não, voltar pra FASE 1.

---

## CHECKLIST DE TÉRMINO

Antes de considerar trabalho feito:

- [ ] `AUDIT_12_2.md` criado e completo
- [ ] Bug raiz identificado e documentado em `AUDIT_12_2.md`
- [ ] Fix aplicado em commits isolados (`fix(...): ... (CIRÚRGICO 12.2 BUG-N)`)
- [ ] Validação backend via curl autenticado retorna dados ✅
- [ ] Vite responde 200 em arquivos críticos ✅
- [ ] Build funciona ✅
- [ ] Humano fez validação visual e confirmou funcionar ✅
- [ ] SPRINT_LOG.md atualizado com seção "Sprint Cirúrgico 12.2"
- [ ] KNOWN_LIMITATIONS.md atualizado se houver dívida nova
- [ ] `git status` working tree limpo
- [ ] **NÃO push para origin** sem aprovação humana

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint Cirúrgico 12.2 (auditoria pós-12.1) no Aethereos.

Antes de qualquer ação:
1. cat AUDIT_12_2.md (deve existir, retomar de onde parou)
2. git log --oneline -10
3. git status
4. Identificar próxima FASE não concluída
5. Continuar SEM declarar fim sem validação humana

Lembrar:
- NÃO criar features novas
- NÃO declarar fim baseado em e2e EXIT 0 (testes pulam sem env vars)
- Validação visual humana é gate obrigatório
- Cada commit é uma intervenção; uma intervenção, uma validação
- Após 3 tentativas sem progresso real, propor rollback
- NÃO push para origin
```

Salve este arquivo como `SPRINT_CIRURGICO_12_2_PROMPT.md` na raiz do projeto antes de começar.
