-- kernel.department_members — Vinculo usuario <-> departamento (Sprint 26)
-- Um usuario pode pertencer a multiplos departamentos.

CREATE TABLE kernel.department_members (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  department_id UUID         NOT NULL REFERENCES kernel.departments(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, user_id)
);

CREATE INDEX kernel_department_members_company_idx
  ON kernel.department_members (company_id);
CREATE INDEX kernel_department_members_dept_idx
  ON kernel.department_members (department_id);
CREATE INDEX kernel_department_members_user_idx
  ON kernel.department_members (user_id);

ALTER TABLE kernel.department_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "department_members_rls" ON kernel.department_members
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.department_members IS
  'Membros de cada departamento. Junction table user_id <-> department_id, escopada por company_id (RLS).';
