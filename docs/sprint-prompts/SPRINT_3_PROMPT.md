# SPRINT LONGO AUTÔNOMO — Aethereos Bootstrap Fase 3

> Continuação de Sprint 2 (Camada 0 entregue, fix de project references aplicado em 53da006).
> Foco desta fase: **Camada 1 — shell-commercial multi-tenant cloud-first**.
> Esta camada **prova empiricamente que o Driver Model é real** — mesmo kernel, drivers diferentes.

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code retomando trabalho. Sprint 1 e Sprint 2 concluídos com sucesso. Antes de qualquer ação:

1. **Leia integralmente:**
   - `CLAUDE.md` da raiz
   - `SPRINT_LOG.md` (estado atual)
   - `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` Partes II, III (Camada 1), IV.7 (Driver Model), VII (Apps), X (Multi-tenancy), XI (AI-native)
   - `docs/SECURITY_GUIDELINES.md` (auth, JIT access, break-glass)
   - `docs/adr/0001-fundacao.md`
   - `docs/adr/0014-resolucao-stack-vs-analise-externa.md`
   - `docs/adr/0015-camada-0-arquitetura-local-first.md`
   - `apps/shell-base/README.md` (referência de como Camada 0 estruturou as coisas — Camada 1 deve ter simetria onde fizer sentido)

2. **Confirme em voz alta** (escreva no chat antes de qualquer ação) seis pontos:
   - Qual o domínio canônico da Camada 1
   - Como Camada 1 estende Camada 0 sem reimplementar (lista de packages reusados vs novos)
   - Onde fica a diferença entre auth Camada 0 (passphrase local) e auth Camada 1 (IdP central com OAuth 2.1 + PKCE)
   - O que é o Outbox pattern e por que é obrigatório no Camada 1 (já existe em scp-worker)
   - Por que `company_id` precede tudo no schema multi-tenant (RLS fail-closed)
   - O que distingue um agente (`actor.type=agent`) de um humano no SCP — Interpretação A+

3. **Verifique estado:**

```bash
git log --oneline -10
git status
pnpm ci:full > /tmp/precheck.log 2>&1; echo "EXIT: $?"
```

Se EXIT != 0, **pare** e descreva. Não inicie sprint sobre base quebrada.

---

## REGRAS INVIOLÁVEIS

(Iguais Sprints 1-2)

**R1.** Commit obrigatório após cada milestone com mensagem estruturada.

**R2.** Nenhuma milestone começa sem critério de aceite verificado e commit feito.

**R3.** Após 3 tentativas, marcar BLOQUEADA, registrar, pular. Sem loops.

**R4.** Toda nova dep exige justificativa no commit body. Para Camada 1, verifique stack cravada em ADR-0014.

**R5.** Bloqueios continuam: sem `next` em shell-commercial (shell é Vite), sem `inngest`, sem `@clerk/*`, sem `prisma`, sem `framer-motion`, sem `aws-cdk`/`terraform`.

**R6.** **Específico Camada 1:** auth via Supabase Auth como IdP central operando OAuth 2.1 + OIDC + PKCE em domínio próprio. **Não use Supabase client direto em código de domínio** — sempre via `SupabaseAuthDriver`/`SupabaseDatabaseDriver` que já existem.

**R7.** **Específico Camada 1:** todo SQL novo respeita RLS por `company_id`. Toda tabela multi-tenant tem `company_id NOT NULL` + policy. Sem exceções.

**R8.** **NUNCA** rode `pnpm ci:full` apenas no fim. Antes de cada commit de milestone, rode `pnpm typecheck && pnpm lint`. No último commit do sprint, rode `pnpm ci:full` completo e VERIFIQUE EXIT 0 antes de commitar mensagem de encerramento.

**R9.** Atualize `SPRINT_LOG.md` ao fim de cada milestone.

**R10.** Não execute fora de `~/Projetos/aethereos`.

**R11.** Ao perceber contexto cheio: pare, escreva pickup point, use prompt de retomada.

**R12.** **Específico Camada 1:** evite reimplementar o que Camada 0 já tem. Se ui-shell já exporta `<WindowManager>`, importe. Se kernel já tem `KernelPublisher`, use. Se Sprint 2 introduziu padrão (ex: boot sequence), copie/adapte. **Simetria entre camadas é objetivo.**

---

## ARQUIVO DE LOG

Adicione nova seção ao `SPRINT_LOG.md`:

```markdown
---

# Sprint 3 — Camada 1 (shell-commercial)

Início: <timestamp ISO>
Modelo: Claude Code (Sprint 3 N=1)

## Calibração inicial

[6 pontos respondidos]

## Histórico de milestones (Sprint 3)

[preenchido conforme avança]
```

Commit antes de prosseguir.

---

## ROADMAP DE MILESTONES

### M19 — Supabase local subido + schema multi-tenant aplicado

**Objetivo:** banco rodando, migrations Sprint 1 (M7) aplicadas e validadas via testes de RLS reais. Cobre item que Sprint 1 declarou pronto mas pode não ter sido testado em corrida limpa.

**Tarefas:**

1. Verificar/criar `supabase/config.toml` apropriado.
2. Garantir que `pnpm dlx supabase start` sobe Postgres local com schemas aplicados.
3. Criar testes de isolação cross-tenant em `apps/scp-worker/__tests__/rls.test.ts`:
   - Criar 2 companies via SQL direto
   - Sem contexto de tenant, query retorna 0 rows
   - Com contexto de company A, query vê só dados de A
   - Com contexto de company B, query vê só dados de B
   - Mudar contexto na mesma sessão muda visibilidade
4. Adicionar script `pnpm dev:db` no root package.json: `supabase start && supabase db reset`
5. Adicionar script `pnpm test:isolation` rodando os testes de RLS contra DB local.
6. Atualizar `docs/runbooks/local-dev-shell-commercial.md` (criar) com instruções de subir DB.

**Critério de aceite:**

```bash
pnpm dev:db                                         # sobe sem erro
pnpm test:isolation                                 # passa
psql "$(supabase status -o json | jq -r .DB_URL)" -c "SET ROLE authenticated; SELECT * FROM kernel.companies"
# Resultado: 0 rows (RLS fail-closed funcionando)
```

Commit: `feat(infra): supabase local + testes de isolação RLS validados`

---

### M20 — Auth: Supabase Auth como IdP central (PKCE)

**Objetivo:** primeiro fluxo de login real. Operando como IdP em domínio simulado.

**Tarefas:**

1. Configurar Supabase Auth para PKCE flow:
   - Provider email/password como base
   - Magic link como secundário (já vem nativo)
   - Tokens com TTL curto (15min access, 24h refresh) conforme SECURITY_GUIDELINES
2. Verificar `SupabaseAuthDriver` existente — completar se faltar:
   - `signIn(email, password)`
   - `signInWithMagicLink(email)`
   - `signUp(email, password)`
   - `signOut()`
   - `getSession()` retorna sessão válida com claims
   - `refreshSession()`
   - `withCompanyContext(companyId)` — define claim ativo da company
3. Tabela `kernel.tenant_memberships` (verificar se já existe; criar migration se não):
   - `user_id UUID NOT NULL`
   - `company_id UUID NOT NULL REFERENCES kernel.companies(id)`
   - `role TEXT NOT NULL CHECK (role IN ('owner','admin','member','agent_supervisor'))`
   - `created_at TIMESTAMPTZ DEFAULT NOW()`
   - PRIMARY KEY (user_id, company_id)
   - RLS: user vê apenas suas próprias memberships
4. Custom JWT claims via Supabase function: incluir `companies` (lista) e `active_company_id` no token.
5. Helper `kernel.set_tenant_context(company_id, user_id)` deve aceitar JWT claims (já existe, validar).

**Critério de aceite:**

```bash
pnpm test --filter=@aethereos/drivers-supabase
# Cobertura mínima: signIn, getSession, withCompanyContext, RLS via membership
```

Commit: `feat(auth): supabase auth como IdP central com PKCE + memberships multi-company`

---

### M21 — App `shell-commercial`: scaffold Vite + auth flow

**Objetivo:** shell da Camada 1 nascendo. Mesmo Vite + React 19 + TanStack Router + Zustand + ui-shell que Camada 0, mas com auth real.

**Tarefas:**

1. Criar `apps/shell-commercial/` com estrutura espelhando `apps/shell-base/`:
   ```
   apps/shell-commercial/
   ├── package.json
   ├── tsconfig.json + tsconfig.build.json (com project references)
   ├── vite.config.ts
   ├── index.html
   ├── public/
   │   └── manifest.webmanifest          # PWA (mas com auth gate)
   ├── src/
   │   ├── main.tsx
   │   ├── app.tsx
   │   ├── routes/
   │   │   ├── __root.tsx
   │   │   ├── index.tsx                 # desktop (autenticado)
   │   │   ├── login.tsx
   │   │   ├── signup.tsx
   │   │   ├── select-company.tsx        # se usuário tem múltiplas
   │   │   └── settings/
   │   │       └── about.tsx
   │   ├── stores/
   │   │   └── session.ts                # Zustand: sessão, company ativa, drivers
   │   ├── lib/
   │   │   ├── drivers.ts                # composição CloudDrivers (Supabase, NATS)
   │   │   └── boot.ts                   # boot sequence cloud-first
   │   ├── components/
   │   │   ├── auth-gate.tsx
   │   │   └── company-switcher.tsx
   │   └── styles/
   │       └── globals.css
   ```
2. Reuso obrigatório:
   - `@aethereos/ui-shell` para Window Manager, Dock, Mesa, Tabs
   - `@aethereos/kernel` para SCP, audit, permissions
   - `@aethereos/drivers-supabase` para Cloud drivers
   - `@aethereos/scp-registry` para schemas
3. Auth gate em `routes/__root.tsx`:
   - Sem sessão → redirect `/login`
   - Sessão sem company ativa → `/select-company`
   - Sessão completa → desktop
4. Boot sequence (`lib/boot.ts`):
   - Tenta refresh de token
   - Se válido, instancia drivers cloud com `companyId` do JWT
   - Hidrata Zustand
   - Renderiza desktop

**Critério de aceite:**

```bash
pnpm --filter=@aethereos/shell-commercial typecheck
pnpm --filter=@aethereos/shell-commercial lint
pnpm --filter=@aethereos/shell-commercial build
# Bundle inicial gzip <500KB (verificar dist/assets/*.js)
```

Commit: `feat(shell-commercial): scaffold com auth gate + cloud boot sequence`

---

### M22 — Onboarding: criação de company + primeira membership

**Objetivo:** primeiro fluxo de negócio cloud. Cria empresa, vira owner, vê desktop.

**Tarefas:**

1. Server-side function (Edge Function ou rota Vite SSR — escolher uma e justificar): `create_company(name, slug)`:
   - Cria registro em `kernel.companies`
   - Cria membership `role=owner` para o usuário autenticado
   - Emite evento `platform.company.created` via Outbox (usar KernelPublisher já existente)
2. UI em `routes/select-company.tsx`:
   - Lista companies do usuário (de memberships)
   - Botão "Criar nova empresa"
   - Form: nome, slug
   - Submit chama function, espera evento, redireciona para desktop
3. Desktop em `routes/index.tsx`:
   - Mostra nome da company ativa
   - Mostra contador de eventos da company (query em `kernel.scp_outbox` filtrado por `company_id`)
   - Company switcher no header (se usuário tem >1)
   - Logout

**Critério de aceite:**

```bash
pnpm dev:infra      # supabase + nats up
pnpm --filter=@aethereos/shell-commercial dev &
pnpm --filter=@aethereos/scp-worker dev &
# Browser: signup, criar company "Empresa Teste", ver desktop
# Verificar no DB: kernel.companies tem registro
# Verificar no DB: kernel.scp_outbox tem evento platform.company.created
# Verificar no log do worker: evento publicado em NATS
```

Commit: `feat(shell-commercial): onboarding de company + primeiro evento SCP cloud`

---

### M23 — Modo Embed: shell-commercial dentro de SaaS standalone (preview)

**Objetivo:** validar arquitetura de embed antes de implementar SaaS standalone. Sprint 4+ vai precisar disso.

**Tarefas:**

1. Adicionar query param `?embed=true` em `routes/__root.tsx`:
   - Esconde Dock e header
   - Renderiza só área de conteúdo
   - Comunicação com host via `postMessage` (placeholder com 1 evento: `embed.ready`)
2. Criar página de teste em `apps/shell-commercial/public/embed-test.html`:
   - HTML estático com `<iframe src="/?embed=true">`
   - Listener de postMessage que loga eventos
3. Documentar protocolo embed em `docs/architecture/EMBED_PROTOCOL.md`:
   - Eventos canônicos: `embed.ready`, `embed.navigate`, `embed.token.refresh`
   - Origem permitida configurável
   - Anti-clickjacking (CSP frame-ancestors)

**Critério de aceite:**

```bash
pnpm --filter=@aethereos/shell-commercial build
pnpm --filter=@aethereos/shell-commercial preview &
# Browser: http://localhost:4173/embed-test.html
# Vê iframe carregando shell sem dock
# DevTools console mostra evento embed.ready recebido
```

Commit: `feat(shell-commercial): modo embed + protocolo postMessage documentado`

---

### M24 — Validação final do Driver Model: kernel agnóstico

**Objetivo:** prova empírica que mesmo kernel roda em ambas camadas.

**Tarefas:**

1. Criar `packages/kernel/__tests__/driver-agnostic.test.ts`:
   - Test 1: instancia `KernelPublisher` com `LocalDatabaseDriver` + `BroadcastChannelEventBus` → publica evento → verifica em SQLite local
   - Test 2: instancia `KernelPublisher` com mocks de `SupabaseDatabaseDriver` + `NatsEventBusDriver` → publica evento → verifica chamadas
   - Test 3: mesmo `auditLog()` com ambas implementações
2. Documentar resultado em `docs/architecture/DRIVER_MODEL_VALIDATION.md`:
   - Tabela: feature × LocalDriver × CloudDriver × kernel touch points
   - Mostrar que kernel não tem `if (camada === 'cloud')` em nenhum lugar
3. Atualizar ADR-0015 com link para esta validação.

**Critério de aceite:**

```bash
pnpm test --filter=@aethereos/kernel
# Todos os testes passam
# Cobertura kernel >= 75%
```

Commit: `test(kernel): driver model agnostico validado contra Local + Cloud`

---

### M25 — ADR-0016 + encerramento Sprint 3

**Objetivo:** registrar decisões e fechar.

**Tarefas:**

1. Criar `docs/adr/0016-camada-1-arquitetura-cloud-first.md`:
   - Status: Aceito
   - Subordinado a: ADR-0001, ADR-0014, ADR-0015
   - Contexto: Camada 1 nasce reusando Camada 0
   - Decisão: Vite simétrico + Supabase Auth IdP + RLS multi-tenant + Outbox + NATS já cravado
   - Consequências
   - Alternativas rejeitadas (Next.js para shell, multiple instances per tenant, etc.)
   - Mapeamento simétrico Camada 0 ↔ Camada 1
2. Atualizar `CLAUDE.md` com referência ao ADR-0016
3. Atualizar `SPRINT_LOG.md` com encerramento
4. Criar `docs/SPRINT_3_REPORT_2026-04-29.md` com métricas:
   - Bundle size shell-commercial
   - Cobertura testes
   - Commits do sprint
   - Pendências para humano

**Critério de aceite:**

```bash
pnpm ci:full > /tmp/sprint3_final.log 2>&1; echo "EXIT: $?"
# DEVE ser 0. Sem exceções. Se != 0, conserte antes de commitar encerramento.
```

Commit final: `chore: encerramento sprint 3 — camada 1 entregue`

Mensagem no chat: "SPRINT 3 ENCERRADO. EXIT 0 confirmado. Aguardando revisão humana."

---

## TÉRMINO DO SPRINT

Não inicie Sprint 4 sozinho. Pare aqui.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint 3 (Camada 1) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (seção "Sprint 3")
3. Rode: git log --oneline -15 && git status
4. Identifique a próxima milestone M19-M25 não concluída
5. Continue a partir dela

Se SPRINT_LOG.md indicar "Sprint 3 encerrado", aguarde humano. Não inicie Sprint 4.

Roadmap completo em SPRINT_3_PROMPT.md na raiz.
```

Salve este arquivo como `SPRINT_3_PROMPT.md` na raiz do projeto antes de começar.
