# @aethereos/temporal-worker

Worker TypeScript que processa workflows Temporal do Aethereos.

## Pré-requisitos

- Temporal Server rodando (ver `pnpm dev:temporal` na raiz, MX224)
- `.env.local` com `DATABASE_URL` (Supabase Postgres) e opcionalmente `TEMPORAL_ADDRESS`
- Em produção: `RESEND_API_KEY` para envio real de e-mail (sem ele, e-mails só aparecem no log)

## Variáveis de ambiente

| Var                   | Default          | Descrição                              |
| --------------------- | ---------------- | -------------------------------------- |
| `TEMPORAL_ADDRESS`    | `localhost:7233` | Endereço gRPC do Temporal Server       |
| `TEMPORAL_NAMESPACE`  | `default`        | Namespace Temporal                     |
| `TEMPORAL_TASK_QUEUE` | `aethereos-main` | Task queue que o worker assina         |
| `DATABASE_URL`        | (obrigatório)    | Connection string do Supabase Postgres |
| `RESEND_API_KEY`      | vazio            | Quando vazio: e-mail só vai pro log    |
| `EMAIL_FROM`          | `no-reply@…`     | Remetente padrão                       |

## Comandos

```bash
pnpm --filter @aethereos/temporal-worker build
pnpm --filter @aethereos/temporal-worker dev      # watch mode
pnpm --filter @aethereos/temporal-worker start    # produção
```

## Activities expostas

- `sendEmail` — envia e-mail via Resend; sem API key, log-only
- `querySupabase` / `updateSupabase` / `insertSupabase` — DB via `postgres` driver com identifier whitelist
- `emitSCPEvent` — INSERT em `kernel.scp_outbox` com envelope completo
- `createNotification` — INSERT em `kernel.notifications`
- `evaluatePolicy` / `waitForApproval` — gate Policy Engine para workflows com agentes (Super Sprint A)

## Workflows registrados

- `onboardingFlow` — drip campaign D0/D3/D10 (MX226)
- `inviteReminderFlow` — reminder D3 + expiration D7 (MX226)
- `lgpdExportFlow` — notify start → export → notify done → cleanup D7 (MX226)
- `choreographyWorkflow` — runner genérico de coreografias multi-step (MX227)

## Setup local

```bash
# 1. Subir Temporal stack
pnpm dev:temporal

# 2. Build do worker (uma vez, ou use dev para watch)
pnpm --filter @aethereos/temporal-worker build

# 3. Rodar
pnpm dev:temporal-worker

# 4. Temporal UI: http://localhost:8233
```

## Produção

Temporal **não** vai para Vercel/Supabase Cloud — host separado:

- Temporal Cloud (managed) ou
- Temporal Operator no Kubernetes ou
- VPS rodando o `temporalio/auto-setup` com Postgres dedicado

Definir `TEMPORAL_ADDRESS` apontando para o endpoint gRPC e fazer deploy do
worker em runtime Node.js (Fly, Railway, Cloud Run, etc.).
