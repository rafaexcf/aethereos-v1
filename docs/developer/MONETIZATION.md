# Monetização e Revenue Share

> Como cobrar pelo seu app e como o split de receita funciona.

## Modelos

| Modelo         | Descrição                                                     |
| -------------- | ------------------------------------------------------------- |
| `free`         | Sem cobrança ao usuário. Default.                             |
| `freemium`     | Grátis com features pagas in-app (gerenciadas pelo developer) |
| `paid`         | Cobrança única no momento da instalação                       |
| `subscription` | Mensalidade recorrente cobrada via Aethereos                  |

## Revenue share — 70/30

Para apps `paid` ou `subscription`:

- **70%** vai para o developer
- **30%** fica com o Aethereos (cobre processamento, hosting, distribuição, suporte)

Exemplo: app de R$ 99,00/mês com 10 instalações:

```
Receita bruta:           R$ 990,00
Sua parte (70%):         R$ 693,00
Aethereos (30%):         R$ 297,00
```

## Status atual da monetização (F2)

> ⚠️ **Importante:** A integração de cobrança real (Stripe + revenue
> share automático) está prevista para F3+. Em F2:
>
> - Apps podem declarar `pricing_model: 'paid'` no manifesto.
> - **Cobrança não acontece** — o app é instalado sem cobrança.
> - `kernel.developer_earnings` está pronto mas vazio.
> - Pagamentos para developers são feitos manualmente via transferência.

## Quando habilitar

Quando o billing real (Super Sprint E + Stripe verificado) entrar em
produção:

1. Usuário clica "Instalar" em app pago.
2. Stripe Checkout Session com `customer_email` da company.
3. Pagamento bem-sucedido → grant ativado em `kernel.app_permission_grants`.
4. Aethereos calcula 70/30 → INSERT em `kernel.developer_earnings`
   com status='pending'.
5. Final do mês: staff agrupa earnings pending → transferência
   bancária → UPDATE status='paid'.

## Cadastro bancário (futuro)

Após primeira venda, developer cadastra dados bancários no Developer
Console. Salvos em `kernel.developer_accounts.bank_account_data` (JSONB,
campo já reservado).

Schema sugerido:

```json
{
  "type": "pix",
  "key": "developer@example.com",
  "key_type": "email",
  "bank_name": "Itaú",
  "branch": "0001",
  "account": "12345-6"
}
```

## Pagamento mínimo

R$ 50,00 acumulados. Saldo abaixo carrega para o mês seguinte.

## Tributação

- Aethereos retém imposto de renda na fonte conforme legislação BR.
- Developer recebe DARF eletrônica + extrato mensal.
- Para PJ: nota fiscal de serviço emitida ao Aethereos.

## Benchmark (referência)

Comparativos de marketplace conhecidos:

| Marketplace       | Revenue share dev |
| ----------------- | ----------------- |
| Apple App Store   | 70-85%            |
| Google Play       | 70-85%            |
| Microsoft Store   | 85% (PWA)         |
| Shopify App Store | 80-100%           |
| **Aethereos**     | **70%**           |

Estamos no padrão da indústria; em F4+ planejamos premium tier (85%
após R$ 100k/ano) via opt-in.

## Dúvidas

`developers@aethereos.io`
