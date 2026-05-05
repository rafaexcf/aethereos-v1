# SPRINT LONGO AUTÔNOMO — Aethereos Bootstrap Fase 2

> Continuação do Sprint 1 (concluído com 10 milestones em commits f5dfdc5..6dc2fc8).
> Foco desta fase: **Camada 0 — shell-base open source local-first**.
>
> **Como usar:**
>
> 1. Confirme que está em `~/Projetos/aethereos`, working tree clean, todos os checks verdes
> 2. Abra Claude Code: `claude`
> 3. Cole este prompt INTEIRO como primeira mensagem
> 4. Volte a cada 60-90 minutos para verificar
> 5. Se sessão terminar no meio, use o "Prompt de Retomada" no fim deste arquivo

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code retomando trabalho no monorepo Aethereos. O Sprint 1 já foi concluído (12 commits, working tree clean). Antes de fazer qualquer coisa:

1. **Leia integralmente** os documentos abaixo, nesta ordem:
   - `CLAUDE.md` da raiz
   - `SPRINT_LOG.md` (estado deixado pelo sprint anterior)
   - `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` Partes II, III (Camadas), IV (Arquitetura), VII (Apps), XIV (Stack)
   - `docs/adr/0001-fundacao.md`
   - `docs/adr/0014-resolucao-stack-vs-analise-externa.md`
   - `docs/SECURITY_GUIDELINES.md`
   - `docs/DATA_LIFECYCLE.md` (relevante para retenção local em OPFS)

2. **Confirme em voz alta** (escrevendo no chat antes de qualquer ação) cinco pontos:
   - Qual é o domínio canônico da Camada 0 e qual licença ela usa
   - Por que a Camada 0 é construída ANTES da Camada 1 (rationale arquitetural, não comercial)
   - Como o Driver Model permite que Camada 0 e Camada 1 compartilhem código
   - Liste 3 invariantes da Camada 0 que diferem da Camada 1
   - O que é OPFS e por que foi escolhido em vez de IndexedDB puro

3. **Verifique estado do repo:**

```bash
git log --oneline -5
git status
pnpm typecheck
```

Se algo estiver vermelho, **pare** e descreva no chat antes de continuar.

---

## REGRAS INVIOLÁVEIS DESTE SPRINT

(Mesmas do Sprint 1, repetidas para sessão limpa)

**R1.** Após cada milestone concluída, **commit obrigatório** com mensagem estruturada:

```
<tipo>(<scope>): <descrição curta>

<corpo explicando o quê e por quê>

Milestone: <ID>
Refs: <documentos consultados>
```

**R2.** Nenhuma milestone começa sem que a anterior tenha critério de aceite verificado, commit feito, entrada no `SPRINT_LOG.md` registrada.

**R3.** Após **3 tentativas** falhando o critério de aceite, marcar `BLOQUEADA`, registrar tentativas e razão, **pular** para próxima milestone. Nunca entrar em loop.

**R4.** Antes de adicionar dependência, verificar `CLAUDE.md` seção 5 e `ADR-0014`. Camada 0 tem restrições adicionais — lista expandida em **R11** abaixo.

**R5.** Nunca usar `next`, `inngest`, `@clerk/*`, `prisma`, `aws-cdk`, `terraform`. Nunca usar `framer-motion` (bundle <500KB).

**R6.** Toda nova dependência exige justificativa no commit body. Camada 0 prefere zero deps adicionais — usar Web Standards sempre que possível.

**R7.** Não delete arquivos em `docs/` nem edite documentos da Fundamentação.

**R8.** Atualize `SPRINT_LOG.md` ao fim de cada milestone com o template padrão (timestamp, status, comandos, arquivos, decisões, próximas dependências).

**R9.** Não execute comandos fora de `~/Projetos/aethereos`. Não instale ferramentas globais.

**R10.** Ao perceber que contexto está cheio: **pare** e escreva "CONTEXTO PRÓXIMO DO LIMITE — pickup point: <descrição>". Use o Prompt de Retomada.

**R11. ESPECÍFICO DA CAMADA 0** — Restrições adicionais:

- **Sem backend obrigatório.** Tudo roda 100% no navegador.
- **Sem dependências de network em runtime crítico.** Após primeiro load, app funciona offline.
- **Tamanho do bundle inicial < 500KB gzip.** Verificável via `vite build` + análise de output.
- **Sem cookies de tracking, sem analytics.** Fundamentação P10 (privacidade por design).
- **PWA instalável.** Manifest correto, service worker básico.
- **OPFS é storage primário** para dados estruturados via SQLite WASM. IndexedDB é fallback secundário para metadados quando OPFS não está disponível.
- **LocalStorage proibido para dados de domínio.** Apenas para preferências triviais (tema, idioma) e mesmo assim com cap de 5KB.
- **Crypto via Web Crypto API nativa**, não bibliotecas externas.

---

## ARQUIVO DE LOG

Adicionar nova seção ao `SPRINT_LOG.md` existente:

```markdown
---

# Sprint 2 — Camada 0 (shell-base)

Início: <timestamp ISO>
Modelo: Claude Code (sessão Sprint 2 N=1)

## Calibração inicial (Sprint 2)

[respostas dos 5 pontos]

## Histórico de milestones (Sprint 2)

[preenchido conforme avança]
```

Commit dessa adição antes de prosseguir.

---

## ROADMAP DE MILESTONES (ordem obrigatória)

### M11 — LocalDrivers: interfaces concretas para ambiente de navegador

**Objetivo:** primeira implementação não-cloud das interfaces do Driver Model. Valida que `packages/drivers/` é mesmo agnóstico.

**Tarefas:**

1. Criar `packages/drivers-local/` com estrutura:
   ```
   packages/drivers-local/
   ├── package.json          # marcar "browser": true; sem dependências node-only
   ├── tsconfig.json
   ├── src/
   │   ├── index.ts
   │   ├── database/
   │   │   ├── sqlite-wasm-driver.ts    # LocalDatabaseDriver via sql.js
   │   │   └── opfs-vfs.ts              # camada VFS apontando para OPFS
   │   ├── storage/
   │   │   └── opfs-storage-driver.ts   # LocalStorageDriver (arquivos em OPFS)
   │   ├── auth/
   │   │   └── local-auth-driver.ts     # auth offline: passphrase + Argon2id em WASM, JWT local
   │   ├── secrets/
   │   │   └── webcrypto-secrets-driver.ts  # AES-GCM via Web Crypto, chave derivada da passphrase
   │   ├── cache/
   │   │   └── memory-cache-driver.ts   # cache em Map com TTL
   │   ├── feature-flags/
   │   │   └── static-flags-driver.ts   # JSON estático embarcado no bundle
   │   └── event-bus/
   │       └── broadcast-channel-driver.ts  # BroadcastChannel API entre abas + fila in-memory
   └── README.md
   ```
2. **Cada driver implements estritamente** a interface canônica de `@aethereos/drivers/interfaces/*`.
3. SQLite WASM: usar `sql.js` (carregado dinamicamente para não inflar bundle inicial). Persistência via OPFS (Origin Private File System) com fallback para IndexedDB.
4. Auth local: gera identidade ED25519 do dispositivo na primeira execução, armazena chave privada no IndexedDB criptografada com AES-GCM derivada da passphrase do usuário (Argon2id).
5. Event bus local: publish escreve em fila + dispara via BroadcastChannel para outras abas; subscribe escuta da fila + BroadcastChannel.
6. **Testes unitários** para cada driver em `__tests__/`. Use `vitest` com `happy-dom` ou `jsdom` para simular navegador.
7. **Não há driver local para `vector`, `llm`, `observability`** — esses não fazem sentido em Camada 0 sem servidor. Documentar no README do package.

**Critério de aceite:**

```bash
pnpm typecheck                                    # passa
pnpm lint                                         # passa
pnpm deps:check                                   # passa
pnpm test --filter=@aethereos/drivers-local       # passa, cobre cada driver
```

Verificar que `package.json` tem campo `browser: true` e não importa nada de `node:*`.

Commit: `feat(drivers-local): implementacoes browser-only para Camada 0 (Fundamentacao 21.5)`

---

### M12 — App `shell-base`: scaffold Vite + React + TanStack Router

**Objetivo:** primeiro app executável do monorepo. Camada 0 nasce aqui.

**Tarefas:**

1. Criar `apps/shell-base/` usando Vite + React 19 + TypeScript:
   ```
   apps/shell-base/
   ├── package.json
   ├── tsconfig.json                      # estende vite-app.json
   ├── vite.config.ts
   ├── index.html
   ├── public/
   │   ├── manifest.webmanifest           # PWA manifest
   │   └── icons/                         # placeholders (gerar SVG simples)
   ├── src/
   │   ├── main.tsx                       # entry point
   │   ├── app.tsx                        # root layout com router
   │   ├── routes/                        # TanStack Router file-based
   │   │   ├── __root.tsx
   │   │   ├── index.tsx                  # tela inicial (desktop)
   │   │   ├── setup.tsx                  # primeira execução: passphrase
   │   │   └── settings/
   │   │       └── about.tsx
   │   ├── stores/
   │   │   └── session.ts                 # Zustand store: sessão, drivers ativos
   │   ├── lib/
   │   │   ├── drivers.ts                 # composição de drivers locais
   │   │   └── boot.ts                    # boot sequence local-first
   │   └── styles/
   │       └── globals.css                # Tailwind + CSS vars
   ├── postcss.config.js
   ├── tailwind.config.ts
   └── README.md
   ```
2. Tailwind v4 + shadcn/ui imports do `@aethereos/ui-shell`.
3. **Service Worker** registrado para offline-first (Workbox ou manual com `precacheAndRoute`). PWA installable.
4. TanStack Router em modo file-based. Routes mínimas: `/` (desktop), `/setup` (first-run), `/settings/about`.
5. Boot sequence em `lib/boot.ts`:
   - Detecta primeira execução (sem dados em OPFS) → redireciona para `/setup`
   - Setup: usuário cria passphrase, gera identidade ED25519, inicializa SQLite WASM com schema mínimo
   - Booted state: carrega dados de OPFS, hidrata Zustand
6. **Sem dependência de servidor.** Build precisa funcionar com `vite preview` e operar 100% offline após primeiro load.

**Critério de aceite:**

```bash
pnpm --filter=@aethereos/shell-base build         # build sucesso
pnpm --filter=@aethereos/shell-base preview &     # serve estático
# Em outra aba: abre http://localhost:4173, vê tela de setup
# Insere passphrase, vê desktop vazio
# Verifica DevTools → Application → OPFS tem arquivos
# Mata o servidor, recarrega — ainda funciona (offline)

# Bundle size check:
du -sh apps/shell-base/dist/assets/*.js | head
# Bundle inicial gzip < 500KB
```

Commit: `feat(shell-base): scaffold Vite + React 19 + TanStack Router + PWA`

---

### M13 — Boot local-first: SQLite WASM + OPFS persistente

**Objetivo:** primeira persistência real. Validar que dados sobrevivem reload.

**Tarefas:**

1. Implementar em `apps/shell-base/src/lib/boot.ts`:
   - Detecção de OPFS (`'storage' in navigator && 'getDirectory' in navigator.storage`)
   - Inicialização de SQLite WASM com VFS apontando para OPFS
   - Migração inicial: tabelas `local_companies`, `local_users`, `local_settings`, `local_events` (mini-SCP local)
   - Schema versionado em `apps/shell-base/src/migrations/0001_init.sql`
2. Implementar `LocalDatabaseDriver` em `packages/drivers-local/src/database/sqlite-wasm-driver.ts` consumido pelo shell.
3. Tela `/setup`:
   - Form: nome do "espaço de trabalho" (vira primeira `local_company`), passphrase
   - Submit: cria tudo em OPFS, gera identidade ED25519, salva chave privada criptografada
4. Tela `/` (desktop):
   - Mostra nome do workspace
   - Mostra contagem de eventos locais (deve ser 1: `platform.workspace.created`)
   - Botão "Limpar workspace" (com confirmação) que apaga OPFS e volta para setup
5. Eventos emitidos localmente passam pelo `KernelPublisher` (já existe) usando `LocalDatabaseDriver` + `BroadcastChannelEventBus`. **Mesmo código de produção, só drivers diferentes** — esse é o ponto.

**Critério de aceite:**

```bash
pnpm --filter=@aethereos/shell-base build && \
pnpm --filter=@aethereos/shell-base preview &
# Abre browser
# Setup com nome "Meu Espaço" e passphrase "test1234"
# Vê desktop com "Meu Espaço" e "1 evento local"
# Recarrega aba (F5) — ainda mostra "Meu Espaço" e contador correto
# DevTools → Application → Origin Private File System mostra arquivos .sqlite
# Limpar workspace → confirma → volta para /setup
```

Commit: `feat(shell-base): boot local-first com SQLite WASM + OPFS + identidade ED25519`

---

### M14 — Shell visual mínimo: Window Manager + Dock + Mesa

**Objetivo:** primeira experiência de "OS no navegador" funcional. Sem apps reais ainda, mas estrutura visual completa.

**Tarefas:**

1. Implementar `packages/ui-shell/src/components/window-manager/` com lógica real:
   - `<WindowManager>` provider context que mantém lista de janelas abertas (Zustand)
   - `<Window>` componente: título, botões (minimizar, maximizar, fechar), arrastável, redimensionável, z-index management
   - Use `react-rnd` ou implementação CSS pura (preferida para bundle).
2. Implementar `<Dock>`:
   - Lista de apps disponíveis (em Camada 0: lista hard-coded mínima — Configurações, Bloco de Notas)
   - Click abre janela via WindowManager
   - Animações via CSS (sem framer-motion).
3. Implementar `<Mesa>`:
   - Grid de widgets com `react-grid-layout`
   - Widget mínimo: relógio, contador de eventos locais
   - Layout persistido em `local_settings` via SQLite.
4. Implementar `<Tabs>` no shell para navegação entre abas dentro de uma janela.
5. **Bloco de Notas** como primeiro app real:
   - CRUD de notas (título + corpo) usando SQLite local
   - Cada criação/edição emite evento `userspace.note.created` ou `userspace.note.updated` via SCP local
   - Lista de notas atualiza via consumer subscrito ao evento (validar pipeline E2E local).
6. **Configurações**: tela com aba "Sobre" (mostra versão, identidade ED25519, espaço usado em OPFS) e aba "Limpar dados".

**Critério de aceite:**

```bash
pnpm --filter=@aethereos/shell-base build && pnpm --filter=@aethereos/shell-base preview
# Setup completo
# Vê desktop com mesa contendo relógio e contador
# Click no Bloco de Notas no dock → janela abre
# Cria nota "Teste 1"
# Contador de eventos no widget atualiza para >1
# Fecha janela, abre de novo → nota persiste
# Recarrega aba → tudo persiste
# Limpa workspace → tudo zera
```

Commit: `feat(shell-base): window manager + dock + mesa + bloco de notas como primeiro app`

---

### M15 — PWA + offline-first comprovado

**Objetivo:** validar que tudo funciona sem rede após primeiro load.

**Tarefas:**

1. Service Worker completo:
   - Precache de todos os assets do build (Workbox `injectManifest` ou manual).
   - Estratégia: cache-first para assets, network-first com fallback para HTML.
   - Update: prompt no usuário quando nova versão disponível.
2. Manifest PWA correto:
   - `display: standalone`
   - `start_url`, `scope`, `theme_color`, `background_color`
   - Ícones 192x192 e 512x512 (gerar SVGs simples programaticamente).
3. Lighthouse audit:
   - PWA score >= 90
   - Performance score >= 80 em modo simulado mobile
   - Acessibilidade >= 90.
4. Documentar em `apps/shell-base/README.md` como instalar como PWA no Chrome/Edge/Firefox.

**Critério de aceite:**

```bash
pnpm --filter=@aethereos/shell-base build && pnpm --filter=@aethereos/shell-base preview &
# Browser DevTools → Lighthouse → audit PWA
# Instala como app
# Desliga rede (DevTools → Network → Offline)
# Recarrega — funciona
# Cria nota offline — funciona
# Religa rede — sem regressão
```

Commit: `feat(shell-base): PWA installable + offline-first comprovado via Lighthouse`

---

### M16 — Empacotamento da Camada 0 sob BUSL-1.1

**Objetivo:** preparar `shell-base` para distribuição como base aberta.

**Tarefas:**

1. Adicionar arquivo `LICENSE.busl-1.1` em `apps/shell-base/` e em cada package usado pela Camada 0 (`packages/drivers-local`, `packages/kernel`, `packages/scp-registry`, `packages/ui-shell`, `packages/drivers/interfaces`):
   - Texto canônico oficial da BUSL 1.1 (https://mariadb.com/bsl11/)
   - Licensor: substituir placeholder
   - Change Date: `2030-04-29`
   - Change License: `Apache License 2.0`
   - Use Limitation: `Production use of the Licensed Work as a hosted or managed service offered to third parties` é vedado.
2. Cada `package.json` afetado tem campo `"license": "BUSL-1.1"`.
3. Adicionar `apps/shell-base/CONTRIBUTING.md` mínimo:
   - Como rodar local
   - Como reportar bug
   - Política de contribuição (CLA simples ou DCO)
   - Código de conduta inline ou link.
4. Adicionar `apps/shell-base/SECURITY.md` com canal para reporte de vulnerabilidades.
5. Atualizar `LICENSE` raiz para refletir corretamente o split por workspace (já existe scaffold, refinar).

**Critério de aceite:**

```bash
pnpm typecheck && pnpm lint
ls apps/shell-base/LICENSE.busl-1.1
ls packages/drivers-local/LICENSE.busl-1.1
grep -l "BUSL-1.1" packages/*/package.json
# Saída: apenas pacotes da Camada 0
```

Commit: `chore(camada-0): BUSL-1.1 em todos os pacotes da base aberta`

---

### M17 — Documentação de arquitetura da Camada 0

**Objetivo:** repositório acessível para contribuidor externo. Antes do GitHub público (decisão futura humana), a doc precisa estar pronta.

**Tarefas:**

1. Criar `docs/architecture/CAMADA_0.md` com:
   - Visão arquitetural: diagrama de blocos textual
   - Mapa de drivers (qual interface, qual implementação local)
   - Fluxo de boot
   - Modelo de dados local (schema SQLite)
   - Limites: o que Camada 0 faz / o que NÃO faz
   - Como Camada 1 estende Camada 0 (preview do que vem)
2. Criar `docs/runbooks/local-dev-shell-base.md`:
   - Setup de ambiente
   - Como debugar OPFS via DevTools
   - Como inspecionar SQLite local (export `.sqlite` para SQLiteStudio ou similar)
   - Troubleshooting comum (Service Worker stuck, OPFS não disponível, etc.)
3. Atualizar `README.md` raiz:
   - Adicionar seção "Camada 0 — começando"
   - Apontar para `apps/shell-base/README.md`

**Critério de aceite:**

```bash
ls docs/architecture/CAMADA_0.md
ls docs/runbooks/local-dev-shell-base.md
wc -l docs/architecture/CAMADA_0.md  # >= 200 linhas
```

Commit: `docs(camada-0): arquitetura, runbook de dev, atualizacao do README`

---

### M18 — ADR de fechamento Sprint 2

**Objetivo:** registrar decisões tomadas durante o sprint que merecem rastreabilidade.

**Tarefas:**

1. Criar `docs/adr/0015-camada-0-arquitetura-local-first.md` cobrindo:
   - Status: Aceito
   - Subordinado a: ADR-0001
   - Contexto: por que Camada 0 antes de Camada 1
   - Decisão: stack escolhida (Vite + React + TanStack Router + Zustand + SQLite WASM + OPFS + Service Worker), drivers locais implementados, BUSL-1.1
   - Consequências: positivas, custos, mitigações
   - Alternativas rejeitadas: PouchDB, Dexie/IndexedDB puro, RxDB, Local-First HTTP
   - Tabela de mapeamento Driver Local ↔ Driver Cloud (mostra simetria do Driver Model)
   - Anexo: regras adicionais para PR review específicas da Camada 0 (sem `node:*`, sem deps backend, bundle <500KB)
2. Atualizar `CLAUDE.md` raiz para referenciar ADR-0015 onde fizer sentido.
3. Atualizar `SPRINT_LOG.md` com seção de encerramento do Sprint 2.

**Critério de aceite:**

```bash
ls docs/adr/0015-camada-0-arquitetura-local-first.md
grep -l "ADR-0015" CLAUDE.md
tail -30 SPRINT_LOG.md  # mostra encerramento Sprint 2
pnpm ci:full            # tudo verde
```

Commit: `docs(adr): ADR-0015 arquitetura da Camada 0 + encerramento Sprint 2`

---

## TÉRMINO DO SPRINT

Quando todas as 8 milestones (M11-M18) estiverem `SUCCESS` ou explicitamente `BLOCKED`/`PARTIAL`:

1. Atualizar `SPRINT_LOG.md`:

```markdown
## Sprint 2 encerrado

- Término: <timestamp>
- Milestones SUCCESS: <count>
- Milestones BLOCKED: <count>
- Milestones PARTIAL: <count>
- Próximas ações sugeridas para humano: <lista>
```

2. Criar `docs/SPRINT_2_REPORT_2026-04-29.md` com resumo executivo legível em 5 minutos:
   - O que foi entregue
   - O que ficou pendente e por quê
   - Estado atual de bundle size, Lighthouse scores, cobertura de testes
   - O que o humano precisa revisar

3. Commit final: `chore: encerramento sprint 2 — Camada 0 entregue`

4. Escrever no chat: "SPRINT 2 ENCERRADO. Aguardando revisão humana."

**Não inicie um novo sprint sozinho.** Pare aqui.

---

## PROMPT DE RETOMADA (caso a sessão termine no meio)

Cole isto como primeira mensagem em nova sessão Claude Code:

```
Estou retomando Sprint 2 (Camada 0) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (busque seção "Sprint 2")
3. Rode: git log --oneline -15
4. Identifique a próxima milestone M11-M18 não concluída
5. Continue a partir dela

Se SPRINT_LOG.md indicar "Sprint 2 encerrado", NÃO inicie novo sprint. Aguarde humano.

Roadmap completo: SPRINT_2_PROMPT.md (raiz do projeto)
```

Salve este arquivo como `SPRINT_2_PROMPT.md` na raiz do projeto antes de começar.
