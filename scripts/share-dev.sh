#!/usr/bin/env bash
# share-dev.sh — Sobe stack local + túnel ngrok para testes externos
# Uso: pnpm share:dev
# Pré-req: ngrok autenticado (ngrok config add-authtoken <token>)
set -euo pipefail

PORT=5174

check_ngrok() {
  if ! command -v ngrok &>/dev/null; then
    echo "❌ ngrok não encontrado. Instale: https://ngrok.com/download"
    echo "   Linux/WSL: curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo 'deb https://ngrok-agent.s3.amazonaws.com buster main' | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok"
    exit 1
  fi
}

start_app_background() {
  echo "→ Subindo app em background (porta $PORT)..."
  VITE_ALLOWED_ORIGINS=".ngrok-free.app,.ngrok.io" \
    pnpm --filter @aethereos/shell-commercial dev --port "$PORT" &>/tmp/aethereos-dev.log &
  APP_PID=$!
  echo "  PID app: $APP_PID (log: /tmp/aethereos-dev.log)"

  # Aguarda o servidor subir (timeout 60s)
  local waited=0
  until curl -s "http://localhost:$PORT" &>/dev/null || [ $waited -ge 60 ]; do
    sleep 2
    waited=$((waited + 2))
  done

  if [ $waited -ge 60 ]; then
    echo "❌ App não subiu em 60s. Verifique /tmp/aethereos-dev.log"
    exit 1
  fi
  echo "  ✓ App rodando em http://localhost:$PORT"
}

start_ngrok() {
  echo "→ Iniciando túnel ngrok na porta $PORT..."
  ngrok http "$PORT" --log=stdout &>/tmp/ngrok.log &
  NGROK_PID=$!

  # Aguarda a API do ngrok ficar disponível (timeout 15s)
  local waited=0
  until curl -s http://localhost:4040/api/tunnels &>/dev/null || [ $waited -ge 15 ]; do
    sleep 1
    waited=$((waited + 1))
  done

  if [ $waited -ge 15 ]; then
    echo "❌ ngrok não iniciou em 15s. Verifique /tmp/ngrok.log"
    exit 1
  fi
}

get_ngrok_url() {
  # Pega a URL pública do túnel via API local do ngrok
  local url
  url=$(curl -s http://localhost:4040/api/tunnels \
    | grep -o '"public_url":"https:[^"]*"' \
    | head -1 \
    | sed 's/"public_url":"//;s/"//')
  echo "$url"
}

cleanup() {
  echo ""
  echo "→ Encerrando túnel e app..."
  [ -n "${NGROK_PID:-}" ] && kill "$NGROK_PID" 2>/dev/null || true
  [ -n "${APP_PID:-}" ] && kill "$APP_PID" 2>/dev/null || true
  echo "→ Reverta Site URL no Supabase Studio para http://localhost:$PORT"
}

# ── main ──────────────────────────────────────────────────────────────────────

trap cleanup EXIT INT TERM

check_ngrok
start_app_background
start_ngrok

NGROK_URL=$(get_ngrok_url)

if [ -z "$NGROK_URL" ]; then
  echo "❌ Não foi possível obter URL do ngrok. Verifique /tmp/ngrok.log"
  exit 1
fi

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│  Compartilhe esta URL: $NGROK_URL"
echo "└─────────────────────────────────────────────────────────┘"
echo ""
echo "⚠️  Lembrete Supabase Studio (http://localhost:54323):"
echo "   Authentication → URL Configuration → Site URL: $NGROK_URL"
echo "   Redirect URLs → adicione: $NGROK_URL/**"
echo ""
echo "  ngrok inspect: http://localhost:4040"
echo "  App log: /tmp/aethereos-dev.log"
echo "  Ctrl+C para encerrar"
echo ""

# Mantém script rodando até Ctrl+C
wait $NGROK_PID 2>/dev/null || true
