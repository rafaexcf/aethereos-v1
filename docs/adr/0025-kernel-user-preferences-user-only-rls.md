# ADR-0025 — `kernel.user_preferences` com RLS por usuário (sem `company_id`)

**Status:** Proposto
**Data:** 2026-05-03
**Sprint:** 12 — Continuidade de OS (preferências, workspace, automações)
**Subordinado a:** ADR-0014, ADR-0016, ADR-0020
**Rigidez:** [DEC]

---

## Contexto

O shell-commercial sincroniza preferências do usuário entre dispositivos: tema (dark/light), ordem do Dock, preferências de notificação, `lock_timeout_minutes` do idle lock. Antes do Sprint 12 essas preferências viviam apenas em `localStorage`, o que quebra a continuidade de OS quando o usuário troca de máquina ou navegador.

O padrão canônico de tabelas em `kernel.*` é multi-tenant via RLS dupla: `user_id = auth.uid() AND company_id = current_setting('app.current_company_id')` (ADR-0016, ADR-0020). Esse padrão pressupõe que todo dado do usuário é dado **dentro de uma empresa**.

Preferências pessoais quebram essa premissa. O tema de um usuário (dark/light) deve segui-lo entre as várias empresas das quais ele participa — não faz sentido o tema voltar a "system default" quando ele troca a empresa ativa. O mesmo vale para `lock_timeout_minutes` (preferência de segurança individual) e ordem do Dock (afinidade pessoal).

Aplicar o filtro multi-tenant exigiria duplicar a mesma preferência em N linhas (uma por empresa do usuário) e implementar lógica de "espelhar entre empresas", o que viola P3 (configuração supera código customizado) e P6 (guardrails mecânicos).

---

## Decisão

Criar `kernel.user_preferences` como exceção controlada ao padrão multi-tenant:

- Schema: `kernel.user_preferences (user_id UUID, key TEXT, value JSONB, updated_at TIMESTAMPTZ)` com `PRIMARY KEY (user_id, key)`.
- RLS: **apenas** `user_id = auth.uid()` — sem filtro por `company_id`.
- Realtime publication habilitada para push cross-device.
- Migração: `supabase/migrations/20260503000012_kernel_user_preferences.sql`.

**Hook de consumo:** `apps/shell-commercial/src/hooks/useUserPreference.ts`.

- Cache em `localStorage` para primeiro paint instantâneo (sem flash de tema errado).
- Hidratação assíncrona da row do Postgres no mount.
- Subscrição Realtime para updates cross-device sem polling.
- Bootstrap centralizado em `useUserPreferencesLifecycle.ts`.

**Chaves cravadas no Sprint 12:**

| key                    | value JSONB                                 | Consumer      |
| ---------------------- | ------------------------------------------- | ------------- |
| `theme`                | `"dark" \| "light" \| "system"`             | ThemeProvider |
| `dock_order`           | `string[]` (app IDs)                        | Dock          |
| `notification_prefs`   | `{ doNotDisturb: boolean, sound: boolean }` | useNotify     |
| `lock_timeout_minutes` | `number` (5..120)                           | useIdleLock   |

---

## Alternativas rejeitadas

### A1 — Manter o padrão multi-tenant e duplicar por empresa

Inserir uma linha por `(user_id, company_id, key)` e propagar updates entre elas via trigger.

**Rejeitado:** complexidade desnecessária. Trigger que sincroniza N linhas viola P6 (guardrails mecânicos preferíveis a triggers ad-hoc); risco de drift se uma das empresas for hard-deleted; quebra continuidade de tema durante o `switchCompany`.

### A2 — Manter em `localStorage` apenas

**Rejeitado:** quebra continuidade entre dispositivos, que é parte do produto OS. Usuário em desktop + mobile + tablet espera o mesmo tema/Dock.

### A3 — Tabela em schema próprio (`profile.preferences`)

Criar schema `profile.*` para dados estritamente pessoais.

**Rejeitado por ora:** prematuro — só há um caso de uso. Reavaliar em Sprint 14+ se aparecerem 3+ tabelas com mesma característica (ex: `profile.devices`, `profile.api_tokens`).

---

## Consequências

### Positivas

- Continuidade de tema, Dock e idle-lock cross-device cross-company.
- Primeiro paint instantâneo via cache local (zero FOUC).
- Realtime push elimina polling.

### Negativas / trade-offs

- **Quebra do padrão canônico multi-tenant** — primeira tabela em `kernel.*` sem `company_id`. Documentado aqui como exceção deliberada.
- Auditoria fica fora do escopo `company_id` — não aparece em relatórios filtrados por empresa.
- Se eventualmente houver requisito legal de "preferências corporativas obrigatórias" (ex: empresa fixa tema), exigirá segunda tabela `kernel.company_preferences` com lógica de override.

---

## Regras operacionais

1. `kernel.user_preferences` é a **única** tabela em `kernel.*` permitida sem filtro `company_id`. Novas tabelas com mesmo padrão exigem ADR.
2. Hooks que consomem preferências devem sempre usar `useUserPreference()` — nunca query direta.
3. Adicionar nova `key` requer atualização da tabela acima neste ADR + Zod schema do `value` no hook.

---

## Referências

- Migração: `supabase/migrations/20260503000012_kernel_user_preferences.sql`
- Hook: `apps/shell-commercial/src/hooks/useUserPreference.ts`
- Bootstrap: `apps/shell-commercial/src/hooks/useUserPreferencesLifecycle.ts`
- ADR-0016 — Camada 1 cloud-first (RLS por `company_id`)
- ADR-0020 — Bifurcação driver server/browser (Realtime via `SupabaseBrowserDataDriver`)
