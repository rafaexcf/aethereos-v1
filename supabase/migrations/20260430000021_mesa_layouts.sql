-- mesa_layouts: persiste layout + wallpaper da Mesa por usuário + empresa
create table kernel.mesa_layouts (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  company_id uuid        not null references kernel.companies(id) on delete cascade,
  layout     jsonb       not null default '[]'::jsonb,
  wallpaper  text        not null default 'default',
  updated_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

alter table kernel.mesa_layouts enable row level security;

create policy "mesa_layouts: tenant + self"
  on kernel.mesa_layouts
  for all
  to authenticated
  using (
    company_id = kernel.current_company_id()
    and user_id = auth.uid()
  )
  with check (
    company_id = kernel.current_company_id()
    and user_id = auth.uid()
  );

grant select, insert, update, delete on kernel.mesa_layouts to authenticated;
