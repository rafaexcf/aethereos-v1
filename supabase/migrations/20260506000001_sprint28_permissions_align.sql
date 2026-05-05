-- Sprint 28 MX150: alinha schema de permissoes com o esperado pelo plano.
--
-- Departments / department_members / groups / group_members ja existem do
-- Sprint 26 (migrations 10-13) com schema que casa exatamente — só
-- garantimos que tenant_memberships ganha department_id e custom_role_id.
--
-- company_roles e app_access_rules tinham schema "draft" do Sprint 26 que
-- nao bate com o uso real planejado pelo Sprint 28. Como sao tabelas
-- scaffold sem dados, dropamos e recriamos com o schema canonico.

-- ─── company_roles: realinhamento ─────────────────────────────────────────

DROP TABLE IF EXISTS kernel.company_roles CASCADE;

CREATE TABLE kernel.company_roles (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  label       TEXT         NOT NULL,
  base_role   TEXT         NOT NULL CHECK (base_role IN ('admin','manager','member','viewer')),
  description TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (company_id, label)
);

CREATE INDEX kernel_company_roles_company_idx
  ON kernel.company_roles (company_id, base_role);

ALTER TABLE kernel.company_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_roles_rls" ON kernel.company_roles
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.company_roles IS
  'Cargos customizaveis por empresa (label friendly, ex: "Diretor Financeiro"). '
  'base_role mapeia para um dos 5 roles base do kernel — Sprint 28 R11.';

-- ─── app_access_rules: realinhamento (rule_target TEXT + action allow/deny) ─

DROP TABLE IF EXISTS kernel.app_access_rules CASCADE;

CREATE TABLE kernel.app_access_rules (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  app_id       TEXT         NOT NULL,
  rule_type    TEXT         NOT NULL CHECK (rule_type IN ('role','department','group','user')),
  rule_target  TEXT         NOT NULL,
  action       TEXT         NOT NULL CHECK (action IN ('allow','deny')),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (company_id, app_id, rule_type, rule_target)
);

CREATE INDEX kernel_app_access_rules_company_app_idx
  ON kernel.app_access_rules (company_id, app_id);

ALTER TABLE kernel.app_access_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_access_rules_rls" ON kernel.app_access_rules
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.app_access_rules IS
  'Regras de acesso a apps por escopo (role/department/group/user). '
  'action allow/deny — deny prevalece (Sprint 28 R13). Owner/admin '
  'sempre veem todos os apps (Sprint 28 R12).';

-- ─── tenant_memberships: novas colunas opcionais ──────────────────────────

ALTER TABLE kernel.tenant_memberships
  ADD COLUMN IF NOT EXISTS department_id UUID
    REFERENCES kernel.departments(id) ON DELETE SET NULL;

ALTER TABLE kernel.tenant_memberships
  ADD COLUMN IF NOT EXISTS custom_role_id UUID
    REFERENCES kernel.company_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS kernel_memberships_department_idx
  ON kernel.tenant_memberships (department_id)
  WHERE department_id IS NOT NULL;

COMMENT ON COLUMN kernel.tenant_memberships.department_id IS
  'Departamento atual do colaborador (1:N). NULL se nao alocado.';
COMMENT ON COLUMN kernel.tenant_memberships.custom_role_id IS
  'Cargo customizado da empresa (label + base_role). NULL = usa role base.';
