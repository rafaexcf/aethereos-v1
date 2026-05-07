# Billing — Aethereos

> Documento de arquitetura e operação do billing. Authority: Fundamentação 11 + ADR-0014 #7.

## Decisão arquitetural — Alternativa B (billing próprio)

Super Sprint E / MX232 adotou **Alternativa B**: billing implementado via
tabelas próprias em `kernel.*` em vez de delegar a um motor externo (Lago).

### Por quê

1. **Simplicidade operacional.** Lago adiciona 4 containers (api, front,
   db, redis), o que dobra a superfície de infraestrutura para um
   benefício marginal nesta fase (3 planos, sem overage complexa).
2. **Redução de superfície de falha.** Sem Lago, a integridade do billing
   depende apenas do Supabase Postgres (já hardened com RLS).
3. **Não-bloqueante.** R8 do sprint orienta migrar para Alternativa B se
   Lago Docker falhar — caso aplicado aqui (Docker indisponível no
   ambiente do sprint).
4. **Migração futura preservada.** O modelo de dados em
   `kernel.subscriptions` reserva colunas `lago_subscription_id` /
   `lago_customer_id` para sincronização caso o time decida adotar Lago
   em F2+ (ADR-0014 #7 mantém Lago como [DEC] de roadmap).

### Quando reavaliar

- Quando overage por uso ficar relevante (cobrança incremental por GB,
  por query IA, por token LLM).
- Quando emissão fiscal automática (NF-e) precisar de invoicing
  estruturado para múltiplos países.
- Quando o catálogo de planos passar de ~5 planos.

## Modelo de dados

| Tabela                 | Escopo      | Função                                                |
| ---------------------- | ----------- | ----------------------------------------------------- |
| `kernel.subscriptions` | per-company | Assinatura ativa: plan*code, status, period, lago*\*? |
| `kernel.invoices`      | per-company | Faturas com status (draft/pending/paid/failed/voided) |
| `kernel.usage_events`  | per-company | Append-only de pontos de medição (active_users etc.)  |
| `kernel.plan_limits`   | global      | Limites e overage por (plan_code, metric_code)        |

R12 do sprint: `plan_limits` é tabela GLOBAL — limites são iguais para
todos no mesmo plano.

R13: subscription Free é auto-criada para toda company nova.

R17: valores em centavos (`amount_cents`). Nunca float.

## Planos

Definidos como constantes em `@aethereos/kernel/billing/plans` e seedados
em `kernel.plan_limits` para queries SQL diretas.

| Plano      | Preço/mês | active_users | storage_bytes | ai_queries | Overage                                 |
| ---------- | --------- | ------------ | ------------- | ---------- | --------------------------------------- |
| Free       | R$ 0      | 3            | 500 MB        | 100        | sem overage                             |
| Pro        | R$ 199,00 | 20           | 10 GB         | 5.000      | R$19,90/user · R$9,90/GB · R$0,05/query |
| Enterprise | R$ 799,00 | 200          | 100 GB        | 50.000     | R$14,90/user · R$4,90/GB · R$0,03/query |

## Quotas (R10 — sem bypass)

`QuotaEnforcer` em `@aethereos/kernel/billing` aplica limites em três
pontos:

- `checkUserInvite(companyId)` — antes do `invite-member` Edge Function
- `checkAIQuery(companyId)` — antes da chamada LLM no Copilot
- `checkFileUpload(companyId, sizeBytes)` — antes do upload no Drive

Cache de 5 minutos por `(companyId, metric_code)` (R14).

## Checkout

`create-checkout` Edge Function aceita `{ plan_code }` e por enquanto
opera em modo **simulado** (R9): atualiza `kernel.subscriptions` direto
sem cobrança real. Stripe ficou para sprint futuro quando a conta
PJ estiver verificada.

## Lago (opt-in, futuro)

Para quem quiser experimentar Lago localmente:

```bash
pnpm dev:lago        # sobe lago-api (3001), lago-front (3003), lago-db (5436), lago-redis (6380)
```

Em seguida criar conta admin no `localhost:3003`, gerar API key, e setar
`LAGO_API_KEY` no `.env.local`. Edge Functions `billing-sync` e
`billing-webhook` ficam como TODO de integração.

## NF-e (Opção D — futuro)

Por enquanto, fatura é exibida no portal do Gestor sem ser nota fiscal
oficial. Para emissão automática (NFe.io / Enotas / Focus NFe) ver
sprint futuro. Texto no portal: "Para solicitar nota fiscal, entre em
contato: financeiro@aethereos.io".
