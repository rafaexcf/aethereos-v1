-- MX48 (Sprint 11): kernel.company_addresses
-- Endereços de uma empresa (sede, filiais, cobrança, entrega).

create table kernel.company_addresses (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references kernel.companies(id) on delete cascade,
  type            text not null default 'sede',
  zip_code        text,
  street          text,
  number          text,
  complement      text,
  neighborhood    text,
  city            text,
  state           text,
  country         text not null default 'BR',
  latitude        double precision,
  longitude       double precision,
  is_primary      boolean not null default false,
  is_billing      boolean not null default false,
  is_shipping     boolean not null default false,
  label           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

comment on table kernel.company_addresses is 'Endereços cadastrais da empresa (sede, cobrança, entrega, etc.).';

create index kernel_company_addresses_company_id_idx on kernel.company_addresses (company_id);

create trigger trg_company_addresses_updated_at
  before update on kernel.company_addresses
  for each row execute function kernel.touch_updated_at();

alter table kernel.company_addresses enable row level security;

create policy "company_addresses: tenant read"
  on kernel.company_addresses for select
  to authenticated
  using (company_id = kernel.current_company_id());

create policy "company_addresses: tenant write"
  on kernel.company_addresses for all
  to authenticated
  using (company_id = kernel.current_company_id())
  with check (company_id = kernel.current_company_id());

grant select, insert, update, delete on kernel.company_addresses to authenticated;
grant all on kernel.company_addresses to service_role;
