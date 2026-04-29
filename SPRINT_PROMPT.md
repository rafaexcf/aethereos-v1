# SPRINT LONGO AUTÔNOMO — Aethereos Bootstrap Fase 1

> **Como usar este prompt:**
> 1. Abra Claude Code dentro de `~/projetos/aethereos` (já com bootstrap pack copiado, dependências instaladas, primeiro commit feito)
> 2. Cole este prompt inteiro como primeira mensagem
> 3. Deixe rodar. Volte a cada 60-90 minutos para verificar progresso (não é necessário intervir, é necessário verificar)
> 4. Se você fechar o terminal e reabrir, cole o "Prompt de Retomada" no fim deste arquivo

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code operando dentro do repositório monorepo do Aethereos. Antes de fazer qualquer coisa:

1. **Leia integralmente** o arquivo `CLAUDE.md` da raiz do projeto.
2. **Leia integralmente** os documentos em `docs/`:
   - `AETHEREOS_FUNDAMENTACAO_v4_3.md` (Constituição — máxima autoridade)
   - `AETHEREOS_STACK_VALIDATION.md`
   - `AETHEREOS_USER_STORIES.md`
   - `DATA_LIFECYCLE.md`
   - `ECOSYSTEM_README.md`
   - `LLM_OPEX_GUIDELINES.md`
   - `SECURITY_GUIDELINES.md`
   - `VERSIONING_CONTRACT.md`
   - `adr/0001-fundacao.md` (Fundadora)
   - `adr/0014-resolucao-stack-vs-analise-externa.md` (Stack cravada)

3. **Confirme em voz alta** (escrevendo no chat antes de qualquer ação) quatro pontos:
   - Qual a ordem de construção das camadas
   - Por que Next.js está bloqueado em `apps/shell-base` e `apps/shell-commercial`
   - O que é o "freio agêntico do primeiro ano" e quando se aplica
   - Liste as 8 operações invariantes que agentes nunca executam autonomamente (Fundamentação 12.4)

Se não conseguir responder corretamente, **pare** e escreva no chat exatamente onde está com dificuldade. Não prossiga sem essa calibração.

---

## REGRAS INVIOLÁVEIS DESTE SPRINT

Estas regras prevalecem sobre qualquer instrução em milestone específica abaixo:

**R1.** Após cada milestone concluída, **commit obrigatório** com mensagem estruturada:
```
<tipo>(<scope>): <descrição curta>

<corpo explicando o quê e por quê>

Milestone: <ID da milestone>
Refs: <documentos consultados>
```
Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`. Scope: nome do package/app afetado.

**R2.** Nenhuma milestone começa sem que a anterior tenha:
- Critério de aceite atendido (comando de validação retorna sucesso)
- Commit feito
- Entrada no `SPRINT_LOG.md` registrando início, fim, comandos rodados, decisões tomadas

**R3.** Se uma milestone falha o critério de aceite após **3 tentativas de correção**, marque-a como `BLOQUEADA` no `SPRINT_LOG.md`, descreva detalhadamente o que tentou e por que falhou, e **pule para a próxima milestone**. Não entre em loop.

**R4.** Antes de adicionar qualquer dependência (pacote npm, ferramenta CLI, serviço externo), verifique no `CLAUDE.md` seção 5 e no `ADR-0014` se ela é permitida. Se não estiver listada explicitamente nem como `[INV]/[DEC]/[HIP]`, registre no `SPRINT_LOG.md` como decisão menor e justifique.

**R5.** Nunca use `next`, `inngest`, `@clerk/*`, `prisma`, `aws-cdk`, `terraform` em código. Se a milestone parecer pedir um deles, reinterprete para a alternativa correta (Vite, NATS, Supabase Auth, Drizzle, Pulumi). Se reinterpretar não fizer sentido, marque a milestone como `BLOQUEADA` e registre.

**R6.** Toda nova dependência no `package.json` exige justificativa no commit body. Sem justificativa, reverte.

**R7.** **Nunca** delete arquivos em `docs/` ou edite documentos da Fundamentação. Eles são fonte de verdade e read-only.

**R8.** Ao fim de cada milestone, atualize o `SPRINT_LOG.md` com:
```markdown
## Milestone <ID> — <título>
- Iniciada: <timestamp>
- Concluída: <timestamp>
- Status: SUCCESS | BLOCKED | PARTIAL
- Comandos validadores: <lista>
- Resultado de cada comando: <ok | output do erro>
- Arquivos criados/modificados: <lista>
- Decisões tomadas: <lista>
- Próximas dependências desbloqueadas: <lista>
```

**R9.** Não execute nenhum comando que afete sistema fora do diretório do projeto. Não instale ferramentas globais sem perguntar. Não toque em arquivos fora de `~/projetos/aethereos`.

**R10.** Se contexto encher e você perceber que está esquecendo informação anterior, **pare** e escreva: "CONTEXTO PRÓXIMO DO LIMITE — pickup point: <descrição clara do estado atual>" no chat. Não tente improvisar.

---

## ARQUIVO DE LOG OBRIGATÓRIO

**Primeira ação concreta:** crie `SPRINT_LOG.md` na raiz com:

```markdown
# Sprint Log — Aethereos Bootstrap Fase 1

Início do sprint: <timestamp ISO>
Modelo: Claude Code (sessão N=1)

## Calibração inicial
[respostas dos 4 pontos da seção CONTEXTO INICIAL]

## Histórico de milestones
[preenchido conforme milestones forem completadas]

## Decisões menores tomadas durante o sprint
[justificativas que não viram ADR mas precisam ser rastreáveis]

## Bloqueios encontrados
[se houver]
```

Commitar este arquivo antes de prosseguir.

---

## ROADMAP DE MILESTONES (ordem obrigatória)

### M1 — Guardrails mecânicos

**Objetivo:** garantir que o CI já bloqueia violações de invariantes antes de qualquer linha de código de domínio existir.

**Tarefas:**
1. Criar `.dependency-cruiser.cjs` na raiz com regras:
   - `apps/shell-base/**` não pode importar de `next`, `@clerk/*`, `inngest`
   - `apps/shell-commercial/**` mesmas restrições
   - `packages/kernel/**` não pode importar de `apps/**`
   - `packages/drivers/**` não pode importar de `apps/**`
   - Código de domínio fora de `packages/drivers/**` não pode importar `@supabase/supabase-js` direto
   - Apps não podem importar entre si (apps são silos)
2. Criar `packages/config-eslint/` com configs compartilhados:
   - `base.js` (raiz comum)
   - `react.js` (estende base, adiciona regras React)
   - `node.js` (estende base, regras Node)
   - Regra customizada que bloqueia `console.log` em prod (warning em dev)
3. Configurar `husky` com pre-commit:
   - `lint-staged` rodando prettier
   - `pnpm typecheck` no diff afetado
4. Criar `.github/workflows/ci.yml`:
   - Jobs: typecheck, lint, deps:check, test, audit
   - Audit `pnpm audit --audit-level=high` deve falhar build
   - Cache de pnpm e Turbo
5. Adicionar `commitlint` com config conventional para validar mensagens

**Critério de aceite:**
```bash
pnpm install                         # sem erros
pnpm deps:check                      # passa (mesmo sem código ainda, valida config)
pnpm lint                            # passa
pnpm typecheck                       # passa
git commit -m "test bad message"     # deve FALHAR no commitlint
git commit -m "chore: test"          # deve passar
```

Após aceite, commit: `chore(tooling): guardrails mecanicos via dep-cruiser, eslint, husky, ci`

---

### M2 — Pacote de configuração TypeScript compartilhada

**Objetivo:** eliminar duplicação de tsconfig entre packages/apps.

**Tarefas:**
1. Criar `packages/config-ts/` com:
   - `base.json` (estende `tsconfig.base.json` da raiz, adiciona path mapping comum)
   - `library.json` (para packages — emit declarations, no JSX)
   - `react-library.json` (para packages com componentes React)
   - `vite-app.json` (para apps shell)
   - `next-app.json` (para apps SaaS standalone)
2. `package.json` do pacote com `exports` corretos
3. Cada futuro `tsconfig.json` de package/app importa de `@aethereos/config-ts/...`

**Critério de aceite:**
```bash
pnpm typecheck   # passa em workspace inteiro (vazio ainda, mas não erra config)
```

Commit: `feat(config-ts): tsconfigs compartilhados (base, library, react, vite, next)`

---

### M3 — Driver Model: interfaces

**Objetivo:** definir contratos de toda dependência externa antes de qualquer implementação. Invariante da Fundamentação 4.7.

**Tarefas:**
1. Criar `packages/drivers/` com estrutura:
   ```
   packages/drivers/
   ├── package.json
   ├── tsconfig.json
   ├── src/
   │   ├── index.ts
   │   ├── interfaces/
   │   │   ├── database.ts        # DatabaseDriver
   │   │   ├── event-bus.ts       # EventBusDriver
   │   │   ├── vector.ts          # VectorDriver
   │   │   ├── storage.ts         # StorageDriver
   │   │   ├── auth.ts            # AuthDriver (sessão, JWT, capabilities)
   │   │   ├── secrets.ts         # SecretsDriver
   │   │   ├── cache.ts           # CacheDriver
   │   │   ├── feature-flags.ts   # FeatureFlagDriver
   │   │   ├── llm.ts             # LLMDriver (atrás do LiteLLM)
   │   │   └── observability.ts   # ObservabilityDriver
   │   ├── types/
   │   │   ├── tenant-context.ts  # TenantContext, ActorContext
   │   │   ├── platform-event.ts  # PlatformEvent, EventEnvelope
   │   │   └── result.ts          # Result<T, E> tipo Either
   │   └── errors.ts              # DriverError hierarquia
   └── README.md
   ```
2. **Não implementar concretos ainda.** Apenas interfaces tipadas com Zod schemas onde aplicável.
3. Cada interface tem JSDoc explicando contrato, garantias, e referência ao documento canônico.
4. `errors.ts` define hierarquia: `DriverError → DatabaseError, NetworkError, AuthError, ValidationError, NotFoundError, ConflictError, RateLimitError`.

**Critério de aceite:**
```bash
pnpm typecheck     # passa
pnpm lint          # passa
pnpm deps:check    # passa
```

Verificar que toda interface tem:
- Parâmetros tipados (sem `any`)
- Retorno em `Promise<Result<T, DriverError>>`
- JSDoc com contrato e referência

Commit: `feat(drivers): interfaces canonicas do Driver Model (Fundamentacao 4.7)`

---

### M4 — Tipos canônicos do SCP

**Objetivo:** schemas Zod de eventos do kernel. Toda emissão futura referencia este registro.

**Tarefas:**
1. Criar `packages/scp-registry/` com:
   ```
   packages/scp-registry/
   ├── src/
   │   ├── index.ts
   │   ├── schemas/
   │   │   ├── envelope.ts        # EventEnvelope (assinatura, hash, metadata)
   │   │   ├── actor.ts           # Actor (human | agent | system)
   │   │   ├── platform.ts        # platform.* events
   │   │   ├── agent.ts           # agent.* events
   │   │   ├── context.ts         # context.* events
   │   │   └── integration.ts     # integration.* events
   │   ├── registry.ts            # registry runtime que valida eventType -> schema
   │   └── helpers.ts             # buildEnvelope, signEnvelope, verifyEnvelope
   ```
2. Schema `EventEnvelope` deve incluir: `id` (UUID v7), `type`, `version`, `tenant_id`, `actor`, `correlation_id`, `causation_id`, `payload`, `occurred_at`, `signature` (Ed25519), `hash_chain` (opcional na v1).
3. Schema `Actor` discrimina por `type`: `human` exige `user_id`; `agent` exige `agent_id` + `supervising_user_id` (Interpretação A+); `system` exige `service_name` + `version`.
4. Helpers usam `crypto` nativo do Node — não adicionar libs ainda.
5. Registry exporta função `register(eventType, schema)` e `validate(eventType, payload)`. CI futuro vai bloquear emissão sem registro.

**Critério de aceite:**
```bash
pnpm typecheck     # passa
pnpm lint          # passa
# Criar teste manual rodando registry.validate('platform.tenant.created', {...payload válido})
# Deve retornar success; payload inválido deve retornar erro estruturado
```

Commit: `feat(scp-registry): envelope, actor, schemas do kernel (Fundamentacao 8.10)`

---

### M5 — Pacote `kernel/` esqueleto

**Objetivo:** núcleo agnóstico de implementação. Tudo aqui usa Driver Model, nada de Supabase direto.

**Tarefas:**
1. Criar `packages/kernel/` com submódulos:
   ```
   packages/kernel/
   ├── src/
   │   ├── index.ts
   │   ├── tenant/
   │   │   ├── context.ts         # withTenantContext()
   │   │   └── membership.ts      # tipos de membership/role
   │   ├── scp/
   │   │   ├── publisher.ts       # publishEvent() canônico (usa Outbox + EventBusDriver)
   │   │   ├── outbox.ts          # interface de outbox (DatabaseDriver-based)
   │   │   └── consumer.ts        # base class para consumers
   │   ├── audit/
   │   │   └── logger.ts          # auditLog() canônico
   │   ├── permissions/
   │   │   ├── capability.ts      # tipos de capability tokens
   │   │   └── engine.ts          # permission engine (não autoriza ainda, define interface)
   │   └── invariants/
   │       └── operations.ts      # lista das 8 operações invariantes (Fundamentação 12.4)
   ```
2. `publishEvent()` recebe `EventEnvelope` parcial, valida via scp-registry, persiste via Outbox (transação com DatabaseDriver), retorna correlation_id.
3. `auditLog()` é fail-loud: erro em audit log NUNCA é silencioso, propaga para o caller.
4. `invariants/operations.ts` é constante exportada — array das 8 operações com metadata. Ainda não há motor que use, mas a fonte de verdade existe.

**Critério de aceite:**
```bash
pnpm typecheck     # passa
pnpm lint          # passa
pnpm deps:check    # passa, valida que kernel só importa drivers/scp-registry, não @supabase
```

Commit: `feat(kernel): esqueleto SCP, audit, permissions, invariants`

---

### M6 — Pacote `ui-shell/` esqueleto

**Objetivo:** componentes compartilhados entre Camada 0 e Camada 1.

**Tarefas:**
1. Criar `packages/ui-shell/` com:
   ```
   packages/ui-shell/
   ├── src/
   │   ├── index.ts
   │   ├── components/
   │   │   ├── window-manager/    # placeholder (api definida, render mínimo)
   │   │   ├── dock/              # placeholder
   │   │   ├── tabs/              # placeholder
   │   │   ├── desktop/           # placeholder
   │   │   └── mesa/              # placeholder de grid de widgets
   │   ├── primitives/            # botões, inputs base usando shadcn — adicionar shadcn aqui
   │   ├── theme/
   │   │   ├── tokens.ts          # design tokens canônicos
   │   │   └── theming.ts         # CSS variables runtime para distribuições
   │   └── hooks/
   ```
2. Adicionar Tailwind v4 + shadcn/ui (verificar versões cravadas no `CLAUDE.md`).
3. Componentes são placeholders — exportam React component com tipo correto e JSX mínimo. Implementação real vem em milestones futuras.
4. **NÃO USAR FRAMER MOTION.** Animações via CSS transitions apenas (ADR-0014 #5: bundle <500KB).

**Critério de aceite:**
```bash
pnpm typecheck     # passa
pnpm lint          # passa
pnpm build --filter=@aethereos/ui-shell   # build passa
```

Commit: `feat(ui-shell): esqueleto de componentes do shell (window manager, dock, tabs, mesa)`

---

### M7 — Setup Supabase local + schema base

**Objetivo:** banco rodando localmente, schemas multi-tenant cravados, RLS testável.

**Tarefas:**
1. `pnpm dlx supabase init` na raiz, configurar `supabase/config.toml`.
2. Criar migrations em `supabase/migrations/`:
   - `0001_init_kernel_schema.sql` — schema `kernel` com tabelas: `companies`, `users`, `memberships`, `roles`, `capabilities`, `agents`
   - `0002_outbox.sql` — tabela `kernel.outbox` para padrão Outbox
   - `0003_events.sql` — tabela `kernel.events` (Event Store, particionada por mês via pg_partman ou range manual)
   - `0004_audit_log.sql` — tabela `kernel.audit_log` append-only
   - `0005_rls_policies.sql` — políticas RLS por `company_id` em todas as tabelas relevantes
3. Função SQL `kernel.set_tenant_context(p_company_id uuid, p_user_id text)` que usa `set_config` para alimentar RLS.
4. `pnpm dlx supabase start` deve subir Postgres local com schemas aplicados.

**Critério de aceite:**
```bash
pnpm dlx supabase start            # sobe sem erro
pnpm dlx supabase db reset         # aplica todas migrations
psql ... -c "SELECT * FROM kernel.companies"   # tabela existe, vazia, RLS ativo
psql ... -c "SET ROLE authenticated; SELECT * FROM kernel.companies"  # zero rows sem contexto (RLS fail-closed funcionando)
```

Commit: `feat(infra): supabase local + schema kernel + RLS por company_id`

---

### M8 — Driver concreto: SupabaseDatabaseDriver

**Objetivo:** primeira implementação concreta do Driver Model. Outras virão depois.

**Tarefas:**
1. Criar `packages/drivers-supabase/` (separado de `packages/drivers/` para deixar interfaces puras):
   ```
   packages/drivers-supabase/
   ├── src/
   │   ├── index.ts
   │   ├── database.ts        # SupabaseDatabaseDriver implements DatabaseDriver
   │   ├── auth.ts            # SupabaseAuthDriver implements AuthDriver
   │   ├── storage.ts         # SupabaseStorageDriver implements StorageDriver
   │   └── vector.ts          # SupabasePgvectorDriver implements VectorDriver
   ```
2. Adicionar `drizzle-orm` como dependência aqui (não no `drivers/` puro). `SupabaseDatabaseDriver` usa Drizzle internamente.
3. Métodos `withTenant(companyId)` e `setContext(companyId, userId)` chamam função `kernel.set_tenant_context` no SQL.
4. Testes unitários básicos contra Supabase local levantado em M7.

**Critério de aceite:**
```bash
pnpm test --filter=@aethereos/drivers-supabase   # passa
# Teste de isolamento: criar 2 companies, dados em cada, query sem contexto retorna zero, com contexto retorna apenas da company correta
```

Commit: `feat(drivers-supabase): implementacao concreta dos drivers cloud sobre Supabase + Drizzle`

---

### M9 — NATS JetStream local + EventBusDriver

**Objetivo:** event bus rodando, primeiro publisher/consumer funcionando.

**Tarefas:**
1. Adicionar `docker-compose.dev.yml` na raiz com serviço NATS JetStream (versão recente, persistência habilitada).
2. Script `pnpm dev:infra` que sobe `supabase start` + `docker-compose up nats`.
3. Criar `packages/drivers-nats/` com `NatsEventBusDriver` implements `EventBusDriver`:
   - `publish(envelope)` usa subject particionado por `tenant_id || actor_id` conforme SCP
   - `subscribe(eventType, handler)` cria consumer durável
   - Ack/nack explícitos
   - DLQ para poison events
4. Worker simples em `apps/scp-worker/` que lê outbox do Postgres e publica no NATS.

**Critério de aceite:**
```bash
pnpm dev:infra                                          # sobe Supabase + NATS
pnpm test --filter=@aethereos/drivers-nats              # passa
# Teste end-to-end manual: publica evento via kernel.publishEvent, verifica que aparece em subject NATS correto
```

Commit: `feat(drivers-nats): NATS JetStream + outbox worker para SCP`

---

### M10 — Primeiro evento SCP end-to-end

**Objetivo:** validar que o pipeline completo (transação Postgres → Outbox → Worker → NATS → Consumer) funciona com um evento real.

**Tarefas:**
1. Implementar evento `platform.company.created`:
   - Schema Zod registrado em `scp-registry`
   - Server action / function que cria company + emite evento atomicamente via outbox
2. Consumer simples em `apps/scp-worker/` que loga eventos consumidos.
3. Teste E2E: chamada cria company, evento aparece no log do consumer dentro de 1-2 segundos, audit_log tem registro.

**Critério de aceite:**
```bash
# Em terminal 1: pnpm dev:infra && pnpm --filter @aethereos/scp-worker dev
# Em terminal 2: pnpm test:e2e:m10
# Resultado: company criada, evento publicado, consumido, audit log registrado, RLS isola corretamente
```

Commit: `feat(kernel): primeiro evento SCP end-to-end (platform.company.created)`

---

## TÉRMINO DO SPRINT

Quando todas as 10 milestones estiverem `SUCCESS` ou explicitamente `BLOCKED`/`PARTIAL` no log:

1. Atualize `SPRINT_LOG.md` com seção final:
   ```markdown
   ## Sprint encerrado
   - Término: <timestamp>
   - Milestones SUCCESS: <count>
   - Milestones BLOCKED: <count>
   - Milestones PARTIAL: <count>
   - Próximas ações sugeridas para humano: <lista>
   ```
2. Crie `docs/SPRINT_REPORT_2026-04-29.md` com resumo executivo legível em 5 minutos.
3. Faça commit final: `chore: encerramento do sprint bootstrap fase 1`
4. Escreva no chat: "SPRINT ENCERRADO. Aguardando revisão humana."

**Não inicie um novo sprint sozinho.** Pare aqui.

---

## PROMPT DE RETOMADA (caso a sessão termine no meio)

Se você precisar fechar e reabrir o Claude Code antes do sprint terminar, cole isto como primeira mensagem na nova sessão:

```
Estou retomando um sprint longo autônomo no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md para ver onde paramos
3. Leia o último commit (git log -1) para confirmar estado
4. Identifique a próxima milestone não-concluída no roadmap original
5. Continue a partir dela

Se o SPRINT_LOG.md indicar que o sprint encerrou, NÃO inicie novo. Aguarde instruções humanas.

Roadmap original em: SPRINT_PROMPT.md (raiz do projeto)
```

Salve este arquivo como `SPRINT_PROMPT.md` na raiz do projeto antes de começar, para que o prompt de retomada funcione.
