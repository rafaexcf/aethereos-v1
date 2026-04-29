# ADR-0017 — Comércio Digital: Primeiro SaaS Standalone da Família Aethereos

**Status:** Aceito  
**Data:** 2026-04-29  
**Subordinado a:** ADR-0001, ADR-0014, ADR-0016  
**Implementado em:** Sprint 4 (M26–M31)

---

## Contexto

O Aethereos é construído em três camadas. As Camadas 0 (shell-base) e 1 (shell-commercial) foram entregues nos Sprints 1–3. A Camada 2 são distribuições verticais — mas antes de bundlar o OS completo, a estratégia é ter SaaS standalone que funcionem de forma independente e, opcionalmente, se integrem ao OS.

O Comércio Digital é o primeiro desses SaaS: uma plataforma de gestão comercial B2B orientada a PMEs. A decisão de construí-lo primeiro (antes de logitix, kwix, autergon) deriva de:

1. É o mais simples em termos de domínio (catálogo + pedidos + pagamento)
2. Valida o padrão técnico para todos os SaaS seguintes
3. Tem PMF (product-market fit) mais imediata no mercado brasileiro SMB

---

## Decisão

### 1. Stack: Next.js 15 App Router (independente de Vite)

Os shells OS usam Vite (ADR-0014 [INV]). Os SaaS standalone usam Next.js 15 App Router por:

- SSR/SSG nativo para SEO sem overhead manual
- App Router com Server Components para zero-JS em rotas públicas
- API Routes para webhook handlers e endpoints REST
- Integração natural com middleware de auth

### 2. Estrutura tripla: `/(public)` + `/app` + `/embed`

Cada SaaS standalone DEVE ter três raízes de rota:

- `/(public)` — páginas SEO-first, zero-auth, Server Components apenas
- `/app` — autenticado, CMS/dashboard
- `/embed` — modo iframe, sem header próprio, auth via postMessage

Esta estrutura é [INV] para todos os SaaS da família. Mudança exige ADR.

### 3. Stripe como gateway de pagamento (não billing engine)

O Stripe é usado exclusivamente como gateway de pagamento (Checkout Sessions, Webhooks). O billing engine será Lago (Sprint 5+, ADR futuro). Implementar usage-based billing diretamente no Stripe viola a separação de responsabilidades.

### 4. Schema Postgres separado: `comercio`

As tabelas do domínio comercial ficam no schema `comercio` (separado de `kernel`). Isso:

- Mantém o kernel limpo e estável
- Permite drop/migrate do schema sem tocar no kernel
- Segue o padrão de separação de domínios via schema (ADR-0014 item 20)

### 5. Eventos `commerce.*` reservados para apps de comércio

O domínio `commerce.*` fica reservado para apps da família comércio (Comércio Digital, módulos comerciais do OS). Eventos de kernel continuam em `platform.*`, `agent.*`, etc. Apps de outras verticais (logitix, kwix) NÃO devem emitir `commerce.*`.

### 6. Variante dupla de build (Fundamentação 7.1)

O mesmo build Next.js serve standalone (domínio próprio) e embed (dentro do shell-commercial). A diferença é runtime: o layout `/embed` detecta o contexto via URL e não renderiza header/footer próprios.

---

## Alternativas rejeitadas

**Single-route sem `/(public)`**: rotas públicas e autenticadas misturadas em `/` prejudicam SEO e cache control granular.

**Separar em N apps Next.js**: uma app por modo (standalone, embed) aumenta complexidade de deploy e divergência de código. O mesmo build serve os dois modos — zero duplicação.

**Billing direto no Stripe**: viable no curto prazo, mas cria lock-in e dificulta migração para Lago. A separação foi imposta desde Sprint 4.

**Usar Remix ou outro framework**: o ecossistema Next.js/Vercel tem mais componentes alinhados com a stack existente (Supabase Auth helpers, Stripe integrations, etc.). A decisão foi tomada em ADR-0014.

**`comercio.*` no schema `public` ou `kernel`**: contamina o espaço de nomes do kernel com lógica de domínio de aplicação.

---

## Consequências

### Positivas

- Padrão técnico validado para todos os SaaS seguintes (logitix, kwix, autergon)
- Deploy standalone possível sem o OS completo — menor fricção para clientes
- Modo embed funcional: shell-commercial pode abrir comercio.digital como app nativo

### Negativas / Trade-offs

- Next.js no monorepo Vite requer configuração extra (extensionAlias, postcss CJS)
- Two-way message protocol (embed) adiciona complexidade de autenticação em iframe
- Stripe webhook handling requer STRIPE_WEBHOOK_SECRET em prod; sem Stripe CLI localmente não há como testar ao vivo

### Mapeamento de pendências para humano

- Stripe live keys (sk*live*, pk*live*, whsec\_) — nunca no código
- Deploy em domínio `comercio.digital`
- DNS + TLS + Supabase project de produção
- Teste de webhook real via Stripe Dashboard ou stripe-cli

---

## Referências

- ADR-0001 — Fundação Aethereos
- ADR-0014 — Stack resolution
- ADR-0016 — Camada 1 cloud-first
- `apps/comercio-digital/docs/EMBED.md` — protocolo embed
- Sprint 4 Log — `SPRINT_LOG.md`
