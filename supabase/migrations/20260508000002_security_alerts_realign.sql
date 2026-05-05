-- Sprint 30 MX166: realinhamento de kernel.security_alerts
-- O Sprint 26 criou a tabela com schema preliminar (alert_type/severity de
-- categorias de monitoramento + payload JSONB). O plano canônico pede:
--   - alert_type expandido pra eventos discretos auto-emitidos pela aplicação
--     (login_new_device, member_removed, admin_added, mfa_disabled, ...)
--   - severity reduzida a 3 níveis (info/warning/critical)
--   - title/description/metadata como campos de primeira classe
--   - acknowledged BOOLEAN (substitui resolved_at) + acknowledged_by UUID
-- DROP + CREATE: tabela ainda não tem dados de produção (tabela criada na
-- mesma janela do Sprint 26).

DROP TABLE IF EXISTS kernel.security_alerts CASCADE;

CREATE TABLE kernel.security_alerts (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  user_id         UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  alert_type      TEXT         NOT NULL
                    CHECK (alert_type IN (
                      'login_new_device',
                      'login_new_ip',
                      'login_failed_multiple',
                      'permission_change',
                      'bulk_data_access',
                      'mfa_disabled',
                      'member_removed',
                      'admin_added'
                    )),
  severity        TEXT         NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('info','warning','critical')),
  title           TEXT         NOT NULL,
  description     TEXT         NOT NULL,
  metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  acknowledged    BOOLEAN      NOT NULL DEFAULT false,
  acknowledged_by UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX kernel_security_alerts_company_idx
  ON kernel.security_alerts (company_id, acknowledged, created_at DESC);
CREATE INDEX kernel_security_alerts_severity_idx
  ON kernel.security_alerts (company_id, severity);
CREATE INDEX kernel_security_alerts_user_idx
  ON kernel.security_alerts (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE kernel.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_alerts_rls" ON kernel.security_alerts
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.security_alerts IS
  'Alertas de seguranca auto-emitidos pela aplicacao (member_removed, admin_added, mfa_disabled, ...). acknowledged=false = aberto.';
