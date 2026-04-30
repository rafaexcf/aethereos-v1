# Quick Start — Camada 1 Local

Sobe o Aethereos do zero em menos de 5 minutos.

## Pré-requisitos

- Node.js ≥ 20.19 e pnpm ≥ 9
- Docker Desktop rodando
- Supabase CLI instalado (`npm i -g supabase`)
- Repositório clonado

## Passo 1 — Banco de dados local

```bash
pnpm dev:db
# Aguarda "Finished supabase db reset on branch main."
```

> `pnpm dev:db` faz `supabase start` + `supabase db reset` (aplica todas as migrations).

## Passo 2 — Configurar variáveis de ambiente

```bash
pnpm setup:env
# Output esperado:
#   ✅  .env.local (raiz) atualizado — URL: http://127.0.0.1:54321
#   ✅  apps/shell-commercial/.env.local atualizado — URL: http://127.0.0.1:54321
```

O script extrai as keys do Supabase local (`supabase status -o env`) e popula:

- `.env.local` (raiz) — usado pelo `scp-worker` e seeds
- `apps/shell-commercial/.env.local` — usado pelo Vite (Vite só lê `.env.local` do diretório do app)

> **IMPORTANTE:** Sempre use `http://127.0.0.1` (não `localhost`). O `config.toml` define
> `site_url=http://127.0.0.1:5174`. Como CORS compara origens lexicalmente, `localhost`
> e `127.0.0.1` são origens diferentes — fetch seria bloqueado.

## Passo 3 — Infra opcional (LLM, observabilidade)

```bash
pnpm dev:infra        # NATS + LiteLLM (obrigatório para Copilot não-degradado)
pnpm dev:otel         # Grafana + Tempo + Loki (opcional — para monitorar)
```

> **Sem LLM key:** o Copilot funciona em modo degradado. Ver `docs/testing/KNOWN_LIMITATIONS.md`.

## Passo 4 — Seed data

```bash
pnpm seed:dev
# Output: "✅ Seed completo!"
```

## Passo 5 — App

```bash
pnpm --filter @aethereos/shell-commercial dev
# Aguarda "VITE ready in ... ms"
# Acesse: http://127.0.0.1:5174
```

> **Use `http://127.0.0.1:5174`** no browser (não `localhost:5174`) para evitar CORS.

## Contas de teste

| Email                           | Senha           | Company             | Role   |
| ------------------------------- | --------------- | ------------------- | ------ |
| ana.lima@meridian.test          | Aethereos@2026! | Meridian Tecnologia | owner  |
| carlos.mendes@meridian.test     | Aethereos@2026! | Meridian Tecnologia | admin  |
| fernanda.souza@meridian.test    | Aethereos@2026! | Meridian Tecnologia | member |
| rafael.costa@atalaia.test       | Aethereos@2026! | Atalaia Consultoria | owner  |
| mariana.ferreira@atalaia.test   | Aethereos@2026! | Atalaia Consultoria | member |
| patricia.rodrigues@solaris.test | Aethereos@2026! | Solaris Engenharia  | owner  |

## Resetar e repopular

```bash
pnpm dev:db       # reseta banco + aplica migrations
pnpm setup:env    # re-popula env (idempotente — seguro rodar de novo)
pnpm seed:dev     # re-popula dados
```

## Logs e monitoramento

- Supabase Studio: http://127.0.0.1:54323
- Grafana: http://127.0.0.1:3002 (admin/admin)
- Langfuse: http://127.0.0.1:3001
- Unleash: http://127.0.0.1:4242 (admin/unleash4all)

## Troubleshooting

| Problema                                       | Solução                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `supabase: command not found`                  | `npm i -g supabase`                                                       |
| Banco não conecta                              | `supabase status` — confirma que está rodando                             |
| `setup:env` falha com "Supabase não rodando"   | Execute `pnpm dev:db` primeiro                                            |
| `ANON_KEY` vazia após setup:env                | Supabase ainda subindo — aguarde 30s e re-execute `pnpm setup:env`        |
| Tela branca no app / "supabaseUrl is required" | `pnpm setup:env` não foi executado ou shell-commercial/.env.local ausente |
| Copilot mostra "modo degenerado"               | Normal — configure LiteLLM para ativar (ver KNOWN_LIMITATIONS.md)         |
| Login retorna 500 no Supabase Studio           | Execute `pnpm dev:db` para re-aplicar migrations (incluindo GRANTS)       |
| CORS bloqueado no browser                      | Confirme que URL do app é `http://127.0.0.1:5174` (não localhost)         |
