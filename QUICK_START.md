# Quick Start — Aethereos

Guia mínimo para subir o ambiente local + configurar features comuns.

## 1. Pre-requisitos

- Node.js 22+
- pnpm 9.15+
- Docker (para Supabase local + LiteLLM/OTel opcionais)
- Supabase CLI (`brew install supabase/tap/supabase` ou `npm i -g supabase`)

## 2. Setup inicial

```bash
pnpm install
supabase start            # sobe Postgres + Auth + Storage + Edge Functions
cd tooling/seed && pnpm start && cd ../..   # cria companies + users + people + chat
```

Usuários de teste (senha: `Aethereos@2026!`):

- Platform: `staff@aethereos.test` (`is_platform_admin=true`)
- Meridian: `ana.lima@meridian.test` (owner)
- Atalaia: `rafael.costa@atalaia.test` (owner)
- Solaris: `patricia.rodrigues@solaris.test` (owner)
- Onboarding test: `onboarding.user@onbtest.test` (sprint 14)

## 3. Subir o shell

```bash
pnpm --filter @aethereos/shell-commercial dev
# abre em http://localhost:5174
```

## 4. Configurar Aether AI Copilot (BYOK)

O Copilot funciona com qualquer provedor compatível com OpenAI ou nativo Anthropic/Google. Você traz sua própria API key.

### Cloud (OpenAI / Anthropic / Groq / Mistral / OpenRouter / Together / Gemini)

1. Abrir Configurações (ícone na Mesa ou via launcher)
2. Conta > **Inteligência Artificial**
3. Selecione o provedor (ex: OpenAI)
4. Cole sua API key (link "Obter chave" aponta para o dashboard de cada provedor)
5. O modelo já vem pré-selecionado (ex: `gpt-4o`); você pode trocar
6. Clique **Testar conexão** → deve mostrar "Conexão OK"
7. Clique **Salvar**
8. Abra o Aether AI Copilot — banner "Modo Degenerado" deve sumir

### Local (LM Studio ou Ollama)

**LM Studio:**

1. Instale LM Studio (https://lmstudio.ai)
2. Baixe um modelo (ex: Llama 3.1 8B Instruct)
3. Vá em "Local Server" e clique **Start Server** (porta 1234)
4. No Aethereos: Configurações > IA > LM Studio (Local)
5. Clique **Detectar modelos** → seleciona o modelo carregado
6. **Testar conexão** → **Salvar**

**Ollama:**

```bash
# instalar (https://ollama.com)
ollama pull llama3.1
ollama serve   # roda na porta 11434
```

Configurações > IA > Ollama (Local) > Detectar modelos > Salvar.

### Custom (qualquer endpoint OpenAI-compatible)

1. Configurações > IA > Custom (OpenAI-compatible)
2. Cole o `Base URL` (ex: `https://meu-proxy.com/v1`)
3. Cole API key (se exigida pelo seu endpoint)
4. Digite o nome do modelo
5. Testar > Salvar

## 5. Instalar/desinstalar apps via Magic Store

Sprint 16 tornou o registry de apps dinâmico. Ao instalar/desinstalar um app na Magic Store, o Dock/Mesa/Apps Launcher reagem em tempo real.

1. Mesa > **Æ Magic Store** (ou via launcher)
2. Navegue por categorias: Aplicativos / Plugins / Widgets / Integrações / Distros
3. Click em um card → **Instalar** → app aparece no Dock (se `showInDock: true`)
4. **Desinstalar** → desaparece do Dock e Apps Launcher

Apps protegidos (Mesa, Magic Store, Aether AI, Configurações, Notificações) mostram badge "Incluído no OS" — não podem ser desinstalados.

Companies novas recebem 10 apps básicos por padrão (drive, pessoas, chat, settings, rh, calendar, tarefas, bloco-de-notas, calculadora, relogio). Verticais (Comércio Digital, LOGITIX, ERP, Kwix, Autergon) precisam ser instalados manualmente.

## 6. Testar fluxo de proposals do Aether AI Copilot

Sprint 17 conectou o ciclo end-to-end do Copilot: aprovar uma sugestão executa a ação real no banco.

1. Mesa > **Aether AI** (ou via launcher)
2. Digite: "criar pessoa Maria Silva" → Copilot detecta intent + propõe ação
3. Painel ActionApprovalPanel aparece com badge "Shadow Mode"
4. Click **Aprovar** → status muda pra "approved · executando…" → "executed"
5. Notificação "✓ Ação executada pelo Copilot" no sino do Dock
6. Verifique em **Pessoas** → Maria Silva foi inserida

Estados visuais:

- pending (violeta): aguarda aprovação
- approved (verde claro): aprovado, executando
- approved + erro (âmbar): falha de execução, botão "Tentar novamente"
- executed (verde): ação confirmada no banco
- rejected (cinza): rejeitado pelo usuário
- expired (cinza pálido): TTL 1h excedido

5 intents implementados: `create_person`, `create_file`, `send_notification`, `update_settings`, `create_channel`. Painel central de todas as proposals em **Governança > Shadow Mode** com filtros + drawer + ações inline.

## 7. Rodar pipeline SCP (eventos -> consumers)

Sprint 18 entregou o consumer pipeline em modo inline (poller direto no Postgres, sem NATS). Eventos publicados pela Edge Function `scp-publish` aterrissam em `kernel.scp_outbox` e sao consumidos pelo `scp-worker`:

- **AuditConsumer** — captura tudo em `kernel.audit_log`
- **NotificationConsumer** — emite `kernel.notifications` para `person.created`, `file.uploaded`, `folder.created`, `chat.channel_created` (idempotente vs. notif inline)
- **EmbeddingConsumer** — chunkifica + embeda arquivos `text/*` ou `application/pdf` em `kernel.embeddings` (degraded skip se falta `SUPABASE_SERVICE_ROLE_KEY`)

Para subir o pipeline completo, abra 4 terminais:

```bash
# Terminal 1 — Supabase (Postgres + Auth + Storage + Edge Functions)
pnpm db:start

# Terminal 2 — infra opcional (LiteLLM se for testar embeddings; outros sao no-op)
pnpm dev:infra

# Terminal 3 — shell-commercial
pnpm dev

# Terminal 4 — worker SCP (polla scp_outbox a cada 2s, processa em batches de 50)
pnpm dev:scp-worker
```

Env vars (`.env.local`):

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres
SCP_POLL_INTERVAL_MS=2000           # opcional, default 2000
SCP_BATCH_SIZE=50                   # opcional, default 50
SCP_MAX_ATTEMPTS=3                  # opcional, default 3 (apos isso => status='failed')
SUPABASE_SERVICE_ROLE_KEY=...       # obrigatoria so se quiser EmbeddingConsumer ativo
```

Para validar: faca uma acao no shell (criar pessoa, upload arquivo) e cheque:

```bash
psql "$DATABASE_URL" -c "SELECT event_type, status, attempts FROM kernel.scp_outbox ORDER BY created_at DESC LIMIT 5;"
psql "$DATABASE_URL" -c "SELECT action, actor_type, created_at FROM kernel.audit_log ORDER BY created_at DESC LIMIT 5;"
```

Sem o worker rodando, eventos ficam `status='pending'` indefinidamente — nao bloqueia o shell, mas audit_log/embeddings nao avancam.

## 8. Testar Context Engine (Sprint 19)

Sprint 19 ligou 3 camadas SCP: eventos brutos → context_records derivados → embeddings indexados → RAG no Copilot.

Passos para validar end-to-end:

1. Subir o pipeline (4 terminais da seção 7) + `pnpm dev:scp-worker`
2. No shell, abrir Drive → upload de um `.txt` ou `.md` qualquer
3. Aguardar ~2-4s (uma rodada do poller). No banco:

```bash
psql "$DATABASE_URL" -c "SELECT entity_type, record_type, version, data->>'name' AS preview FROM kernel.context_records ORDER BY updated_at DESC LIMIT 5;"
psql "$DATABASE_URL" -c "SELECT source_type, source_id, chunk_index, length(chunk_text) FROM kernel.embeddings ORDER BY created_at DESC LIMIT 5;"
```

Esperado:

- `context_records`: linha `file/summary` + `company/company_stats_files`
- `embeddings`: chunks do arquivo (1+ rows com source_type='file')

Se `embeddings` vazio: LLM indisponível. Configure `LITELLM_URL` + `LITELLM_MASTER_KEY` no `.env.local` ou rode `pnpm dev:llm` para subir o gateway local.

Para testar **RAG no Copilot**:

1. Abrir Configurações > Inteligência Artificial → configurar BYOK (qualquer provedor OpenAI-compatible)
2. Abrir Aether AI Copilot
3. Perguntar algo sobre o conteúdo do arquivo (ex: "qual o conteúdo do arquivo X?")
4. A resposta vem com badge sutil **◆ N contextos da empresa** quando o RAG encontrou chunks similares

Para inspecionar via UI:

- Abrir app **Governança** → aba **◆ Context Engine**
- Ver cards de resumo + tabela dos últimos 20 records
- Click em "Snapshot" em qualquer linha → drawer mostra records + related_events + embedding_count

## 8.5. Convidar colaboradores e criar departamentos (Sprint 27-28)

Após criar a company, owner/admin podem expandir a equipe:

1. Mesa > **Gestor** > aba **Equipe** > **Convidar colaborador**
2. Email + role (admin / manager / member / viewer) → Edge Function `invite-member` cria membership pendente + dispara invite Supabase Auth.
3. Convidado recebe email com link de signup; ao confirmar, role é ativado.

Departamentos e grupos:

1. Mesa > **Gestor** > aba **Departamentos** > **Novo departamento** (e.g., Desenvolvimento, Produto)
2. Mesa > **Gestor** > aba **Grupos** > criar grupo ad-hoc (e.g., "Squad Camada 1")
3. Mesa > **Gestor** > aba **Acessos** > definir regras `app_access_rules` por departamento/grupo + janela temporal opcional (`access_schedules`).

## 8.6. Apps com persistência: Tarefas, Kanban, Bloco de Notas (Sprint 29)

Sprint 29 migrou esses apps de localStorage para Postgres com RLS:

- **Tarefas** (`kernel.tasks`, `kernel.task_lists`) — listas + tarefas por company_id.
- **Kanban** (`kernel.kanban_boards/columns/cards` + activity/attachments/labels/comments/checklist) — boards multi-coluna persistentes.
- **Bloco de Notas** (`kernel.notes`, `kernel.note_labels`) — markdown notes com labels.

Sem mudança de UI — só backing store. Funciona idêntico em qualquer device do mesmo tenant.

## 8.7. Configurar 2FA TOTP (Sprint 30)

1. Configurações > **Segurança** > **Ativar 2FA TOTP**
2. Aplicativo authenticator (Google Authenticator, Authy, 1Password) escaneia QR code.
3. Confirmar com 6 dígitos atuais → TOTP ativo na próxima sessão.
4. Codigos de backup (8) gerados — guarde fora do Aethereos.

## 8.8. Exportar dados da company (LGPD Art. 18)

Apenas owner pode exportar:

1. Configurações > **Privacidade & LGPD** > **Exportar dados da empresa**
2. Edge Function `export-company-data` gera JSON com: companies, memberships,
   profiles, contacts, files (sem storage_path), scp_outbox últimos 90d, etc.
3. Download direto do browser (limite 50 MB).

Não inclui senhas, tokens, secrets. Rate-limit: 3 exports/hora.

## 8.9. Encerrar sessões remotas

1. Configurações > **Segurança** > **Sessões ativas** lista todos os logins.
2. Para encerrar uma sessão específica: clique em **Encerrar**.
3. Para encerrar TODAS exceto a atual: **Encerrar outras sessões**.

Edge Function `force-logout` marca `kernel.login_history.is_active=false`;
shell consulta no boot/poll e desconecta automaticamente.

## 9. Rodar gates de CI

```bash
pnpm typecheck
pnpm lint
pnpm test                 # vitest unit tests
pnpm test:isolation       # cross-tenant RLS tests
pnpm ci:full              # tudo acima + build

# E2E (Playwright)
set -a; source tooling/e2e/.env.local; set +a
pnpm test:e2e:full        # ~22s, 32/32 esperado
```

## 10. Stop / cleanup

```bash
supabase stop --no-backup
```

## Refs

- `SPRINT_LOG.md` — histórico de sprints
- `KNOWN_LIMITATIONS.md` — limitações conhecidas + fix plans
- `CLAUDE.md` — instruções para agentes IA assistentes (Claude Code, Cursor)
- `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` — documento constitucional
