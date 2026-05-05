-- kernel.access_schedules — Janelas de horario permitidas para acesso (Sprint 26)
-- Define quando determinado escopo (empresa, departamento, role ou usuario)
-- pode acessar o sistema. allow_emergency permite override em emergencia.

CREATE TABLE kernel.access_schedules (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  scope            TEXT         NOT NULL
                     CHECK (scope IN ('company','department','role','user')),
  scope_id         UUID,
  weekdays         TEXT[]       NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri']::TEXT[],
  start_time       TIME,
  end_time         TIME,
  timezone         TEXT         NOT NULL DEFAULT 'America/Sao_Paulo',
  allow_emergency  BOOLEAN      NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX kernel_access_schedules_company_idx
  ON kernel.access_schedules (company_id, scope);
CREATE INDEX kernel_access_schedules_scope_id_idx
  ON kernel.access_schedules (scope_id)
  WHERE scope_id IS NOT NULL;

ALTER TABLE kernel.access_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_schedules_rls" ON kernel.access_schedules
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.access_schedules IS
  'Horarios de acesso permitidos por escopo (empresa/departamento/role/usuario). weekdays e array de mon..sun. allow_emergency pode burlar a janela.';
