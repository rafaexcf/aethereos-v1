# ADR-0021 — Critérios de Prontidão da Camada 1 para Testes Manuais

**Data:** 2026-04-29  
**Status:** Aceito  
**Autores:** rafaexcf (humano) + Claude Sonnet 4.6 (agente assistente)  
**Escopo:** Sprint 9 — Camada 1 testável por humanos externos  
**Rigidez:** `[DEC]` — decisão tomada. Revisão exige novo ADR.

---

## Contexto

Após 8 sprints de construção (Camada 0 → Camada 1 → Copilot → RAG → Driver Model), a Camada 1 (`apps/shell-commercial/`) atingiu um estado de feature completeness suficiente para validação manual por testers externos.

O objetivo do Sprint 9 era definir e atingir os critérios de "pronta para testes", documentá-los, e criar a infraestrutura de suporte para sessões de validação — sem deploy em produção, sem custo cloud, sem novas features.

---

## Decisão

### Critérios de Prontidão (gates obrigatórios)

Uma versão da Camada 1 é considerada **pronta para testes manuais** quando:

#### 1. Infraestrutura de seed funcional

- `pnpm seed:dev` popula dados sem erros: companies, usuários auth, memberships, people, files, channels, messages, proposals.
- `pnpm seed:reset` limpa dados seed de forma idempotente.
- Seed é idempotente: re-executar não duplica dados nem gera erros fatais.

#### 2. Stack sobe em <5 minutos

- `pnpm dev:db && pnpm seed:dev && pnpm --filter @aethereos/shell-commercial dev` completa sem intervenção manual.
- Documentado em `docs/testing/QUICK_START.md`.

#### 3. Smoke test executável

- `docs/testing/MANUAL_SMOKE_TEST.md` cobre seções A-K (41 passos).
- Seções críticas: Login/Company, Drive, Pessoas, Chat, RLS Cross-Tenant, Copilot Shadow Mode.
- Tester externo consegue executar sem conhecimento do codebase.

#### 4. Limitações documentadas

- `docs/testing/KNOWN_LIMITATIONS.md` documenta o que NÃO funciona e por quê.
- Testers não devem reportar limitações conhecidas como bugs.

#### 5. Compartilhamento sem deploy

- `pnpm share:dev` (ou `scripts/share-dev.sh`) sobe stack + túnel ngrok.
- URL pública impressa no terminal para envio a testers.
- Documentado em `docs/runbooks/share-with-tester.md`.

#### 6. Observabilidade de sessão

- Dashboard Grafana "Usage During Testing" disponível em `http://localhost:3002`.
- Monitora: logins, companies ativas, SCP events, arquivos, chat messages, latência, erros.

#### 7. CI verde

- `pnpm ci:full` (typecheck + lint + deps:check + test + test:isolation + build) passa com exit 0.
- Nenhum `any` explícito novo em código de produção.
- Nenhuma violação de dependency-cruiser (cross-layer imports).

#### 8. Dívidas críticas quitadas

- MX19: Copilot persiste histórico no banco (não localStorage) — `kernel.copilot_conversations`, `kernel.copilot_messages`.
- MX19: Copilot emite SCP events — `agent.copilot.message_sent`, `agent.copilot.action_proposed`, `agent.copilot.action_approved`.
- MX19: INSERT policy em `kernel.agent_proposals` (migration adicionada).
- Modo Degenerado ativo e visível quando LiteLLM não configurado.

---

### O que NÃO é critério de prontidão para testes manuais

- Deploy em produção (Vercel, Supabase cloud, domínio registrado).
- Performance sob carga (não é objetivo de testes manuais).
- Features completas de Billing, Compliance UI, ou Auditoria avançada.
- Modo offline/PWA funcional em dev mode.
- LLM real configurado (Modo Degenerado é suficiente para validar Shadow Mode).

---

## Consequências

### Positivas

- Critérios claros permitem afirmar objetivamente quando a Camada 1 está "testável".
- Testers externos têm documentação suficiente para auto-servir.
- Sessões de validação são monitoráveis via Grafana sem acesso ao banco.
- Limitações conhecidas reduzem ruído de bugs inválidos.

### Riscos e mitigações

- **Risco:** Tester reporta limitação L1-L10 como bug → **Mitigação:** KNOWN_LIMITATIONS.md distribuído antes da sessão.
- **Risco:** URL ngrok muda entre sessões → **Mitigação:** `pnpm share:dev` imprime nova URL; Supabase Studio precisa ser atualizado manualmente (documentado).
- **Risco:** Seed falha em ambiente sem Docker → **Mitigação:** QUICK_START.md lista Docker como pré-requisito explícito.

---

## Alternativas consideradas

### A: Deploy em staging (Vercel + Supabase cloud)

**Rejeitada.** Custo cloud imediato, dependência de configuração de domínio e DNS, risco de dados de teste em ambiente compartilhado. Sprint 9 é explicitamente "sem deploy em cloud".

### B: Critérios subjetivos ("quando parecer pronto")

**Rejeitada.** Sem critérios objetivos, cada sprint repetiria a discussão. ADR fixa o contrato.

### C: Aguardar features completas de Billing/Compliance

**Rejeitada.** Essas features são Camada 2+. Camada 1 (OS shell + Copilot + Drive + Pessoas + Chat) é o escopo correto para validação de Sprint 9.

---

## Referências

- `docs/testing/QUICK_START.md` — setup em <5 min
- `docs/testing/MANUAL_SMOKE_TEST.md` — 41 passos de smoke test
- `docs/testing/KNOWN_LIMITATIONS.md` — 10 limitações documentadas
- `docs/runbooks/share-with-tester.md` — sessão ngrok
- `infra/otel/grafana/dashboards/usage-testing.json` — dashboard de monitoramento
- Fundamentação v4.3 §P8 — "IA não acelera validação com clientes reais"
- Fundamentação v4.3 §P14 — "Modo Degenerado obrigatório para todo componente sofisticado"
