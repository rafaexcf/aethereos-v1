# Runbook — CORS em dev local: por que `127.0.0.1` e não `localhost`

## Problema

Ao usar `localhost` e `127.0.0.1` misturados nas URLs de serviços locais, o browser
bloqueia requisições com erro CORS. Isso ocorre porque:

**Origem = scheme + host + port** (RFC 6454 / Fetch Spec).

`http://localhost:54321` e `http://127.0.0.1:54321` têm hosts lexicalmente diferentes.
O browser **não resolve DNS** ao comparar origens CORS — compara strings. Portanto, mesmo
que `localhost` resolva para `127.0.0.1` no sistema, eles são origens distintas para o browser.

## Configuração do Supabase

`supabase/config.toml` define:

```toml
[auth]
site_url = "http://127.0.0.1:5174"
additional_redirect_urls = [
  "http://127.0.0.1:5174",
  "http://localhost:5174",   # mantido para conveniência de browser
  "http://127.0.0.1:3000",
]
```

O GoTrue emite `Access-Control-Allow-Origin` baseado em `site_url`. Se o app faz
fetch de `http://localhost:5174`, mas o token foi emitido para `http://127.0.0.1:5174`,
o header CORS não corresponde → browser bloqueia.

## Decisão

**Padronizar em `127.0.0.1`** em todos os env files e scripts de dev:

| Arquivo                            | Variável                 | Valor correto            |
| ---------------------------------- | ------------------------ | ------------------------ |
| `.env.local` (raiz)                | `SUPABASE_URL`           | `http://127.0.0.1:54321` |
| `apps/shell-commercial/.env.local` | `VITE_SUPABASE_URL`      | `http://127.0.0.1:54321` |
| `apps/shell-commercial/.env.local` | `VITE_SUPABASE_ANON_KEY` | _key real_               |

URL do app no browser: `http://127.0.0.1:5174` (não `localhost:5174`).

## Em produção

Não é problema — domínio único (`app.aethereos.io`) é usado em todos os lugares.
Esta restrição é exclusiva do ambiente de dev local.

## Ferramenta

`pnpm setup:env` (executa `tooling/setup-env.sh`) popula os env files automaticamente
usando `supabase status -o env`, que já retorna `API_URL=http://127.0.0.1:54321`.
