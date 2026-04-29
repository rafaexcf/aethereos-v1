-- Migration: tenant_memberships + custom JWT claims hook
-- Cria a tabela de memberships multi-company e o hook de JWT customizado
-- para incluir claims de company nos tokens Supabase Auth.

-- ============================================================
-- 1. Tabela: kernel.tenant_memberships
-- ============================================================
-- Um usuário pode ser membro de múltiplas empresas com roles diferentes.
-- PRIMARY KEY (user_id, company_id) garante unicidade.

create table kernel.tenant_memberships (
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid not null references kernel.companies(id) on delete cascade,
  role        text not null check (role in ('owner', 'admin', 'member', 'agent_supervisor')),
  created_at  timestamptz not null default now(),
  primary key (user_id, company_id)
);

comment on table kernel.tenant_memberships is
  'Memberships multi-company. Um user_id pode ter roles diferentes em cada company.';

create index kernel_memberships_user_id_idx     on kernel.tenant_memberships (user_id);
create index kernel_memberships_company_id_idx  on kernel.tenant_memberships (company_id);

-- ============================================================
-- 2. RLS — kernel.tenant_memberships
-- ============================================================

alter table kernel.tenant_memberships enable row level security;

-- Usuário autenticado vê apenas suas próprias memberships
create policy "memberships: user can read own"
  on kernel.tenant_memberships for select
  to authenticated
  using (user_id = auth.uid());

-- Usuário autenticado pode inserir memberships para si mesmo
-- (owner cria membership ao criar empresa — via Edge Function service_role)
create policy "memberships: user can insert own"
  on kernel.tenant_memberships for insert
  to authenticated
  with check (user_id = auth.uid());

-- Permissões de tabela
grant select, insert on kernel.tenant_memberships to authenticated;
grant usage, select on sequence kernel.scp_outbox_id_seq to authenticated;

-- ============================================================
-- 3. Função: kernel.custom_access_token_hook
-- ============================================================
-- Hook para JWT custom claims do Supabase Auth.
-- Chamado automaticamente pelo GoTrue ao emitir/refrescar tokens.
-- Injeta no JWT: companies (lista) e active_company_id (primeira membership).
--
-- Configurar em supabase/config.toml:
--   [auth.hook.custom_access_token]
--   enabled = true
--   uri = "pg-functions://postgres/kernel/custom_access_token_hook"

create or replace function kernel.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = kernel, auth, public, extensions
as $$
declare
  claims        jsonb;
  user_id_val   uuid;
  companies_arr jsonb;
  first_company text;
begin
  claims      := event -> 'claims';
  user_id_val := (event ->> 'user_id')::uuid;

  -- Lista de company_ids do usuário
  select jsonb_agg(company_id order by created_at)
  into   companies_arr
  from   kernel.tenant_memberships
  where  user_id = user_id_val;

  if companies_arr is null then
    companies_arr := '[]'::jsonb;
  end if;

  -- Primeira company como active_company_id default
  select company_id::text
  into   first_company
  from   kernel.tenant_memberships
  where  user_id = user_id_val
  order  by created_at
  limit  1;

  claims := jsonb_set(claims, '{companies}',         companies_arr);
  claims := jsonb_set(claims, '{active_company_id}', to_jsonb(first_company));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

comment on function kernel.custom_access_token_hook(jsonb) is
  'Hook JWT do Supabase Auth. Injeta companies e active_company_id nos claims do token.';

-- Grant para que o GoTrue possa invocar a função
grant execute on function kernel.custom_access_token_hook to supabase_auth_admin;
revoke execute on function kernel.custom_access_token_hook from authenticated, anon, public;

-- ============================================================
-- 4. Helper: kernel.set_tenant_context_from_jwt
-- ============================================================
-- Chamado como db-pre-request pelo PostgREST para definir o contexto
-- de tenant automaticamente a partir dos claims do JWT.
-- Configurar em supabase/config.toml:
--   db_pre_request = "kernel.set_tenant_context_from_jwt"

create or replace function kernel.set_tenant_context_from_jwt()
returns void
language plpgsql
security definer
set search_path = kernel, public, extensions
as $$
declare
  active_company text;
begin
  -- Lê active_company_id dos claims do JWT (injetado pelo hook acima)
  active_company := current_setting('request.jwt.claims', true)::jsonb ->> 'active_company_id';

  if active_company is not null and active_company <> '' and active_company <> 'null' then
    perform set_config('app.current_company_id', active_company, true);
  end if;
end;
$$;

comment on function kernel.set_tenant_context_from_jwt() is
  'db-pre-request hook: define tenant context a partir dos claims do JWT automaticamente.';

grant execute on function kernel.set_tenant_context_from_jwt to authenticated;
