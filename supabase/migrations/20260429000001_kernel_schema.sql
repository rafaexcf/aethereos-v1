-- Migration: kernel_schema
-- Cria o schema kernel com tabelas fundamentais do OS, RLS por company_id,
-- e função set_tenant_context() para controle de acesso multi-tenant.

-- ============================================================
-- 0. Extensions
-- ============================================================

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- ============================================================
-- 1. Schema kernel
-- ============================================================

create schema if not exists kernel;

-- Concede uso ao role autenticado (PostgREST usa authenticated)
grant usage on schema kernel to authenticated;
grant usage on schema kernel to service_role;

-- ============================================================
-- 2. Tabela: kernel.companies (tenants)
-- ============================================================

create table kernel.companies (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,63}$'),
  name        text not null,
  plan        text not null default 'trial' check (plan in ('trial','starter','growth','enterprise')),
  status      text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table kernel.companies is 'Tenants do sistema. Nunca deletar — usar status=deleted.';

-- ============================================================
-- 3. Tabela: kernel.users
-- ============================================================

create table kernel.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  company_id    uuid not null references kernel.companies(id),
  email         text not null,
  display_name  text,
  role          text not null default 'member'
                  check (role in ('owner','admin','member','viewer','agent_operator')),
  status        text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, email)
);

comment on table kernel.users is 'Usuários vinculados a um tenant. Role define capabilities base.';

create index kernel_users_company_id_idx on kernel.users (company_id);

-- ============================================================
-- 4. Tabela: kernel.agents
-- ============================================================

create table kernel.agents (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references kernel.companies(id),
  supervising_user_id uuid not null references kernel.users(id),
  name                text not null,
  description         text,
  capabilities        text[] not null default '{}',
  status              text not null default 'active' check (status in ('active','suspended','deleted')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table kernel.agents is
  'Agentes de IA. supervising_user_id obrigatório (Interpretação A+, Fundamentação 12.4).';

create index kernel_agents_company_id_idx on kernel.agents (company_id);
create index kernel_agents_supervisor_idx on kernel.agents (supervising_user_id);

-- ============================================================
-- 5. Tabela: kernel.audit_log (append-only)
-- ============================================================

create table kernel.audit_log (
  id            bigserial primary key,
  company_id    uuid not null references kernel.companies(id),
  actor_id      uuid not null,
  actor_type    text not null check (actor_type in ('human','agent','system')),
  action        text not null,
  resource_type text,
  resource_id   uuid,
  payload       jsonb,
  ip_address    inet,
  created_at    timestamptz not null default now()
);

comment on table kernel.audit_log is
  'Log de auditoria append-only. Nunca deletar registros. RLS permite apenas INSERT para autenticados.';

create index kernel_audit_log_company_id_idx on kernel.audit_log (company_id, created_at desc);
create index kernel_audit_log_actor_idx     on kernel.audit_log (actor_id, created_at desc);

-- ============================================================
-- 6. Tabela: kernel.scp_outbox (Outbox Pattern)
-- ============================================================

create table kernel.scp_outbox (
  id            bigserial primary key,
  company_id    uuid not null references kernel.companies(id),
  event_type    text not null,
  event_id      uuid not null unique default gen_random_uuid(),
  payload       jsonb not null,
  envelope      jsonb not null,
  status        text not null default 'pending' check (status in ('pending','published','failed')),
  attempts      int not null default 0,
  last_error    text,
  created_at    timestamptz not null default now(),
  published_at  timestamptz
);

comment on table kernel.scp_outbox is
  'Outbox para eventos SCP. Worker lê pending, publica no NATS e marca published.';

create index kernel_scp_outbox_pending_idx on kernel.scp_outbox (status, created_at)
  where status = 'pending';
create index kernel_scp_outbox_company_idx on kernel.scp_outbox (company_id, created_at desc);

-- ============================================================
-- 7. Função: kernel.set_tenant_context()
-- ============================================================
-- Chamada no início de cada sessão RLS para definir o company_id corrente.
-- PostgREST chama via db-pre-request ou o app chama manualmente antes de queries.

create or replace function kernel.set_tenant_context(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = kernel, public, extensions
as $$
begin
  -- Valida que a empresa existe e está ativa
  if not exists (
    select 1 from kernel.companies
    where id = p_company_id and status = 'active'
  ) then
    raise exception 'tenant_context: company % not found or not active', p_company_id
      using errcode = 'P0001';
  end if;

  perform set_config('app.current_company_id', p_company_id::text, true);
end;
$$;

comment on function kernel.set_tenant_context(uuid) is
  'Define contexto de tenant para a sessão. Fail-closed: erro se empresa inativa.';

-- Versão sem validação para uso interno de sistema (service_role)
create or replace function kernel.set_tenant_context_unsafe(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = kernel, public, extensions
as $$
begin
  perform set_config('app.current_company_id', p_company_id::text, true);
end;
$$;

comment on function kernel.set_tenant_context_unsafe(uuid) is
  'Define contexto de tenant sem validação. Uso exclusivo de workers internos (service_role).';

-- Helper para ler o company_id corrente da sessão
create or replace function kernel.current_company_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_company_id', true), '')::uuid;
$$;

-- ============================================================
-- 8. RLS — kernel.companies
-- ============================================================

alter table kernel.companies enable row level security;

-- Usuários autenticados veem apenas a própria empresa
create policy "companies: tenant can read own"
  on kernel.companies for select
  to authenticated
  using (id = kernel.current_company_id());

-- service_role bypassa RLS por padrão (Supabase)

-- ============================================================
-- 9. RLS — kernel.users
-- ============================================================

alter table kernel.users enable row level security;

create policy "users: tenant can read own"
  on kernel.users for select
  to authenticated
  using (company_id = kernel.current_company_id());

create policy "users: tenant can insert own"
  on kernel.users for insert
  to authenticated
  with check (company_id = kernel.current_company_id());

create policy "users: tenant can update own"
  on kernel.users for update
  to authenticated
  using (company_id = kernel.current_company_id())
  with check (company_id = kernel.current_company_id());

-- ============================================================
-- 10. RLS — kernel.agents
-- ============================================================

alter table kernel.agents enable row level security;

create policy "agents: tenant can read own"
  on kernel.agents for select
  to authenticated
  using (company_id = kernel.current_company_id());

create policy "agents: tenant can insert own"
  on kernel.agents for insert
  to authenticated
  with check (company_id = kernel.current_company_id());

create policy "agents: tenant can update own"
  on kernel.agents for update
  to authenticated
  using (company_id = kernel.current_company_id())
  with check (company_id = kernel.current_company_id());

-- ============================================================
-- 11. RLS — kernel.audit_log (append-only)
-- ============================================================

alter table kernel.audit_log enable row level security;

-- SELECT: owners e admins veem log do próprio tenant
create policy "audit_log: admins can read own"
  on kernel.audit_log for select
  to authenticated
  using (company_id = kernel.current_company_id());

-- INSERT: qualquer usuário autenticado pode inserir (sistema chama via auditLog())
create policy "audit_log: authenticated can insert own"
  on kernel.audit_log for insert
  to authenticated
  with check (company_id = kernel.current_company_id());

-- UPDATE/DELETE: proibido (append-only)

-- ============================================================
-- 12. RLS — kernel.scp_outbox
-- ============================================================

alter table kernel.scp_outbox enable row level security;

-- INSERT: sistema insere via KernelPublisher (service_role ou authenticated com contexto)
create policy "scp_outbox: authenticated can insert own"
  on kernel.scp_outbox for insert
  to authenticated
  with check (company_id = kernel.current_company_id());

-- SELECT: apenas service_role (worker lê via service_role, sem RLS)
-- Usuários autenticados não leem a outbox diretamente

-- ============================================================
-- 13. Permissões de tabela
-- ============================================================

grant select, insert, update on kernel.companies   to authenticated;
grant select, insert, update on kernel.users       to authenticated;
grant select, insert, update on kernel.agents      to authenticated;
grant select, insert         on kernel.audit_log   to authenticated;
grant insert                 on kernel.scp_outbox  to authenticated;

-- Sequences para bigserial
grant usage, select on sequence kernel.audit_log_id_seq  to authenticated;
grant usage, select on sequence kernel.scp_outbox_id_seq to authenticated;

-- ============================================================
-- 14. Trigger: updated_at automático
-- ============================================================

create or replace function kernel.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_companies_updated_at
  before update on kernel.companies
  for each row execute function kernel.touch_updated_at();

create trigger trg_users_updated_at
  before update on kernel.users
  for each row execute function kernel.touch_updated_at();

create trigger trg_agents_updated_at
  before update on kernel.agents
  for each row execute function kernel.touch_updated_at();
