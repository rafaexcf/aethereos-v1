# ADR-NNNN — Resolução de Stack: Análise Externa vs Decisões Constitucionais

> **Renumere para o próximo ADR disponível na sequência do projeto** (ex: ADR-0014) antes de commitar em `docs/adr/`.

**Status:** Aceito
**Data:** 2026-04-27
**Autor:** Humano (com apoio de revisão crítica)
**Subordinado a:** AETHEREOS_FUNDAMENTACAO v4.3 (Partes II, IV.7, X, XIV) e AETHEREOS_STACK_VALIDATION
**Tipo:** Resolução de tensão analítica
**Substitui:** —
**Substituído por:** —

---

## 1. Contexto

Durante o processo de definição da arquitetura do Aethereos foi conduzida thread analítica com modelo de linguagem externo (Kimi) que produziu três documentos: (a) recomendação inicial de stack, (b) validação dessa stack contra cenários extraídos da Fundamentação, (c) revisão final da stack e plano de execução em 6 semanas.

A análise foi competente em diagnóstico mas precedeu várias decisões constitucionais que foram cravadas posteriormente na Fundamentação v4.3 e nos documentos companheiros. Sem registro auditável dessas divergências, há risco real de o squad de agentes (ou novos colaboradores humanos) recair em sugestões antigas que parecem razoáveis isoladamente mas conflitam com invariantes do projeto.

Este ADR encerra a thread analítica externa, registra **convergências** que valem manter como reforço, **divergências** que precisam ser explicitamente bloqueadas, e **fragmentos recuperáveis** que continuam úteis com adaptação.

---

## 2. Análise externa avaliada

A thread Kimi propôs, em sua versão final, a seguinte stack:

- **Frontend Shell:** Next.js 14 App Router
- **UI:** Tailwind + shadcn/ui + CSS transitions (Framer Motion descartado por bundle size)
- **Estado:** Zustand
- **Auth/IdP:** Clerk (Organizations + SSO cross-domain nativo)
- **Database:** Supabase PostgreSQL com RLS
- **Event Bus:** Inngest + Outbox PostgreSQL
- **Cache:** Upstash Redis (feature flags, tokens, cache semântico de IA)
- **AI:** Vercel AI SDK + OpenAI/Claude diretos
- **Vector:** pgvector com interface VectorDriver
- **Storage:** Supabase Storage com interface StorageDriver
- **Drivers:** Pacote `@aethereos/drivers` com interfaces tipadas
- **CI/Guardrails:** dependency-cruiser + ESLint customizado

Plano: 6 semanas, **Camada 0 explicitamente adiada para fase posterior** sob argumento de "cortar 40% da complexidade inicial".

---

## 3. Convergências (manter e reforçar)

Onde a análise externa coincide com decisões constitucionais já cravadas, ela serve de validação independente. Estes pontos não são objeto de debate:

| Item | Decisão convergente | Referência canônica |
|---|---|---|
| Monorepo | Turborepo + pnpm | Fundamentação 21.7 |
| Linguagem | TypeScript strict desde commit zero | Fundamentação 14.1 [INV] |
| UI primitives | Tailwind + shadcn/ui | Fundamentação 14.1 (Tailwind v4 cravado) |
| Estado de sessão | Zustand | Fundamentação 4.4 e 14.1 |
| Banco de dados | Supabase PostgreSQL com RLS | Fundamentação 10.1 [INV] |
| Vetorial inicial | pgvector | Fundamentação 14.2 |
| Storage | Supabase Storage para arquivos pequenos | Fundamentação 4.1 (Drive) |
| Driver Model como invariante | Toda dependência externa via interface | Fundamentação 4.7 [INV] |
| Outbox pattern para SCP | Atomicidade entre dado de domínio e publicação | Stack Validation 8.1 |
| Idempotência de eventos | UUID v7 + dedup por idempotency_key | Fundamentação 8.10.5 [INV] |
| Guardrails mecânicos | dependency-cruiser + ESLint customizado em CI | Fundamentação P6, 17.4 |
| Estratégia anti-fork de OS-no-navegador | Construir shell próprio em vez de forkar Puter/daedalOS | Decisão arquitetural confirmada |

Esses pontos têm validação externa independente além da decisão interna. Manter.

---

## 4. Divergências e resolução

A tabela abaixo é o coração deste ADR. Cada linha registra uma recomendação da análise externa, a decisão constitucional do Aethereos, e o rationale. Em todos os casos a **decisão Aethereos prevalece** — a análise externa está subordinada à Fundamentação, não o contrário.

| # | Área | Recomendação Kimi | Decisão Aethereos | Tipo | Rationale | Referência |
|---|---|---|---|---|---|---|
| 1 | Framework do shell OS | Next.js 14 App Router | **Vite 8+ com React 19, TanStack Router, Zustand** | [DEC] | SSR é desnecessário para app autenticado; custo adicional de roteamento Next não se justifica para shell-OS; Next está cravado apenas para SaaS standalone (comercio.digital, logitix, kwix, autergon) e sites institucionais Astro. Modelo híbrido URL+estado descrito em 4.4 exige roteador desacoplado de framework de SSR. | Fundamentação 14.1 (alternativas rejeitadas), 4.4 |
| 2 | Event Bus / Mensageria | Inngest managed serverless | **NATS JetStream + Outbox PostgreSQL desde dia 1** | [DEC] | Inngest é elegante para webhooks e cron mas tem (a) vendor lock-in significativo, (b) modelo de billing por step que escala mal para >100k eventos/dia/tenant, (c) ausência de particionamento por subject que o SCP Core Profile 8.10.4 exige (ordering por entidade/actor/tenant). NATS JetStream entrega particionamento, retenção configurável, replay nativo e self-host quando enterprise exigir. | Fundamentação 8.10, memória do projeto |
| 3 | Workflow engine para fluxos longos | Inngest functions + cron | **Temporal a partir da Fase 2** | [DEC] | Inngest cobre cron + retries simples. Não cobre orquestração stateful determinística necessária para: agente em modo sombra, break-glass procedure, reconciliações financeiras multi-step, onboarding com falhas parciais e retomada. Temporal é o padrão de mercado para isso e tem driver TS first-class. Fase 1 pode viver sem; Fase 2 não. | Memória do projeto, padrão SCP 8.10.5 (poison events) |
| 4 | Identity Provider | Clerk como auth principal | **Supabase Auth como IdP central operando OAuth 2.1 + OIDC + PKCE** em domínio `idp.aethereos.com`; Zitadel/Keycloak como federado opcional na Fase 3+ se SAML/SCIM exigido | [INV] | Argumento Kimi de "Supabase não faz SSO cross-domain" assume implementação ingênua via cookies. Topologia correta (descrita em 10.6) é IdP central com PKCE e Token Exchange RFC 8693, que Supabase Auth suporta nativamente. Trocar para Clerk introduce vendor proprietário com pricing por MAU que escala mal e perde a integração nativa com RLS por `auth.uid()`. Quando enterprise exigir SAML, vai para Zitadel/Keycloak (self-hostável, federável), não Clerk. | Fundamentação 10.6 [INV], correção v4.1 |
| 5 | ORM / Camada de dados | Supabase client direto + Server Actions | **Drizzle ORM** sobre Supabase Postgres | [DEC] | Supabase client encoraja queries inline e mistura concerns (auth + dados + storage). Drizzle dá schema em TS, queries tipadas, migrations versionadas, sem esconder SQL — alinhado com Driver Model porque é fácil trocar a connection string. Prisma foi rejeitado (mais pesado, esconde SQL). | Fundamentação 14.2, alternativas rejeitadas |
| 6 | LLM provider | OpenAI/Anthropic chamados direto via Vercel AI SDK | **LiteLLM gateway entre aplicação e providers** | [DEC] | Chamada direta prende ao provider e quebra P15 (Orçamento LLM exige fallback declarado). LiteLLM centraliza rate limiting, custo por tenant, fallback automático, roteamento adaptativo (Claude para tarefa A, GPT para B, modelo barato para C). Vercel AI SDK fica como cliente de UI streaming, não como gateway. | Fundamentação P15, LLM_OPEX_GUIDELINES |
| 7 | Observabilidade de IA | Ausente na proposta | **Langfuse self-hosted** para traces, custos por tenant, qualidade | [DEC] | P15 exige seis campos declarados antes do merge de feature LLM, incluindo métricas de qualidade com thresholds. Sem Langfuse (ou equivalente) não há como cumprir. Self-hosted porque dados de prompts e respostas têm sensibilidade alta. | Fundamentação P15, LLM_OPEX_GUIDELINES |
| 8 | Feature flags | Tabela `tenant_features` ad-hoc + Redis | **Unleash self-hosted** | [DEC] | Tabela ad-hoc funciona até precisar de gradual rollout, segmentação por tenant/plano/região, audit, kill switch acessível por SRE em pânico, UI de gestão. Construir tudo isso vira projeto-dentro-do-projeto. Unleash entrega pronto, é open source, self-hostável. | Memória do projeto, Stack Validation 2.1 |
| 9 | Billing | Stripe integration simples | **Lago para metered billing**, Stripe apenas como gateway de pagamento | [DEC] | Aethereos cobra por: usuários ativos, eventos SCP/mês, queries vetoriais, tokens LLM consumidos, storage, conectores premium. Isso é metered billing complexo. Stripe Subscriptions cobre fixed plans bem; metered+proration+revenue share para Magic Store, não. Lago é purpose-built. | Memória do projeto, Stack Validation 3.x |
| 10 | Observabilidade geral | Sentry + Logtail | **OpenTelemetry + Grafana stack** (Tempo, Loki, Prometheus); Sentry pode ficar como receiver de erros | [DEC] | Sentry+Logtail cobrem erros e logs. Não cobrem traces distribuídos. SCP exige tracing end-to-end de uma operação que cruza shell → outbox → JetStream → Context Engine → app consumidor → ação governada. Isso é OpenTelemetry com correlation_id propagado. Sem ele, debugar p95 violado em produção é adivinhação. | Fundamentação 5.1, SLO_TARGETS |
| 11 | Infraestrutura como código | Não abordado | **Pulumi TypeScript** | [DEC] | Mantém linguagem única (TS) no monorepo. Terraform HCL fragmenta. Cloud Development Kit é AWS-locked. Pulumi TS permite agentes lerem/modificarem infra com mesmas skills usadas no app. | Memória do projeto |
| 12 | CI/CD | Implícito (Vercel) | **GitHub Actions** com matriz por workspace Turbo | [DEC] | Vercel deploy é parte da stack, mas pipeline de CI (lint, type, test, dependency-cruiser, audit, SBOM) precisa estar fora do provedor de hosting. GitHub Actions já está implícito pela origem do código. | SECURITY_GUIDELINES seção 11 |
| 13 | Camada 0 (open source local-first) | **Adiar para fase posterior** | **Construir PRIMEIRO**, antes de Camada 1 | [INV] | Esta é a divergência mais séria. Ordem de construção atual: Camada 0 → Camada 1 → comercio.digital → logitix → kwix → autergon. Construir Camada 1 antes de Camada 0 produz Driver Model nunca testado contra dois backends reais (LocalDriver vs CloudDriver) — ele degenera em vazamento de implementação Supabase em todo lugar. Camada 0 sob BUSL v1.1 também é o moat estratégico (atrai devs, evita lock-in percebido); adiar é abrir mão da tese "Android para empresas". | User memories, estratégia de produto |
| 14 | Stack Camada 0 | (não abordado, foi adiado) | **Vite + React + OPFS + IndexedDB + SQLite WASM (sql.js ou absurd-sql) + PWA via Workbox** | [INV] | Stack diferente da Camada 1 — local-first puro, sem servidor obrigatório, instalável como PWA. Mesmo shell visual (package `ui-shell` compartilhado), drivers diferentes (`LocalDrivers` vs `CloudDrivers`). | User memories, Fundamentação 21.5 (revisada) |
| 15 | Frontend dos sites institucionais | Mesmo Next.js do shell | **Astro** para aethereos.org, aethereos.io, b2baios.com.br | [DEC] | Sites institucionais são content-heavy, SEO-first, JS mínimo. Astro entrega isso melhor que Next. Manter Next só onde realmente precisa de App Router (SaaS standalone). | User memories |
| 16 | Frontend de cada SaaS standalone | Mesmo monolito Next.js | **Cada SaaS é Next.js 15 App Router independente** com rotas /(public) SEO + /app autenticado standalone + /embed iframe; build shared via package `core` | [DEC] | Variante dupla de build descrita em 7.1. SaaS tem vida comercial própria em domínio próprio; precisa SEO em landing, dashboard autenticado, e modo embed dentro do shell Aethereos. Tudo no mesmo projeto Next quebra separação de concerns. | Fundamentação 7.1, user memories |
| 17 | Vetorial em fase enterprise | pgvector indefinidamente | **pgvector Fase 1-2 + Qdrant na Fase 3+** atrás de `VectorDriver` | [DEC] | pgvector aguenta até ~5-10M vetores por tenant. Acima disso, latência de query degrada e tenant enterprise exige índice dedicado. VectorDriver permite swap sem refactor de negócio. Decisão antecipada porque retrofit de abstração depois custa caro. | Stack Validation 4.3, user memories |
| 18 | Modelo de agentes | "Tabela `agents` com `supervisor_id` e tools permitidas" (Kimi) | **Interpretação A+: agente tem identidade própria (`agent_id`, JWT TTL 15min, `actor.type=agent` no SCP) MAS sempre com `supervising_user_id` obrigatório**; capability tokens do agente são sempre subconjunto das do humano supervisor; responsabilidade legal e billing = humano + organização; ano 1 = autonomia 0-1 apenas, ações irreversíveis exigem aprovação humana explícita | [INV] | Kimi descreveu superficial. A modelagem real exige distinção: agente é actor de primeira classe no SCP (rastreamento, audit dual, métricas) MAS responsabilização sempre cai em humano nominável. As 8 operações invariantes (12.4) nunca executam autonomamente, freio agêntico (P11) obrigatório no primeiro ano. | Fundamentação 12.4 [INV], P11, user memories |
| 19 | Auth multi-tenant | Clerk Organizations | **Tabela `tenant_memberships` + `auth.uid()` do Supabase Auth + RLS por `company_id`**; um `user_id` pode ter múltiplas memberships com role diferente em cada | [INV] | Compatível com IdP central de #4. RLS é fail-closed: query sem `current_company_id` retorna zero rows. Bug na aplicação não vaza. | Fundamentação 10.1, 10.2 |
| 20 | Persistência das distribuições | "Cada tenant em sua schema" (subentendido por Kimi) | **Uma instância Supabase por distribuição vertical**; todos os apps escrevem na mesma instância em **schemas Postgres separados** (`kernel`, `comercio_digital`, `logitix`, `kwix`, `autergon`) com RLS por `company_id`; cliente standalone vira tenant com `installed_apps` filtrado | [DEC] | Cliente que adota standalone e depois faz upgrade para bundle não migra dados — já está no mesmo banco; ativação é mudança em `installed_apps`. Schema separation operacionaliza P13 (soberania de domínio). | Fundamentação 10.5 [INV], user memories |

### Itens de stack revisada do Kimi sem conflito formal mas que precisam adequação

| Item | Status | Ajuste necessário |
|---|---|---|
| Upstash Redis para cache semântico de IA | Aceitável como substituto de "cache local" | OK como driver concreto da camada de cache; abstrair atrás de interface para permitir Redis self-hosted no enterprise |
| `@dnd-kit` para dock | Aceitável | Dependência discreta, sem implicação arquitetural |
| `react-rnd` para janelas redimensionáveis | Aceitável | Mesmo |
| `react-grid-layout` para Mesa | Aceitável | Mesmo |
| Code splitting agressivo via dynamic imports | Aceitável e necessário | Bundle inicial <500KB é SLO declarado; lazy loading de apps é invariante de 4.5 |
| Pre-commit hooks via Husky/lint-staged | Aceitável | Já implícito em P6 (guardrails mecânicos) |

---

## 5. Itens recuperáveis da análise

A análise externa contém um único fragmento de código que vale ser preservado e adaptado:

**Padrão Outbox + Server Action atômico para emissão de evento SCP**, descrito na seção "Protocolo de Contexto — Primeiro Server Action" da terceira mensagem Kimi. A lógica está correta:

1. Transação Postgres única que persiste dado de domínio + insert em tabela `outbox`
2. Worker separado lê outbox em ordem, publica no event bus, marca como processed
3. Idempotência via `correlation_id` + `idempotency_key`
4. Audit log gerado em sequência (pode ser na mesma transação ou logo após)

**Adaptação obrigatória:**
- Trocar `supabase.rpc(...)` por **Drizzle transactions** com schema tipado
- Trocar "Inngest job a cada 10s" por **consumer NATS JetStream durável** com `ack`/`nack` explícito e DLQ para poison events
- Trocar emissão `inngest.send(...)` por **publish em subject NATS particionado** por `scope_entity_id || actor_id || tenant_id` conforme declarado no Event Schema Registry
- Adicionar **assinatura Ed25519** no payload do evento conforme P11 (eventos auto-certificáveis)

Esse padrão adaptado vai para `packages/kernel/scp/` como helper canônico de emissão.

---

## 6. Princípios destilados (para o squad de agentes)

Para evitar que sugestões antigas reapareçam em PRs futuros, registramos os seguintes meta-princípios derivados desta análise:

**P-MA1. Análises externas anteriores à constituição não são autoridade.** Quando agente encontra recomendação em conversa antiga (Kimi, ChatGPT, Gemini, qualquer outro) que conflita com Fundamentação ou ADR posterior, a Fundamentação/ADR vence sem debate.

**P-MA2. Stack barata managed não é stack correta.** A tentação de "Vercel + Supabase + Inngest + Clerk" é real porque tudo é managed e barato no início. Mas barato no Mês 1 frequentemente é caro no Mês 18 (vendor lock-in, billing-by-everything, migração impossível). Decisões cravadas (NATS, Temporal, LiteLLM, Langfuse, Unleash, Lago, OTel, Pulumi) refletem essa lição.

**P-MA3. Driver Model não é dívida adiável.** Toda dependência externa via interface, desde commit zero. Sem isso, todo "vamos abstrair depois" vira vazamento de implementação.

**P-MA4. Camada 0 antes de Camada 1.** A ordem é Camada 0 → Camada 1 → SaaS verticais. Construir Camada 1 antes de Camada 0 produz Driver Model nunca testado e perde o moat estratégico do open source.

**P-MA5. P15 (Orçamento LLM) é obrigatório.** Toda feature com LLM declara seis campos antes do merge: custo, latência, fallback, kill switch, quota, métricas de qualidade. Sem LiteLLM e Langfuse, esses campos não são monitoráveis — então eles fazem parte da stack, não são extras.

---

## 7. Consequências

### Positivas

- Squad de agentes tem registro auditável do porquê de cada decisão de stack
- Sugestões antigas que reapareçam em PRs podem ser refutadas por referência a este ADR
- Nova pessoa entrando no projeto entende em uma leitura por que Next.js não é shell, por que Inngest não é event bus, por que Clerk não é IdP
- A tabela serve de checklist quando outro modelo de IA for consultado — perguntar "como isso se compara à decisão atual?" antes de implementar

### Negativas

- Stack atual tem curva de aprendizado mais alta que stack-Vercel-managed
- Custo operacional inicial é maior em algumas dimensões (NATS self-hosted vs Inngest free tier; OTel stack vs Sentry simples)
- Velocidade nas primeiras 4 semanas é menor que se fosse stack managed
- Mas: investimento dos 14 dias de bootstrap (Fundamentação 22.x) economiza 4-6 meses de retrabalho posterior

### Mitigações

- Documentar runbooks para componentes self-hosted (NATS, Langfuse, Unleash, Grafana stack)
- Manter providers managed como fallback durante validação inicial onde possível (ex: Supabase managed na Fase 1-2, self-host só se enterprise exigir)
- Templates de código para padrões repetitivos (emissão SCP via Outbox, auth flow OAuth 2.1 + PKCE, RLS policy boilerplate)

---

## 8. Critérios de revisão deste ADR

Este ADR pode ser revisitado se:

- Aparecer evidência operacional concreta de que algum componente cravado tem sinal de stress descrito no documento Stack Validation
- Surgir tecnologia nova que torne uma das decisões obsoleta (raro em horizonte de 12 meses)
- Cliente enterprise exigir requisito não suportado pela stack atual (ex: SAML obrigatório → Zitadel é ativado, conforme já previsto)

Revisão **não acontece** porque:
- Outro modelo de IA fez análise mais simples
- Componente managed equivalente ficou mais barato
- Pressão de cronograma sugere "atalho temporário"

---

## 9. Referências

- AETHEREOS_FUNDAMENTACAO v4.3 — Partes II (princípios), IV.7 (Driver Model), VII.1 (apps first-party), VIII (SCP), X (multi-tenancy), XI (AI-native), XIV (Stack Cravado)
- AETHEREOS_STACK_VALIDATION — todos os 22 grupos de cenários
- LLM_OPEX_GUIDELINES — operacionalização de P15
- SECURITY_GUIDELINES — JIT access, break-glass, service-role scoping
- VERSIONING_CONTRACT — compatibilidade entre versões
- Memórias do projeto sobre stack consensos, modelo de agentes (Interpretação A+), ordem de construção das camadas
- Thread analítica externa Kimi (preservada como artefato histórico)

---

## Anexo A — Mapeamento rápido para PR review

Quando revisor (humano ou agente) encontrar PR usando tecnologia abaixo, deve aplicar a regra correspondente:

| Detectado no PR | Regra |
|---|---|
| `import { ... } from 'next'` em `apps/shell/*` | **Bloquear**. Shell é Vite. Next só em `apps/comercio-digital/`, `apps/logitix/`, `apps/kwix/`, `apps/autergon/`, sites institucionais Astro. |
| `from 'inngest'` ou `import inngest` | **Bloquear**. Event bus é NATS JetStream + Outbox. |
| `from '@clerk/...'` | **Bloquear**. Auth é Supabase Auth como IdP central. |
| `import { PrismaClient }` | **Bloquear**. ORM é Drizzle. |
| `openai.chat.completions.create` direto sem passar por gateway | **Bloquear**. LLM via LiteLLM gateway com Langfuse instrumentation. |
| Feature flag em tabela ad-hoc no banco | **Bloquear**. Feature flags via Unleash. |
| Cobrança usage-based escrita à mão sobre Stripe | **Bloquear**. Metered billing via Lago. |
| `localStorage` para feature flag em tenant | **Bloquear**. Cache de validação via Redis driver. |
| `console.log` em código de produção | **Bloquear**. Logs estruturados via OTel/pino. |
| `terraform` ou `cdk` em `infra/` | **Bloquear**. IaC é Pulumi TS. |
| Direct Supabase client em código de domínio fora de `packages/drivers/` | **Bloquear**. Domínio chama interface Driver, não cliente concreto. |

Esta lista não é exaustiva. Quando dúvida, consultar tabela da seção 4 deste ADR.

---

**Fim do ADR.**
