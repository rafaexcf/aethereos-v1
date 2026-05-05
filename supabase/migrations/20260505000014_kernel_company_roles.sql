-- kernel.company_roles — Cargos customizaveis da empresa (Sprint 26)
-- Permite que cada empresa nomeie seus proprios cargos (ex.: "Diretor Financeiro")
-- mapeando para uma role interna do kernel (owner/admin/manager/member/viewer).

CREATE TABLE kernel.company_roles (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  label                 TEXT         NOT NULL CHECK (char_length(trim(label)) >= 1),
  maps_to_role          TEXT         NOT NULL
                          CHECK (maps_to_role IN ('owner','admin','manager','member','viewer')),
  default_department_id UUID         REFERENCES kernel.departments(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX kernel_company_roles_company_idx
  ON kernel.company_roles (company_id, maps_to_role);
CREATE INDEX kernel_company_roles_default_dept_idx
  ON kernel.company_roles (default_department_id)
  WHERE default_department_id IS NOT NULL;

ALTER TABLE kernel.company_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_roles_rls" ON kernel.company_roles
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.company_roles IS
  'Cargos customizaveis nomeados pela empresa. label livre, maps_to_role mapeia para roles canonicas do kernel.';
