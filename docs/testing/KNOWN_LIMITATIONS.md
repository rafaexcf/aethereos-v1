# Known Limitations — Camada 1 Sprint 9

**Versão:** Sprint 9 (2026-04-29)  
**Audiência:** Testers externos e internos fazendo validação manual da Camada 1.

Estas limitações são **esperadas e documentadas**. Não são bugs a reportar — a menos que o comportamento observado contradiga o descrito aqui.

---

## L1. AI Copilot — Modo Degenerado (sem LLM real)

**Status:** Ativo por padrão em setup local sem LiteLLM configurado.

**O que acontece:**

- O drawer do Copilot abre normalmente.
- Um banner "modo degenerado" aparece no topo.
- Respostas ao usuário são mensagens de fallback fixas, não geradas por LLM.
- Intent detection (detectar "criar pessoa", "criar canal") funciona via heurística simples, não LLM.
- Propostas no Shadow Mode são criadas e persistem no banco normalmente.
- Histórico de conversa carrega e persiste entre sessões (funciona sem LLM).

**Como ativar o LLM real:**

```bash
# Adicione ao .env.local:
LITELLM_ENDPOINT=http://localhost:4000
LITELLM_API_KEY=sk-local
OPENAI_API_KEY=sk-xxx   # ou ANTHROPIC_API_KEY

pnpm dev:infra  # sobe LiteLLM + NATS
```

**Referência:** Fundamentação P14 — Modo Degenerado obrigatório para todo componente sofisticado.

---

## L2. Notificações por Email — Desativadas

**Status:** Email transacional não configurado no ambiente local.

**O que acontece:**

- Supabase Auth local usa a conta de email em memória (não envia emails reais).
- "Confirmar email" na criação de conta: em ambiente local, `email_confirm: true` é setado pelo seed — contas de teste já estão confirmadas.
- Para novos cadastros via UI: o email de confirmação não chega. Use o Supabase Studio (`http://localhost:54323`) → Authentication → Users para confirmar manualmente.
- Notificações de eventos (chat, pessoa criada) não são enviadas por email.

**Workaround:** Confirmar usuário manualmente no Studio ou usar contas seed pré-confirmadas.

---

## L3. Painel Staff — Requer Claim JWT

**Status:** Painel `/staff` exige `app_metadata.is_staff: true` no JWT do usuário.

**O que acontece:**

- Usuários seed padrão não têm o claim de staff.
- Acessar `/staff` sem o claim resulta em redirecionamento ou mensagem "Acesso negado".
- O painel mostra dados de todas as companies (visão cross-tenant) — intencionalmente restrito.

**Como testar o Staff:**

```sql
-- No Supabase Studio → SQL Editor:
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"is_staff": true}'
WHERE email = 'ana.lima@meridian.test';
```

Depois, relogar com a conta para obter JWT atualizado.

---

## L4. RAG / Busca Semântica — Degradado sem LLM

**Status:** `embed-text` Edge Function requer LiteLLM para gerar embeddings.

**O que acontece:**

- Copilot RAG retrieval (busca de contexto em arquivos/conversas anteriores) não funciona sem LiteLLM.
- Perguntas ao Copilot sobre conteúdo do Drive retornam contexto vazio.
- O fluxo base de conversa e Shadow Mode **não é afetado**.

**Quando ativa:** Ao configurar LiteLLM com modelo de embeddings (ex: `text-embedding-3-small`).

---

## L5. Stripe — Modo Test, Sem Billing Real

**Status:** Stripe em modo test (se configurado) ou completamente ausente.

**O que acontece:**

- Tela de billing (se existir no UI) usa chaves de teste Stripe — nenhuma cobrança real.
- Lago (sistema de usage billing) não está rodando localmente neste sprint.
- Features gate por plano não estão ativos: todos os usuários seed têm acesso a todas as features.

**Não reportar:** "Não consigo pagar/assinar" — esperado. O objetivo de Sprint 9 é validar a camada OS, não o fluxo de pagamento.

---

## L6. Compliance e Auditoria — UI Placeholder

**Status:** Ícone de Auditoria no dock pode exibir dados mock ou lista vazia.

**O que acontece:**

- A tabela `kernel.scp_events` recebe eventos reais ao usar o app normalmente.
- A UI de Auditoria pode mostrar esses eventos, mas a interface de filtros avançados é placeholder.
- A UI de Governança (Fundamentação/Invariantes) é read-only neste sprint.

**O que está funcional:** Eventos SCP são gravados no banco ao realizar ações (login, criar arquivo, enviar mensagem, criar pessoa). Verificável via Supabase Studio.

---

## L7. Modo Offline / PWA

**Status:** PWA registrado, mas cache de assets pode estar incompleto em dev mode.

**O que acontece:**

- Em produção (`pnpm build && pnpm preview`), o Service Worker cacheia assets para uso offline.
- Em `pnpm dev`, o Service Worker está **desativado** (`devOptions: { enabled: false }`).
- Desconectar da internet em modo dev resulta em tela branca.

**Não reportar:** Falha offline em `pnpm dev`. Testar offline requer build de produção.

---

## L8. Performance — Latência Adicional via ngrok

**Status:** Ao testar via URL ngrok, latência extra de ~30-100ms é esperada.

**O que acontece:**

- Tráfego percorre: browser do tester → ngrok cloud → sua máquina local → app.
- Operações que parecem lentas podem ser latência de rede, não bug de performance.
- Para isolar: testar diretamente em `http://localhost:5174` sem ngrok.

**Referência:** `docs/runbooks/share-with-tester.md` — seção "Limitações importantes".

---

## L9. Realtime Chat — Requer Supabase com Realtime Ativo

**Status:** Supabase local tem Realtime ativo por padrão, mas pode falhar em conexões ngrok.

**O que acontece:**

- Realtime usa WebSocket. Em alguns casos, o túnel ngrok pode ter latência alta em WebSockets.
- Se mensagens de outro usuário não aparecem sem reload: é limitação de rede via ngrok.
- Em `localhost`: Realtime funciona normalmente.

---

## L10. Dados Seed — Não Persistem Entre `supabase db reset`

**Status:** `pnpm dev:db` executa `supabase db reset` — **apaga todos os dados**.

**O que acontece:**

- Rodar `pnpm dev:db` novamente apaga tudo e recria o schema zerado.
- Dados de teste (arquivos criados, mensagens, pessoas) são perdidos.
- Rodar `pnpm seed:dev` depois repopula os dados base.

**Workflow correto após reset:**

```bash
pnpm dev:db      # reset schema
pnpm seed:dev    # repopula dados base
```

---

## Resumo Rápido

| Limitação                            | Impacto       | Workaround                         |
| ------------------------------------ | ------------- | ---------------------------------- |
| L1. Copilot sem LLM                  | Médio         | Configurar LiteLLM (opcional)      |
| L2. Email transacional ausente       | Baixo         | Confirmar usuário no Studio        |
| L3. Staff requer claim JWT           | Baixo         | SQL no Studio para adicionar claim |
| L4. RAG sem embeddings               | Médio         | Configurar LiteLLM                 |
| L5. Billing desativado               | Informacional | Esperado — fora do escopo Sprint 9 |
| L6. Auditoria/Governança placeholder | Baixo         | Verificar via Studio diretamente   |
| L7. PWA offline apenas em produção   | Baixo         | Usar `pnpm build && pnpm preview`  |
| L8. Latência ngrok                   | Baixo         | Testar via localhost para comparar |
| L9. Realtime instável via ngrok      | Baixo         | Testar via localhost               |
| L10. Seed apagado no dev:db          | Médio         | Rodar `pnpm seed:dev` após dev:db  |
