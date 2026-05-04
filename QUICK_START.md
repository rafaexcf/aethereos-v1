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

## 6. Rodar gates de CI

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

## 7. Stop / cleanup

```bash
supabase stop --no-backup
```

## Refs

- `SPRINT_LOG.md` — histórico de sprints
- `KNOWN_LIMITATIONS.md` — limitações conhecidas + fix plans
- `CLAUDE.md` — instruções para agentes IA assistentes (Claude Code, Cursor)
- `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` — documento constitucional
