-- MX47 (Sprint 11): estender kernel.companies para modelo multi-tenant rico
-- Alinha V1 com V2: cnpj, cnpj_data, status pendente, planos atualizados.
--
-- ATENÇÃO: recria constraints de plan e status com novos valores.
-- Dados existentes migrados: trial→free, growth→pro, deleted→cancelled.

-- Migrar dados antes de dropar constraints
update kernel.companies set plan = 'free' where plan = 'trial';
update kernel.companies set plan = 'pro' where plan = 'growth';
update kernel.companies set status = 'cancelled' where status = 'deleted';

-- Dropar constraints antigas (inline sem nome explícito → nome gerado pelo PG)
alter table kernel.companies drop constraint if exists companies_plan_check;
alter table kernel.companies drop constraint if exists companies_status_check;

-- Recriar constraints com valores do V2
alter table kernel.companies
  add constraint companies_plan_check
  check (plan in ('free', 'starter', 'pro', 'enterprise'));

alter table kernel.companies
  add constraint companies_status_check
  check (status in ('pending', 'active', 'cancelled', 'suspended'));

-- Atualizar defaults
alter table kernel.companies alter column plan set default 'free';
alter table kernel.companies alter column status set default 'pending';

-- Adicionar novas colunas
alter table kernel.companies
  add column if not exists cnpj         text unique,
  add column if not exists trade_name   text,
  add column if not exists email        text,
  add column if not exists phone        text,
  add column if not exists logo_url     text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists settings     jsonb not null default '{}'::jsonb,
  add column if not exists cnpj_data    jsonb,
  add column if not exists deleted_at   timestamptz;

comment on column kernel.companies.cnpj is 'CNPJ limpo (14 dígitos numéricos). Unique por empresa ativa.';
comment on column kernel.companies.cnpj_data is 'Snapshot da BrasilAPI no momento do cadastro.';
comment on column kernel.companies.status is 'pending=aguardando aprovação, active=ativo, cancelled=cancelado, suspended=suspenso.';
