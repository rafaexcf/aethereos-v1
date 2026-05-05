# SPRINT 15 — BYOK LLM: Configuracao de Provedor + LM Studio + Copilot Real

> **Objetivo:** Usuario configura sua propria API key de LLM nas Configuracoes, escolhendo provedor (OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, LM Studio local, ou qualquer endpoint OpenAI-compatible). Copilot passa a funcionar com LLM real.
> **NAO inclui:** SCP consumer, Policy Engine, Client SDK, staging deploy.
> **Estimativa:** 4-6 horas. Custo: $25-45.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar Sprint 14 documentado
3. git log --oneline -10 — confirmar HEAD
4. packages/drivers/src/interfaces/llm.ts — interface LLMDriver (complete, embed, ping, withTenant)
5. packages/drivers-litellm/src/litellm-driver.ts — implementacao atual via LiteLLM gateway
6. packages/kernel/src/degraded/degraded-llm-driver.ts — fallback degradado
7. apps/shell-commercial/src/apps/copilot/index.tsx — Copilot UI atual
8. apps/shell-commercial/src/apps/configuracoes/index.tsx — App de configuracoes
9. kernel.user_preferences — tabela (user_id, key, value jsonb)

### Estado atual

- Copilot existe com UI completa (chat, Shadow Mode, proposals, RAG cego)
- LLM Driver interface definida: complete(), embed(), ping(), withTenant()
- Implementacao atual: LiteLLMDriver aponta para gateway local (http://localhost:4000)
- Fallback: DegradedLLMDriver retorna content vazio
- withDegradedLLM() wrapper ja implementado (failover automatico)
- user_preferences ja tem CRUD funcional (useUserPreference hook)
- App Configuracoes ja existe com multiplas secoes

### Arquitetura da solucao

A ideia e BYOK (Bring Your Own Key): o usuario configura seu provedor diretamente, sem depender de LiteLLM gateway da plataforma. Todos os grandes provedores expoem API compativel com o formato OpenAI (/v1/chat/completions). Isso inclui:

- OpenAI (api.openai.com)
- Anthropic via proxy OpenAI-compatible (ou API nativa)
- Google Gemini (generativelanguage.googleapis.com)
- Groq (api.groq.com)
- Mistral (api.mistral.ai)
- OpenRouter (openrouter.ai/api)
- Together AI (api.together.xyz)
- LM Studio local (localhost:1234)
- Ollama local (localhost:11434)
- Qualquer endpoint custom OpenAI-compatible

O driver BYOK faz fetch direto para o endpoint configurado pelo usuario. NAO passa por LiteLLM gateway (que continua disponivel como fallback de plataforma se o usuario nao configurar nada).

IMPORTANTE SOBRE SEGURANCA: a API key do usuario e armazenada em kernel.user_preferences com a key llm_config. A key fica no banco Supabase protegida por RLS (so o proprio usuario le). Em producao futura, considerar criptografia at-rest adicional — mas para MVP, RLS e suficiente.

---

## MILESTONES

### MX72 — BYOKLLMDriver: novo driver OpenAI-compatible

O que fazer:

1. Criar packages/drivers-byok/ com package @aethereos/drivers-byok que implementa LLMDriver.

2. Interface de config:
   - provider: string (openai, anthropic, google, groq, mistral, openrouter, together, lmstudio, ollama, custom)
   - baseUrl: string (ex: https://api.openai.com/v1, http://localhost:1234/v1)
   - apiKey: string (key do usuario, vazia para local)
   - model: string (ex: gpt-4o, claude-3-5-sonnet, llama-3.1-8b)
   - maxTokens: number (default 1024)
   - temperature: number (default 0.7)

3. O driver faz POST para {baseUrl}/chat/completions com formato OpenAI-standard:
   - Headers: Authorization Bearer {apiKey}, Content-Type application/json
   - Body: { model, messages, max_tokens, temperature, stream: false }
   - Para LM Studio e Ollama: apiKey pode ser vazio ou lm-studio

4. Tratamento especial por provider:
   - Anthropic: se provider === anthropic, usar baseUrl https://api.anthropic.com/v1/messages com header x-api-key e formato nativo Anthropic (messages API). Converter resposta para formato padrao LLMCompletionResult.
   - Google Gemini: se provider === google, usar endpoint https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent com apiKey como query param. Converter resposta.
   - Todos os outros: formato OpenAI-compatible padrao.

5. embed() retorna Err com mensagem "Embedding nao suportado neste provedor" para provedores sem endpoint de embeddings — ou tenta {baseUrl}/embeddings se disponivel.

6. ping() faz GET em {baseUrl}/models (OpenAI format) ou similar health check. Timeout 5s.

7. Testes unitarios basicos: mock fetch, verifica headers e body para cada provider type.

Package setup:
packages/drivers-byok/
package.json (@aethereos/drivers-byok)
tsconfig.json
src/
byok-llm-driver.ts
provider-configs.ts
index.ts
**tests**/
byok-llm-driver.test.ts

Criterio de aceite: BYOKLLMDriver compila, testes passam, implementa LLMDriver interface.

Commit: feat(drivers-byok): BYOKLLMDriver — OpenAI-compatible multi-provider (MX72)

---

### MX73 — Provider presets e validacao

O que fazer:

1. Criar provider-configs.ts com presets para cada provedor:

   openai: label OpenAI, baseUrl https://api.openai.com/v1, models [gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo, o1, o1-mini], requiresKey true, docsUrl https://platform.openai.com/api-keys, format openai

   anthropic: label Anthropic (Claude), baseUrl https://api.anthropic.com, models [claude-sonnet-4-20250514, claude-3-5-sonnet-20241022, claude-3-haiku-20240307], requiresKey true, docsUrl https://console.anthropic.com/settings/keys, format anthropic

   google: label Google Gemini, baseUrl https://generativelanguage.googleapis.com/v1beta, models [gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash], requiresKey true, docsUrl https://aistudio.google.com/apikey, format google

   groq: label Groq, baseUrl https://api.groq.com/openai/v1, models [llama-3.1-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768], requiresKey true, docsUrl https://console.groq.com/keys, format openai

   mistral: label Mistral AI, baseUrl https://api.mistral.ai/v1, models [mistral-large-latest, mistral-small-latest, open-mistral-nemo], requiresKey true, docsUrl https://console.mistral.ai/api-keys, format openai

   openrouter: label OpenRouter, baseUrl https://openrouter.ai/api/v1, models [anthropic/claude-3.5-sonnet, openai/gpt-4o, meta-llama/llama-3.1-70b-instruct], requiresKey true, docsUrl https://openrouter.ai/keys, format openai

   together: label Together AI, baseUrl https://api.together.xyz/v1, models [meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo, mistralai/Mixtral-8x7B-Instruct-v0.1], requiresKey true, docsUrl https://api.together.xyz/settings/api-keys, format openai

   lmstudio: label LM Studio (Local), baseUrl http://localhost:1234/v1, models [] (detectado via GET /v1/models), requiresKey false, docsUrl https://lmstudio.ai, format openai, hint Inicie o LM Studio e ative o servidor local na porta 1234

   ollama: label Ollama (Local), baseUrl http://localhost:11434/v1, models [] (detectado), requiresKey false, docsUrl https://ollama.com, format openai, hint Instale e inicie o Ollama. Modelos: ollama pull llama3.1

   custom: label Custom (OpenAI-compatible), baseUrl vazio, models [], requiresKey true, format openai, hint Qualquer endpoint que aceite formato OpenAI /v1/chat/completions

2. Funcao de validacao: dado um BYOKConfig, tenta ping() e retorna {ok, models?, error?}.

3. Para LM Studio e Ollama: funcao fetchAvailableModels(baseUrl) que faz GET /v1/models e retorna lista de modelos disponiveis localmente.

Criterio de aceite: Presets funcionam, validacao retorna resultado claro, fetchAvailableModels funciona.

Commit: feat(drivers-byok): provider presets + validation + model discovery (MX73)

---

### MX74 — UI de configuracao LLM no app Configuracoes

O que fazer:

1. Adicionar nova secao Inteligencia Artificial no app Configuracoes, com icone Bot ou Brain.

2. A secao deve ter:

   a) Seletor de provedor — dropdown ou cards com os presets

   b) Campo API Key — input type password com toggle de visibilidade. Oculto para LM Studio/Ollama. Link Obter chave apontando para docsUrl do preset.

   c) Campo Base URL — pre-preenchido pelo preset, editavel apenas para Custom. Para locais, mostrar hint.

   d) Seletor de modelo — dropdown com modelos do preset. Para LM Studio/Ollama, botao Detectar modelos que chama fetchAvailableModels. Para Custom, input livre.

   e) Botao Testar conexao — chama ping() + complete() com mensagem simples. Mostra resultado (ok/erro com mensagem clara).

   f) Botao Salvar — persiste em kernel.user_preferences com key=llm_config, value=jsonb do BYOKConfig.

3. Design consistente com o resto do app Configuracoes. Mesmo padrao visual.

4. Se o usuario nao configurou nada, mostrar estado vazio com explicacao: Configure seu provedor de IA para ativar o Aether AI Copilot.

5. Se ja configurou, mostrar resumo: Provedor: OpenAI | Modelo: gpt-4o | Status: Conectado

6. Persistencia usa o hook useUserPreference ja existente.

Criterio de aceite: Secao renderiza, usuario pode selecionar provedor, inserir key, testar conexao, salvar. Configuracao persiste em user_preferences.

Commit: feat(settings): secao Inteligencia Artificial — BYOK provider config UI (MX74)

---

### MX75 — Integrar BYOKLLMDriver no boot do shell

O que fazer:

1. No boot do shell (onde drivers sao inicializados), adicionar logica:
   - Ler user_preferences key=llm_config
   - Se existe e esta preenchido: criar BYOKLLMDriver com o config do usuario
   - Se nao existe: manter LiteLLMDriver como fallback (ou DegradedLLMDriver se LiteLLM nao estiver rodando)
   - Wrappear com withDegradedLLM() em ambos os casos (failover automatico)

2. O driver LLM deve ser reativo: quando o usuario salva nova config nas Configuracoes, o driver deve ser recriado sem precisar recarregar a pagina. Usar um store Zustand ou ref reativo.

3. Manter compatibilidade: se LiteLLM gateway estiver rodando E usuario nao configurou BYOK, usar LiteLLM. Prioridade: BYOK > LiteLLM > Degraded.

4. Nao quebrar nenhum teste existente. O boot sem config deve continuar funcionando identicamente.

Criterio de aceite: Shell boota normalmente. Se usuario configurou BYOK, Copilot usa o driver do usuario. Se nao, usa fallback.

Commit: feat(shell): integrate BYOKLLMDriver in boot — BYOK > LiteLLM > Degraded (MX75)

---

### MX76 — Copilot funciona com LLM real

O que fazer:

1. Verificar que o Copilot funciona end-to-end com o BYOKLLMDriver:
   - Enviar mensagem — recebe resposta real do LLM
   - Banner de modo degradado desaparece quando LLM esta configurado
   - Shadow Mode proposals funcionam (LLM sugere acoes, humano aprova)
   - Historico persiste em kernel.copilot_messages

2. Testar com pelo menos 2 provedores:
   - Um cloud (OpenAI ou Anthropic ou Groq)
   - LM Studio local (se disponivel) — se nao, documentar como KNOWN_LIMITATION

3. Se LM Studio nao estiver instalado na maquina, o teste de LM Studio e manual/deferido. Documentar instrucoes.

4. Nao alterar a UI do Copilot significativamente — apenas garantir que funciona com LLM real.

Criterio de aceite: Copilot responde com LLM real quando BYOK configurado. Banner de degradado some. Historico persiste.

Commit: feat(copilot): end-to-end with BYOK LLM — real AI responses (MX76)

---

### MX77 — Testes + documentacao

O que fazer:

1. Testes unitarios para BYOKLLMDriver (mock fetch):
   - Format openai: verifica headers e body
   - Format anthropic: verifica x-api-key e body nativo
   - Format google: verifica query param e body
   - Ping: verifica endpoint
   - Erro de rede: retorna NetworkError
   - Erro 401: retorna AuthError
   - Erro 429: retorna RateLimitError

2. Teste E2E (opcional, se possivel sem API key real):
   - Abrir Configuracoes > IA
   - Selecionar provedor Custom
   - Preencher URL invalida
   - Testar conexao — deve mostrar erro

3. Atualizar SPRINT_LOG.md com Sprint 15

4. Atualizar QUICK_START.md com instrucoes de como configurar LLM:
   - Cloud: Configuracoes > IA > escolher provedor > colar API key > salvar
   - Local: Instalar LM Studio > baixar modelo > iniciar servidor > Configuracoes > IA > LM Studio > detectar modelos > salvar

5. Atualizar KNOWN_LIMITATIONS.md se necessario

Criterio de aceite: Testes passam, documentacao atualizada. pnpm typecheck && pnpm lint green.

Commit: docs: sprint 15 — BYOK LLM config + copilot real (MX77)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem feat/fix/docs(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. Nova dep exige justificativa em commit.
R5. Bloqueios mantidos: sem next em shells, sem inngest, sem @clerk/\*, sem prisma.
R6. Antes de cada commit: pnpm typecheck && pnpm lint.
R7. Atualize SPRINT_LOG.md ao fim de cada milestone.
R8. Nao execute fora de ~/Projetos/aethereos. Nao escreva em ~/Projetos/aethereos-v2.
R9. Ao perceber contexto cheio: pare, escreva pickup point.
R10. API keys do usuario NUNCA em logs, NUNCA em console.log, NUNCA em eventos SCP. RLS protege leitura.
R11. O BYOKLLMDriver faz chamadas diretas do browser para o endpoint do provedor. NAO criar proxy Edge Function neste sprint (simplificacao intencional; proxy e melhoria futura para esconder key do network tab).
R12. Nao quebrar os 32 E2E existentes.

---

## TERMINO DO SPRINT

Quando MX77 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte o resultado (X passed, Y failed, Z skipped).

3. Pare aqui. Nao inicie Sprint 16.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 15 (BYOK LLM Config) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX72-MX77 nao concluida
5. Continue a partir dela

Lembrar:

- BYOK = Bring Your Own Key. Usuario configura seu provedor nas Configuracoes.
- BYOKLLMDriver implementa LLMDriver interface.
- Presets: OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, Together, LM Studio, Ollama, Custom.
- Config armazenada em kernel.user_preferences key=llm_config.
- Prioridade: BYOK > LiteLLM > Degraded.
- API keys NUNCA em logs ou SCP events.
- 32 E2E existentes nao podem quebrar.

Roadmap em SPRINT_15_PROMPT.md na raiz.
