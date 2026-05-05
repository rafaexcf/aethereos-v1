# SPRINT 11 — Schemas multi-tenant + cadastro CNPJ + aprovação Master Admin

> **Tipo:** Sprint de portagem com escopo controlado. Traz os schemas fundamentais de V2 (profiles, companies estendida, company_users, company_modules, employees enxuto, company_addresses, company_contacts) + Edge Function de lookup CNPJ via BrasilAPI + UI mínima de cadastro e aprovação.
>
> **NÃO traz:** Onboarding wizard 6 passos. App RH com CRUD employees. Apps verticais (Comércio/LOGITIX/ERP). Estes vão para Sprints 12, 13 e além.
> **Schema employees enxuto:** ~70 campos (HR puro). Os 110+ campos comerciais/sales/buy do V2 ficam para sprints do ERP/Comércio.
>
> **Estimativa:** 8-12 horas. Custo: $60-95.

---

## CONTEXTO

V2 (`~/Projetos/aethereos-v2/`) tem schema rico de multi-tenant + RH + CNPJ. Foi explorado em ~6 meses, está documentado em `CLAUDE.md` e `FLUXO-COMPLETO-AETHEREOS.md` com regras invariantes claras (Fluxo A = CNPJ novo, Fluxo B = CNPJ existente, "todo user DEVE ter employee", employee vinculado user_id não exclui).

V1 tem fundação arquitetural mas modelo de dados está mínimo. `kernel.companies` só tem `id`, `name`, `slug`, `metadata`. Não tem `cnpj`, não tem `cnpj_data`, não tem `status` pending/active. Não existe `kernel.profiles`, não existe `kernel.employees`, não existe `kernel.company_users` (existe `tenant_memberships` mas com modelo diferente — não tem `status` invitation flow, não tem role completo).

**Sprint 11 alinha modelo de dados V1 com V2** sem implementar UI complexa. Apenas o mínimo de UI para o humano testar: cadastro com CNPJ funcional + aprovação manual no painel staff.

Decisões prévias do humano:

1. **Sprint 11 enxuto, mas com ALGUMA UI** — cadastro CNPJ básico no fim do sprint (humano quer ver tela funcionando)
2. **Schema employees: meio termo (60-80 campos HR puro)** — campos comerciais (commissions, sell*\*, buy*\*, sales_targets) ficam para sprint do ERP/Comércio

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code no V1 (`~/Projetos/aethereos`). V2 (`~/Projetos/aethereos-v2`) é apenas referência de leitura — você NÃO escreve em V2.

### Leituras obrigatórias

**Em V1:**

- `CLAUDE.md`
- `SPRINT_LOG.md` — Sprint 10 deve estar fechado
- `supabase/migrations/` — listar todas para entender estado atual
- `supabase/migrations/20260429000003_m22_create_company_fn.sql` — função `create_company_for_user` que vamos modificar/substituir
- `supabase/migrations/20260430000017_fix_scp_outbox_validate.sql` — fix do bug #11
- `supabase/functions/create-company/index.ts` — Edge Function que vai ser substituída
- `apps/shell-commercial/src/routes/select-company.tsx` (e/ou rota de registro existente)
- `apps/shell-commercial/src/routes/login.tsx`
- `tooling/seed/src/index.ts` e auxiliares (`companies.ts`, `users.ts`, etc.) — vão ser reescritos
- `packages/scp-registry/src/` ou similar — schemas Zod de eventos SCP
- ADR-0014 a 0023 — decisões cravadas
- `docs/SPRINT_10_REPORT*.md` se existir

**Em V2 (referência):**

- `~/Projetos/aethereos-v2/CLAUDE.md` — fluxos de cadastro A e B (linhas 30-90 documentam regras invariantes)
- `~/Projetos/aethereos-v2/FLUXO-COMPLETO-AETHEREOS.md` (seções 1-5 sobre cadastro e aprovação)
- `~/Projetos/aethereos-v2/shared/schema/auth.ts` — profiles
- `~/Projetos/aethereos-v2/shared/schema/companies.ts` — companies, company_users, company_modules
- `~/Projetos/aethereos-v2/shared/schema/hr.ts` — employees (você vai usar APENAS os campos não-comerciais; ver lista de campos enxutos abaixo)
- `~/Projetos/aethereos-v2/shared/schema/minha-empresa.ts` — company_addresses e company_contacts
- `~/Projetos/aethereos-v2/shared/schema/enums.ts` — COMPANY_PLANS, COMPANY_STATUSES, COMPANY_USER_ROLES, COMPANY_USER_STATUSES, COMPANY_MODULES, MODULE_STATUSES
- `~/Projetos/aethereos-v2/artifacts/api-server/src/services/cnpj.ts` — BrasilAPI + ReceitaWS fallback
- `~/Projetos/aethereos-v2/artifacts/api-server/src/routes/auth.ts` — fluxos A e B do registro

### Confirmação obrigatória (escrever no chat antes de qualquer código)

1. Lista de todas as migrations existentes em V1 (ordem cronológica)
2. Decisão sobre como reconciliar `kernel.tenant_memberships` (V1) vs `company_users` (V2):
   - **Opção A — Manter `tenant_memberships`** e adicionar colunas (`role`, `status`, `module_access`, etc.). Reusa custom JWT hook existente.
   - **Opção B — Renomear `tenant_memberships` → `company_users`** via migration. Maior alinhamento V2 mas precisa atualizar custom JWT hook + queries existentes.
   - **Opção C — Criar `company_users` separada** mantendo `tenant_memberships` legacy. Migrations precisam ser cuidadosas pra evitar inconsistência.
   - **Recomendação: Opção A**. Manter nome `tenant_memberships`, estender colunas. Documentar como dívida arquitetural pra possível rename futuro.
3. Lista exata dos ~70 campos do `kernel.employees` (ver "Schema employees enxuto" abaixo)
4. Plano de Edge Function `cnpj-lookup` vs `register-company` (vão ser duas separadas? Lookup público sem auth + register precisa auth user já criado?)
5. Plano de seed: `pnpm seed:dev` deve criar 3 empresas com cnpj_data preenchido + 3 owners com profile + employees vinculados (já validados via gates)

---

## REGRAS INVIOLÁVEIS

**R1.** Commit por milestone com mensagem `feat(<scope>): <descrição> (MX<N>)`.
**R2.** Milestone só começa após anterior ter critério de aceite e commit.
**R3.** Após 3 tentativas de fix de bug específico, marcar BLOQUEADO, registrar em `KNOWN_LIMITATIONS.md`, pular.
**R4.** Nova dep exige justificativa em commit.
**R5.** Bloqueios mantidos: sem `next` em shells, sem `inngest`, sem `@clerk/*`, sem `prisma`. (`framer-motion` permitido por ADR-0023.)
**R6.** Antes de cada commit: `pnpm typecheck && pnpm lint`. Antes do encerramento: gates triplos `ci:full` + `test:smoke` + `test:e2e:full`.
**R7.** Atualize `SPRINT_LOG.md` ao fim de cada milestone.
**R8.** Não execute fora de `~/Projetos/aethereos`. Não escreva em `~/Projetos/aethereos-v2`.
**R9.** Ao perceber contexto cheio: pare, escreva pickup point.

**R10. ESPECÍFICO 11 — Não criar UI complexa:**

- **PROIBIDO criar:** OnboardingWizard, App RH com CRUD employees, painel Admin completo
- **PERMITIDO criar:** Reformular `/register` com lookup CNPJ + preview, atualizar `/staff/companies` com aprovar/rejeitar inline
- Tudo mais é dívida pra Sprint 12+

**R11. ESPECÍFICO 11 — Schema employees enxuto:**
Você vai criar `kernel.employees` com **APENAS** os ~70 campos abaixo. Os 110+ campos comerciais (commission*\*, sell*\_, buy\__, sales\**, monthly_target, quarterly_target, yearly_target, semi_target, sellTerritory*, buyer\*_, supplier\_\_, etc.) **NÃO** entram neste sprint. Vão para sprint do ERP/Comércio.

**Campos a incluir (HR puro + identificação):**

```
-- Identificação
id, company_id (FK), user_id (nullable, references auth.users),
full_name, email, phone, cpf, rg, birth_date, gender, marital_status, nationality,

-- Profissional básico
position, department, registration_number, contract_type (default 'CLT'),
work_schedule, salary, hire_date, termination_date, status (default 'active'),

-- Visual / contato corporativo
photo_url, cover_url, corporate_email, corporate_phone, area_trabalho,

-- Documentação trabalhista
pis_pasep, ctps_number, ctps_series, ctps_uf,
voter_title, voter_zone, voter_section,

-- Endereço residencial
address_cep, address_street, address_number, address_complement,
address_neighborhood, address_city, address_state,

-- Trabalho
cost_center, manager_id (FK self-reference, nullable),
work_hours, badge_number, work_start_time, work_end_time, ramal,

-- Personal extras
linkedin, bio, blood_type, linkedin_public, bio_public,

-- Perfil de contrato
contract_status, contract_end_date, work_regime, payment_unit, cbo_code, cbo_description,
custom_work_schedule, contract_term, probation_period, probation_end_date,

-- Local de trabalho efetivo
work_location_same_company, work_location_cep, work_location_street,
work_location_number, work_location_complement, work_location_neighborhood,
work_location_city, work_location_state,

-- Pagamentos & legais
last_raise_date, hazard_pay, hazard_pay_percent, danger_pay,
night_shift_pay, overtime_percent, union_name, fgts_account,
aso_admission_date, aso_next_periodic,

-- Termination
termination_reason, termination_type, termination_notes,

-- Metadados
data jsonb default '{}'::jsonb,
created_by uuid,
created_at, updated_at, deleted_at
```

Total: ~75 colunas. Tudo que sobra do schema V2 = comercial = fora de escopo.

**R12. ESPECÍFICO 11 — Custom JWT hook:**
Atualize a função `kernel.custom_access_token_hook` para incluir o claim `is_platform_admin` lendo de `kernel.profiles.is_platform_admin`. Sem isso, `/staff/*` não pode autorizar corretamente.

**R13. ESPECÍFICO 11 — Cuidado com schema employees vs schema kernel:**
V2 usa schema `public` para employees, profiles, etc. V1 usa schema `kernel`. Mantenha tudo em `kernel`. Atualize tipos Drizzle e Edge Functions correspondentemente.

---

## ARQUIVO DE LOG

Adicione ao `SPRINT_LOG.md`:

```markdown
---

# Sprint 11 — Schemas multi-tenant + cadastro CNPJ + aprovação

Início: <timestamp ISO>
Modelo: Claude Code (Sprint 11 N=1)

## Origem

Decisão estratégica em 2026-04-30: V2 vira spec, V1 é destino.
Sprint 10 portou paradigma OS visual.
Sprint 11 traz fundação multi-tenant rica + cadastro CNPJ funcional.

## 5 pontos de calibração respondidos

[5 pontos]

## Decisões neste sprint

- Renomear ou estender `tenant_memberships` → ?
- ~70 campos employees (lista final)
- ...

## Histórico de milestones (Sprint 11)

[preenchido conforme avança]
```

Commit antes de prosseguir.

---

## ROADMAP DE MILESTONES

### MX47 — Migrations: profiles + companies estendida + tenant_memberships estendida

**Objetivo:** estender schema multi-tenant.

**Tarefas:**

1. Migration `<timestamp>_profiles_table.sql`:

```sql
create table kernel.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  position text,
  department text,
  is_platform_admin boolean not null default false,
  data jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
alter table kernel.profiles enable row level security;
create policy "profiles: owner read" on kernel.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: owner update" on kernel.profiles for update to authenticated using (id = auth.uid());
-- Insert apenas via service_role (Edge Function register)
grant select, update on kernel.profiles to authenticated;
grant insert, select, update, delete on kernel.profiles to service_role;

-- Trigger updated_at
create trigger trg_profiles_updated_at before update on kernel.profiles
  for each row execute function kernel.touch_updated_at();
```

2. Migration `<timestamp>_companies_extend.sql`:

```sql
alter table kernel.companies
  add column if not exists cnpj text unique,
  add column if not exists trade_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists logo_url text,
  add column if not exists plan text not null default 'free',
  add column if not exists status text not null default 'pending',
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists cnpj_data jsonb,
  add column if not exists deleted_at timestamptz;

-- Constraint check status
alter table kernel.companies
  add constraint companies_status_check
  check (status in ('pending', 'active', 'cancelled', 'suspended'));

alter table kernel.companies
  add constraint companies_plan_check
  check (plan in ('free', 'starter', 'pro', 'enterprise'));
```

3. Migration `<timestamp>_tenant_memberships_extend.sql`:

```sql
alter table kernel.tenant_memberships
  add column if not exists status text not null default 'active',
  add column if not exists module_access jsonb default '{}'::jsonb,
  add column if not exists invited_by uuid,
  add column if not exists blocked_reason text,
  add column if not exists blocked_at timestamptz,
  add column if not exists removed_at timestamptz,
  add column if not exists last_login_at timestamptz,
  add column if not exists login_count integer default 0;

alter table kernel.tenant_memberships
  add constraint tenant_memberships_role_check
  check (role in ('owner', 'admin', 'manager', 'member', 'viewer'));

alter table kernel.tenant_memberships
  add constraint tenant_memberships_status_check
  check (status in ('active', 'pending', 'blocked', 'rejected', 'removed'));
```

4. Migration `<timestamp>_company_modules.sql`:

```sql
create table kernel.company_modules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references kernel.companies(id) on delete cascade,
  module text not null,
  status text not null default 'active',
  activated_at timestamptz default now(),
  created_at timestamptz default now() not null,
  unique (company_id, module)
);
-- check module
alter table kernel.company_modules add constraint company_modules_module_check
  check (module in ('comercio_digital', 'logitix', 'erp', 'rh', 'drive', 'pmo', 'operacional', 'marketing', 'sac', 'juridico'));
alter table kernel.company_modules add constraint company_modules_status_check
  check (status in ('active', 'inactive', 'trial', 'expired'));

alter table kernel.company_modules enable row level security;
create policy "company_modules: tenant" on kernel.company_modules for all to authenticated
  using (company_id = kernel.current_company_id());
grant select on kernel.company_modules to authenticated;
grant all on kernel.company_modules to service_role;
```

**Critério de aceite:**

```bash
supabase db reset
docker exec supabase_db_aethereos psql -U postgres -c "\d kernel.profiles"
docker exec supabase_db_aethereos psql -U postgres -c "\d kernel.companies"
docker exec supabase_db_aethereos psql -U postgres -c "\d kernel.tenant_memberships"
docker exec supabase_db_aethereos psql -U postgres -c "\d kernel.company_modules"
# Todas mostram colunas novas/tabelas novas
```

Commit: `feat(schema): profiles + companies estendida + tenant_memberships estendida + company_modules (MX47)`

---

### MX48 — Migrations: employees + company_addresses + company_contacts

**Objetivo:** schema HR + endereços/contatos da empresa.

**Tarefas:**

1. Migration `<timestamp>_employees_table.sql` com os ~75 campos listados em R11. RLS multi-tenant + grants. Trigger updated_at.
2. Migration `<timestamp>_company_addresses.sql`:

```sql
create table kernel.company_addresses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references kernel.companies(id) on delete cascade,
  type text not null default 'sede',
  zip_code text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  country text default 'BR',
  latitude double precision,
  longitude double precision,
  is_primary boolean default false,
  is_billing boolean default false,
  is_shipping boolean default false,
  label text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);
-- RLS, grants, trigger ...
```

3. Migration `<timestamp>_company_contacts.sql`:

```sql
create table kernel.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references kernel.companies(id) on delete cascade,
  department text not null,
  name text,
  email text,
  phone text,
  extension text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz
);
-- RLS, grants ...
```

4. Trigger BEFORE DELETE em `kernel.employees` para bloquear se `user_id IS NOT NULL`:

```sql
create or replace function kernel.prevent_delete_linked_employee()
returns trigger language plpgsql as $$
begin
  if old.user_id is not null then
    raise exception 'Employee vinculado a user_id não pode ser excluído (Fundamentação: regra de ouro do CLAUDE.md V2)' using errcode = 'P0001';
  end if;
  return old;
end;
$$;
create trigger trg_employees_prevent_delete_linked
  before delete on kernel.employees
  for each row execute function kernel.prevent_delete_linked_employee();
```

**Critério de aceite:**

```bash
supabase db reset
docker exec supabase_db_aethereos psql -U postgres -c "\d kernel.employees" | head -100
# Vê todas as colunas
# Tenta deletar employee com user_id (deve falhar com mensagem invariante)
```

Commit: `feat(schema): employees enxuto + company_addresses + company_contacts + trigger prevent delete (MX48)`

---

### MX49 — Custom JWT hook estendido + migration de drizzle types

**Objetivo:** claims completos no JWT + tipos TypeScript.

**Tarefas:**

1. Atualizar `kernel.custom_access_token_hook` para incluir claim `is_platform_admin`:

```sql
create or replace function kernel.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable as $$
declare
  v_user_id uuid;
  v_companies jsonb;
  v_active_company_id uuid;
  v_is_admin boolean;
  v_claims jsonb;
begin
  v_user_id := (event->>'user_id')::uuid;
  v_claims := coalesce(event->'claims', '{}'::jsonb);

  -- Companies
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', tm.company_id,
    'role', tm.role,
    'status', tm.status
  )), '[]'::jsonb)
  into v_companies
  from kernel.tenant_memberships tm
  where tm.user_id = v_user_id;

  -- Active company (primeira active, ou null)
  select tm.company_id into v_active_company_id
  from kernel.tenant_memberships tm
  where tm.user_id = v_user_id and tm.status = 'active'
  order by tm.created_at limit 1;

  -- Platform admin
  select coalesce(p.is_platform_admin, false) into v_is_admin
  from kernel.profiles p where p.id = v_user_id;

  v_claims := v_claims
    || jsonb_build_object('companies', v_companies)
    || jsonb_build_object('active_company_id', v_active_company_id)
    || jsonb_build_object('is_platform_admin', coalesce(v_is_admin, false));

  return jsonb_build_object('claims', v_claims);
end;
$$;
```

2. Atualizar Drizzle types em `packages/db-types/src/`:
   - Criar/atualizar `profiles.ts`, `companies.ts` (incluindo cnpj_data + status), `tenant_memberships.ts` (com role + status), `company_modules.ts`, `employees.ts` (~75 cols), `company_addresses.ts`, `company_contacts.ts`
   - Tudo no schema `kernel` (drizzle `pgSchema('kernel')`)
3. Atualizar `apps/shell-commercial/src/types/api.ts` ou similar com tipos novos exportados.

**Critério de aceite:**

```bash
pnpm typecheck
# EXIT 0 — todos os tipos batem
docker exec supabase_db_aethereos psql -U postgres -c "select kernel.custom_access_token_hook(jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000000', 'claims', '{}'::jsonb));"
# Retorna jsonb com claims companies/active_company_id/is_platform_admin
```

Commit: `feat(auth): JWT hook claim is_platform_admin + drizzle types completos (MX49)`

---

### MX50 — Edge Function `cnpj-lookup` (BrasilAPI + ReceitaWS fallback)

**Objetivo:** lookup público de CNPJ.

**Tarefas:**

1. Criar `supabase/functions/cnpj-lookup/index.ts`:
   - GET `?cnpj=XXXXXXXXXXXXXX` (14 dígitos puros)
   - Tenta BrasilAPI: `https://brasilapi.com.br/api/cnpj/v1/<cnpj>`
   - Fallback ReceitaWS: `https://receitaws.com.br/v1/cnpj/<cnpj>`
   - Returns `{ cnpj, razao_social, nome_fantasia, situacao, atividade_principal, logradouro, numero, complemento, bairro, municipio, uf, cep, telefone, email }`
   - **NÃO requer auth** (lookup público, mas com rate limit por IP futuro — dívida)
   - Retorna 404 se ambos falharem, 400 se cnpj inválido
2. Adicionar CORS headers
3. Cache simples in-memory? (deixe TODO se complicar — sprint cirúrgico futuro)

**Critério de aceite:**

```bash
# Subir Supabase
supabase functions deploy cnpj-lookup --no-verify-jwt # local
curl -s "http://127.0.0.1:54321/functions/v1/cnpj-lookup?cnpj=11222333000181" | jq .
# (CNPJ aleatório válido em formato — pode dar 404 mas não 500)
```

Commit: `feat(cnpj): edge function lookup CNPJ via BrasilAPI + ReceitaWS (MX50)`

---

### MX51 — Edge Function `register-company` (substitui create-company)

**Objetivo:** registro atômico empresa + profile + employee + tenant_membership.

**Tarefas:**

1. Criar `supabase/functions/register-company/index.ts`:
   - Recebe `{ email, password, fullName, phone?, cnpj, position?, area_trabalho? }`
   - Validações Zod (senha mínima, cnpj 14 dígitos)
   - Lookup CNPJ via Edge Function `cnpj-lookup` (chamada interna OU duplicar logic)
   - Verifica se CNPJ já existe em `kernel.companies` (deleted_at IS NULL):
     - **Fluxo A (CNPJ novo):** cria auth.user → profile → company (status=pending, cnpj_data=jsonb da API) → tenant_membership (role=owner, status=active) → employee (status=active) → ativa módulos `comercio_digital`, `logitix`, `erp` em `company_modules` → emite SCP `platform.company.registered`
     - **Fluxo B (CNPJ existente):** cria auth.user → profile → tenant_membership (role=member, status=pending) → employee (status=pending) → cria notificações para owners/admins da company → emite SCP `platform.user.join_requested`
   - Tudo em transação SQL via função PL/pgSQL `kernel.register_user_with_cnpj(...)` (mais seguro que JS) — Edge Function só valida + chama RPC
2. Manter `supabase/functions/create-company/` legacy mas marcar como deprecated (será removida em sprint futuro).
3. Função PL/pgSQL `kernel.register_user_with_cnpj` que faz tudo atômico (já existe template em `20260429000003_m22_create_company_fn.sql` — refatorar).

**Critério de aceite:**

```bash
# Test E2E manual
curl -X POST "http://127.0.0.1:54321/functions/v1/register-company" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234",
    "fullName": "Teste",
    "cnpj": "33000167000101",
    "phone": "+5511999999999",
    "position": "CTO"
  }'
# Espera 201 com { user, company, status: 'pending_approval' }
docker exec supabase_db_aethereos psql -U postgres -c "select count(*) from kernel.companies where status = 'pending';"
# >= 1
```

Commit: `feat(register): edge function register-company atomico fluxo A+B (MX51)`

---

### MX52 — Seed atualizado com novo schema + companies aprovadas

**Objetivo:** dados reais alinhados ao schema novo.

**Tarefas:**

1. Reescrever `tooling/seed/src/companies.ts`:
   - 3 companies com `cnpj`, `cnpj_data` (jsonb falso), `status='active'` (pré-aprovadas para teste), `trade_name`, `plan='pro'`, `onboarding_completed=true`
2. Atualizar `tooling/seed/src/users.ts`:
   - Cria auth.user → profile (com is_platform_admin=true para o primeiro user de cada company? não — só um global) → tenant_membership (role=owner) → employee
3. Adicionar primeiro super-admin: usuário `staff@aethereos.test` com `is_platform_admin=true`, sem company associada (ou com company "Aethereos Internal")
4. Honestidade: cada `.upsert()` que retornar erro **falha o seed inteiro**. Output mostra contagens reais.

**Critério de aceite:**

```bash
supabase db reset
pnpm seed:dev
# Espera output: 3 companies (active), 1 staff admin, 9 owners + 60 employees em cascata
docker exec supabase_db_aethereos psql -U postgres -c "
  select 'companies' as t, count(*) from kernel.companies where status='active'
  union all select 'profiles', count(*) from kernel.profiles
  union all select 'employees', count(*) from kernel.employees
  union all select 'memberships', count(*) from kernel.tenant_memberships;
"
# companies>=3, profiles>=10, employees>=9
```

Commit: `feat(seed): refactor seed para schema novo + super admin (MX52)`

---

### MX53 — UI: tela /register com lookup CNPJ + preview

**Objetivo:** UI mínima funcional pra cadastro.

**Tarefas:**

1. Criar/refatorar `apps/shell-commercial/src/routes/register.tsx`:
   - Form fields: nome completo, email, telefone (PhoneInput pattern), CNPJ (input com mask `XX.XXX.XXX/XXXX-XX`), cargo, área de trabalho, senha + confirmação
   - Ao completar 14 dígitos do CNPJ: dispara fetch para `/functions/v1/cnpj-lookup?cnpj=...`
   - Mostra preview card com: razão social, nome fantasia, situação, atividade, endereço
   - Submit chama Edge Function `register-company`
   - Mensagens de erro inline (form validation + erro do servidor)
   - Após sucesso: tela "Cadastro recebido. Aguarde aprovação."
2. Validação Zod compartilhada (frontend + Edge Function) para campos
3. **NÃO criar componentes shared/PhoneInput, CPFInput, CNPJInput, CEPInput de V2** — usar input simples com mask via `react-imask` ou regex client-side. Componentes shared fica para Sprint 12+.
4. Estilo: usar tokens CSS já existentes do Sprint 10 (var(--bg-elevated), var(--glass-border), etc.). Card centered, max-w-md.

**Critério de aceite:**

```bash
pnpm typecheck && pnpm lint
# Manual: abrir /register, digitar CNPJ "33000167000101" (Petrobras teste),
# preview deve aparecer
# preencher form, submit
# após sucesso: tela "aguarde aprovação"
```

Commit: `feat(ui): tela /register com lookup CNPJ + preview (MX53)`

---

### MX54 — UI: aprovação no /staff/companies

**Objetivo:** master admin aprovar/rejeitar inline.

**Tarefas:**

1. Atualizar `apps/shell-commercial/src/routes/staff/companies.tsx` (ou similar):
   - Lista companies com `status = 'pending'` no topo
   - Cada card: razão social, CNPJ, data registro, dados do CNPJ (mostra preview do `cnpj_data`), email do owner, cargo
   - Botão **Aprovar** → muda status para 'active', emite SCP `platform.company.approved`, atualiza `tenant_memberships.status` se necessário
   - Botão **Rejeitar** → modal pede motivo, muda status para 'cancelled' + grava motivo em coluna nova `cancellation_reason` (migration adicional se preciso) — emite SCP `platform.company.rejected`
2. Edge Function `staff-approve-company` que faz tudo (recebe `{ company_id, action: 'approve'|'reject', reason? }`)
3. Acesso restrito: middleware verifica `claims.is_platform_admin === true` no JWT
4. Email/notif do owner ao ser aprovado/rejeitado: deixar TODO (Sprint 12)

**Critério de aceite:**

```bash
# Manual
# 1. Login como staff@aethereos.test (criado no seed) — usuario com is_platform_admin=true
# 2. Acessar /staff/companies
# 3. Ver lista de companies pendentes
# 4. Aprovar uma
# 5. Logout, login como owner aprovado, ver que /desktop carrega
```

Commit: `feat(ui): /staff/companies aprovacao inline + edge function (MX54)`

---

### MX55 — E2E Playwright atualizado + encerramento

**Objetivo:** validar fluxo completo via browser.

**Tarefas:**

1. Atualizar `tooling/e2e/tests/company-creation.spec.ts`:
   - Test 1: GET CNPJ → preview aparece (mock fetch ou usar BrasilAPI real)
   - Test 2: Submit register → tela "aguarde aprovação"
   - Test 3: Login como staff → /staff/companies mostra empresa pendente
   - Test 4: Aprovar → company status muda para 'active' (validação SQL)
2. Atualizar `tooling/e2e/tests/login.spec.ts` se necessário
3. Atualizar `MANUAL_SMOKE_TEST.md` com fluxo CNPJ
4. Atualizar `KNOWN_LIMITATIONS.md`:
   - Onboarding wizard 6 passos: dívida Sprint 12
   - App RH com CRUD employees: dívida Sprint 13
   - Componentes shared (PhoneInput, CPFInput, etc.): dívida Sprint 13
   - Email/notif aprovação: dívida Sprint 12
   - Cache CNPJ lookup: dívida cirúrgica futura
   - Schema employees comerciais (110+ campos): dívida sprint ERP/Comércio
5. Gates triplos:

```bash
pnpm ci:full > /tmp/s11_ci.log 2>&1; echo "ci EXIT: $?"
pnpm test:smoke > /tmp/s11_smoke.log 2>&1; echo "smoke EXIT: $?"
set -a; source tooling/e2e/.env.local; set +a
pnpm test:e2e:full > /tmp/s11_e2e.log 2>&1; echo "e2e EXIT: $?"
```

Commit final: `chore: encerramento sprint 11 — multi-tenant + cadastro CNPJ funcional`

Mensagem: "SPRINT 11 ENCERRADO. Triple gate verde. Schemas profiles + companies estendida + tenant_memberships estendida + company_modules + employees (75 cols HR puro) + company_addresses + company_contacts. Edge Functions cnpj-lookup + register-company. JWT hook estendido com is_platform_admin. UI /register com lookup CNPJ funcional + preview. UI /staff/companies aprovação inline. Aguardando validação humana e Sprint 12 (onboarding wizard 6 passos)."

---

## TÉRMINO DO SPRINT

Pare aqui. Não inicie Sprint 12.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint 11 (multi-tenant + cadastro CNPJ) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (seção "Sprint 11")
3. Rode: git log --oneline -15 && git status && supabase status 2>&1 | head -5
4. Identifique a próxima milestone MX47-MX55 não concluída
5. Continue a partir dela

Lembrar:
- V2 (~/Projetos/aethereos-v2) é APENAS leitura. Nunca escrever em V2.
- Schema employees ENXUTO: ~75 campos HR puro. NÃO incluir comerciais (sell_*, buy_*, commission_*, etc.).
- NÃO criar OnboardingWizard nem App RH (Sprints 12 e 13).
- Sprint só fecha com gates triplos EXIT 0.

Roadmap em SPRINT_11_PROMPT.md na raiz.
```

Salve este arquivo como `SPRINT_11_PROMPT.md` na raiz do projeto antes de começar.
