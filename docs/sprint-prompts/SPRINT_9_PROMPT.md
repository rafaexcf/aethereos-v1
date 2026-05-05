# SPRINT LONGO AUTÔNOMO — Aethereos Bootstrap Fase 9

> Sprint 9 **redesenhado**. Não é hardening + IaC + deploy real (esse vira Sprint 10).
> Foco desta fase: **deixar a Camada 1 pronta para testes manuais e tunneling para terceiros**.
>
> Objetivo concreto: você consegue subir local em ~30s, popular com seed data, executar smoke test scriptado, e tunelizar via ngrok para 2-3 testers. Sem custo recorrente. Sem deploy. Sem domínio próprio.

---

## CONTEXTO INICIAL OBRIGATÓRIO

Sprints 1-8 entregues. CI EXIT 0 estável. Camada 1 funcionalmente entregue mas com 4 dívidas residuais conhecidas e 3 containers em estado "unhealthy" (rodando mas com healthcheck falso-positivo).

1. **Leia integralmente:**
   - `CLAUDE.md`
   - `SPRINT_LOG.md` (todas as seções, especialmente Sprints 6.5, 7 revisado, 8)
   - `docs/SPRINT_6_5_AUDITORIA.md`
   - `docs/architecture/SCP_PIPELINE_E2E.md`
   - `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` Parte II (princípios, especialmente P14 Modo Degenerado, P8 Honestidade de cronograma)
   - `docs/adr/0019-apps-internos-camada-1-copilot-shadow.md`
   - `docs/adr/0020-driver-model-bifurcacao-server-browser.md`
   - Código atual:
     - `apps/shell-commercial/src/apps/copilot/` (estado de proposals e messages)
     - `infra/local/docker-compose.dev.yml`
     - `supabase/migrations/` (verificar se `kernel.agent_proposals` e `kernel.copilot_messages` existem como tabelas reais)

2. **Confirme em voz alta** (escreva no chat antes de qualquer ação) seis pontos:
   - Diferença concreta entre "Camada 1 pronta para testes" e "Camada 1 em produção" — o que está em cada e o que NÃO está
   - Lista das 4 dívidas residuais herdadas do Sprint 8 (`kernel.agent_proposals` real, `kernel.copilot_messages`, eventos SCP do Copilot, fixes de containers unhealthy)
   - Por que Tempo voltou a quebrar mesmo após pin em 2.5.0 (investigar via logs)
   - Diferença entre "container Up (unhealthy)" e "container em loop Restarting" — o que cada um significa
   - Como ngrok tunneliza um localhost para URL pública sem mudar configuração de DNS
   - Por que seed data faz parte de prontidão para teste (vs banco vazio = experiência ruim do tester)

3. **Verifique estado:**

```bash
git log --oneline -10
git status
pnpm typecheck > /tmp/precheck.log 2>&1; echo "TYPECHECK EXIT: $?"
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Se TYPECHECK != 0, **pare** e descreva.

---

## REGRAS INVIOLÁVEIS

(Iguais aos sprints anteriores)

**R1.** Commit por milestone com mensagem estruturada.
**R2.** Milestone só começa após anterior ter critério de aceite e commit.
**R3.** Após 3 tentativas, BLOQUEADA, registrar, pular.
**R4.** Nova dep exige justificativa.
**R5.** Bloqueios continuam: sem `next` em shells, sem `inngest`, sem `@clerk/*`, sem `prisma`, sem `framer-motion`.
**R6.** Toda chamada LLM via LiteLLM. Toda feature flag via Unleash. Toda persistência via Driver Model.
**R7.** Antes de cada commit: `pnpm typecheck && pnpm lint`. Antes do encerramento: `pnpm ci:full` EXIT 0.
**R8.** Atualize `SPRINT_LOG.md` ao fim de cada milestone.
**R9.** Não execute fora de `~/Projetos/aethereos`. Não instale globais.
**R10.** Ao perceber contexto cheio: pare, escreva pickup point.
**R11.** Reuso obrigatório de patterns existentes.

**R12. ESPECÍFICO SPRINT 9 — Sem features novas:**

- Você NÃO está criando UI nova
- Você NÃO está adicionando novos apps
- Sua missão é **fechar dívidas residuais e tornar o produto testável por humano não-técnico**
- Se descobrir bug pré-existente fora do escopo destas 7 milestones, anote no log mas **não conserte**

**R13. ESPECÍFICO SPRINT 9 — Sem deploy real:**

- **NÃO** instalar Pulumi, Terraform, AWS CDK
- **NÃO** configurar Vercel deployment
- **NÃO** tocar em Stripe live keys
- **NÃO** registrar domínio aethereos.io
- **NÃO** subir Supabase em cloud (continua local)
- **NÃO** subir NATS managed
- Tudo permanece local + ngrok para tunneling temporário
- Esse é Sprint 10 (mais provável) ou Sprint 11

**R14. ESPECÍFICO SPRINT 9 — Honestidade radical com testers:**

- Toda limitação conhecida vai pra `docs/testing/KNOWN_LIMITATIONS.md`
- Tester nunca deve ser surpreendido por funcionalidade que parece pronta mas é mock
- Se descobrir nova limitação durante o sprint, adicionar ao documento

---

## ARQUIVO DE LOG

Adicione ao `SPRINT_LOG.md`:

```markdown
---

# Sprint 9 — Camada 1 pronta para testes (não-deploy)

Início: <timestamp ISO>
Modelo: Claude Code (Sprint 9 N=1)

## Decisão humana registrada

Sprint 9 NÃO é hardening + IaC + deploy real. Esse vira Sprint 10.
Sprint 9 deixa Camada 1 testável local + via ngrok, sem custo recorrente.

## Calibração inicial (6 pontos respondidos)

[6 pontos]

## Histórico de milestones (Sprint 9)

[preenchido conforme avança]
```

Commit antes de prosseguir.

---

## ROADMAP DE MILESTONES

### MX19 — Fechar 4 dívidas residuais críticas

**Objetivo:** sumir com itens que vêm circulando desde Sprint 6.

**Tarefas:**

**A. `kernel.agent_proposals` realmente persistido:**

1. Verificar se migration cria a tabela. Se não, criar `supabase/migrations/0017_kernel_agent_proposals.sql`:
   - `id UUID PK`
   - `agent_id UUID NOT NULL`
   - `conversation_id UUID NOT NULL`
   - `intent_type TEXT NOT NULL`
   - `intent_payload JSONB NOT NULL`
   - `status TEXT CHECK (status IN ('proposed','approved','rejected','expired','executed','failed'))`
   - `proposed_at TIMESTAMPTZ DEFAULT NOW()`
   - `expires_at TIMESTAMPTZ`
   - `decided_by UUID`
   - `decided_at TIMESTAMPTZ`
   - `result JSONB`
   - `company_id UUID NOT NULL`
   - INDEX (company_id, status, expires_at), RLS por company_id
2. Atualizar `apps/shell-commercial/src/apps/copilot/`:
   - Substituir useState de proposals por queries reais via SupabaseBrowserDataDriver
   - Aprovação/rejeição persiste em DB

**B. `kernel.copilot_messages` persistência:**

1. Migration `supabase/migrations/0018_kernel_copilot_messages.sql`:
   - `id UUID PK`
   - `conversation_id UUID NOT NULL`
   - `role TEXT CHECK (role IN ('user','agent','system'))`
   - `content TEXT NOT NULL`
   - `tool_calls JSONB`
   - `created_at TIMESTAMPTZ DEFAULT NOW()`
   - `company_id UUID NOT NULL`
   - INDEX (conversation_id, created_at), RLS
2. Em `apps/shell-commercial/src/apps/copilot/`:
   - Histórico de mensagens carregado de DB ao abrir
   - Cada nova mensagem persiste

**C. Eventos SCP do Copilot:**

1. Schemas em `packages/scp-registry/src/schemas/agent.ts`:
   - `agent.copilot.action_proposed`
   - `agent.copilot.action_approved`
   - `agent.copilot.action_rejected`
   - `agent.copilot.message_sent`
2. Emissão via `publishEvent()` (Edge Function scp-publish já existe da MX8) em todos os pontos relevantes

**D. Fix de Tempo recorrente:**

1. `docker logs aethereos-tempo-dev 2>&1 | tail -50`
2. Identificar causa específica (provavelmente metrics_generator ou ring config)
3. Ajustar `infra/otel/tempo-config.yaml` para versão 2.5.0
4. Recreate container, validar 5 minutos sem restart

**Critério de aceite:**

```bash
pnpm typecheck && pnpm lint
pnpm test --filter=@aethereos/shell-commercial
pnpm dev:db
# Manual:
# 1. Abre Copilot, manda mensagem → mensagem persiste em kernel.copilot_messages
# 2. Pede ação criadora → proposta aparece em kernel.agent_proposals
# 3. Aprova proposta → status='approved' em DB, evento agent.copilot.action_approved no outbox
# 4. Recarrega aba → histórico de conversa persiste
# 5. docker ps mostra Tempo Up por 5+ minutos sem Restarting
```

Commit: `fix(sprint-9): fechar 4 dividas residuais (proposals, messages, eventos copilot, tempo) MX19`

---

### MX20 — Seed data realista

**Objetivo:** banco populado e útil para teste.

**Tarefas:**

1. Criar `tooling/seed/` (novo package interno):
   ```
   tooling/seed/
   ├── package.json
   ├── tsconfig.json
   ├── src/
   │   ├── index.ts             # entry point
   │   ├── companies.ts         # 3 companies com nomes, slugs, cores
   │   ├── users.ts             # 8-10 users distribuídos com roles variados
   │   ├── people.ts            # ~20 pessoas por company
   │   ├── files.ts             # ~10 arquivos por company com nomes realistas
   │   ├── chat.ts              # 3 canais por company com 5-10 mensagens passadas
   │   ├── proposals.ts         # 3-5 propostas Copilot (status variados)
   │   └── reset.ts             # apaga tudo (cuidadoso, só dev DB)
   ```
2. Pessoas com nomes brasileiros realistas (não "John Doe"). Departamentos: Engenharia, Vendas, RH, Financeiro, Marketing.
3. Arquivos com nomes variados (.md, .txt, .pdf simulado, .json) e tamanhos diferentes.
4. Mensagens de chat variadas — algumas curtas, outras longas, em datas variadas.
5. Scripts no root `package.json`:
   ```json
   "seed:dev": "pnpm --filter=@aethereos/seed start",
   "seed:reset": "pnpm --filter=@aethereos/seed start -- --reset"
   ```
6. Seed usa `SupabaseDatabaseDriver` (server-side, com service_role local) — NÃO usa browser driver.
7. **Idempotente:** rodar 2 vezes não duplica.
8. **Seguro:** se detectar produção (NEXT_PUBLIC_SUPABASE_URL contendo "supabase.co" e não localhost), recusa rodar.

**Critério de aceite:**

```bash
pnpm dev:db
pnpm seed:dev          # popula
# Verificar:
psql "$(supabase status -o json | jq -r .DB_URL)" -c "SELECT COUNT(*) FROM kernel.companies"  # 3
psql ... -c "SELECT COUNT(*) FROM kernel.people"  # ~60
pnpm seed:dev          # rodar de novo, não duplica
pnpm seed:reset        # apaga
psql ... -c "SELECT COUNT(*) FROM kernel.companies"  # 0
```

Commit: `feat(seed): seed data realista para testes manuais MX20`

---

### MX21 — Smoke test manual scriptado

**Objetivo:** documento que tester segue passo a passo.

**Tarefas:**

1. Criar `docs/testing/MANUAL_SMOKE_TEST.md`:
   - Pré-requisitos (subir stack, rodar seed)
   - 30-50 passos numerados cobrindo:
     - Login com user pré-seeded
     - Verificar Dashboard mostra company correta
     - Drive: criar pasta, upload, navegar, deletar
     - Pessoas: lista, detalhe, criar nova, editar, deactivate
     - Chat: trocar de canal, enviar mensagem, ver Realtime
     - Configurações: mudar tema, mudar nome empresa (se owner)
     - Copilot: abrir, mandar mensagem, ver resposta degradada esperada
     - Auditoria: ver eventos recentes, filtrar por tipo
     - Governança: ver agentes, ver invariantes
     - **RLS:** logout, login com user de outra company, NÃO deve ver dados da primeira
   - Cada passo: "Faça X" + "Esperado: Y" + caixa para "Observado:"
2. Criar `docs/testing/QUICK_START.md`:
   - Comandos para subir tudo do zero em <5 minutos
3. Tempo estimado de execução do smoke test: 30-45 minutos.

**Critério de aceite:**

```bash
ls docs/testing/MANUAL_SMOKE_TEST.md docs/testing/QUICK_START.md
wc -l docs/testing/MANUAL_SMOKE_TEST.md  # >= 200 linhas
```

Commit: `docs(testing): smoke test manual + quick start guide MX21`

---

### MX22 — Tunneling via ngrok para testers externos

**Objetivo:** mostrar para 2-3 amigos sem deploy.

**Tarefas:**

1. Documentar setup ngrok em `docs/runbooks/share-with-tester.md`:
   - Como instalar ngrok
   - Configurar token (free tier suficiente)
   - Comando para tunelizar shell-commercial em :5173
   - Configurar Supabase local para aceitar requisições do túnel (CORS, redirect URLs)
2. Script `pnpm share:dev` no root:
   - Sobe `pnpm dev:db && pnpm dev:infra && pnpm --filter=...dev` em background
   - Roda ngrok
   - Imprime URL pública pra compartilhar
3. **CSP/CORS:**
   - `apps/shell-commercial/vite.config.ts` aceita origin do ngrok via env `VITE_ALLOWED_ORIGINS`
   - Supabase config local permite redirect URL do túnel
4. **Limitação documentada:** túnel ngrok cai quando você fecha terminal. Não use para teste contínuo. Apenas sessões.

**Critério de aceite:**

```bash
pnpm share:dev
# Output: "Compartilhe esta URL: https://abc123.ngrok.app"
# Acessar URL em outro browser → app carrega, signup funciona
```

Commit: `feat(tooling): pnpm share:dev para tunelizar via ngrok MX22`

---

### MX23 — Dashboard "Usage During Testing" no Grafana

**Objetivo:** ver atividade dos testers em tempo real.

**Tarefas:**

1. Criar dashboard JSON em `infra/otel/grafana/dashboards/usage-testing.json`:
   - **Painel 1:** Signups por hora (últimas 6h)
   - **Painel 2:** Companies criadas
   - **Painel 3:** Eventos SCP por tipo (counts)
   - **Painel 4:** Arquivos uploaded
   - **Painel 5:** Mensagens de chat enviadas
   - **Painel 6:** Latência p95 de operações principais
   - **Painel 7:** Erros 5xx (counts)
   - Filtros: time range, company_id (opcional)
2. Provisionar dashboard no Grafana via volume mount.
3. Documentar acesso em `docs/runbooks/share-with-tester.md` — você (admin) acessa http://localhost:3002 enquanto testers usam.
4. **Sem PII:** dashboard mostra só counts, nunca nomes/emails.

**Critério de aceite:**

```bash
docker compose -f infra/local/docker-compose.dev.yml restart grafana
# Browser http://localhost:3002 → admin/admin
# Dashboard "Usage During Testing" aparece na lista
# Métricas zeradas se sem uso, populam se houver
```

Commit: `feat(observability): dashboard usage during testing MX23`

---

### MX24 — Documento de limitações conhecidas

**Objetivo:** honestidade radical com testers.

**Tarefas:**

1. Criar `docs/testing/KNOWN_LIMITATIONS.md`:
   - **Copilot:** modo degradado (sem chave LLM real). Esperar respostas canned. Pipeline de proposta funciona, retrieval funciona se houver embeddings (mas embedder está em degradado também).
   - **Stripe:** test mode apenas. Cartão 4242... funciona, dinheiro real não.
   - **Painel Staff:** requer claim manual `is_staff:true` no JWT. Ver `docs/runbooks/staff-claims.md`.
   - **Embeddings/RAG:** embedder não roda sem chave LLM. Arquivos uploaded ficam sem vetores.
   - **Notificações por email:** ainda não enviam — só persistem em DB e mostram via Realtime no UI.
   - **Compliance frameworks:** UI placeholder.
   - **Plano de cobrança:** UI placeholder.
   - **Modo offline:** Camada 1 não tem (Camada 0 tem). Se rede cair, app fica em loading state.
   - Adicionar conforme novas limitações forem descobertas.
2. Linkar de `MANUAL_SMOKE_TEST.md` (mencionar antes de cada teste afetado).

**Critério de aceite:**

```bash
ls docs/testing/KNOWN_LIMITATIONS.md
wc -l docs/testing/KNOWN_LIMITATIONS.md  # >= 50 linhas
```

Commit: `docs(testing): limitacoes conhecidas para testers MX24`

---

### MX25 — ADR-0021 + encerramento Sprint 9

**Objetivo:** consolidar e fechar.

**Tarefas:**

1. Criar `docs/adr/0021-criterios-prontidao-camada-1-testes.md`:
   - Status: Aceito
   - Subordinado a: ADR-0001
   - Contexto: Camada 1 funcionalmente entregue mas testabilidade exigia trabalho próprio
   - Decisão: critérios de "pronto para testes manuais" (lista dos 7 itens da apresentação)
   - Decisão: explícito que **NÃO inclui** deploy real (vai pra Sprint 10)
   - Consequências: capacidade de validar com 2-3 testers reais sem custo
2. Atualizar `CLAUDE.md`:
   - Seção 4: marcar Camada 1 como "pronta para testes manuais"
3. Atualizar `SPRINT_LOG.md` com encerramento Sprint 9.
4. Criar `docs/SPRINT_9_REPORT_2026-04-29.md` (ou data atual):
   - O que foi entregue
   - 4 dívidas residuais que estavam abertas → status final
   - Testes feitos pelo agente vs testes pendentes para humano
   - Próximos passos sugeridos: convidar 2-3 testers, coletar feedback, decidir Sprint 10
5. **CI completo:** `pnpm ci:full` EXIT 0 obrigatório.

**Critério de aceite:**

```bash
pnpm ci:full > /tmp/sprint9_final.log 2>&1; echo "EXIT: $?"
# DEVE ser 0.
```

Commit final: `chore: encerramento sprint 9 — camada 1 pronta para testes manuais`

Mensagem no chat: "SPRINT 9 ENCERRADO. EXIT 0 confirmado. Camada 1 pronta para testes manuais. Aguardando revisão humana."

---

## TÉRMINO DO SPRINT

Não inicie Sprint 10 sozinho. Pare aqui.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint 9 (Camada 1 testável) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (seção "Sprint 9")
3. Rode: git log --oneline -15 && git status && docker ps --format "table {{.Names}}\t{{.Status}}"
4. Identifique a próxima milestone MX19-MX25 não concluída
5. Continue a partir dela

Lembrar: este sprint não inclui deploy real. Apenas testabilidade local + tunneling.

Se SPRINT_LOG.md indicar "Sprint 9 encerrado", aguarde humano. Não inicie Sprint 10.

Roadmap em SPRINT_9_PROMPT.md na raiz.
```

Salve este arquivo como `SPRINT_9_PROMPT.md` na raiz do projeto antes de começar.
