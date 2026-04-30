# Quick Start — Camada 1 Local

Sobe o Aethereos do zero em menos de 5 minutos.

## Pré-requisitos

- Node.js ≥ 20.19 e pnpm ≥ 9
- Docker Desktop rodando
- Supabase CLI instalado (`npm i -g supabase`)
- Repositório clonado e `.env.local` configurado

## Passo 1 — Banco de dados local

```bash
pnpm dev:db
# Aguarda "Started supabase local development setup."
# Anota a Service Role Key exibida (vai para .env.local)
```

Copie a chave para `.env.local`:

```
SUPABASE_SERVICE_KEY=<service_role_key_do_output>
SUPABASE_ANON_KEY=<anon_key_do_output>
SUPABASE_URL=http://localhost:54321
```

## Passo 2 — Infra opcional (LLM, observabilidade)

```bash
pnpm dev:infra        # NATS + LiteLLM (obrigatório para Copilot não-degradado)
pnpm dev:otel         # Grafana + Tempo + Loki (opcional — para monitorar)
```

> **Sem LLM key:** o Copilot funciona em modo degradado. Ver `docs/testing/KNOWN_LIMITATIONS.md`.

## Passo 3 — Seed data

```bash
pnpm seed:dev
# Output: "✅ Seed completo!"
```

## Passo 4 — App

```bash
pnpm --filter @aethereos/shell-commercial dev
# Aguarda "VITE ready in ... ms"
# Acesse: http://localhost:5174
```

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
pnpm seed:reset   # apaga dados seed
pnpm seed:dev     # repopula
```

## Logs e monitoramento

- Supabase Studio: http://localhost:54323
- Grafana: http://localhost:3002 (admin/admin)
- Langfuse: http://localhost:3001
- Unleash: http://localhost:4242 (admin/unleash4all)

## Troubleshooting

| Problema                         | Solução                                                           |
| -------------------------------- | ----------------------------------------------------------------- |
| `supabase: command not found`    | `npm i -g supabase`                                               |
| Banco não conecta                | `supabase status` — confirma que está rodando                     |
| Seed falha com "replace-me"      | Configure SUPABASE_SERVICE_KEY em .env.local                      |
| Tela branca no app               | Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY              |
| Copilot mostra "modo degenerado" | Normal — configure LiteLLM para ativar (ver KNOWN_LIMITATIONS.md) |
