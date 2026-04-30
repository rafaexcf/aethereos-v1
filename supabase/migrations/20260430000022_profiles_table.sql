-- MX47 (Sprint 11): kernel.profiles
-- Perfil extendido do usuário — separa dados pessoais de auth.users.
-- is_platform_admin aqui (não em app_metadata) → usado pelo JWT hook em MX49.

create table kernel.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  phone         text,
  avatar_url    text,
  position      text,
  department    text,
  is_platform_admin boolean not null default false,
  data          jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table kernel.profiles is
  'Perfil extendido do usuário. is_platform_admin = acesso ao painel /staff.';

alter table kernel.profiles enable row level security;

create policy "profiles: owner read"
  on kernel.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles: owner update"
  on kernel.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- platform_admin pode ler todos os profiles (necessário para /staff/companies)
create policy "profiles: platform_admin read all"
  on kernel.profiles for select
  to authenticated
  using (
    exists (
      select 1 from kernel.profiles p2
      where p2.id = auth.uid() and p2.is_platform_admin = true
    )
  );

-- Insert apenas via service_role (Edge Function register-company)
grant select, update on kernel.profiles to authenticated;
grant insert, select, update, delete on kernel.profiles to service_role;

create trigger trg_profiles_updated_at
  before update on kernel.profiles
  for each row execute function kernel.touch_updated_at();
