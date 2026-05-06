# DOGFOOD_PLAN.md — Aethereos uso interno (30 dias)

> Sprint 32 / MX178 — selo final da Camada 1.
> Início: **2026-05-06**. Conclusão prevista: **2026-06-05**.
> Owner: rafacostafranco@gmail.com.

---

## Objetivo

Usar o Aethereos diariamente como workspace principal para gerir o
desenvolvimento dos 30 dias seguintes. Fechar Gates 4 (eval dataset),
5 (uptime ≥99,5%) e 8 (dogfood) com tráfego real, não simulado.

**Sem dogfood, não temos evidência empírica de que a Camada 1 sobrevive
a uso humano sustentado.**

---

## Tenant interno

- Nome: **Aethereos Dev** (ou equivalente reservado)
- Owner: rafacostafranco@gmail.com (email REAL, não @test — R10)
- URL: https://aethereos.io
- Ambiente: produção (oublhirkojyipwtmkzvw)

### Configuração inicial (lista a seguir é manual)

> ⚠️ **Setup é manual** porque o agente não cria conta de usuário com
> email real autonomamente (P7, R10). Owner faz na UI:

- [ ] Acessar https://aethereos.io/register
- [ ] Criar empresa "Aethereos Dev" com owner = email real
- [ ] Upload de logo (Aethereos branding)
- [ ] Configurar BYOK LLM com API key real do provedor
      (Anthropic / OpenAI / Google) em Configurações → IA
- [ ] Instalar apps relevantes via Magic Store:
      Tarefas, Kanban, Bloco de Notas, Drive, Chat, Copilot,
      Calendário, Agenda Telefônica, Reuniões
- [ ] Criar departamentos: Desenvolvimento, Produto, Design
- [ ] Criar grupo "Squad Camada 1"
- [ ] Convidar pelo menos 1 colaborador (se houver alguém na equipe)
- [ ] Habilitar 2FA TOTP (Configurações → Segurança)

---

## Métricas a coletar

### Diárias (auto via observabilidade)

- Uptime (Gate 5) — coletado pelo monitor externo (ver MX179).
- Latência p50/p95/p99 do scp-worker — Vercel logs estruturados.
- Eventos publicados/dia — kernel.scp_outbox.
- Erros JS no shell — `lib/observability.ts` (Sentry se configurado).

### Quasi-diárias (registro manual)

- Bugs encontrados → issue no GitHub com label `dogfood`.
- Features faltantes percebidas → issue com label `dogfood-feature`.
- Queries reais ao Copilot → log informal em `docs/copilot-eval-real.md`
  (alimenta Gate 4 — expansão do dataset de 50 para 500+).
- Feedback qualitativo livre.

### Semanal (registro manual)

- Resumo da semana em `docs/dogfood-log.md`:
  - 3 coisas que funcionaram bem
  - 3 coisas que atrapalharam
  - Bugs corrigidos vs. encontrados
  - Apps mais usados

---

## Checklist diário (mínimo viável)

```
- [ ] Abrir https://aethereos.io e usar como workspace principal do dia
- [ ] Criar/atualizar tarefas em Tarefas
- [ ] Mover cards no Kanban se em sprint
- [ ] Tomar pelo menos 1 nota em Bloco de Notas
- [ ] Fazer pelo menos 1 pergunta ao Copilot
- [ ] Reportar bugs descobertos como issue com label `dogfood`
```

Se um dia for impossível usar (viagem, etc.), registrar como `dogfood-skip`
em `docs/dogfood-log.md` e seguir.

---

## Critério de sucesso (após 30 dias)

| Métrica          | Meta                                 | Como medir                     |
| ---------------- | ------------------------------------ | ------------------------------ |
| Uptime           | ≥ 99,5%                              | Monitor externo (MX179)        |
| Bugs P0 abertos  | 0 ao final dos 30 dias               | GitHub issues `dogfood` + `P0` |
| Queries Copilot  | ≥ 200 reais (Gate 4 = 500+ ao final) | `docs/copilot-eval-real.md`    |
| Sessões diárias  | ≥ 25 / 30 dias                       | Self-report no log             |
| Feedback escrito | ≥ 4 resumos semanais                 | `docs/dogfood-log.md`          |

Se TODOS forem atingidos: Gate 8 → PASS. Atualizar GATES_STATUS.md.

Se algum falhar: documentar root cause, decidir se é blocker ou aceitável,
ajustar plano.

---

## Issues template para bugs de dogfood

Arquivo: `.github/ISSUE_TEMPLATE/dogfood.md` (criado em MX178).

Labels sugeridas:

- `dogfood` (obrigatória)
- `bug` / `feature` / `polish`
- `P0` / `P1` / `P2` / `P3`
- App afetado: `app:tarefas`, `app:kanban`, etc.

---

## Ao final dos 30 dias

1. Atualizar `GATES_STATUS.md`:
   - Gate 5 → PASS se uptime ≥ 99,5%
   - Gate 8 → PASS
   - Gate 4 → ainda PARCIAL até dataset chegar a 500+ (provavelmente
     sim com 30 dias de uso real)

2. Compilar findings em `docs/dogfood-final-report.md`:
   - Bugs encontrados / corrigidos / pendentes
   - Decisões de scope (e.g., "Aether AI precisa ser memoria-stateful
     antes de comercio.digital lançar")
   - Métricas finais

3. Decisão go/no-go para iniciar **comercio.digital** (Camada 2).

---

## Anti-objetivos (NÃO fazer durante dogfood)

- ❌ Adicionar features novas que não tenham origem no uso real.
- ❌ Refatorar god components — fica para sprint pós-dogfood.
- ❌ Esquivar de bugs reais "esperando" para usar fluxo alternativo.
- ❌ Manter tenant @test em paralelo "para testar coisas" — usar o
  Aethereos Dev real, com risco real de bug afetar workspace real.
