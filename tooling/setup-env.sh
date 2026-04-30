#!/usr/bin/env bash
# setup-env.sh — popula .env.local (raiz) e apps/shell-commercial/.env.local
# com valores reais do Supabase local.
#
# Pré-requisito: `supabase start` (ou `pnpm dev:db`) deve estar rodando.
# Idempotente: rodar duas vezes não duplica entradas.
#
# Uso:
#   pnpm setup:env
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_ROOT="$REPO_ROOT/.env.local"
ENV_SHELL="$REPO_ROOT/apps/shell-commercial/.env.local"

# ---------------------------------------------------------------------------
# Verificar Supabase
# ---------------------------------------------------------------------------
if ! supabase status >/dev/null 2>&1; then
  echo "❌  Supabase não está rodando. Execute: pnpm dev:db" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Extrair valores do Supabase local
# ---------------------------------------------------------------------------
SUPABASE_ENV="$(supabase status -o env 2>/dev/null)"

extract() {
  echo "$SUPABASE_ENV" | grep "^$1=" | head -1 | sed 's/^[^=]*="\(.*\)"$/\1/'
}

ANON_KEY="$(extract ANON_KEY)"
SERVICE_KEY="$(extract SERVICE_ROLE_KEY)"
API_URL="$(extract API_URL)"   # já vem como http://127.0.0.1:54321

if [[ -z "$ANON_KEY" || -z "$SERVICE_KEY" || -z "$API_URL" ]]; then
  echo "❌  Não foi possível extrair keys do 'supabase status -o env'." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Criar .env.local raiz se não existir
# ---------------------------------------------------------------------------
if [[ ! -f "$ENV_ROOT" ]]; then
  cp "$REPO_ROOT/.env.local.example" "$ENV_ROOT"
  echo "✅  .env.local criado a partir do exemplo"
fi

# ---------------------------------------------------------------------------
# Helper: upsert KEY=VALUE — substitui se existir, adiciona no fim se não
# ---------------------------------------------------------------------------
upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

# ---------------------------------------------------------------------------
# Atualizar .env.local raiz
# ---------------------------------------------------------------------------
upsert_env "$ENV_ROOT" "SUPABASE_URL"      "$API_URL"
upsert_env "$ENV_ROOT" "SUPABASE_ANON_KEY" "$ANON_KEY"
upsert_env "$ENV_ROOT" "SUPABASE_SERVICE_KEY" "$SERVICE_KEY"
upsert_env "$ENV_ROOT" "VITE_SUPABASE_URL"      "$API_URL"
upsert_env "$ENV_ROOT" "VITE_SUPABASE_ANON_KEY" "$ANON_KEY"

echo "✅  .env.local (raiz) atualizado — URL: $API_URL"

# ---------------------------------------------------------------------------
# Criar/atualizar apps/shell-commercial/.env.local
# ---------------------------------------------------------------------------
if [[ ! -f "$ENV_SHELL" ]]; then
  touch "$ENV_SHELL"
fi

upsert_env "$ENV_SHELL" "VITE_SUPABASE_URL"      "$API_URL"
upsert_env "$ENV_SHELL" "VITE_SUPABASE_ANON_KEY" "$ANON_KEY"

echo "✅  apps/shell-commercial/.env.local atualizado — URL: $API_URL"
echo ""
echo "🎯  Próximo passo: pnpm seed:dev"
