# Runbook — Compartilhar com Tester via ngrok

Este runbook permite que você mostre a Camada 1 para 2-3 testers externos
sem precisar de deploy em cloud. Tudo roda local; o ngrok cria um túnel temporário.

---

## Pré-requisitos

1. Stack local rodando (banco + app)
2. [ngrok](https://ngrok.com/) instalado e autenticado

### Instalar ngrok

```bash
# Linux/WSL
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
  && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list \
  && sudo apt update && sudo apt install ngrok

# macOS
brew install ngrok
```

### Autenticar ngrok (free tier — 1 sessão simultânea)

1. Crie conta em https://ngrok.com/
2. Copie seu authtoken em https://dashboard.ngrok.com/get-started/your-authtoken
3. Rode: `ngrok config add-authtoken <seu-token>`

---

## Passo a passo

### 1. Suba a stack local

```bash
pnpm dev:db && pnpm seed:dev
```

### 2. Configure VITE_ALLOWED_ORIGINS e suba o app

```bash
# Adicione ao .env.local (ou exporte):
VITE_ALLOWED_ORIGINS=.ngrok-free.app,.ngrok.io

pnpm --filter @aethereos/shell-commercial dev
```

> O `VITE_ALLOWED_ORIGINS` evita o erro "Invalid Host header" quando o app
> recebe requests de uma URL ngrok.

### 3. Abra o túnel ngrok

Em um **segundo terminal**:

```bash
ngrok http 5174
```

Saída esperada:

```
Session Status   online
Account          seu@email.com (Plan: Free)
Version          3.x
Forwarding       https://abc123.ngrok-free.app -> http://localhost:5174
```

### 4. Compartilhe a URL com os testers

Copie a URL `https://abc123.ngrok-free.app` e envie.

O tester acessa diretamente no browser — sem VPN, sem configuração adicional.

### 5. Configurar Supabase para aceitar redirect do túnel

O Supabase Auth precisa conhecer a URL do túnel para permitir redirects OAuth:

```bash
# .env.local
SUPABASE_URL=http://localhost:54321
# Adicionar a URL ngrok como allowed URL no supabase (local dev):
supabase functions serve  # opcional, para Edge Functions
```

No Studio local (`http://localhost:54323`):

- Authentication → URL Configuration → Site URL: `https://abc123.ngrok-free.app`
- Redirect URLs: adicione `https://abc123.ngrok-free.app/**`

> **Nota:** a URL ngrok muda a cada sessão no free tier. Repita este passo cada vez.

---

## Limitações importantes

- **Túnel cai** quando você fecha o terminal do ngrok. Sessão = sessão.
- **URL muda** a cada `ngrok http` no free tier. Testers precisam da nova URL.
- **Free tier**: 1 agente ngrok simultâneo. Para 2 testers paralelos, usem a mesma URL.
- **Latência adicional**: tráfego vai local → ngrok cloud → tester. Esperado ~30-100ms extra.
- **Não usar** para testes de carga ou sessões longas. É para validação manual rápida.

---

## Monitorar atividade dos testers

Enquanto testers usam, você acompanha em:

- **Grafana** `http://localhost:3002` → Dashboard "Usage During Testing" (MX23)
- **Supabase Studio** `http://localhost:54323` → Table Editor → ver linhas criadas em tempo real
- **ngrok inspect** `http://localhost:4040` → inspecionar requests HTTP

---

## Encerrando a sessão

```bash
# Ctrl+C no terminal do ngrok
# Reverte Site URL no Supabase Studio para http://localhost:5174
```
