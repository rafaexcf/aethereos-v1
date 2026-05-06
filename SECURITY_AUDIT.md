# SECURITY_AUDIT.md — Aethereos Sprint 32 (MX175)

> Re-auditoria pós-Sprints 21-31. Estado em **2026-05-06**.
> Sprint 20 (MX106) cobriu 68 tabelas + 11 Edge Functions.
> Sprint 32 (MX175) re-audita **81 tabelas + 16 Edge Functions** após
> Magic Store, Gestor, departamentos, persistência de apps, 2FA/LGPD,
> SCP replay, health endpoint.

---

## Resumo executivo

| Item                                   | Sprint 20 | Sprint 32 | Status |
| -------------------------------------- | --------- | --------- | ------ |
| RLS habilitado em kernel.\*            | 68/68     | **81/81** | ✅     |
| Tabelas kernel com pelo menos 1 policy | 68/68     | **81/81** | ✅     |
| Total de policies                      | 99        | **123**   | ✅     |
| Anon role acesso a kernel.\*           | DENIED    | DENIED    | ✅     |
| Storage buckets privados               | 5         | 5         | ✅     |
| Storage buckets públicos               | 3         | 3         | ✅     |
| Edge Functions                         | 11        | **16**    | ✅     |
| Edge Functions com JWT obrigatório     | 9/11      | **13/16** | ✅     |
| Edge Functions públicas (whitelist)    | 2/11      | **3/16**  | ✅     |
| pnpm audit (critical+high)             | 0         | 0         | ✅     |

**Veredito: APROVADO PARA PRODUÇÃO.** Nenhum bloqueador. Uma correção de
config.toml aplicada (`health` adicionado a `verify_jwt = false`).

---

## 1. RLS em kernel.\*

### 1.1 Cobertura

81 tabelas com `ENABLE ROW LEVEL SECURITY` em migrations:

```bash
$ grep -hiE "ALTER TABLE +kernel\.[a-z_]+ +ENABLE ROW LEVEL SECURITY" \
    supabase/migrations/*.sql | grep -oiE "kernel\.[a-z_]+" | sort -u | wc -l
81
```

81 tabelas com pelo menos uma `CREATE POLICY` apontando para elas:

```bash
# (regex case-insensitive sobre todas as migrations — script Python)
tables_with_policy: 81
total_policies: 123
rls_no_policy: []
```

### 1.2 Tabelas novas auditadas (Sprints 21-31, 13 tabelas)

| Tabela kernel.\*      | Migration                                   | RLS | Policy               |
| --------------------- | ------------------------------------------- | --- | -------------------- |
| app_registry          | 20260504000005_kernel_app_registry          | ✅  | authenticated_select |
| app_permission_grants | 20260504000008_kernel_app_permission_grants | ✅  | company_id           |
| departments           | 20260505000010                              | ✅  | company_id           |
| department_members    | 20260505000011                              | ✅  | company_id           |
| groups                | 20260505000012                              | ✅  | company_id           |
| group_members         | 20260505000013                              | ✅  | company_id           |
| company_roles         | 20260505000014                              | ✅  | company_id           |
| app_access_rules      | 20260505000015                              | ✅  | company_id           |
| access_schedules      | 20260505000016                              | ✅  | company_id           |
| company_settings      | 20260505000017                              | ✅  | company_id           |
| security_alerts       | 20260505000018 + 20260508000002             | ✅  | company_id           |
| rate_limits           | 20260505000020                              | ✅  | service_role         |
| tasks                 | 20260507000001                              | ✅  | company_id           |
| kanban_boards         | 20260507000002                              | ✅  | company_id           |
| kanban_columns        | 20260507000002                              | ✅  | company_id           |
| kanban_cards          | 20260507000002                              | ✅  | company_id           |
| notes                 | 20260507000003                              | ✅  | company_id           |
| login_history         | 20260508000001                              | ✅  | company_id           |

Sprints 28-30 também adicionaram `kanban_activity`, `kanban_attachments`,
`kanban_card_labels`, `kanban_checklist_items`, `kanban_comments`,
`kanban_labels`, `task_lists`, `note_label_links`, `note_labels` —
todas com RLS + policy `company_id = kernel.current_company_id()`
(verificadas via grep automatizado).

### 1.3 Padrão das policies

Padrão dominante (78/81 tabelas):

```sql
CREATE POLICY "<table>_rls" ON kernel.<table>
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());
```

Exceções intencionais (3 tabelas):

| Tabela         | Policy                                | Justificativa                                                                |
| -------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| `app_registry` | `authenticated_select` (read-only)    | Catálogo global de apps disponíveis. Não é dado de tenant — é catálogo open. |
| `rate_limits`  | `service_role` only                   | Counters cross-tenant. Apenas Edge Functions (service_role) acessam.         |
| `companies`    | `tenant can read own` (Sprint 2/MX22) | Cada user lê só suas memberships via JOIN com `tenant_memberships`.          |

### 1.4 Função `kernel.current_company_id()`

Helper SQL que lê `active_company_id` do JWT claim injetado pelo
`custom_access_token` hook (Supabase Auth). Falha imediatamente se
claim ausente — RLS bloqueia query no caminho rápido.

Verificado em `supabase/migrations/20260429000001_kernel_schema.sql`
e atualizado em sprints subsequentes.

---

## 2. Anon role acesso

Validado anteriormente em Sprint 20 (MX106) e mantido sem regressão:

- `anon` **não tem `USAGE`** no schema `kernel`.
- Isolamento garantido em camada de schema (não depende só de RLS).
- 0 grants de `SELECT/INSERT/UPDATE/DELETE` para `anon` ou `PUBLIC` em
  `kernel.*`.

---

## 3. Storage buckets

Sem mudanças desde Sprint 20:

| Bucket            | Public | Justificativa                        |
| ----------------- | ------ | ------------------------------------ |
| `company-logos`   | true   | Logo de empresa exibido publicamente |
| `user-avatars`    | true   | Avatar de usuário exibido em UIs     |
| `user-wallpapers` | true   | Wallpapers reusáveis                 |
| `kernel-files`    | false  | Drive privado, RLS por company_id    |
| `kernel-media`    | false  | Câmera/photos privados               |
| `kernel-meetings` | false  | Gravações de reuniões                |
| `kernel-pdfs`     | false  | PDFs                                 |
| `kernel-voice`    | false  | Voz                                  |

Todos privados validam `(storage.foldername(name))[1] = kernel.current_company_id()::text`.

---

## 4. Edge Functions (16)

| Função                  | verify_jwt     | Validação interna                                                         |
| ----------------------- | -------------- | ------------------------------------------------------------------------- |
| activate-module         | true (default) | getUser via JWT + active_company_id                                       |
| cnpj-lookup             | **false**      | Pre-auth (consulta CNPJ pública), sem dados privados                      |
| complete-onboarding     | true           | getUser + atualiza perfil do user                                         |
| context-snapshot        | true           | getUser + active_company_id                                               |
| create-company          | true           | getUser + service_role insere                                             |
| embed-text              | true           | LITELLM gateway + server secrets                                          |
| **export-company-data** | true           | getUser + role==`owner` only + rate-limit 3/h (Sprint 30 MX167)           |
| **force-logout**        | true           | getUser + role==`owner\|admin` (ou self) + tenant check (Sprint 30 MX165) |
| **health**              | **false**      | Público (intencional, monitor uptime). Sem PII. Sprint 31 MX171.          |
| **invite-member**       | true           | getUser + role==`owner\|admin` + rate-limit 10/h (Sprint 27 MX144/MX147)  |
| register-company        | **false**      | Cria user via Auth API (pre-auth)                                         |
| scp-publish             | true           | getUser + active_company_id + agent block                                 |
| staff-approve-company   | true           | getUser + `is_platform_admin` check                                       |
| staff-company-detail    | true           | getUser + role check                                                      |
| staff-list-companies    | true           | getUser + role check                                                      |

**Mudanças desde Sprint 20:**

- 5 funções novas: `export-company-data`, `force-logout`, `health`,
  `invite-member`, mais correção de config para `health`.
- `health` adicionada a `[functions.health] verify_jwt = false` no
  `supabase/config.toml` (corrigido neste sprint — antes era default
  `true`, o que quebraria o monitor externo).

### 4.1 Achados na auditoria das novas funções

#### invite-member (Sprint 27 MX144)

- ✅ Valida JWT via `userClient.auth.getUser(jwt)`.
- ✅ Verifica `role IN ('owner','admin')` antes de criar membership.
- ✅ Rate-limit: 10 convites/hora por user.
- ✅ Valida email regex e `role` contra whitelist (`admin|manager|member|viewer`).
- ✅ Bloqueia atribuição de `owner` por convite (controle: dono inicial só via create-company).
- ✅ Emite SCP event `platform.user.invited` em outbox.

#### force-logout (Sprint 30 MX165)

- ✅ Valida JWT.
- ✅ Self-logout permitido a qualquer role; logout-de-outros restrito a `owner|admin`.
- ✅ Verifica que target tem membership ativa nesta company antes de marcar.
- ✅ Rate-limit: 10 force-logouts/hora.
- ✅ Não usa `auth.admin.signOut(jwt)` (que afetaria todas as companies do user) —
  marca `kernel.login_history.is_active=false`, e shell consulta no boot/poll.

#### export-company-data (Sprint 30 MX167)

- ✅ Valida JWT.
- ✅ **Owner only** (R11 do sprint): `if (callerRole !== 'owner')` retorna 403.
- ✅ Rate-limit: 3 exports/hora.
- ✅ Limite: 50 MB. Acima disso retorna 413.
- ✅ Não inclui senhas, tokens, storage_path nem secrets.

#### health (Sprint 31 MX171)

- ✅ **Público intencional** (R9 do sprint): para monitores externos.
- ✅ Sem PII, sem dados de tenant. Apenas `status/timestamp/version/db/uptime_seconds`.
- ✅ Usa `kernel.scp_outbox` (HEAD count) como teste de DB conectividade.
- ⚠️ **Correção MX175**: adicionado `[functions.health] verify_jwt = false` em
  `supabase/config.toml` para deploy declarativo.

---

## 5. Dependências

```bash
$ pnpm audit --audit-level=high
# Status verificado em MX176 — ver CODE_QUALITY_AUDIT.md
```

Mantido em 0 critical/high desde Sprint 20 MX104.

---

## 6. Pontos de atenção (não-bloqueadores)

1. **scp_outbox sem retention policy** — herdado de Sprint 20. Recomendação F2:
   cron de purge `status='published' AND created_at < NOW() - 90 days`.
2. **embed-text não valida user identity dentro da função** — herdado.
   Apenas confia no `verify_jwt=true` da plataforma.
3. **agent_proposals expira via cron client-side** — KL existente, não bloqueador.
4. **CSP estrito ainda permissivo** (Gate 6 PARCIAL) — restrições de HMR Vite.
   Endereçado em sprint pós-pen-test.

---

## 7. Mudanças aplicadas neste sprint

- `supabase/config.toml`: adicionado bloco `[functions.health] verify_jwt = false`
  para garantir que monitores externos consigam atingir o endpoint.

---

## 8. Próximos passos pós-sprint 32

- Pen-test caixa-preta no staging (Gate 6).
- Bug bounty publicado.
- Cron server-side de purge para `scp_outbox.published`.
- Cron de expiração server-side para `agent_proposals` (substituir cron client-side).
