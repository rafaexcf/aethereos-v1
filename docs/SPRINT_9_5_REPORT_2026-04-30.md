# Sprint 9.5 Report — 2026-04-30

**Tipo:** Sprint cirúrgico (bug fix only)  
**Duração:** ~4 horas  
**Status:** ENCERRADO — EXIT 0 em ci:full E test:smoke

## Origem

Sprint 9 foi declarado concluído com EXIT 0 de CI e ADR-0021 ("Camada 1 pronta para testes manuais"). Em sessão de smoke test executada por humano em 2026-04-30, 6 bugs bloqueadores foram descobertos.

## Bugs originais (6 listados no sprint)

| #   | Bug                                                               | Fix                                                 | Milestone |
| --- | ----------------------------------------------------------------- | --------------------------------------------------- | --------- |
| 1   | `.env.local.example` com placeholder literal                      | Template atualizado + script setup-env.sh           | MX27      |
| 2   | `scp-worker` script `dev` sem `--env-file`                        | Adicionado `--env-file=../../.env.local`            | MX29      |
| 3   | `.env.local.example` sem variáveis `VITE_*`                       | Bloco VITE\_\* adicionado ao template               | MX27      |
| 4   | `apps/shell-commercial/.env.local` nunca criado                   | `setup-env.sh` cria automaticamente                 | MX28      |
| 5   | `localhost` vs `127.0.0.1` CORS                                   | Padronizado para `127.0.0.1` em todos os env files  | MX30      |
| 6   | `GRANT USAGE ON SCHEMA kernel` ausente para `supabase_auth_admin` | Migration `20260430000014_fix_auth_hook_grants.sql` | MX26      |

## Bugs adicionais descobertos durante o sprint

| #   | Bug                                                                                                              | Fix                                                         | Status                                    |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| 6b  | Hook retorna SQL NULL quando user sem memberships (`to_jsonb(NULL::text)` = SQL NULL, quebra cadeia `jsonb_set`) | Migration `20260430000015_fix_hook_null_active_company.sql` | ✅ Corrigido                              |
| 7   | Seed: campo `metadata` não existe em `kernel.companies`                                                          | Não corrigido (R10 — fora dos 6 bugs originais)             | Anotado                                   |
| 8   | Seed: fallback de user lookup usa `schema() hack` que não funciona                                               | Não corrigido (R10)                                         | Anotado                                   |
| 9   | `service_role` sem grants em tabelas do schema kernel (BYPASSRLS mas sem table-level privileges)                 | Migration `20260430000016_kernel_service_role_grants.sql`   | ✅ Corrigido (necessário para smoke test) |
| 10  | `kernel.files` sem `GRANT SELECT` para `authenticated`                                                           | Não corrigido (R10)                                         | Anotado para Sprint 10                    |

## Smoke test executado

```
=== Aethereos Smoke Test — Sprint 9.5/MX31 ===
[T1] Login retorna HTTP 200 + JWT válido           ✅
[T2] JWT contém: companies, active_company_id, is_staff  ✅
[T3] Query REST autenticada não retorna erro HTTP  ✅
=== Resultado: 5 ok, 0 falha(s) ===
```

JWT confirmado com:

- `companies: ["f0000000-0000-0000-0000-000000000001"]`
- `active_company_id: "f0000000-0000-0000-0000-000000000001"`
- `is_staff: false`

## Aprendizado principal

**CI verde ≠ produto funciona.** `pnpm ci:full` valida código — não valida runtime. O agente nunca deve declarar sprint encerrado baseado apenas em CI sem executar smoke test de login real.

ADR-0022 formaliza o gate duplo: `pnpm ci:full` AND `pnpm test:smoke` para todo sprint que toca auth, env, ou migrations.

## O que precisa ser feito pelo humano

1. **Smoke test manual no browser**: abrir `http://127.0.0.1:5174`, logar com `ana.lima@meridian.test / Aethereos@2026!`, navegar pelos apps. O seed ainda tem bugs (#7, #8) que impedem dados realistas — as telas de listagem estarão vazias.

2. **Fix dos bugs #7 e #8 no seed** (para Sprint 10): remover `metadata` do companies upsert, corrigir user lookup para usar `supabase.auth.admin.listUsers()`.

3. **Fix do bug #10** (para Sprint 10): adicionar `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kernel TO authenticated` para garantir que todos os apps tenham acesso às tabelas.

## Dívidas para Sprint 10

1. Fixes #7 e #8 no seed para dados realistas
2. Fix #10 — grants authenticated em todas as tabelas kernel
3. Playwright E2E no browser (ADR-0022 meta futura)
4. Deploy em staging (Vercel preview + Supabase cloud)
5. IaC Pulumi
