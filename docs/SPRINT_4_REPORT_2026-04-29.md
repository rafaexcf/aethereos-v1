# Sprint 4 Report — comercio.digital

**Data:** 2026-04-29  
**Sprint:** 4 (M26–M31)  
**Status:** ENCERRADO

---

## O que foi entregue

| Milestone                                            | Entregue | Commit                                            |
| ---------------------------------------------------- | -------- | ------------------------------------------------- |
| M26 — Scaffold Next.js 15 + estrutura tripla         | ✅       | `feat(comercio-digital): scaffold Next.js 15...`  |
| M27 — Catálogo de produtos com SCP events            | ✅       | `feat(comercio-digital): catalogo de produtos...` |
| M28 — Checkout Stripe + webhook + outbox idempotente | ✅       | `feat(comercio-digital): checkout flow stripe...` |
| M29 — Modo embed dentro de shell-commercial          | ✅       | `feat(comercio-digital): modo embed...`           |
| M30 — Landing pública SEO + preços + sobre           | ✅       | `feat(comercio-digital): landing publica SEO...`  |
| M31 — ADR-0017 + encerramento                        | ✅       | `chore: encerramento sprint 4`                    |

---

## O que foi construído

### Infraestrutura

- 2 migrações SQL: `comercio.products` + `comercio.orders` + `comercio.order_items`
- RLS multi-tenant em todas as tabelas via `current_setting('app.current_company_id')`
- Drizzle schema: `comercio.ts` + `orders.ts`
- SCP registry: 8 novos event types (`commerce.product.*`, `commerce.checkout.*`, `commerce.order.*`)

### Backend/API

- Domain services: `lib/products.ts`, `lib/orders.ts` com outbox pattern
- Server Actions: create/update/archive products, checkout
- `POST /api/checkout` — cria Stripe Session + pedido pending
- `POST /api/webhooks/stripe` — valida assinatura, idempotência via UNIQUE constraint

### Frontend

- `/` — landing SEO com hero, features, steps
- `/precos` — tabela Free/Starter/Pro
- `/sobre` — texto institucional
- `/app/produtos` — listagem, criação, edição, arquivo
- `/app/pedidos` — listagem com status
- `/embed` — dashboard embedado com navegação
- `sitemap.xml` + `robots.txt` (pré-renderizados)

### Integração embed

- `EmbeddedApp` component no shell-commercial
- Protocolo `host.token.set` / `embed.ready` funcional
- Botão "Abrir Comércio Digital" no desktop do shell-commercial
- `docs/EMBED.md` documentando protocolo, CSP, limitações

### Testes

- 8 unit tests (5 products + 3 orders), 100% pass
- Mocked DrizzleDb via Vitest

---

## Pendências para humano (não automatable por IA)

1. **Stripe live keys** — `sk_live_`, `pk_live_`, `whsec_live_` em `.env` de produção
2. **Deploy** — Vercel/Fly.io com domínio `comercio.digital`
3. **Supabase project de produção** — aplicar as 2 migrações SQL no projeto cloud
4. **Webhook Stripe real** — registrar endpoint no Stripe Dashboard para produção
5. **Teste de pagamento end-to-end** — com cartão de teste Stripe (4242 4242 4242 4242)
6. **Custom domain DNS** — `comercio.digital` apontando para deploy
7. **`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`** — configurar em produção
8. **Revisão humana de segurança** — RLS policies, webhook signature validation, CSP headers

---

## Métricas

### Testes

- `pnpm test` (comercio-digital): 8/8 ✅
- `pnpm typecheck` (comercio-digital): EXIT 0 ✅
- `pnpm typecheck` (shell-commercial): EXIT 0 ✅
- `pnpm build` (comercio-digital): EXIT 0 ✅

### Bundle (Next.js build)

- First Load JS compartilhado: ~102 kB gzip
- Rota landing `/`: 174 B + shared
- Middleware: 34.3 kB

### Lighthouse (estimativa — não executado ao vivo)

- Performance: ~90+ (Server Components, sem JS client nas rotas públicas)
- SEO: ~95+ (metadata canônica, sitemap, robots, OG tags, HTML semântico)

---

## Decisões tomadas durante o sprint

1. **`drizzle-orm` como dep direta** de `comercio-digital` — necessário para `eq`, `and` na domain service; versão deve ser igual à de `drivers-supabase` (`^0.41.0`)
2. **`zod` como dep direta** — checkout route usa Zod para validação de body
3. **`stripe@17.7.0`** — `apiVersion: "2025-02-24.acacia"` (LatestApiVersion do pacote)
4. **Lazy Supabase client init** — Client Components (embed layout, login page) jamais inicializam o client em nível de módulo; sempre dentro de `useEffect` ou handlers
5. **PostCSS deve ser CommonJS** — `module.exports` (não `export default`), ignorado pelo ESLint via `**/postcss.config.js`
6. **`extensionAlias` em webpack** — necessário para resolver imports `.js` em workspace-source TypeScript packages dentro do Next.js
7. **`refreshToken` no session store** — necessário para forwarding ao iframe via embed protocol

---

## Sugestão para Sprint 5

Três opções possíveis — decisão humana:

**A) Consolidar comercio.digital em produção**

- Deploy real, domínio, Stripe live, cliente beta
- Mais arriscado mas gera feedback real

**B) Começar logitix**

- Segundo SaaS standalone (logística)
- Valida padrão com domínio diferente
- Ainda sem feedback de mercado

**C) Infraestrutura cross-cutting**

- NATS JetStream local dev setup
- Lago billing setup
- Observabilidade (OpenTelemetry)
- Pré-requisitos para Sprint 6+

Recomendação do agente: **A ou C** — C se o time quer solidez técnica antes de novos verticais; A se há cliente real esperando o comercio.digital.
