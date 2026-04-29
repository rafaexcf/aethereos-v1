-- MX6: kernel.staff_access_log — imutável, registra todo acesso staff a companies
-- Referência: Fundamentação 12.4 [INV], platform.staff.access
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kernel.staff_access_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id  UUID NOT NULL REFERENCES kernel.users(id),
  company_id     UUID NOT NULL REFERENCES kernel.companies(id),
  action         TEXT NOT NULL CHECK (char_length(action) BETWEEN 1 AND 100),
  resource_id    UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE kernel.staff_access_log IS
  'Log imutável de acessos staff. Todo acesso staff a dados de uma company é registrado aqui. Referência para emissão de platform.staff.access via outbox.';

CREATE INDEX kernel_staff_access_log_company_idx
  ON kernel.staff_access_log (company_id, created_at DESC);

CREATE INDEX kernel_staff_access_log_staff_idx
  ON kernel.staff_access_log (staff_user_id, created_at DESC);

-- RLS: staff pode inserir seus próprios acessos; SELECT via service_role apenas
ALTER TABLE kernel.staff_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_access_log_insert ON kernel.staff_access_log
  FOR INSERT
  WITH CHECK (staff_user_id = auth.uid());

-- Sem SELECT policy via anon/user — leitura apenas via service_role (admin)
