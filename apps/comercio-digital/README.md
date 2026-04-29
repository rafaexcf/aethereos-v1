# Comércio Digital

Primeiro SaaS standalone da família Aethereos. Plataforma de gestão comercial B2B — catálogo de produtos, pedidos e checkout — que roda standalone em domínio próprio e se integra ao Aethereos OS via embed.

## Estrutura de rotas

| Rota        | Descrição                                                        |
| ----------- | ---------------------------------------------------------------- |
| `/(public)` | SEO-first, sem auth (landing, preços, sobre)                     |
| `/app`      | Dashboard autenticado (login direto via IdP)                     |
| `/embed`    | Modo iframe — sessão herdada via postMessage do shell-commercial |

## Modo standalone vs embed

O mesmo build, comportamento diferente em runtime:

- **Standalone:** acesso via domínio próprio (`comercio.digital`), header/footer públicos, login próprio.
- **Embed:** dentro do shell-commercial como iframe (`/embed/*`), sem chrome, sessão delegada via `host.token.set` postMessage.

Ver `docs/architecture/EMBED_PROTOCOL.md` para o protocolo completo.

## Setup local

```bash
cp .env.local.example .env.local
# preencher .env.local com suas chaves

pnpm install
pnpm dev:db  # subir Supabase local

pnpm --filter=@aethereos/comercio-digital dev
# Disponível em http://localhost:3000
```

## Scripts

```bash
pnpm dev        # dev server :3000
pnpm build      # build de produção
pnpm start      # servidor de produção :3000
pnpm typecheck  # tsc --noEmit
pnpm lint       # ESLint
```

## Integrações

- **Auth:** `@aethereos/drivers-supabase/browser` (client) e `@aethereos/drivers-supabase` (server)
- **Kernel:** `@aethereos/kernel` para publicação de eventos SCP via Outbox
- **SCP Registry:** `@aethereos/scp-registry` para schemas dos eventos `commerce.*`
- **Stripe:** gateway de pagamento (M28+), chaves de teste em `.env.local`
- **Billing recorrente:** Lago (Sprint 5+)
