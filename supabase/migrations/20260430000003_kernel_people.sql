-- Migration: kernel.people — Cadastro de Pessoas
-- M42, Sprint 6

CREATE TABLE kernel.people (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name    TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  role_label   TEXT,
  department   TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive','onboarding')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT kernel_people_unique_email UNIQUE (company_id, email)
);

CREATE INDEX kernel_people_company_status_idx  ON kernel.people (company_id, status);
CREATE INDEX kernel_people_company_dept_idx    ON kernel.people (company_id, department);

CREATE TRIGGER kernel_people_updated_at
  BEFORE UPDATE ON kernel.people
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

-- RLS
ALTER TABLE kernel.people ENABLE ROW LEVEL SECURITY;

-- Qualquer membro da company lê
CREATE POLICY "people_read" ON kernel.people
  FOR SELECT USING (company_id = kernel.current_company_id());

-- Owner/admin podem inserir e atualizar
CREATE POLICY "people_write" ON kernel.people
  FOR INSERT WITH CHECK (company_id = kernel.current_company_id());

CREATE POLICY "people_update" ON kernel.people
  FOR UPDATE USING (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

-- Exclusão física bloqueada — usar status=inactive (operação invariante 12.4 #2)
-- DELETE exige service_role (nunca via authenticated RLS)
