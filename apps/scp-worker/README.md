# scp-worker

Serviço Node.js que drena o `kernel.scp_outbox` e publica eventos no NATS JetStream.

## Dependências de ambiente

O worker precisa das seguintes variáveis:

| Variável               | Descrição                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`         | PostgreSQL (via Drizzle) — `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `SUPABASE_URL`         | URL da API Supabase local — `http://127.0.0.1:54321`                                 |
| `SUPABASE_SERVICE_KEY` | Service role key (acesso irrestrito ao banco)                                        |
| `NATS_URL`             | Endereço do NATS JetStream — `nats://127.0.0.1:4222`                                 |

## Dev local

```bash
# Na raiz do monorepo
pnpm dev:db         # sobe Supabase + aplica migrations
pnpm setup:env      # popula .env.local com keys reais
pnpm dev:infra      # sobe NATS

# Rodar o worker
pnpm --filter=@aethereos/scp-worker dev
# Ou: cd apps/scp-worker && pnpm dev
```

O script `dev` lê automaticamente `.env.local` da raiz do monorepo via `--env-file=../../.env.local`.
Sem esse arquivo, o processo exibia `DATABASE_URL env var is required` — corrigido na Sprint 9.5/MX29.

## Produção

Em produção, variáveis de ambiente são injetadas pela plataforma (Vercel, Fly.io, etc.).
Não usar `--env-file` em produção — scripts `dev` e `start` na raiz do monorepo podem
ser chamados com as vars injetadas pelo processo pai.
