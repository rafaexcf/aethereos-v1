-- kernel.departments — Departamentos da empresa (Sprint 26)
-- Cada empresa pode organizar colaboradores em departamentos lógicos.
-- manager_user_id aponta para o gestor responsável (opcional).

CREATE TABLE kernel.departments (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name            TEXT         NOT NULL CHECK (char_length(trim(name)) >= 1),
  description     TEXT,
  manager_user_id UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX kernel_departments_company_idx
  ON kernel.departments (company_id, name);
CREATE INDEX kernel_departments_manager_idx
  ON kernel.departments (manager_user_id)
  WHERE manager_user_id IS NOT NULL;

ALTER TABLE kernel.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_rls" ON kernel.departments
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

CREATE TRIGGER kernel_departments_updated_at
  BEFORE UPDATE ON kernel.departments
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

COMMENT ON TABLE kernel.departments IS
  'Departamentos da empresa (ex.: Financeiro, RH, TI). manager_user_id é o gestor responsavel. RLS por company_id.';
