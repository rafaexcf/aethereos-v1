-- MX48 (Sprint 11): kernel.employees — schema HR enxuto (~75 campos)
-- EXCLUÍDOS: commission_*, sell_*, buy_*, monthly/quarterly/yearly_target (fora de escopo Sprint 11).
-- INVARIANTE: employee com user_id != null NÃO pode ser excluído (trigger prevent_delete_linked).

create table kernel.employees (
  -- Identificação
  id                        uuid primary key default gen_random_uuid(),
  company_id                uuid not null references kernel.companies(id) on delete cascade,
  user_id                   uuid references auth.users(id) on delete set null,
  full_name                 text not null,
  email                     text,
  phone                     text,
  cpf                       text,
  rg                        text,
  birth_date                date,
  gender                    text,
  marital_status            text,
  nationality               text,

  -- Profissional básico
  position                  text,
  department                text,
  registration_number       text,
  contract_type             text not null default 'CLT',
  work_schedule             text,
  salary                    numeric(14, 2),
  hire_date                 date,
  termination_date          date,
  status                    text not null default 'active',

  -- Visual / contato corporativo
  photo_url                 text,
  cover_url                 text,
  corporate_email           text,
  corporate_phone           text,
  area_trabalho             text,

  -- Documentação trabalhista
  pis_pasep                 text,
  ctps_number               text,
  ctps_series               text,
  ctps_uf                   text,
  voter_title               text,
  voter_zone                text,
  voter_section             text,

  -- Endereço residencial
  address_cep               text,
  address_street            text,
  address_number            text,
  address_complement        text,
  address_neighborhood      text,
  address_city              text,
  address_state             text,

  -- Trabalho
  cost_center               text,
  manager_id                uuid references kernel.employees(id) on delete set null,
  work_hours                text,
  badge_number              text,
  work_start_time           text,
  work_end_time             text,
  ramal                     text,

  -- Personal extras
  linkedin                  text,
  bio                       text,
  blood_type                text,
  linkedin_public           boolean not null default false,
  bio_public                boolean not null default false,

  -- Perfil de contrato
  contract_status           text,
  contract_end_date         date,
  work_regime               text,
  payment_unit              text,
  cbo_code                  text,
  cbo_description           text,
  custom_work_schedule      text,
  contract_term             text,
  probation_period          text,
  probation_end_date        date,

  -- Local de trabalho efetivo
  work_location_same_company    boolean not null default true,
  work_location_cep             text,
  work_location_street          text,
  work_location_number          text,
  work_location_complement      text,
  work_location_neighborhood    text,
  work_location_city            text,
  work_location_state           text,

  -- Pagamentos & legais
  last_raise_date           date,
  hazard_pay                boolean not null default false,
  hazard_pay_percent        numeric(5, 2),
  danger_pay                boolean not null default false,
  night_shift_pay           boolean not null default false,
  overtime_percent          numeric(5, 2),
  union_name                text,
  fgts_account              text,
  aso_admission_date        date,
  aso_next_periodic         date,

  -- Termination
  termination_reason        text,
  termination_type          text,
  termination_notes         text,

  -- Metadados
  data                      jsonb not null default '{}'::jsonb,
  created_by                uuid references auth.users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz
);

comment on table kernel.employees is
  'Funcionários/colaboradores da empresa. Campos HR puro. '
  'user_id vinculado → employee não pode ser excluído (trigger prevent_delete_linked).';

-- Índices
create index kernel_employees_company_id_idx on kernel.employees (company_id);
create index kernel_employees_user_id_idx    on kernel.employees (user_id) where user_id is not null;
create index kernel_employees_status_idx     on kernel.employees (company_id, status);

-- INVARIANTE: employee vinculado a user_id não pode ser excluído
create or replace function kernel.prevent_delete_linked_employee()
returns trigger
language plpgsql
as $$
begin
  if old.user_id is not null then
    raise exception
      'Employee vinculado a user_id não pode ser excluído. Use deleted_at para soft delete.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger trg_employees_prevent_delete_linked
  before delete on kernel.employees
  for each row execute function kernel.prevent_delete_linked_employee();

create trigger trg_employees_updated_at
  before update on kernel.employees
  for each row execute function kernel.touch_updated_at();

-- RLS
alter table kernel.employees enable row level security;

create policy "employees: tenant read"
  on kernel.employees for select
  to authenticated
  using (company_id = kernel.current_company_id());

create policy "employees: tenant insert"
  on kernel.employees for insert
  to authenticated
  with check (company_id = kernel.current_company_id());

create policy "employees: tenant update"
  on kernel.employees for update
  to authenticated
  using (company_id = kernel.current_company_id())
  with check (company_id = kernel.current_company_id());

grant select, insert, update on kernel.employees to authenticated;
grant all on kernel.employees to service_role;
