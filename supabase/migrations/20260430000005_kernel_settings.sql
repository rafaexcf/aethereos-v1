-- Migration: kernel.settings — configurações por escopo
-- M44, Sprint 6

CREATE TABLE kernel.settings (
  scope      TEXT NOT NULL CHECK (scope IN ('user','company','platform')),
  scope_id   UUID NOT NULL,
  key        TEXT NOT NULL,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (scope, scope_id, key)
);

CREATE INDEX kernel_settings_scope_id_idx ON kernel.settings (scope, scope_id);

CREATE TRIGGER kernel_settings_updated_at
  BEFORE UPDATE ON kernel.settings
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

-- RLS: usuário lê/escreve suas próprias settings (scope=user, scope_id=auth.uid())
-- Owner/admin leem/escrevem settings da company (scope=company, scope_id=current_company_id())
-- Platform settings: apenas service_role
ALTER TABLE kernel.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_user" ON kernel.settings
  FOR ALL
  USING (
    (scope = 'user' AND scope_id = auth.uid())
    OR
    (scope = 'company' AND scope_id = kernel.current_company_id())
  )
  WITH CHECK (
    (scope = 'user' AND scope_id = auth.uid())
    OR
    (scope = 'company' AND scope_id = kernel.current_company_id())
  );
