-- Seed para desenvolvimento local
-- Cria empresa de teste + usuário admin para facilitar desenvolvimento.
-- NÃO usar em produção.

-- Empresa de teste
insert into kernel.companies (id, slug, name, plan, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'aethereos-dev',
  'Aethereos Dev',
  'enterprise',
  'active'
) on conflict (id) do nothing;
