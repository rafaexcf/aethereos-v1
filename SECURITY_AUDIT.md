# SECURITY_AUDIT.md — Aethereos Sprint 20 (MX106)

> Auditoria de segurança pré-staging. Estado em **2026-05-04**.
> Ref: SPRINT_20_PROMPT.md MX106 + SECURITY_GUIDELINES.md.

---

## Resumo executivo

| Item                                | Status    |
| ----------------------------------- | --------- |
| RLS habilitado em kernel.\*         | 68/68 ✅  |
| Tabelas kernel sem policy           | 0/68 ✅   |
| Anon role acesso a kernel.\*        | DENIED ✅ |
| Storage buckets privados (5)        | OK ✅     |
| Storage buckets públicos (3)        | OK ✅     |
| Edge Functions com JWT obrigatório  | 9/11 ✅   |
| Edge Functions públicas (whitelist) | 2/11 ✅   |
| pnpm audit (critical+high)          | 0 ✅      |
| pnpm audit (moderate)               | 0 ✅      |

**Veredito: APROVADO PARA STAGING.** Nenhum bloqueador.

---

## 1. RLS em kernel.\*

68/68 tabelas com `rowsecurity=true`:

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='kernel';
-- 68 rows, todas com t (true)
```

68/68 tabelas com pelo menos 1 policy ativa:

```sql
SELECT count(distinct tablename) FROM pg_policies WHERE schemaname='kernel';
-- 68
```

Total de policies: **99** (algumas tabelas têm policies separadas para SELECT/INSERT/UPDATE/DELETE).

### Tabelas auditadas (68)

agent_capabilities, agent_proposals, agents, alarms, audit_log, automations,
browser_bookmarks, browser_history, calculator_history, calendar_defs,
calendar_events, chat_channel_members, chat_channels, chat_messages,
clock_preferences, companies, company_addresses, company_contacts,
company_modules, contact_addresses, contact_group_links, contact_groups,
contact_methods, contacts, context_records, copilot_conversations,
copilot_messages, documents, embeddings, employees, file_versions, files,
kanban_activity, kanban_attachments, kanban_boards, kanban_card_labels,
kanban_cards, kanban_checklist_items, kanban_columns, kanban_comments,
kanban_labels, media_files, meetings, mesa_layouts, note_label_links,
note_labels, notes, notifications, pdf_notes, people, poll_options,
poll_votes, polls, pomodoro_sessions, presentations, profiles, scp_outbox,
settings, spreadsheets, staff_access_log, task_lists, tasks,
tenant_memberships, trash_items, user_preferences, users, voice_recordings,
workspace_state.

Padrão das policies: `company_id = kernel.current_company_id()` (multi-tenant) ou `user_id = auth.uid()` (per-user) ou ambos.

### Função kernel.current_company_id()

Helper SQL central que lê `active_company_id` do JWT claim injetado pelo `custom_access_token` hook. Falha imediatamente se claim ausente — RLS bloqueia query.

---

## 2. Anon role acesso

Tested via `SET ROLE anon; SELECT * FROM kernel.companies;`:

```
ERROR: permission denied for schema kernel
```

✅ Anon **não tem nem USAGE** no schema kernel. Isolamento garantido no nível de schema, não dependendo só de RLS.

GRANT statements em kernel.\*: apenas `authenticated` + `service_role`. Confirmado via:

```sql
SELECT grantee FROM information_schema.role_table_grants
WHERE table_schema='kernel' AND grantee IN ('anon','PUBLIC');
-- 0 rows
```

---

## 3. Storage buckets

| Bucket            | Public | Justificativa                        |
| ----------------- | ------ | ------------------------------------ |
| `company-logos`   | true   | Logo de empresa exibido publicamente |
| `user-avatars`    | true   | Avatar de usuário exibido em UIs     |
| `user-wallpapers` | true   | Wallpapers reusáveis entre users     |
| `kernel-files`    | false  | Drive privado, RLS por company_id    |
| `kernel-media`    | false  | Camera/photos privados               |
| `kernel-meetings` | false  | Gravações de reuniões                |
| `kernel-pdfs`     | false  | PDFs de documentos                   |
| `kernel-voice`    | false  | Gravações de voz                     |

Todos os 5 buckets privados têm policies em `storage.objects` que validam `(storage.foldername(name))[1] = kernel.current_company_id()::text`.

---

## 4. Edge Functions

11 funções no `supabase/functions/`:

| Função                | verify_jwt     | Validação interna                             |
| --------------------- | -------------- | --------------------------------------------- |
| activate-module       | true (default) | getUser via JWT + active_company_id           |
| cnpj-lookup           | **false**      | Pre-auth (consulta CNPJ) — sem dados privados |
| complete-onboarding   | true           | getUser + atualiza perfil do user             |
| context-snapshot      | true           | getUser + active_company_id (Sprint 19)       |
| create-company        | true           | getUser + service_role insere                 |
| embed-text            | true           | Usa LITELLM_URL/KEY (server secrets)          |
| register-company      | **false**      | Cria user via Auth API (pre-auth)             |
| scp-publish           | true           | getUser + active_company_id + agent block     |
| staff-approve-company | true           | getUser + role check (`is_platform_admin`)    |
| staff-company-detail  | true           | getUser + role check                          |
| staff-list-companies  | true           | getUser + role check                          |

✅ As 2 funções `verify_jwt=false` (cnpj-lookup, register-company) são intencionalmente públicas (pre-auth flow). Nenhuma expõe dados de tenants.

---

## 5. Dependências (pós-MX104)

```bash
$ pnpm audit --audit-level=low
No known vulnerabilities found
```

Era: 1 critical + 4 high + 5 moderate (Sprint 19). Resolvido em MX104 via overrides em `pnpm.overrides`:

- `happy-dom >=20.8.9` → critical VM context escape + 2 high
- `serialize-javascript >=7.0.5` → high RCE via RegExp
- `drizzle-orm >=0.45.2` → high SQL injection
- `vite >=6.4.2` → moderate path traversal
- `uuid >=14.0.0` → moderate buffer bounds
- `postcss >=8.5.10` → moderate XSS
- `esbuild >=0.25.0` → moderate request leak

---

## 6. Pontos de atenção (não-bloqueadores)

1. **embed-text não valida user identity dentro da função** — apenas confia no `verify_jwt=true` da plataforma. Em pré-staging isso é aceitável; ataque exigiria JWT válido.
2. **agent_proposals expira via cron client-side** (Sprint 17 MX86) — não há job server-side. KL existente, não bloqueador.
3. **scp_outbox não tem retention policy** — eventos antigos acumulam indefinidamente. Recomenda-se job de purge para `status='published' AND created_at < NOW() - 90 days` em F2.

---

## 7. Próximos passos pós-staging

- Cron de purge para `scp_outbox.published`
- Pen-test caixa-preta no staging
- Rate-limiting per-user em scp-publish (atualmente nenhum)
- Renovação de JWT a cada deploy (rotation)
