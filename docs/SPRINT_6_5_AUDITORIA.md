# Sprint 6.5 — Auditoria objetiva dos débitos herdados do Sprint 6

> Gerado por: Claude Code (Sprint 6.5 MX1)
> Data: 2026-04-29
> Propósito: documentar honestamente o delta entre o que foi declarado entregue no Sprint 6
> e o que realmente existe no código. Sem consertar nada nesta milestone.

---

## 1. Estado atual: tabela de auditoria

| App/Módulo       | Leitura de dados      | Escrita de dados       | Eventos SCP emitidos    | Estado real           |
| ---------------- | --------------------- | ---------------------- | ----------------------- | --------------------- |
| Drive (M41)      | DEMO_FILES hardcoded  | useState local, sem DB | Nenhum (TODO no código) | 100% demo             |
| Pessoas (M42)    | DEMO_PEOPLE hardcoded | useState local, sem DB | Nenhum (TODO no código) | 100% demo             |
| Chat (M43)       | DEMO_CHANNELS/MSGS    | useState local, sem DB | Nenhum (TODO no código) | 100% demo + sem RT    |
| Configurações    | local state           | local only             | Nenhum (TODO no código) | 100% demo             |
| Copilot (M45)    | LLM via degraded mode | proposals em useState  | Nenhum (TODO no código) | LLM parcial           |
| Governança (M47) | DEMO_AGENTS hardcoded | read-only (by design)  | N/A (leitura only)      | 100% demo             |
| Auditoria (M48)  | DEMO_SCP_EVENTS       | read-only (by design)  | N/A (leitura only)      | 100% demo             |
| Staff (M49)      | DEMO_COMPANIES        | sem JWT check de staff | Nenhum (TODO no código) | 100% demo + sem guard |

---

## 2. Gap arquitetural central — SupabaseBrowserDatabaseDriver ausente

### Problema

O Sprint 6 listou como próximo passo "conectar drivers Supabase reais".
O `SupabaseDatabaseDriver` em `packages/drivers-supabase/src/database/supabase-database-driver.ts`
usa `import postgres from "postgres"` (pg client nativo Node.js + Drizzle ORM).

`shell-commercial` é uma **Vite SPA (cliente puro)**. Não tem Node.js runtime.
Tentar usar `SupabaseDatabaseDriver` no browser resultaria em erro fatal de runtime.

### O que falta

Um `SupabaseBrowserDatabaseDriver` (browser-compatible) que:

- Usa `@supabase/supabase-js` (já instalado — `SupabaseBrowserAuthDriver` usa)
- Autentica com JWT do usuário logado (RLS enforçado automaticamente pelo Supabase)
- Expõe interface simples para as operações CRUD dos apps
- Impõe `company_id` como filtro obrigatório (replicando o papel de `kernel.set_tenant_context()`)
- É instanciado em `buildDrivers()` e exposto via `DriversContext`

### Tabelas Drizzle já definidas (migrations Sprint 6 OK)

As tabelas existem no schema Drizzle (`packages/drivers-supabase/src/schema/kernel.ts`):

- `kernel.files` + `kernel.file_versions` (Drive)
- `kernel.people` (Pessoas — DELETE bloqueado por RLS)
- `kernel.chat_channels` + `kernel.channel_members` + `kernel.chat_messages` (Chat)
- `kernel.settings` (Configurações)
- `kernel.agents` + `agent_capabilities` + `copilot_conversations` + `copilot_messages` (Copilot)
- `kernel.agent_proposals` (Shadow Mode)

As migrations foram geradas mas precisamos verificar se foram aplicadas no banco local.

### Impacto

Sem este driver, MX3 (Drive/Pessoas/Configurações) e MX4 (Chat) não podem ser implementados
conforme o Driver Model. Implementar MX2 (DriversContext) é pré-requisito absoluto de MX3+.

---

## 3. Débitos por app — detalhamento

### 3.1 Drive (M41) — TRIVIAL/MÉDIO

**Arquivos:** `apps/shell-commercial/src/apps/drive/index.tsx`

**Leitura:**

- `const [files, setFiles] = useState<FileEntry[]>(DEMO_FILES)` — linha 200
- Sem chamada de banco, sem paginação, sem busca real

**Escrita:**

- `handleUpload()` linha 221: cria entry local, TODO para SupabaseStorageDriver + kernel.files
- `handleCreateFolder()` linha 242: cria folder local, TODO para kernel.files insert
- `handleDelete()` linha 258: remove do state local, TODO para delete + evento

**Eventos SCP pendentes:**

- `platform.file.uploaded` — nunca emitido
- `platform.folder.created` — nunca emitido
- `platform.file.deleted` — nunca emitido

**Para conectar:** query `kernel.files where company_id=$1 and parent_id=$2` via browser driver.
Upload físico precisa de `SupabaseStorageDriver` (já existe em `packages/drivers-supabase/src/storage/`).

**Estimativa:** MÉDIO (driver browser + storage + eventos)

---

### 3.2 Pessoas (M42) — TRIVIAL/MÉDIO

**Arquivos:** `apps/shell-commercial/src/apps/pessoas/index.tsx`

**Leitura:**

- `const [people, setPeople] = useState<Person[]>(DEMO_PEOPLE)` — linha 287
- Demo forçado com `companyId: "demo"` hardcoded

**Escrita:**

- `handleCreate()` linha 305: cria local, TODO para kernel.people insert + evento
- `handleUpdate()` linha 325: atualiza local, TODO para kernel.people update + evento
- `confirmDeactivate()` linha 353: atualiza status local, TODO para evento (bloqueado para agentes)

**Eventos SCP pendentes:**

- `platform.person.created` — nunca emitido
- `platform.person.updated` — nunca emitido
- `platform.person.deactivated` — nunca emitido (deve ser bloqueado por PermissionEngine para agentes)

**Schemas SCP:** `platform.ts` no scp-registry já tem? Verificar.

**Estimativa:** MÉDIO

---

### 3.3 Chat (M43) — MÉDIO/COMPLEXO

**Arquivos:** `apps/shell-commercial/src/apps/chat/index.tsx`

**Leitura:**

- `DEMO_CHANNELS` e `DEMO_MESSAGES` — linhas 28-59
- `useState<Channel[]>(DEMO_CHANNELS)` linha 175
- Presença simulada com `%3` (resto demo, linha 229)

**Escrita:**

- Envio de mensagem: `TODO: inserir em kernel.chat_messages` linha 204
- Criação de canal: `TODO: inserir em kernel.chat_channels + kernel.chat_channel_members` linha 221

**Realtime:**

- Completamente ausente — sem subscription Supabase Realtime
- Sem presence online/offline real

**Eventos SCP pendentes:**

- `platform.chat.message_sent` — nunca emitido
- `platform.chat.channel_created` — nunca emitido

**Complexidade extra:** Realtime exige subscription client-side ao canal Supabase.
RLS no Realtime: `channel_id` deve estar na policy para que usuário só receba mensagens
de canais onde é membro.

**Estimativa:** COMPLEXO

---

### 3.4 Configurações (M44) — TRIVIAL

**Arquivos:** `apps/shell-commercial/src/apps/configuracoes/index.tsx`

**Leitura:**

- `useState("Usuário Demo")` — nome hardcoded linha 25
- `useState("demo-company")` — slug hardcoded linha 119
- Não lê nada de kernel.settings

**Escrita:**

- `handleSave()` em TabPerfil: aplica tema ao DOM mas TODO persist linha 33
- `handleSave()` em TabEmpresa: TODO persist linha 125
- Outras abas (Plano, Sistema, Integrações): UI read-only, sem escrita real

**Eventos SCP pendentes:**

- `platform.settings.updated` (scope=user) — nunca emitido
- `platform.settings.updated` (scope=company) — nunca emitido

**Estimativa:** TRIVIAL (apenas queries simples de settings key-value)

---

### 3.5 Copilot (M45) + Shadow Mode (M46) — COMPLEXO

**Arquivos:** `apps/shell-commercial/src/apps/copilot/index.tsx`

**O que funciona:**

- `instrumentedChat()` via `LiteLLMDriver` — chamada real ao LLM (mas LiteLLM unhealthy)
- `withDegradedLLM()` — modo degenerado quando LLM offline
- Aprovação/rejeição de proposals — UI completa (mas sem exec real)

**O que está stub/regex:**

- `INTENT_PATTERNS` (linhas 73-128): detecção por RegExp pura
- `detectIntent()` (linha 146): extrai payload hardcoded do regex match
- Quando aprovado: `TODO: executar ação real via driver correspondente` (linha 294)
- Persistência de mensagens: TODO (linha 394)
- Persistência de proposals: TODO (linha 379)
- Emissão de eventos SCP: TODO (linhas 295, 305, 380, 395)

**Action Intents atuais (via regex):**

1. `create_person` — regex: `/criar?\s+pessoa|adicionar?\s+pessoa.../i`
2. `create_file` — regex: `/criar?\s+(pasta|arquivo...)...`
3. `send_notification` — regex: `/notifica|avisar|comunicar.../i`
4. `update_settings` — regex: `/configura|alterar?\s+config.../i`
5. `create_channel` — regex: `/criar?\s+canal.../i`

**O que MX5 deve fazer:**

- Substituir regex por structured output (tool_calls via LiteLLM)
- Schemas Zod estritos para payloads dos 5 intents (novo: `agent.action.*` em scp-registry)
- Validar tool_call com Zod antes de criar proposal
- `PermissionEngine.canPropose()` para bloquear 8 operações invariantes

**Eventos SCP pendentes:**

- `agent.copilot.message_sent` — schema existe, emissão não
- `agent.copilot.action_proposed` — schema existe, emissão não
- `agent.copilot.action_approved` — schema existe, emissão não
- `agent.copilot.action_rejected` — schema existe, emissão não

**Estimativa:** COMPLEXO

---

### 3.6 Governança (M47) — MÉDIO (mas pode ser diferido)

**Arquivos:** `apps/shell-commercial/src/apps/governanca/index.tsx`

**Natureza:** App read-only de compliance. Exibe estado de agentes, capabilities e invariantes.

**Estado:** `DEMO_AGENTS` hardcoded. Para virar real precisaria ler `kernel.agents` e
`kernel.agent_capabilities`. Porém é read-only — não emite eventos, não escreve.

**Decisão:** Diferir para Sprint 7. Impacto de ser demo state é baixo (UI de compliance).
Não bloqueia nenhum outro débito.

**Estimativa:** MÉDIO (mas prioridade baixa)

---

### 3.7 Auditoria (M48) — MÉDIO (mas pode ser diferido)

**Arquivos:** `apps/shell-commercial/src/apps/auditoria/index.tsx`

**Natureza:** App read-only. Exibe eventos SCP, audit_log, métricas LLM.

**Estado:** `DEMO_SCP_EVENTS` hardcoded. Para virar real precisaria ler `kernel.events`
(ou `scp_outbox`) e `audit_log`. Read-only, sem emissão de eventos.

**Decisão:** Diferir para Sprint 7. Uma vez que MX3/MX4 estejam conectados, eventos reais
vão popular o banco — Auditoria se tornará naturalmente útil.

**Estimativa:** MÉDIO (mas prioridade baixa)

---

### 3.8 Staff (M49) — MÉDIO

**Arquivos:** `apps/shell-commercial/src/routes/staff.tsx`

**Estado:**

- `DEMO_COMPANIES` hardcoded
- Sem verificação de claim `is_staff` no JWT
- Sem emissão de `platform.staff.access`
- Sem `kernel.staff_access_log`

**Para MX6:**

- Guard: verificar `is_staff` no JWT antes de renderizar a rota
- Query real: `kernel.companies` onde staff pode ver TODAS (sem filtro por company_id)
- Emitir `platform.staff.access` com `target_company_id` cada vez que acessa dados de empresa
- Criar migration `kernel.staff_access_log`

**Estimativa:** MÉDIO

---

## 4. Lista priorizada de débitos

### Prioridade 1 — BLOQUEANTE (sem isso, Sprint 7 é inválido)

1. **[MX2] SupabaseBrowserDatabaseDriver + DriversContext** — COMPLEXO
   - Pré-requisito de tudo abaixo
   - Sem isso: apps ficam em demo state independente de qualquer outro esforço

2. **[MX3] Drive, Pessoas, Configurações conectados** — MÉDIO cada
   - Depende de MX2
   - Drive + storage real; Pessoas + RLS; Configurações + settings persist

3. **[MX4] Chat com Realtime real** — COMPLEXO
   - Depende de MX2
   - Supabase Realtime subscription + presença + RLS isolation

4. **[MX5] Copilot: intents Zod + LLM real** — COMPLEXO
   - Depende de MX2 (para persistência) mas pode rodar parcialmente com LLM
   - Structured output + PermissionEngine

5. **[MX6] Staff middleware + platform.staff.access** — MÉDIO
   - Mais isolado, não depende de SupabaseBrowserDatabaseDriver para o guard JWT
   - Depende para query real de companies

### Prioridade 2 — DIFERIDO para Sprint 7

6. **[DIFERIDO] Governança conectada ao banco** — MÉDIO
7. **[DIFERIDO] Auditoria conectada ao banco** — MÉDIO
8. **[DIFERIDO] RAG pgvector no Copilot** — COMPLEXO (fora do escopo 6.5)
9. **[DIFERIDO] KernelPublisher browser** — COMPLEXO (emissão real via NATS)

---

## 5. Estimativas de esforço

| Milestone | Débito principal                        | Estimativa |
| --------- | --------------------------------------- | ---------- |
| MX2       | SupabaseBrowserDatabaseDriver + Context | 2-3h       |
| MX3       | Drive + Pessoas + Configurações         | 2-3h       |
| MX4       | Chat Realtime + RLS                     | 2-3h       |
| MX5       | Copilot Zod + LLM + PermissionEngine    | 2-3h       |
| MX6       | Staff guard + evento + migration        | 1-2h       |
| **Total** |                                         | **9-14h**  |

> Nota: a estimativa original do sprint era 4-7h. O gap de SupabaseBrowserDatabaseDriver
> (não previsto na spec original) adiciona ~2h de complexidade estrutural.

---

## 6. Riscos identificados

### RISCO-1: Supabase local não configurado

Se `supabase local start` (CLI) não tiver rodado e as migrations não foram aplicadas,
MX3/MX4 falharão ao tentar queries reais. Verificar antes de MX3.

### RISCO-2: LiteLLM unhealthy sem API keys

Container LiteLLM está up mas unhealthy. Copilot ficará em modo degradado.
Para MX5, precisamos ou configurar ANTHROPIC_API_KEY no container ou aceitar teste com modo degradado.

### RISCO-3: RLS em Realtime

Supabase Realtime precisa de políticas RLS específicas para publications.
As migrations existentes podem ou não ter configurado o Realtime publication para `chat_messages`.

### RISCO-4: staff JWT claim `is_staff`

O Supabase Auth não tem `is_staff` nativo. Para MX6, precisamos de hook JWT custom
no Supabase (DB Function como hook) ou verificar claims de `user_metadata`.

---

## 7. Nota de honestidade

O Sprint 6 declarou entrega de "apps funcionais com CI EXIT 0". O CI passou porque:

- Os componentes compilam sem erros TypeScript
- Os dados demo são válidos em runtime
- Os TODOs são comentários, não código com falha

O CI não testou: queries reais, Realtime, eventos SCP, ou persistência entre sessões.
A afirmação "apps entregues" era de estrutura/UI — não de conectividade real.
Este documento registra a distinção para que Sprint 7 (hardening) não teste demo state.
