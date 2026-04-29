# SPRINT CIRÚRGICO 6.5 — Consolidação dos débitos do Sprint 6

> **Tipo:** Sprint cirúrgico, não de features. Foco exclusivo em **conectar o que ficou desconectado** no Sprint 6.
> **Não cria apps novos.** Não cria features novas. Não escreve ADRs. Apenas honra a promessa do Sprint 6.
> **Estimativa:** 4-7 horas. Custo: $25-45 em tokens.

---

## CONTEXTO

Sprint 6 entregou 6 apps no Dock + Copilot estrutural com CI EXIT 0, mas auto-declarou na própria mensagem de encerramento que vários módulos estão usando **demo state** (mock client-side) em vez de drivers reais, e que algumas estruturas vieram simplificadas:

**Débitos declarados pelo próprio agente:**

1. Apps usam "demo state" em vez de chamar Supabase via `SupabaseDatabaseDriver`
2. M43 Chat: "Realtime stub" — não usa Supabase Realtime real
3. M45 Copilot: nunca rodou contra LLM real (sem chave configurada)
4. M46 Action Intents: implementadas "por regex" em vez de schemas Zod tipados como o roadmap exigia
5. M49 Painel staff: middleware `/staff` pendente + emissão `platform.staff.access` pendente
6. RAG pgvector mencionado no M45 mas não implementado

**Por que não passamos direto para Sprint 7 (hardening + IaC):**
Hardening sobre apps que usam demo state é construir em areia. Sprint 7 vai testar adversarialmente coisas que nem chamam o banco. Antes do hardening real, os apps precisam estar de fato conectados.

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code retomando trabalho. Sprint 6 declarou apps construídos mas com débitos materiais. Este sprint corrige esses débitos.

1. **Leia integralmente:**
   - `CLAUDE.md`
   - `SPRINT_LOG.md` (seções Sprint 5 e Sprint 6)
   - `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` Partes IV.7 (Driver Model), VIII (SCP), X (Multi-tenancy), XI (AI-native)
   - `docs/adr/0019-apps-internos-camada-1-copilot-shadow.md`
   - Código atual: `apps/shell-commercial/src/apps/*` (drive, pessoas, chat, configuracoes, copilot, governanca, auditoria)
   - `apps/shell-commercial/src/apps/copilot/` em particular — onde Action Intents foram implementadas
   - `packages/scp-registry/src/schemas/` — onde schemas SCP cravados existem (ou deveriam existir)
   - `packages/drivers-supabase/src/database.ts` — driver concreto que apps deveriam usar

2. **Confirme em voz alta** (escreva no chat antes de qualquer ação) cinco pontos:
   - Lista de quais apps (do M41-M49) atualmente usam demo state vs drivers reais — auditoria do código atual
   - Lista dos arquivos `*.ts*` no app Copilot que implementam Action Intents — confirmar que estão por regex e não Zod
   - Como `SupabaseDatabaseDriver.withTenant(companyId)` é instanciado no shell-commercial atualmente (existe? está usado?)
   - Qual é o esquema atual de instanciação de drivers — onde é o ponto único de criação dos clientes Supabase no shell
   - O que falta para o Copilot fazer chamada real ao LiteLLM (chave em `.env.local`? variável de ambiente passada ao build?)

3. **Verifique estado:**

```bash
git log --oneline -8
git status
pnpm typecheck > /tmp/precheck.log 2>&1; echo "TYPECHECK EXIT: $?"
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Se TYPECHECK != 0, **pare** e descreva.

---

## REGRAS INVIOLÁVEIS

(Iguais aos sprints anteriores)

**R1.** Commit obrigatório após cada milestone, mensagem estruturada.
**R2.** Nenhuma milestone começa sem critério de aceite verificado e commit feito.
**R3.** Após 3 tentativas, BLOQUEADA, registrar, pular. Sem loops.
**R4.** Nova dep exige justificativa.
**R5.** Bloqueios: sem `next` em shells, sem `inngest`, sem `@clerk/*`, sem `prisma`, sem `framer-motion`.
**R6.** Toda chamada LLM via LiteLLM gateway. Toda feature flag via Unleash.
**R7.** Toda persistência via Driver Model. **Esta regra é o coração deste sprint** — não pode haver `createClient` direto em código de domínio dos apps.
**R8.** Antes de cada commit: `pnpm typecheck && pnpm lint`. Antes do encerramento: `pnpm ci:full` EXIT 0.
**R9.** Atualize `SPRINT_LOG.md` ao fim de cada milestone.
**R10.** Não execute fora de `~/Projetos/aethereos`. Não instale globais.
**R11.** Ao perceber contexto cheio: pare, escreva pickup point.

**R12. ESPECÍFICO 6.5 — Sem features novas:**

- Você **não** está criando UI nova
- Você **não** está adicionando novos apps ou novos botões
- Você **não** está reescrevendo arquitetura
- Sua única missão é **substituir mock por implementação real** preservando interfaces existentes
- Se descobrir bug pré-existente que não está no escopo destes débitos, anote no log mas **não conserte** — vira tarefa do Sprint 7

**R13. ESPECÍFICO 6.5 — Honestidade radical:**

- Se algum débito for mais difícil que o esperado e demandar refactor amplo, **pare e marque BLOQUEADO** detalhadamente. Não improvise solução parcial.
- Se algo no código atual estiver fundamentalmente errado (não só desconectado), reporte ao humano antes de tentar fix.
- O propósito deste sprint é **fazer o código corresponder ao que foi declarado entregue**. Se isso não for viável, é melhor admitir do que mascarar.

---

## ARQUIVO DE LOG

Adicione nova seção ao `SPRINT_LOG.md`:

```markdown
---

# Sprint 6.5 — Consolidação dos débitos do Sprint 6

Início: <timestamp ISO>
Modelo: Claude Code (Sprint 6.5 N=1)

## Origem

Sprint 6 entregou 6 apps com CI EXIT 0 mas auto-declarou múltiplos módulos
em demo state. Decisão humana: pausa para consolidação antes de Sprint 7.

## Auditoria inicial (5 pontos respondidos)

[5 pontos da Calibração]

## Histórico de milestones (Sprint 6.5)

[preenchido conforme avança]
```

Commit antes de prosseguir.

---

## ROADMAP DE MILESTONES

### MX1 — Auditoria objetiva do estado atual

**Objetivo:** documentação clara de o que está mock vs real. Sem isso o sprint navega no escuro.

**Tarefas:**

1. Para cada um dos 6 apps + Copilot + Painel Staff, abrir os arquivos principais e identificar:
   - Onde a UI lê dados (hardcoded array? `useState` mock? chamada a Server Action? chamada a `SupabaseDatabaseDriver`?)
   - Onde a UI escreve dados (mesmo levantamento)
   - Existe schema Zod registrado no `scp-registry`? Está sendo usado para validação real?
   - Testes existentes cobrem o caminho real ou só o mock?
2. Produzir documento `docs/SPRINT_6_5_AUDITORIA.md` com:
   - Tabela: app × leitura × escrita × evento SCP × estado atual
   - Lista priorizada de débitos (alguns mais fáceis que outros)
   - Estimativa por débito: trivial / médio / complexo
3. **Não consertar nada nesta milestone.** Apenas documentar honestamente.

**Critério de aceite:**

```bash
test -f docs/SPRINT_6_5_AUDITORIA.md
wc -l docs/SPRINT_6_5_AUDITORIA.md  # >= 100 linhas
pnpm typecheck   # passa (não tocou em código)
```

Commit: `docs(sprint-6.5): auditoria objetiva dos debitos herdados do sprint 6 (MX1)`

---

### MX2 — Composição central de drivers no shell-commercial

**Objetivo:** ponto único de criação de drivers, injetado via React Context. Pré-requisito para todos os apps usarem drivers reais.

**Tarefas:**

1. Verificar se `apps/shell-commercial/src/lib/drivers.ts` (criado no Sprint 3 / M21) está realmente sendo usado ou se foi escrito e abandonado.
2. Se ausente ou subutilizado, implementar:
   - Função `createDrivers(companyContext)` que retorna `{ db, auth, storage, eventBus, llm, observability, featureFlags, notifications }` instanciados com config correta
   - React Context `DriversContext` no topo da árvore de componentes
   - Hook `useDrivers()` para apps consumirem
3. Server-side: helpers em `apps/shell-commercial/src/lib/server-drivers.ts` (se aplicável) para Server Actions / API routes.
4. **Não consumir nos apps ainda nesta milestone.** Apenas estabelecer a infraestrutura.

**Critério de aceite:**

```bash
pnpm typecheck && pnpm lint
# Manual: rodar shell-commercial em dev
# DriversContext hidrata sem erro
# useDrivers() retorna instâncias funcionais (mesmo se apps ainda usam mock)
```

Commit: `feat(shell-commercial): contexto centralizado de drivers via DriversContext (MX2)`

---

### MX3 — Conectar Drive, Pessoas, Configurações ao SupabaseDatabaseDriver

**Objetivo:** três apps mais simples viram reais.

**Tarefas (uma por app):**

1. **Drive** (`apps/shell-commercial/src/apps/drive/`):
   - Substituir demo state por `useDrivers().db.from('kernel.files').where(...)` (ou padrão real do Drizzle)
   - Server Action `uploadFile(formData)` usa `SupabaseStorageDriver` real
   - Listagem de pastas via SQL real com RLS por `company_id`
   - Emit eventos `platform.file.uploaded` / `platform.folder.created` via `KernelPublisher` real (não logar no console)
2. **Pessoas** (`apps/shell-commercial/src/apps/pessoas/`):
   - CRUD via Server Actions chamando `SupabaseDatabaseDriver`
   - Validação Zod no servidor
   - RLS isola por `company_id`
   - Eventos SCP reais
3. **Configurações** (`apps/shell-commercial/src/apps/configuracoes/`):
   - Settings persistidos em `kernel.settings` real
   - Mudança de tema atualiza preference em DB e propaga para próxima sessão
   - Aba Empresa: owner/admin pode atualizar nome, slug; emite `platform.settings.updated`
4. Para cada app, escrever **1-2 testes E2E** que:
   - Criam dado via Server Action
   - Verificam que está em DB
   - Verificam que evento foi emitido em outbox
   - Verificam que RLS isola entre companies

**Critério de aceite:**

```bash
pnpm dev:db   # supabase local up
pnpm test --filter=@aethereos/shell-commercial
pnpm typecheck && pnpm lint
# Manual: shell-commercial dev
# Drive: criar pasta, upload arquivo, recarregar página, persiste
# Pessoas: criar pessoa, ver no DB
# Configurações: mudar tema, persiste após logout/login
```

Commit: `feat(apps): conectar Drive, Pessoas, Configuracoes ao SupabaseDatabaseDriver real (MX3)`

---

### MX4 — Realtime real no Chat + RLS testado

**Objetivo:** Chat deixa de ser stub. Realtime via Supabase.

**Tarefas:**

1. Em `apps/shell-commercial/src/apps/chat/`:
   - Persistência via `SupabaseDatabaseDriver` (substituir mock)
   - Subscription Supabase Realtime no canal `kernel_chat_messages:channel_id={id}` para mensagens
   - Subscription Realtime presence para online/offline
   - Send message: insert no DB, evento `platform.chat.message_sent`, sem otimistic update por agora (simplifica)
   - Notification automática para users do canal não-ativo (reusar M37)
2. Teste E2E com 2 usuários:
   - User A em company X, user B em company X, ambos no canal #geral
   - User C em company Y, no seu próprio canal #geral
   - User A envia "olá"
   - User B recebe via Realtime em <1s
   - User C **não** recebe (RLS isola)

**Critério de aceite:**

```bash
pnpm dev:db
pnpm test --filter=@aethereos/shell-commercial   # teste e2e do chat passa
# Manual: dois browsers, mesma company, dois usuários
# Mensagem propaga em real-time
# Browser de outra company não recebe
```

Commit: `feat(chat): Realtime real Supabase + isolacao por company (MX4)`

---

### MX5 — Action Intents tipadas via Zod no Copilot + LLM real

**Objetivo:** Copilot vira LLM-driven com schemas Zod estritos.

**Tarefas:**

1. Em `packages/scp-registry/src/schemas/agent.ts`:
   - Definir schemas Zod estritos para as 5 Action Intents:
     - `agent.action.create_note` — `{ title: string, body: string, parentFolderId?: string }`
     - `agent.action.create_person` — `{ fullName: string, email?: string, role_label?: string }`
     - `agent.action.send_chat_message` — `{ channelId: string, body: string }`
     - `agent.action.update_settings` — `{ scope: 'user'|'company', key: string, value: jsonValue }` (rejeita scope='platform')
     - `agent.action.search_knowledge` — `{ query: string, topK?: number }`
2. Em `apps/shell-commercial/src/apps/copilot/`:
   - Substituir extração por regex por **structured output** do LLM:
     - Definir tool/function schemas no formato OpenAI Function Calling (LiteLLM compatible)
     - LiteLLM retorna `tool_calls` estruturados
     - Validar tool_call com schema Zod registrado antes de criar `agent_proposal`
     - Se validação falha → não cria proposta, loga warning
   - Usar `instrumentedChat()` (M33) para toda chamada
   - Guard: se LiteLLM offline ou sem chave válida → fallback é uma mensagem fixa "Copilot está em manutenção"
3. **Smoke test contra LiteLLM real:**
   - Se humano configurou `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY` em `.env.local`, rodar 1 chamada de teste no startup do dev e logar resultado
   - Se ambas as chaves estão como placeholder, marcar Copilot como `degraded` no painel de operações
4. **Bloqueio mecânico** das 8 operações invariantes via `PermissionEngine.canPropose(agent, intentType, payload)`:
   - Inspeciona payload e nega se cair em demissão, plano de contas, transferência, exclusão, etc.
   - Log de tentativa em `audit_log`

**Critério de aceite:**

```bash
pnpm typecheck && pnpm lint
pnpm test --filter=@aethereos/shell-commercial   # testes do copilot passam
# Manual (com chave LLM real):
# Pede ao Copilot "crie uma nota com o resumo da reunião X"
# Copilot retorna proposta tipada (não regex), validada Zod
# Owner aprova → nota criada no Drive (via MX3)
# Pede ao Copilot "demitir o João" → proposta nunca chega no drawer (PermissionEngine bloqueou)
# audit_log tem registro da tentativa
```

Commit: `feat(copilot): Action Intents tipadas Zod + LLM real via LiteLLM + bloqueio invariantes (MX5)`

---

### MX6 — Middleware /staff + emissão platform.staff.access + encerramento

**Objetivo:** fechar o débito do Painel Staff e encerrar o sprint cirúrgico.

**Tarefas:**

1. Em `apps/shell-commercial/`:
   - Middleware verifica claim `is_staff` no JWT antes de permitir `/staff/*`
   - Se não staff → redirect com 403
   - Se staff → registra `platform.staff.access` em SCP com:
     - `actor.user_id` = staff
     - `payload.target_company_id` = company sendo acessada
     - `correlation_id` propagado
   - Notification automática para owner da company-alvo: "Acesso staff registrado por [Nome]"
2. Verificar tabela `kernel.staff_access_log` existe e está populada por trigger em `kernel.events` filtrando `event_type='platform.staff.access'`. Se não existir, criar migration.
3. Atualizar `SPRINT_LOG.md` com encerramento Sprint 6.5:
   - O que foi consolidado
   - Débitos remanescentes (se algum BLOCKED)
   - Status de cada item da auditoria MX1 (resolvido/parcial/pendente)
4. Criar `docs/SPRINT_6_5_REPORT_2026-04-29.md`:
   - Antes/depois de cada app
   - Pendências para humano
   - Status para Sprint 7
5. **CI completo:** `pnpm ci:full` EXIT 0 obrigatório.

**Critério de aceite:**

```bash
pnpm ci:full > /tmp/sprint65_final.log 2>&1; echo "EXIT: $?"
# DEVE ser 0.
```

Commit: `chore: encerramento sprint 6.5 — debitos sprint 6 consolidados`

Mensagem no chat: "SPRINT 6.5 ENCERRADO. EXIT 0 confirmado. Aguardando revisão humana."

---

## TÉRMINO DO SPRINT

Não inicie Sprint 7 sozinho. Pare aqui.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint 6.5 (Consolidação) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (seção "Sprint 6.5")
3. Leia docs/SPRINT_6_5_AUDITORIA.md (se MX1 já concluída)
4. Rode: git log --oneline -15 && git status
5. Identifique a próxima milestone MX1-MX6 não concluída
6. Continue a partir dela

Lembrar regras especiais 6.5: sem features novas, sem refactor amplo, só substituir mock por implementação real.

Se SPRINT_LOG.md indicar "Sprint 6.5 encerrado", aguarde humano. Não inicie Sprint 7.

Roadmap em SPRINT_6_5_PROMPT.md na raiz.
```

Salve este arquivo como `SPRINT_6_5_PROMPT.md` na raiz do projeto antes de começar.
