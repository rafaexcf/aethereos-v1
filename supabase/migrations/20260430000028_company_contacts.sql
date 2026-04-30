-- MX48 (Sprint 11): kernel.company_contacts
-- Contatos da empresa por departamento.

create table kernel.company_contacts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references kernel.companies(id) on delete cascade,
  department  text not null,
  name        text,
  email       text,
  phone       text,
  extension   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

comment on table kernel.company_contacts is 'Contatos da empresa por departamento.';

create index kernel_company_contacts_company_id_idx on kernel.company_contacts (company_id);

create trigger trg_company_contacts_updated_at
  before update on kernel.company_contacts
  for each row execute function kernel.touch_updated_at();

alter table kernel.company_contacts enable row level security;

create policy "company_contacts: tenant read"
  on kernel.company_contacts for select
  to authenticated
  using (company_id = kernel.current_company_id());

create policy "company_contacts: tenant write"
  on kernel.company_contacts for all
  to authenticated
  using (company_id = kernel.current_company_id())
  with check (company_id = kernel.current_company_id());

grant select, insert, update, delete on kernel.company_contacts to authenticated;
grant all on kernel.company_contacts to service_role;
