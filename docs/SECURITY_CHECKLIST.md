# Security Checklist — Aethereos Camada 1

Sprint 31 / MX174 — Gate 6 da Fase 1 (parcial). Cobre os 13 vetores de
ameaça canônicos da Fundamentação. Pen test externo permanece pendente
(contratar após 30 dias de staging dogfood).

Última verificação: 2026-05-05
Próxima revisão obrigatória: 2026-08-05 (90 dias) ou após mudança em
auth/RLS/Edge Functions.

---

## Status global

| #   | Vetor                            | Status   | Última verificação |
| --- | -------------------------------- | -------- | ------------------ |
| 1   | Tenant cross-read (RLS bypass)   | MITIGADO | 2026-05-05         |
| 2   | Tenant cross-write               | MITIGADO | 2026-05-05         |
| 3   | Privilege escalation             | MITIGADO | 2026-05-05         |
| 4   | Auth bypass                      | MITIGADO | 2026-05-05         |
| 5   | CSRF                             | MITIGADO | 2026-05-05         |
| 6   | XSS                              | MITIGADO | 2026-05-05         |
| 7   | SQL injection                    | MITIGADO | 2026-05-05         |
| 8   | Insecure direct object reference | MITIGADO | 2026-05-05         |
| 9   | Data exposure in logs            | MITIGADO | 2026-05-05         |
| 10  | Excessive data exposure          | MITIGADO | 2026-05-05         |
| 11  | Broken auth                      | MITIGADO | 2026-05-05         |
| 12  | Service role key exposure        | MITIGADO | 2026-05-05         |
| 13  | Iframe escape                    | MITIGADO | 2026-05-05         |

**Pendente:** pen test externo (Gate 6 só fecha 100% após contratação
e relatório). Programar para sprint pós-dogfood.

---

## 1. Tenant cross-read (RLS bypass)

**Risco:** usuário do tenant A consegue ler dados do tenant B via
endpoint REST/PostgREST.

**Mitigação:**

- Todas as 70+ tabelas em `kernel.*` têm `ENABLE ROW LEVEL SECURITY`.
- Policy padrão: `USING (company_id = kernel.current_company_id())`.
- `kernel.current_company_id()` retorna `auth.jwt() ->> 'app_metadata' ->> 'active_company_id'`.
- Hooks de troca de empresa atualizam JWT antes de qualquer request.

**Evidência:**

- `pnpm test:isolation` — 13 cenários de cross-tenant via RLS (Sprint 9.6).
- `SECURITY_AUDIT.md` Sprint 20 — auditoria de 68/68 tabelas com policy.
- E2E Playwright `cross-tenant-rls.spec.ts` — testa GET 404/empty cross-tenant.

**Re-validação:** rodar `pnpm test:isolation` após qualquer migration
que crie tabela `kernel.*`.

---

## 2. Tenant cross-write

**Risco:** usuário do tenant A escreve em registro do tenant B.

**Mitigação:**

- Mesma RLS policy do vetor 1 com `WITH CHECK` igualmente.
- Trigger `kernel.scp_outbox_validate` audita inserção em outbox e bloqueia
  operações 12.4 INVARIANT (Fundamentação) — `kernel.is_invariant_operation`.

**Evidência:**

- E2E `cross-tenant-write.spec.ts` (planejado em Sprint 9.6 §3).
- Migrations `20260430000009_scp_outbox_audit.sql` e
  `20260430000017_fix_scp_outbox_validate.sql`.

---

## 3. Privilege escalation (member → admin)

**Risco:** member consegue se promover a admin/owner ou aprovar próprio
proposal.

**Mitigação:**

- Tabelas `tenant_memberships.role` (CHECK in 'owner','admin','member')
  - `kernel.company_roles` para roles custom — ambas RLS protegem
    ownership do registro.
- UI do Gestor → Cargos exige `tenant_memberships.role IN ('owner','admin')`
  para edit (Sprint 28 MX153/MX154).
- `lib/effective-permissions.ts` (Sprint 28 MX155) tem 9 unit tests
  cobrindo deny prevalecendo, owner/admin sempre vendo, sentinel `__all__`.
- Agent proposals (Sprint 17): `agent.action.approved` exige `actor.type=human`,
  agent NUNCA aprova próprio proposal.

**Evidência:**

- `__tests__/unit/effective-permissions.test.ts` — 9/9 passando.
- Manual review via Gestor → Cargos hierarquia.

---

## 4. Auth bypass

**Risco:** request sem JWT ou com JWT inválido acessa endpoint protegido.

**Mitigação:**

- Edge Functions verificam `Authorization: Bearer <jwt>` no header.
- Função `verifyJwt()` em `_shared/` valida assinatura e expiração.
- PostgREST recusa requests sem JWT em tabelas com RLS habilitada
  (anon role não tem grant em `kernel.*` exceto kernel.companies via
  fluxo de signup).
- Health endpoint (MX171) é a única exceção pública (R9 do sprint).

**Evidência:**

- `force-logout/index.ts`, `export-company-data/index.ts` — auth check
  no início.
- E2E unauthenticated-cross-tenant.spec.ts testa 401/404 sem JWT.

---

## 5. CSRF

**Risco:** site malicioso submete requests autenticados em nome do
usuário.

**Mitigação:**

- Supabase Auth usa cookies `SameSite=Lax` e `Secure` (HTTPS-only).
- Edge Functions com CORS allowlist explícita
  (`_shared/cors.ts` lê `ALLOWED_ORIGINS`, fallback dev em localhost).
- Requests state-changing exigem JWT no header `Authorization` — não
  cookie — então mesmo CSRF clássico não envia o token.

**Evidência:**

- `_shared/cors.ts` Sprint 27 MX142.
- Nenhum endpoint state-changing depende de cookie de auth.

---

## 6. XSS

**Risco:** atacante injeta HTML/JS via input do usuário.

**Mitigação:**

- React escapa por padrão em `{value}`. Nenhum uso de
  `dangerouslySetInnerHTML` em código de produção (verificar com grep).
- Iframes de apps externos têm `sandbox` (sem `allow-top-navigation`,
  sem `allow-same-origin` quando possível) — Sprint 23 ADR.
- Headers de produção (Sprint 27 MX147): `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`.

**Evidência:**

- `vercel.json` — headers configurados.
- Lint `react-best-practices` checa `dangerouslySetInnerHTML`.
- `apps/shell-commercial/src/components/os/AppFrame.tsx` — sandbox
  iframes.

---

## 7. SQL injection

**Risco:** input do usuário é concatenado em SQL e executado.

**Mitigação:**

- Supabase client usa PostgREST — todas queries são parametrizadas.
- `postgres` package no scp-worker usa tagged templates (`sql\`...\``)
  com placeholders.
- Edge Functions nunca constroem SQL string — sempre `.from().select()`
  ou `client.rpc()`.
- CI bloqueia `import { drizzle }` em código browser
  (`pnpm deps:check`).

**Evidência:**

- Code review: `grep -rn "sql.unsafe\|exec\(.*\${" apps packages` retorna 0
  ocorrências em produção.

---

## 8. Insecure direct object reference (IDOR)

**Risco:** mudar `:id` na URL acessa recurso de outro tenant/usuário.

**Mitigação:**

- RLS força `company_id = current_company_id()` em SELECT/UPDATE/DELETE.
- IDs são UUIDs (gen_random_uuid) — não enumeráveis.
- App-level: hooks como `useTaskById` retornam null se RLS filtrou.

**Evidência:**

- E2E cross-tenant access by id retorna 404/empty.

---

## 9. Data exposure in logs

**Risco:** API keys, JWTs, senhas, PII em logs de produção.

**Mitigação:**

- `console.log` proibido em produção (CLAUDE.md §5 — bloqueado em CI).
- Logs estruturados via `jlog()` em scp-worker — schema explícito,
  sem `payload` cru com chaves.
- DATABASE_URL mascarado em logs do scp-worker (regex em main.ts).
- `[obs] error` (Sprint 31 MX171) loga só `msg`, `tag`, `stack` — não
  dados arbitrários do estado.

**Evidência:**

- `grep -rn "console.log" apps/shell-commercial/src apps/scp-worker/src`
  retorna apenas dev-only ou eslint-disabled.

---

## 10. Excessive data exposure

**Risco:** API retorna mais campos/registros do que o cliente precisa,
incluindo internos.

**Mitigação:**

- `.select('id,name,...')` em queries — nunca `select('*')` em UI
  pública.
- RLS limita escopo. Endpoints batch (export-company-data MX167)
  são owner-only, rate-limited 3/h, capped 50MB.
- Nenhuma tabela exposta retorna `password_hash`, `service_role_key`,
  `mfa_secret`.

**Evidência:**

- Edge Function `export-company-data` exclui colunas sensíveis (R15
  Sprint 30).

---

## 11. Broken auth

**Risco:** session fixation, weak password, no MFA, no lockout.

**Mitigação:**

- Supabase Auth gerencia sessão (refresh tokens rotativos).
- Política de senhas configurada em Supabase (mínimo, complexidade —
  Sprint 30 MX168 documenta config).
- 2FA TOTP via `mfa.enroll`/`challengeAndVerify` (Sprint 30 MX163).
- Política `enforce_2fa` (`none|admins|all`) persistida em
  `kernel.companies.settings` (Sprint 30 MX164).
- `kernel.login_history` registra cada login (IP, UA) — Sprint 30 MX165.
- Force-logout via Edge Function (Sprint 30 MX165).
- Rate-limit em endpoints de auth (Sprint 27 MX147).

**Evidência:**

- TabAutenticacao2FA, TabSessoesAtivas e TabAlertasRisco no Gestor.
- Migration `20260508000001_kernel_login_history.sql`.

---

## 12. Service role key exposure

**Risco:** SUPABASE_SERVICE_ROLE_KEY vazar no frontend e bypass total.

**Mitigação:**

- `SUPABASE_SERVICE_ROLE_KEY` só existe em Edge Functions (Deno env).
- Frontend usa apenas `VITE_SUPABASE_ANON_KEY` (público por design).
- Driver Model bifurcado (ADR-0020): browser usa `SupabaseBrowserDataDriver`,
  server usa `SupabaseDatabaseDriver` — CI bloqueia mistura.
- Bloqueio em CI: `import { SupabaseDatabaseDriver }` em código browser
  → fail (CLAUDE.md §5).
- Bloqueio: escrita direta em `kernel.scp_outbox` de browser → fail
  (usar Edge Function scp-publish).

**Evidência:**

- `pnpm deps:check` no CI cobre os imports cross-camada.
- Code review: nenhum `process.env.SUPABASE_SERVICE_ROLE_KEY` em
  `apps/shell-commercial/`.

---

## 13. Iframe escape

**Risco:** app embarcado consegue navegar a janela top, ler cookies do
shell, ou acessar APIs do shell.

**Mitigação:**

- AppFrame sandbox: `sandbox="allow-scripts allow-forms allow-popups"`
  — sem `allow-top-navigation`, sem `allow-same-origin` para apps
  externos da Magic Store.
- Bridge SDK (`@aethereos/client`) usa `postMessage` com origem checada
  - CSP (`Content-Security-Policy: frame-ancestors 'self'`).
- Apps internos (mesmo origem) recebem capability tokens com escopo
  limitado, expirando em 15 min.

**Evidência:**

- `apps/shell-commercial/src/components/os/AppFrame.tsx` — sandbox
  attributes.
- Sprint 23 ADR — Manifesto + Permissões.
- `packages/client/src/bridge.ts` — origem checked.

---

## Próximos passos (fora deste sprint)

- [ ] Pen test externo (Gate 6 fecha 100% só após relatório).
- [ ] Bug bounty publicado em `SECURITY.md`.
- [ ] CSP estrito (`script-src 'self'`) — atualmente permissivo para
      Vite dev.
- [ ] Rotação automatizada de service_role_key (Vault).
- [ ] WAF na frente do Vercel para bloqueio de bots agressivos
      (depois de avaliar custo).

Versão: 1.0.0
