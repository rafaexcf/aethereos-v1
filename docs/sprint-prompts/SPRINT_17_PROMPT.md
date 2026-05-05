# SPRINT 17 — Agent Proposals Workflow: Aprovar, Rejeitar, Executar

> **Objetivo:** Quando o Copilot propoe uma acao (criar pessoa, criar arquivo, enviar notificacao, etc.), o usuario aprova ou rejeita. Se aprovado, a acao e executada de verdade no banco. Notificacao informa o usuario. Proposals expiradas sao marcadas automaticamente.
> **NAO inclui:** verticais, staging deploy, Policy Engine, novos intent types.
> **Estimativa:** 3-5 horas. Custo: $20-35.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar Sprint 16 documentado
3. git log --oneline -10 — confirmar HEAD
4. apps/shell-commercial/src/apps/copilot/index.tsx — CopilotDrawer com ActionApprovalPanel (inline approve/reject)
5. kernel.agent_proposals — schema com status pending/approved/rejected/executed/expired, intent_type, payload jsonb, expires_at (1h TTL)
6. kernel.agents — tabela de agentes (DEMO_AGENT_ID = 00000000-0000-0000-0000-000000000001)
7. packages/scp-registry/src/schemas/agent.ts — SCP schemas: agent.copilot.action_proposed/approved/rejected
8. kernel.people, kernel.files, kernel.notifications, kernel.settings, kernel.chat_channels — tabelas alvo dos intents

### Estado atual

- Copilot detecta intents via keywords (detectIntent), cria proposals em agent_proposals com status=pending
- ActionApprovalPanel renderiza inline no chat com botoes Aprovar/Rejeitar
- Ao clicar Aprovar: status muda para approved, SCP event emitido
- Ao clicar Rejeitar: status muda para rejected, SCP event emitido
- PROBLEMA 1: Apos aprovacao, NADA ACONTECE. Status fica approved mas a acao nao e executada (nao insere pessoa, nao cria arquivo, etc.)
- PROBLEMA 2: Proposals expiradas (expires_at < now()) nao sao marcadas como expired
- PROBLEMA 3: Nao ha notificacao ao usuario quando uma proposal e criada ou executada
- PROBLEMA 4: Nao ha view central de proposals pendentes (so inline no chat)
- 40 proposals existem no banco (dados de teste)

### Arquitetura da solucao

5 intent types existentes:

- create_person: INSERT em kernel.people
- create_file: INSERT em kernel.files (metadata, sem upload fisico)
- send_notification: INSERT em kernel.notifications
- update_settings: UPDATE em kernel.settings
- create_channel: INSERT em kernel.chat_channels

Execucao acontece no frontend (browser) usando o DataDriver do usuario autenticado. O Copilot propoe, o humano aprova, o codigo executa a acao com as credenciais do humano (nao do agente). Isso e consistente com autonomia nivel 0-1 e freio agentico.

---

## MILESTONES

### MX84 — Executor de proposals aprovadas

O que fazer:

1. Criar modulo apps/shell-commercial/src/lib/proposal-executor.ts com funcao:

   async function executeProposal(
   drivers: { data: DataDriver; scp: ScpPublisher },
   proposal: { id: string; intentType: string; payload: Record<string, unknown> },
   userId: string,
   companyId: string,
   ): Promise<{ ok: boolean; error?: string }>

2. Implementar execucao por intent_type:

   create_person:
   - Extrair full_name, email, source_request do payload
   - INSERT em kernel.people: { company_id, full_name, email, created_by: userId }
   - Emitir SCP: kernel.person.created

   create_file:
   - Extrair name, kind, source_request do payload
   - INSERT em kernel.files: { company_id, name, mime_type: null, size_bytes: 0, uploaded_by: userId, parent_id: null }
   - Emitir SCP: kernel.file.created

   send_notification:
   - Extrair title, body, type do payload
   - INSERT em kernel.notifications: { company_id, user_id: userId, type, title, body, source_app: 'copilot' }
   - (nao precisa SCP — notificacao ja e o resultado)

   update_settings:
   - Extrair scope, key, source_request do payload
   - UPSERT em kernel.settings: { company_id, scope, scope_id: userId ou companyId, key, value: payload, updated_by: userId }
   - Emitir SCP: kernel.settings.updated

   create_channel:
   - Extrair name, kind, source_request do payload
   - INSERT em kernel.chat_channels: { company_id, name, kind, created_by: userId }
   - Emitir SCP: kernel.chat.channel_created

3. Apos execucao bem-sucedida:
   - UPDATE agent_proposals SET status = 'executed', reviewed_at = now() WHERE id = proposal.id
   - Emitir SCP: agent.copilot.action_executed (novo schema — registrar em scp-registry)

4. Se execucao falhar:
   - Manter status = 'approved' (nao reverter para pending)
   - Retornar error message
   - Log no console (sem expor dados sensiveis)

5. Testes unitarios: mock DataDriver, verificar INSERT chamado com campos corretos para cada intent_type.

Criterio de aceite: executeProposal funciona para os 5 intent types. Testes passam.

Commit: feat(copilot): proposal executor — execute approved actions for all 5 intent types (MX84)

---

### MX85 — Integrar executor no fluxo de aprovacao do Copilot

O que fazer:

1. No CopilotDrawer, quando usuario clica Aprovar:
   - Atual: muda status para approved, emite SCP. FIM.
   - Novo: muda status para approved, emite SCP, CHAMA executeProposal(), se ok muda para executed.

2. O fluxo completo fica:
   a) Usuario clica Aprovar
   b) UI mostra spinner/loading no botao
   c) UPDATE status = 'approved' no banco
   d) Emitir SCP agent.copilot.action_approved
   e) Chamar executeProposal()
   f) Se ok: UPDATE status = 'executed', emitir SCP agent.copilot.action_executed
   g) Se erro: manter approved, mostrar mensagem de erro no ActionApprovalPanel
   h) UI atualiza: mostra badge Executado ou Erro

3. O ActionApprovalPanel deve ter novo estado visual para executed com erro:
   - executed: verde, badge Executado com check
   - approved (com erro): amarelo, badge Aprovado - falha na execucao com retry button

4. Botao Retry: tenta executeProposal() novamente.

5. NAO mudar a logica de detectIntent ou canPropose — apenas o fluxo pos-aprovacao.

Criterio de aceite: Aprovar uma proposal no chat executa a acao de verdade. Pessoa criada aparece em kernel.people. Canal criado aparece em kernel.chat_channels. Etc.

Commit: feat(copilot): execute proposals on approval — end-to-end action flow (MX85)

---

### MX86 — Expirador de proposals

O que fazer:

1. Proposals tem expires_at (default 1h apos criacao). Proposals nao revisadas apos esse tempo devem ser marcadas como expired.

2. Duas abordagens (implementar ambas):

   a) Client-side: no CopilotDrawer, ao carregar proposals pendentes, verificar expires_at < now() e marcar como expired via UPDATE. Isso cobre o caso de uso normal.

   b) Banco: criar funcao SQL kernel.expire_stale_proposals() que faz:
   UPDATE kernel.agent_proposals SET status = 'expired' WHERE status = 'pending' AND expires_at < now();
   Chamar via cron (pg_cron se disponivel) ou via o client-side no boot.

3. Proposals expiradas no ActionApprovalPanel: mostrar badge Expirada (cinza) sem botoes de acao.

4. Limpar as 40 proposals de teste que estao no banco (provavelmente todas expiradas). Ou marcar como expired.

Criterio de aceite: Proposals velhas sao marcadas como expired. UI mostra estado visual correto.

Commit: feat(copilot): expire stale proposals — client + SQL function (MX86)

---

### MX87 — Notificacoes de proposals

O que fazer:

1. Quando Copilot cria uma proposal (status=pending):
   - Inserir notificacao em kernel.notifications: { user_id: supervisingUserId, company_id, type: 'info', title: 'Copilot sugeriu uma acao', body: descricao do intent, source_app: 'copilot', source_id: proposal.id }
   - Isso faz a notificacao aparecer no sino do Dock (notificacoes Realtime)

2. Quando proposal e executada (status=executed):
   - Inserir notificacao: { type: 'success', title: 'Acao executada pelo Copilot', body: descricao do que foi feito }

3. Quando proposal expira:
   - Inserir notificacao: { type: 'warning', title: 'Sugestao do Copilot expirou', body: descricao }

4. Clicar na notificacao deve abrir o Copilot (via source_app: 'copilot').

Criterio de aceite: Criar proposal gera notificacao. Executar gera notificacao de sucesso. Expirar gera warning.

Commit: feat(copilot): notifications for proposal lifecycle (MX87)

---

### MX88 — Painel central de proposals no app Governanca

O que fazer:

1. No app Governanca (apps/shell-commercial/src/apps/governanca/), adicionar aba ou secao Proposals do Copilot.

2. A secao lista todas as proposals da company (nao so do usuario atual):
   - Filtros: status (pending, approved, executed, rejected, expired), intent_type
   - Colunas: data, intent, payload preview, status, reviewed_by, reviewed_at
   - Ordenacao por created_at DESC

3. Proposals pendentes tem botoes Aprovar / Rejeitar inline (apenas para o supervising_user ou admin).

4. Clicar em uma proposal abre drawer com detalhes completos: payload formatado, historico de status, link para conversa do Copilot.

5. Dados vem de kernel.agent_proposals via DataDriver com RLS (company-scoped).

Criterio de aceite: Governanca mostra lista de proposals. Admin pode aprovar/rejeitar de la. Filtros funcionam.

Commit: feat(governanca): proposals panel — central view for all copilot proposals (MX88)

---

### MX89 — Testes E2E + documentacao

O que fazer:

1. Adicionar ou atualizar testes E2E:
   - Teste basico: verificar que Governanca tem secao de proposals (se acessivel)
   - NAO testar execucao real de proposals no E2E (dependeria de LLM real para gerar proposal)
   - Se possivel: testar que proposal seed aparece na lista de Governanca

2. Rodar suite completa:
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

3. Resultado esperado: 33+ passed, 0 failed.

4. Atualizar SPRINT_LOG.md com Sprint 17.

5. Documentar no QUICK_START.md: como testar o fluxo de proposals (pedir ao Copilot para criar uma pessoa, aprovar, verificar em Pessoas).

Criterio de aceite: Testes passam, documentacao atualizada.

Commit: docs: sprint 17 — agent proposals workflow (MX89)

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
R10. Freio agentico invariante: execucao usa credenciais do HUMANO, nao do agente. O Copilot propoe, o humano autoriza, o sistema executa com permissoes do humano.
R11. NAO adicionar novos intent types neste sprint. Apenas fazer os 5 existentes funcionarem end-to-end.
R12. NAO quebrar os 33 E2E existentes.
R13. Proposals expiradas NUNCA podem ser executadas. Verificar expires_at antes de executar.

---

## TERMINO DO SPRINT

Quando MX89 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte o resultado (X passed, Y failed, Z skipped).

3. Pare aqui. Nao inicie Sprint 18.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 17 (Agent Proposals Workflow) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX84-MX89 nao concluida
5. Continue a partir dela

Lembrar:

- Objetivo: proposals aprovadas executam acao real (INSERT em tabelas kernel).
- 5 intent types: create_person, create_file, send_notification, update_settings, create_channel.
- Execucao usa credenciais do HUMANO (freio agentico).
- Proposals expiradas (expires_at < now()) nunca executam.
- Notificacoes informam o usuario sobre lifecycle da proposal.
- Governanca tem painel central de todas as proposals.
- 33 E2E existentes nao podem quebrar.

Roadmap em SPRINT_17_PROMPT.md na raiz.
