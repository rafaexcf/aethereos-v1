# SPRINT LONGO AUTÔNOMO — Aethereos Bootstrap Fase 4

> Continuação dos Sprints 1-3 (kernel + Camada 0 + Camada 1 entregues).
> Foco desta fase: **comercio.digital — primeiro SaaS standalone da família Aethereos**.
>
> **Decisão humana registrada:** validação será local-only. Supabase cloud, NATS produção, domínio aethereos.io e CSP de produção continuam pendentes para humano. Sprint 4 não tenta validar contra ambiente cloud real.

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code retomando trabalho. Sprints 1, 2 e 3 concluídos com sucesso (CI EXIT 0 em corrida fresca, working tree clean, push para origin/main feito).

1. **Leia integralmente:**
   - `CLAUDE.md` da raiz
   - `SPRINT_LOG.md` (estado deixado pelos 3 sprints anteriores)
   - `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` Partes VII (Apps), VII.1 (SaaS standalone — variante dupla de build), XII (Compliance/Fiscal)
   - `docs/AETHEREOS_USER_STORIES.md` (foque na seção comercio.digital se houver; senão, leia épicos relacionados a vendas/checkout)
   - `docs/SECURITY_GUIDELINES.md`
   - `docs/adr/0014-resolucao-stack-vs-analise-externa.md` (lembrar: Next.js 15 está liberado para SaaS standalone, mas Stripe é gateway, billing usage-based é Lago)
   - `docs/adr/0015-camada-0-arquitetura-local-first.md`
   - `docs/adr/0016-camada-1-arquitetura-cloud-first.md`
   - `apps/shell-commercial/README.md` (referência de simetria — comercio.digital deve poder ser embedado dentro)

2. **Confirme em voz alta** (escreva no chat antes de qualquer ação) sete pontos:
   - Por que comercio.digital usa Next.js 15 (e não Vite como os shells)
   - Quais são as 3 rotas-mãe obrigatórias da variante dupla de build descrita na Fundamentação 7.1
   - Como comercio.digital se integra ao shell-commercial via embed (referenciar EMBED_PROTOCOL.md)
   - Por que Stripe é gateway de pagamento mas NÃO motor de billing recorrente neste projeto
   - O que distingue uma sale event (transação consumada) de uma checkout event (pagamento iniciado) no SCP
   - Por que comercio.digital é Camada 2 (vertical) mas reusa kernel + ui-shell + drivers da Camada 1
   - Como o Next.js consome `@aethereos/drivers-supabase/browser` vs `@aethereos/drivers-supabase` (server)

3. **Verifique estado:**

```bash
git log --oneline -8
git status
pnpm ci:full > /tmp/precheck.log 2>&1; echo "EXIT: $?"
```

Se EXIT != 0, **pare** e descreva. Não inicie sprint sobre base quebrada.

---

## REGRAS INVIOLÁVEIS

(Iguais aos Sprints 1-3, mantidas para sessão limpa)

**R1.** Commit obrigatório após cada milestone com mensagem estruturada (`<tipo>(<scope>): <descrição>` + corpo + Milestone + Refs).

**R2.** Nenhuma milestone começa sem critério de aceite verificado e commit feito.

**R3.** Após 3 tentativas, marcar BLOQUEADA, registrar tentativas, pular. Sem loops.

**R4.** Nova dep exige justificativa no commit. Verifique stack cravada em ADR-0014 antes.

**R5.** Bloqueios: sem `inngest`, sem `@clerk/*`, sem `prisma`, sem `framer-motion`, sem `aws-cdk`/`terraform`. **Next.js 15 está LIBERADO neste app** (este é a exceção justificada).

**R6.** Stripe é cravado como gateway de pagamento (charge único, refund). Para billing recorrente/usage-based, **planejar mas não implementar Lago neste sprint** — fica para Sprint 5+.

**R7.** Toda emissão de evento via `@aethereos/kernel` `KernelPublisher`. Nunca emitir direto. Toda persistência via `SupabaseDatabaseDriver` (server-side em Next) ou via Edge Function. **Nunca chamar Supabase client direto em código de domínio.**

**R8.** Antes de cada commit de milestone: `pnpm typecheck && pnpm lint`. Antes do commit final do sprint: `pnpm ci:full` completo, EXIT 0 confirmado, antes de commitar mensagem de encerramento. Lição aprendida do Sprint 2.

**R9.** Atualize `SPRINT_LOG.md` ao fim de cada milestone.

**R10.** Não execute fora de `~/Projetos/aethereos`. Não instale globais.

**R11.** Ao perceber contexto cheio: pare, escreva pickup point, use prompt de retomada.

**R12.** Reuso obrigatório (lição Sprint 3): se shell-commercial ou ui-shell já tem componente, importe. Se kernel tem padrão, copie. Simetria entre apps é objetivo.

**R13.** **Específico SaaS standalone:** todo SaaS desta família tem 3 rotas-mãe canônicas:

- `/(public)` — SEO-first, sem auth, landing/marketing/preços
- `/app` — autenticada, dashboard standalone (login direto via IdP)
- `/embed` — modo iframe, recebe token via postMessage, sem chrome próprio

A separação não é decoração. É invariante arquitetural [INV] que permite o app rodar standalone (domínio próprio comercio.digital) e embedado dentro do shell Aethereos.

**R14.** **Validação local-only neste sprint:** não tente conectar a Supabase cloud nem Stripe live. Use Supabase local (já existe via M19) e Stripe test mode com chaves de teste declaradas em `.env.local.example`. Não comprometa nenhuma chave real.

**R15.** **Variante dupla de build (Fundamentação 7.1):** comercio.digital tem que conseguir ser servido em duas configurações:

- **Standalone:** `next start` em domínio próprio, fluxo completo de checkout
- **Embed:** dentro de iframe do shell-commercial, sem header/footer, com sessão herdada

A diferença é runtime via header/cookie ou query param, não build separado.

---

## ARQUIVO DE LOG

Adicione nova seção ao `SPRINT_LOG.md`:

```markdown
---

# Sprint 4 — comercio.digital (primeiro SaaS standalone)

Início: <timestamp ISO>
Modelo: Claude Code (Sprint 4 N=1)

## Decisão de escopo registrada

Validação local-only (sem Supabase cloud, sem Stripe live, sem domínio).
Cloud + produção ficam para humano após este sprint.

## Calibração inicial (Sprint 4)

[7 pontos respondidos]

## Histórico de milestones (Sprint 4)

[preenchido conforme avança]
```

Commit antes de prosseguir.

---

## ROADMAP DE MILESTONES

### M26 — Scaffold `apps/comercio-digital/` Next.js 15 + estrutura tripla

**Objetivo:** primeiro SaaS standalone nasce. Estrutura de rotas correta desde commit zero, sem refactor depois.

**Tarefas:**

1. Criar `apps/comercio-digital/` com Next.js 15 App Router + TypeScript + Tailwind v4:
   ```
   apps/comercio-digital/
   ├── package.json                     # nome: @aethereos/comercio-digital
   ├── tsconfig.json + tsconfig.build.json (com project references aos workspaces)
   ├── next.config.ts
   ├── tailwind.config.ts
   ├── postcss.config.js
   ├── app/
   │   ├── (public)/                    # rota mãe: SEO-first
   │   │   ├── layout.tsx               # com header/footer públicos
   │   │   ├── page.tsx                 # landing
   │   │   ├── precos/page.tsx
   │   │   └── sobre/page.tsx
   │   ├── app/                         # rota mãe: autenticada
   │   │   ├── layout.tsx               # auth gate + sidebar
   │   │   ├── page.tsx                 # dashboard
   │   │   ├── produtos/page.tsx
   │   │   ├── pedidos/page.tsx
   │   │   └── login/page.tsx
   │   ├── embed/                       # rota mãe: iframe sem chrome
   │   │   ├── layout.tsx               # minimal, recebe token via postMessage
   │   │   ├── page.tsx                 # dashboard embedado
   │   │   └── checkout/page.tsx        # checkout embedado
   │   ├── api/
   │   │   ├── checkout/route.ts        # POST cria checkout session
   │   │   ├── webhooks/stripe/route.ts # webhook handler
   │   │   └── healthz/route.ts
   │   ├── globals.css
   │   └── layout.tsx                   # root, detecta modo via header
   ├── components/
   │   ├── public/                      # marketing
   │   ├── app/                         # autenticado
   │   ├── embed/                       # embed-only
   │   └── shared/                      # comuns (importam de @aethereos/ui-shell)
   ├── lib/
   │   ├── drivers.ts                   # composição cloud drivers
   │   ├── auth.ts                      # session helpers (Supabase Auth)
   │   ├── stripe.ts                    # Stripe client wrapper
   │   └── runtime-mode.ts              # detecta standalone vs embed
   ├── public/
   ├── .env.local.example               # CHAVES DE TESTE com nomes claros
   └── README.md
   ```
2. **Reuso obrigatório:**
   - `@aethereos/ui-shell` para componentes (botões, dialogs, primitives)
   - `@aethereos/kernel` para SCP, audit
   - `@aethereos/drivers-supabase` para auth e DB (lado servidor)
   - `@aethereos/drivers-supabase/browser` para client-side
   - `@aethereos/scp-registry` para schemas de eventos
3. **Detecção de modo runtime** em `lib/runtime-mode.ts`:
   - Header `X-Aethereos-Embed: true` ou query `?embed=true` ou pathname iniciar com `/embed` → modo embed
   - Caso contrário → standalone
   - Helper `getRuntimeMode()` exportado para Server Components e Client Components
4. **Auth nas três rotas-mãe:**
   - `(public)/*` — sem auth check
   - `app/*` — middleware redireciona para `/app/login` se sem sessão
   - `embed/*` — espera token via postMessage no mount (Client Component)
5. **Layout root** (`app/layout.tsx`) detecta modo e ajusta:
   - Standalone: cabeçalho/rodapé padrão
   - Embed: minimal, sem chrome
6. **Tema** carregado de CSS variables, igual aos shells, para permitir embedagem com tema do host.

**Critério de aceite:**

```bash
pnpm --filter=@aethereos/comercio-digital typecheck
pnpm --filter=@aethereos/comercio-digital lint
pnpm --filter=@aethereos/comercio-digital build
# Build deve passar sem erros
# Bundle inicial app/* (gzip) <300KB esperado, <500KB obrigatório
```

Commit: `feat(comercio-digital): scaffold next.js 15 + estrutura (public)/app/embed (M26)`

---

### M27 — Catálogo de produtos: schema + CRUD básico

**Objetivo:** primeiro modelo de domínio do app. Fundação para checkout.

**Tarefas:**

1. Criar migration `supabase/migrations/0006_comercio_schema.sql`:
   - Schema separado: `comercio` (operacionaliza P13 — soberania de domínio)
   - Tabela `comercio.products`:
     - `id UUID PK DEFAULT gen_random_uuid()`
     - `company_id UUID NOT NULL REFERENCES kernel.companies(id)`
     - `name TEXT NOT NULL`
     - `slug TEXT NOT NULL`
     - `description TEXT`
     - `price_cents INTEGER NOT NULL CHECK (price_cents >= 0)`
     - `currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL','USD','EUR'))`
     - `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived'))`
     - `metadata JSONB DEFAULT '{}'::jsonb`
     - `created_at TIMESTAMPTZ DEFAULT NOW()`
     - `updated_at TIMESTAMPTZ DEFAULT NOW()`
     - UNIQUE(company_id, slug)
     - INDEX (company_id, status)
   - RLS: usuário vê apenas produtos de companies onde tem membership
   - Trigger `set_updated_at()` para `updated_at`
2. Schema Zod registrado em `packages/scp-registry/src/schemas/commerce.ts`:
   - `commerce.product.created`
   - `commerce.product.updated`
   - `commerce.product.archived`
3. Server Actions Next.js em `app/app/produtos/actions.ts`:
   - `createProduct(input)` — valida com Zod, insert via `SupabaseDatabaseDriver`, emit evento via Outbox
   - `updateProduct(id, patch)` — valida, update, evento
   - `archiveProduct(id)` — soft delete, evento
4. UI em `app/app/produtos/`:
   - `page.tsx` — lista produtos da company ativa (Server Component, busca via driver)
   - `nova/page.tsx` — form de criação (Client Component)
   - `[id]/editar/page.tsx` — edit
   - Botão "Arquivar" com dialog de confirmação
5. Testes em `apps/comercio-digital/__tests__/products.test.ts`:
   - Criar produto, listar, atualizar, arquivar
   - Verificar evento emitido em outbox
   - Verificar isolação cross-company (criar com user A, query com user B = 0 rows)

**Critério de aceite:**

```bash
pnpm dev:db                                         # supabase local up
pnpm --filter=@aethereos/comercio-digital test     # passa
pnpm --filter=@aethereos/comercio-digital build    # passa
```

Commit: `feat(comercio-digital): catalogo de produtos com SCP events (M27)`

---

### M28 — Checkout flow: Stripe test mode + criação de pedido

**Objetivo:** primeiro fluxo de pagamento end-to-end, rodando local com chaves de teste.

**Tarefas:**

1. Migration `supabase/migrations/0007_orders_schema.sql`:
   - `comercio.orders`:
     - `id UUID PK`
     - `company_id UUID NOT NULL`
     - `customer_email TEXT NOT NULL`
     - `customer_name TEXT`
     - `amount_cents INTEGER NOT NULL`
     - `currency TEXT NOT NULL`
     - `status TEXT NOT NULL CHECK (status IN ('pending','paid','failed','refunded','cancelled'))`
     - `stripe_session_id TEXT UNIQUE`
     - `stripe_payment_intent_id TEXT`
     - `metadata JSONB`
     - `created_at`, `updated_at`
   - `comercio.order_items` — itens do pedido (product_id, qty, price_cents_at_purchase)
   - RLS por company_id
2. Schemas SCP registrados:
   - `commerce.checkout.started`
   - `commerce.order.placed`
   - `commerce.order.paid`
   - `commerce.order.failed`
   - `commerce.order.refunded`
3. **Stripe integration:**
   - Adicionar dep `stripe` (server-side only)
   - `lib/stripe.ts`: client wrapper que aceita `STRIPE_SECRET_KEY` de env
   - `app/api/checkout/route.ts` (POST):
     - Recebe `{ productId, customerEmail }`
     - Cria `stripe.checkout.sessions.create()` em test mode
     - Insert em `comercio.orders` com `status='pending'`
     - Emit evento `commerce.checkout.started`
     - Retorna URL da Stripe Checkout
4. **Webhook handler** em `app/api/webhooks/stripe/route.ts`:
   - Valida assinatura Stripe (`stripe.webhooks.constructEvent`)
   - Eventos tratados: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Update order status atomicamente com emit de evento (Outbox pattern via DatabaseDriver.transaction)
   - **Idempotência via `stripe_session_id` UNIQUE constraint** — webhook duplicado não duplica evento
5. UI:
   - `app/app/produtos/[id]/page.tsx` — botão "Comprar" inicia checkout
   - `app/app/pedidos/page.tsx` — lista pedidos com status
6. **Documentar no `.env.local.example`:**
   ```
   # Stripe TEST MODE — chaves começam com sk_test_ e pk_test_
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
7. **Não comprometer nenhuma chave real no commit.** Verificar `.gitignore` cobre `.env.local`.

**Critério de aceite:**

```bash
# Subir tudo
pnpm dev:db
pnpm --filter=@aethereos/comercio-digital build

# Testes unitários do fluxo
pnpm --filter=@aethereos/comercio-digital test

# Stripe webhook local testável via stripe-cli
# (Não obrigatório rodar live, mas a rota deve responder a payload mock corretamente)
# Mock test:
curl -X POST http://localhost:3000/api/webhooks/stripe -d "@__tests__/fixtures/checkout.session.completed.json"
# Deve retornar 200, criar evento commerce.order.paid
```

Commit: `feat(comercio-digital): checkout flow stripe test + webhook + outbox idempotente (M28)`

---

### M29 — Modo embed funcional: comercio.digital dentro de shell-commercial

**Objetivo:** validar dual-mode na prática. Mesmo app, dois contextos.

**Tarefas:**

1. Implementar `app/embed/layout.tsx`:
   - Sem header, footer ou navegação própria
   - Listener `postMessage` no mount: espera `embed.token` do parent
   - Token recebido vira sessão Supabase via `auth.setSession()`
   - Emit `embed.ready` para parent quando autenticado
   - CSP `frame-ancestors` configurável via env (em dev: localhost; em prod: domínios autorizados)
2. Em `apps/shell-commercial/` adicionar:
   - Novo componente `<EmbeddedApp src="..." token="...">` que cria iframe e envia token via postMessage
   - App mock no Dock: "Comercio Digital" que abre janela com `<EmbeddedApp src="http://localhost:3000/embed" />`
3. Pages embed:
   - `app/embed/page.tsx` — versão minimal do dashboard
   - `app/embed/checkout/[productId]/page.tsx` — checkout embedável
4. Documentar em `apps/comercio-digital/docs/EMBED.md`:
   - Como configurar parent
   - Tokens, refresh, lifecycle
   - CSP, segurança
   - Limitações (cookies third-party, etc.)
5. **Importante:** mesmo build do Next, mesmo bundle. A diferença é só o layout escolhido em runtime.

**Critério de aceite:**

```bash
# Terminal 1: comercio-digital dev
pnpm --filter=@aethereos/comercio-digital dev    # roda em :3000

# Terminal 2: shell-commercial dev
pnpm --filter=@aethereos/shell-commercial dev    # roda em :5173

# Browser http://localhost:5173
# Login no shell-commercial, abre app "Comercio Digital" no dock
# Janela abre com iframe
# Dashboard embedado renderiza com sessão herdada
# Vê produtos da company ativa
```

Commit: `feat(comercio-digital): modo embed dentro de shell-commercial (M29)`

---

### M30 — Landing pública SEO-first

**Objetivo:** entregar a primeira rota-mãe de verdade. SEO, performance, sem JS pesado.

**Tarefas:**

1. `app/(public)/page.tsx` — landing com:
   - Hero com título, subtítulo, CTA "Começar grátis"
   - Seção "Funcionalidades" (3-4 cards)
   - Seção "Como funciona" (3 passos)
   - Footer com links (Sobre, Preços, Contato)
2. `app/(public)/precos/page.tsx` — tabela de planos:
   - Free, Starter, Pro (preços placeholder)
   - CTA "Assinar" → `/app/login` (signup desligado neste sprint)
3. `app/(public)/sobre/page.tsx` — texto institucional (placeholder honesto)
4. **SEO:**
   - `app/layout.tsx` ou `(public)/layout.tsx` define metadata canônica via Next 15 metadata API
   - `sitemap.ts` exporta sitemap.xml
   - `robots.ts` exporta robots.txt
   - Open Graph + Twitter cards
5. **Performance:**
   - Server Components onde possível
   - Imagens via `next/image` com placeholders (use `placeholder.co` ou SVGs simples)
   - Sem JS desnecessário no client
   - Lighthouse desktop SEO >= 95, Performance >= 90, Accessibility >= 90
6. **Acessibilidade:**
   - HTML semântico
   - alt em imagens
   - foco visível
   - navegação por teclado funcional

**Critério de aceite:**

```bash
pnpm --filter=@aethereos/comercio-digital build
pnpm --filter=@aethereos/comercio-digital start &
# Browser: http://localhost:3000
# Lighthouse audit em /
# SEO >= 95, Performance >= 90, Accessibility >= 90
# Bundle inicial das rotas (public) gzip <100KB
```

Commit: `feat(comercio-digital): landing publica SEO + precos + sobre (M30)`

---

### M31 — Refinamento + ADR-0017 + encerramento Sprint 4

**Objetivo:** consolidar, documentar, fechar.

**Tarefas:**

1. Criar `docs/adr/0017-comercio-digital-primeiro-saas-standalone.md`:
   - Status: Aceito
   - Subordinado a: ADR-0001, ADR-0014, ADR-0016
   - Contexto: por que comercio.digital é o primeiro SaaS standalone, papel de Camada 2
   - Decisão: Next.js 15 + estrutura tripla `(public)/app/embed`, Stripe como gateway, schema Postgres separado, eventos `commerce.*` reservados
   - Alternativas rejeitadas (single-route, separar em N apps, billing direto sem Lago, etc.)
   - Consequências
   - Mapeamento: variante dupla de build no Next.js
2. Atualizar `CLAUDE.md`:
   - Seção 9 (eventos SCP): adicionar domínio `commerce.*` como reservado para apps comércio
   - Seção 4: referência ao ADR-0017
3. Atualizar `SPRINT_LOG.md` com encerramento Sprint 4.
4. Criar `docs/SPRINT_4_REPORT_2026-04-29.md` com:
   - O que foi entregue
   - Pendências para humano (Stripe live keys, deploy, webhook real, custom domain)
   - Métricas: bundles, Lighthouse, testes
   - Decisões tomadas durante o sprint
   - Sugestão de Sprint 5 (logitix? consolidar comercio? produção?)
5. **Antes do commit final, rodar `pnpm ci:full`. Verificar EXIT 0.** Lição do Sprint 2.

**Critério de aceite:**

```bash
pnpm ci:full > /tmp/sprint4_final.log 2>&1; echo "EXIT: $?"
# DEVE ser 0. Sem exceções.
```

Commit final: `chore: encerramento sprint 4 — comercio digital entregue`

Mensagem no chat: "SPRINT 4 ENCERRADO. EXIT 0 confirmado. Aguardando revisão humana."

---

## TÉRMINO DO SPRINT

Não inicie Sprint 5 sozinho. Pare aqui.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint 4 (comercio.digital) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (seção "Sprint 4")
3. Rode: git log --oneline -15 && git status
4. Identifique a próxima milestone M26-M31 não concluída
5. Continue a partir dela

Se SPRINT_LOG.md indicar "Sprint 4 encerrado", aguarde humano. Não inicie Sprint 5.

Roadmap completo em SPRINT_4_PROMPT.md na raiz.
```

Salve este arquivo como `SPRINT_4_PROMPT.md` na raiz do projeto antes de começar.
