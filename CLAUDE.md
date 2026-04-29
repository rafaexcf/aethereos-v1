# CLAUDE.md — Aethereos Monorepo (raiz)

> Âncora operacional para todo trabalho assistido por IA neste repositório. Lido automaticamente por agentes (Claude Code, Cursor, etc.) ao iniciarem trabalho. **Mudanças aqui exigem ADR.**

---

## 1. Identidade do projeto

Aethereos é OS B2B no navegador organizado em três camadas:

- **Camada 0** (`apps/shell-base/`) — base aberta sob **BUSL v1.1** (Change Date 4 anos para Apache 2.0), local-first puro (OPFS + IndexedDB + PWA), **sem backend obrigatório**. Domínio: `aethereos.org`.
- **Camada 1** (`apps/shell-commercial/`) — proprietária, multi-tenant, SCP, AI Copilot. Domínio: `aethereos.io`.
- **Camada 2** — distribuições verticais que bundlam Camada 1 + SaaS pré-instalados. Primeira: B2B AI OS Brazil em `b2baios.com.br`.

SaaS standalone da família: `apps/comercio-digital/`, `apps/logitix/`, `apps/kwix/`, `apps/autergon/` — cada um Next.js 15 App Router independente com `/(public)` SEO + `/app` autenticado + `/embed` iframe.

Sites institucionais: `apps/sites/aethereos-org/`, `apps/sites/aethereos-io/`, `apps/sites/b2baios-com-br/` — cada um Astro.

**Ordem de construção cravada:** Camada 0 → Camada 1 → comercio.digital → logitix → kwix → autergon. Não inverter sem ADR.

---

## 2. Autoridade documental (em caso de conflito)

1. `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` — Constituição. Máxima autoridade.
2. Documentos operacionais companheiros (`docs/SECURITY_GUIDELINES.md`, `docs/DATA_LIFECYCLE.md`, `docs/LLM_OPEX_GUIDELINES.md`, `docs/VERSIONING_CONTRACT.md`, `docs/SLO_TARGETS.md`, etc.) — subordinados à Fundamentação.
3. ADRs em `docs/adr/*.md` — decisões em contexto. Subordinadas à Fundamentação, podem refinar companheiros.
4. Este CLAUDE.md e CLAUDE.md hierárquicos por subdiretório — operacional.
5. Runbooks locais em `docs/runbooks/` — específicos.

Quando dois documentos discordam, ganha o de maior autoridade. **Nunca** invente "ambos estão certos" para evitar conflito; escalonar para humano se persistente.

---

## 3. Tricotomia de rigidez

- **`[INV]`** — invariante. Mudança exige revisão constitucional. Nunca altere sem ADR explícito aprovado por humano.
- **`[DEC]`** — decisão tomada. Mudança exige ADR de revisão.
- **`[HIP]`** — hipótese ativa. Pode mudar conforme evidência operacional.

Em dúvida, prefira preservar o que tem maior peso de rigidez.

---

## 4. Stack cravada (resumo executável)

Detalhe completo em `docs/adr/0014-resolucao-stack-vs-analise-externa.md`.

| Camada | Tecnologia | Tipo |
|---|---|---|
| Frontend shell OS (Camadas 0 e 1) | Vite 8+ / React 19 / TanStack Router / Zustand / Tailwind v4 / shadcn/ui | [INV] |
| Frontend SaaS standalone | Next.js 15 App Router (cada SaaS é projeto independente) | [DEC] |
| Frontend sites institucionais | Astro | [DEC] |
| Linguagem | TypeScript strict | [INV] |
| Runtime backend | Node.js 20.19+/22.12+ | [DEC] |
| ORM | Drizzle | [INV] |
| Banco | Supabase Postgres 16 + RLS por `company_id` | [INV] |
| Auth/IdP | Supabase Auth como IdP central (OAuth 2.1 + OIDC + PKCE) em `idp.aethereos.com` | [INV] |
| Auth federada (F3+ se SAML) | Zitadel / Keycloak | [HIP] |
| Validação | Zod em toda borda | [INV] |
| Event bus | NATS JetStream + Outbox PostgreSQL desde dia 1 | [DEC] |
| Workflow engine | Temporal (a partir da Fase 2) | [DEC] |
| LLM gateway | LiteLLM | [DEC] |
| LLM observability | Langfuse self-hosted | [DEC] |
| Vector | pgvector F1-2 atrás de VectorDriver; Qdrant F3 | [DEC] |
| Feature flags | Unleash | [DEC] |
| Billing | Lago (F2) + Stripe como gateway de pagamento | [DEC] |
| Observabilidade | OpenTelemetry + Grafana stack (Tempo, Loki, Prometheus) | [DEC] |
| IaC | Pulumi TypeScript | [DEC] |
| CI | GitHub Actions | [DEC] |
| Driver Model | Toda dependência externa via interface | [INV] |

---

## 5. Bloqueios em PR (verificáveis em CI)

Quando agente detectar uso de tecnologia bloqueada, **não merge**. Lista canônica em `docs/adr/0014-...md` Anexo A. Resumo:

- `import` de `next` em `apps/shell-base/` ou `apps/shell-commercial/` → bloquear (shell é Vite)
- `import` de `inngest` em qualquer lugar → bloquear (event bus é NATS JetStream + Outbox)
- `import` de `@clerk/...` → bloquear (auth é Supabase Auth como IdP central)
- `import { PrismaClient }` → bloquear (ORM é Drizzle)
- Chamada direta a `openai`/`anthropic` SDK sem passar por LiteLLM gateway → bloquear
- Cliente Supabase importado em código de domínio fora de `packages/drivers/` → bloquear
- Feature flag em tabela ad-hoc no banco → bloquear (usar Unleash)
- Cobrança usage-based escrita à mão sobre Stripe → bloquear (usar Lago)
- `console.log` em código de produção → bloquear (logs estruturados via OTel/pino)
- `terraform` ou `aws-cdk` em `infra/` → bloquear (IaC é Pulumi TS)

---

## 6. Princípios fundadores resumidos

- **P1** — Kernel é invariante. Mudança apenas se útil para ≥2 verticais.
- **P2** — Verticais são isoladas. Sem código compartilhado entre verticais.
- **P3** — Configuração supera código customizado.
- **P4** — Multi-tenant por empresa via RLS, não por vertical.
- **P5** — SCP é barramento universal obrigatório. Apps não se comunicam diretamente.
- **P6** — Core protege-se de si mesmo. Guardrails mecânicos, não documentais.
- **P7** — Desenvolvimento é assistido por IA, arquitetura é humana. ADRs são humanos.
- **P8** — Honestidade de cronograma. IA não acelera validação com clientes reais.
- **P9** — AI-native é estrutural. `actor_type` distingue humano de agente em todo evento.
- **P11** — Eventos são auto-certificáveis (Ed25519 + hash chain opcional).
- **P14** — Modo Degenerado obrigatório para todo componente sofisticado.
- **P15** — Orçamento LLM declarado antes do merge: custo, latência, fallback, kill switch, quota, métricas.

---

## 7. Operações que agentes NUNCA executam autonomamente

Detalhe em Fundamentação 12.4. Lista invariante:

1. Demissão de colaborador
2. Alteração estrutural de cadastro de fornecedores/clientes (bloqueio, remoção)
3. Alteração de plano de contas
4. Transferência financeira acima de limite configurado
5. Alteração de políticas de governança
6. Concessão ou revogação de acesso privilegiado
7. Exclusão de dados
8. Alteração de informações fiscais (regime tributário, cadastros SEFAZ)

**Freio agêntico no primeiro ano comercial:** autonomia 0-1 apenas (sugerir, humano executa). Ações irreversíveis sempre exigem aprovação humana explícita.

---

## 8. Modelo de agentes (Interpretação A+)

- Agente tem identidade própria: `agent_id`, tabela `kernel.agents`, JWT interno TTL 15min, `actor.type=agent` em todo evento SCP emitido.
- Agente sempre tem **`supervising_user_id` obrigatório** — nenhum agente roda sem humano supervisor nominado.
- Capability tokens do agente são **sempre subconjunto** das do humano supervisor.
- Responsabilidade legal e billing recaem em humano + organização.
- Ano 1: autonomia 0-1 apenas. Ações irreversíveis exigem aprovação humana explícita.

---

## 9. Convenções de nome de evento SCP

Formato: `<domain>.<entity>.<action>` (3 níveis mínimos, 4 permitido).
Action no particípio passado. Lowercase. Pontos como separador.

Domínios reservados pelo kernel (apps comuns NÃO podem emitir):

- `platform.*`
- `agent.*`
- `context.*`
- `integration.*`
- `financial.*` (consumido pelo framework financeiro pluggable)
- `fiscal.*` (consumido pelo framework fiscal pluggable)

Todo `event_type` tem schema Zod registrado em `packages/scp-registry/`. CI bloqueia emissão sem schema registrado.

---

## 10. Comandos do dia a dia

```bash
pnpm install            # instalar dependências
pnpm dev                # rodar todos apps em dev mode
pnpm build              # build incremental via Turbo
pnpm lint               # ESLint em todos os pacotes
pnpm typecheck          # tsc --noEmit em todos os pacotes
pnpm test               # testes unitários
pnpm test:isolation     # testes de RLS cross-tenant (obrigatório em PR que toca dados)
pnpm test:e2e           # Playwright E2E
pnpm deps:check         # dependency-cruiser (bloqueia imports cross-camada)
pnpm format             # prettier
pnpm ci:full            # roda tudo na ordem do pipeline de CI
```

Gates antes de abrir PR: `pnpm ci:full` deve passar local.

---

## 11. Fluxo de PR

1. Agente cria branch `feat/<scope>-<short-desc>` ou `fix/...` ou `chore/...` ou `docs/...`
2. Implementa mudança
3. Roda local: `pnpm ci:full`
4. Abre PR descrevendo: o que muda, por que, qual `[INV]/[DEC]/[HIP]` afeta
5. CI roda: typecheck, lint, deps:check, audit (high+critical bloqueia), test, test:isolation, build
6. **Revisão humana obrigatória** mesmo se squad agêntico aprovou
7. Merge somente com green CI + 1+ approval humano
8. **ADR emitido ANTES do PR** se mudança for arquitetural (toca [INV] ou [DEC] crítica)

---

## 12. Quando parar e perguntar

Agente deve **parar e perguntar ao humano** antes de:

- Adicionar nova dependência (justifica em PR)
- Tocar em arquivo `[INV]` (interfaces de Driver Model, RLS policies, schemas SCP do kernel, manifesto de vertical)
- Mudar contrato de evento publicado em produção (versão major exige migração de consumidores)
- Criar nova categoria de ADR (ex: ADR-XXXX-driver-novo)
- Importar entre camadas que `dependency-cruiser` bloqueia
- Bypass de teste de isolação cross-tenant

---

## 13. CLAUDE.md hierárquicos

Subdiretórios podem ter `CLAUDE.md` próprio com regras complementares. Hierarquia de leitura (do mais específico para o mais geral):

1. `apps/<app>/CLAUDE.md` — quando trabalhando em app específico
2. `packages/<pkg>/CLAUDE.md` — quando trabalhando em pacote específico
3. Este `CLAUDE.md` na raiz

Filhos refinam pais; **nunca** contradizem invariantes da raiz.

---

## 14. Guardrails que cobrem este arquivo

Este `CLAUDE.md` é lido em CI por job de validação. Mudanças que removem invariantes ou bloqueios listados aqui exigem ADR. Não basta editar o arquivo — sem ADR de fundamento, o CI rejeita o PR.

Versão: 1.0.0
Última revisão: ver git log
