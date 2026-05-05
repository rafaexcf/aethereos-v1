-- kernel.app_access_rules — Regras de acesso a apps por empresa (Sprint 26)
-- rule_type define o escopo de quem pode usar o app:
--   - 'all': todos da empresa
--   - 'by_role': roles em rule_target
--   - 'by_department': departments em rule_target
--   - 'by_user_list': usuarios em rule_target
--   - 'blocked': ninguem (override total)
-- app_id NAO e FK pois kernel.app_registry e global (read-only catalog).

CREATE TABLE kernel.app_access_rules (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  app_id      TEXT         NOT NULL CHECK (char_length(trim(app_id)) >= 1),
  rule_type   TEXT         NOT NULL
                CHECK (rule_type IN ('all','by_role','by_department','by_user_list','blocked')),
  rule_target JSONB        NOT NULL DEFAULT '[]'::jsonb,
  allow       BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, app_id)
);

CREATE INDEX kernel_app_access_rules_company_idx
  ON kernel.app_access_rules (company_id, app_id);

ALTER TABLE kernel.app_access_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_access_rules_rls" ON kernel.app_access_rules
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.app_access_rules IS
  'Regras de acesso a apps por empresa. UNIQUE(company_id, app_id) — uma regra por app por empresa. rule_target JSONB array de ids/labels conforme rule_type.';
