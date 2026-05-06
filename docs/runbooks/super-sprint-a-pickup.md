# Super Sprint A — Pickup Point 1

> Pausa após MX200 (PICKUP POINT 1 do roadmap original).
> Data: 2026-05-06. HEAD: `b559f98`.

---

## Completado: MX197-MX200 (Bloco 1 — Fundação)

### MX197 — Migration: 3 tabelas

`supabase/migrations/20260510000001_policy_engine.sql`

- `kernel.action_intents` (catálogo global, RLS SELECT authenticated)
- `kernel.policies` (per-company, RLS company-scoped, UNIQUE name+version)
- `kernel.policy_evaluations` (append-only, RLS SELECT+INSERT only)

### MX198 — Seed 25 action intents

`supabase/migrations/20260510000002_seed_action_intents.sql`

25 intents cobrindo: contatos (3), arquivos (3), tarefas (3), comunicação (3),
equipe (4), apps (2), config (2), IA (3), políticas (2). Risk classes A/B/C
distribuídas. Reversibility populada para deletes.

### MX199 — PolicyEngine runtime

`packages/kernel/src/policy/`:

- `types.ts` — PolicyResult, PolicyRule union, ConditionMap
- `conditions.ts` — operadores max/min/above/below/equals/in/not_in/contains,
  hour_of_day (HH:MM), risk_class
- `PolicyEngine.ts` — classe com cache 5min, deny short-circuit (R8),
  defaults user=allow / agent=require_approval, dryRun mode
- `index.ts` + re-export em `@aethereos/kernel`

13 unit tests passando. 35/35 testes kernel green.

### MX200 — Integração com Agent Proposals

- Migration `20260510000003_agent_proposals_policy_link.sql`:
  agent_proposals + policy_evaluation_id + auto_resolved + auto_resolved_reason.
- `apps/shell-commercial/src/lib/policy/browser-evaluator.ts`:
  BrowserPolicyDataSource adapta DataDriver → PolicyDataSource.
  INTENT_TYPE_TO_ACTION_ID mapeia (create_person → kernel.contact.create etc.).
  evaluateProposal() helper.
- Copilot integration: avalia ANTES de inserir.
  - allow → status=approved + auto_resolved=true
  - deny → status=rejected + auto_resolved=true + rejection_reason
  - require_approval → status=pending (legado)

---

## Pendente: MX201-MX206 (Bloco 2 + 3)

### Bloco 2 — Policy Studio UI

- **MX201** — Gestor: aba "Políticas" com lista + wizard CRUD 4 steps.
  Componente novo em `apps/gestor/tabs/Politicas.tsx` (ou PoliciasTab).
  Wizard: Identidade → Escopo → Regras → Revisão. js-yaml para serializar.
  Necessário: `pnpm --filter shell-commercial add js-yaml @types/js-yaml`.

- **MX202** — Simulação de impacto 90 dias. Botão "Simular" abre drawer
  com contagem allow/deny/require_approval re-avaliando proposals últimas
  90 dias em dryRun mode. PolicyEngine já suporta dryRun.

- **MX203** — 3 templates hardcoded (Conservador, Moderado, Operações
  Financeiras). Constantes em `apps/gestor/tabs/policy-templates.ts`.
  Botão "Usar template" no topo do Policy Studio.

### Bloco 3 — Polish + Deploy

- **MX204** — Explicar decisão: drawer no app Governanca + Auditoria
  mostrando policy_evaluations row (policy_name, matched_rule JSON,
  parameters JSON, reason). Para proposals com auto_resolved=true,
  exibir badge "Auto-aprovado por política" / "Auto-rejeitado".

- **MX205** — Métricas no dashboard do Gestor:
  - Card "Políticas ativas: X" + "Avaliações este mês: Y"
  - Mini chart 30 dias (allow/deny/require_approval barras empilhadas)
  - Top 5 intents mais avaliados
  - Taxa auto-aprovação / auto-rejeição / escalação

- **MX206** — Testes + deploy + docs:
  - pnpm typecheck && pnpm lint && pnpm test
  - supabase db push --linked (3 novas migrations a aplicar)
  - git push origin main
  - Atualizar SPRINT_LOG.md e CHANGELOG.md

---

## Como retomar

```
Estou retomando Super Sprint A (Policy Engine) no Aethereos.
Continue a partir do MX201 (Policy Studio CRUD).

Estado:
- HEAD: b559f98 (push para main feito)
- MX197-MX200 completos
- Engine funcional + integrado com Copilot
- Pendente: MX201-MX206 (UI + métricas + deploy)

Roadmap em docs/sprint-prompts/SUPER_SPRINT_A_POLICY_ENGINE.md
Pickup detalhado em docs/runbooks/super-sprint-a-pickup.md
```

## Notas técnicas para retomada

- **js-yaml** ainda não instalado. Necessário antes do MX201.
- **3 migrations** novas (`20260510000001/2/3`) ainda não rodadas em
  produção remoto. `supabase db push --linked` no MX206.
- **Cache invalidation** já tem helper (`invalidatePolicyCache`); chamar
  no Policy Studio após CRUD.
- **policy_evaluations.proposal_id** referencia agent_proposals criada
  via FK ON DELETE SET NULL. OK.
- **Mapping INTENT_TYPE_TO_ACTION_ID** atualmente cobre 5 intents do
  Copilot legado. Quando outros componentes (Magic Store etc.) emitirem
  intents, expandir o mapa em `browser-evaluator.ts`.
