-- MX47 (Sprint 11): estender kernel.tenant_memberships com status + colunas de invitation flow
-- Opção A escolhida: manter nome tenant_memberships, adicionar colunas V2.
-- Dívida arquitetural: possível rename→company_users em sprint futuro via ADR.
--
-- Também atualiza constraint de role para incluir 'manager' e 'viewer'.

-- Migrar dados de role antes de recriar constraint
update kernel.tenant_memberships set role = 'member' where role = 'agent_supervisor';

-- Dropar constraint de role antiga
alter table kernel.tenant_memberships drop constraint if exists tenant_memberships_role_check;

-- Nova constraint de role (alinhada ao V2)
alter table kernel.tenant_memberships
  add constraint tenant_memberships_role_check
  check (role in ('owner', 'admin', 'manager', 'member', 'viewer'));

-- Novas colunas
alter table kernel.tenant_memberships
  add column if not exists status         text not null default 'active',
  add column if not exists module_access  jsonb default '{}'::jsonb,
  add column if not exists invited_by     uuid references auth.users(id) on delete set null,
  add column if not exists blocked_reason text,
  add column if not exists blocked_at     timestamptz,
  add column if not exists removed_at     timestamptz,
  add column if not exists last_login_at  timestamptz,
  add column if not exists login_count    integer not null default 0;

alter table kernel.tenant_memberships
  add constraint tenant_memberships_status_check
  check (status in ('active', 'pending', 'blocked', 'rejected', 'removed'));

comment on column kernel.tenant_memberships.status is
  'active=membro ativo; pending=aguardando aprovação do owner/admin; blocked=bloqueado; rejected=rejeitado; removed=removido.';

-- Grant update para que o Edge Function register-company (service_role) possa atualizar status
grant update on kernel.tenant_memberships to service_role;
