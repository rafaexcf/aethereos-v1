-- MX47 (Sprint 11): kernel.company_modules
-- Rastreia módulos ativados por empresa. RLS multi-tenant.

create table kernel.company_modules (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references kernel.companies(id) on delete cascade,
  module       text not null,
  status       text not null default 'active',
  activated_at timestamptz default now(),
  created_at   timestamptz not null default now(),
  unique (company_id, module)
);

alter table kernel.company_modules
  add constraint company_modules_module_check
  check (module in (
    'comercio_digital', 'logitix', 'erp', 'rh',
    'drive', 'pmo', 'operacional', 'marketing', 'sac', 'juridico'
  ));

alter table kernel.company_modules
  add constraint company_modules_status_check
  check (status in ('active', 'inactive', 'trial', 'expired'));

comment on table kernel.company_modules is
  'Módulos ativados por empresa. RLS por company_id via current_company_id().';

alter table kernel.company_modules enable row level security;

create policy "company_modules: tenant read"
  on kernel.company_modules for select
  to authenticated
  using (company_id = kernel.current_company_id());

grant select on kernel.company_modules to authenticated;
grant all on kernel.company_modules to service_role;
