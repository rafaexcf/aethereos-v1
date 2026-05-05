-- kernel.security_alerts — Alertas de seguranca (Sprint 26)
-- Capturados por jobs/triggers (login fora do horario, IP estranho, mass download).
-- resolved_at NULL = aberto; preenchido = resolvido.

CREATE TABLE kernel.security_alerts (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  user_id     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  alert_type  TEXT         NOT NULL
                CHECK (alert_type IN (
                  'login_unusual_ip',
                  'failed_login',
                  'off_hours_access',
                  'mass_download',
                  'permission_change'
                )),
  severity    TEXT         NOT NULL
                CHECK (severity IN ('low','medium','high','critical')),
  payload     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX kernel_security_alerts_company_idx
  ON kernel.security_alerts (company_id, created_at DESC);
CREATE INDEX kernel_security_alerts_severity_idx
  ON kernel.security_alerts (company_id, severity, created_at DESC);
CREATE INDEX kernel_security_alerts_open_idx
  ON kernel.security_alerts (company_id, created_at DESC)
  WHERE resolved_at IS NULL;
CREATE INDEX kernel_security_alerts_user_idx
  ON kernel.security_alerts (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE kernel.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_alerts_rls" ON kernel.security_alerts
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.security_alerts IS
  'Alertas de seguranca capturados por jobs/triggers. resolved_at NULL = aberto. payload JSONB livre p/ contexto.';
