-- kernel.company_settings — Settings hierarquicos da empresa (Sprint 26)
-- Substitui kernel.settings legado (que era key/scope mas sem company_id explicito).
-- Permite settings por empresa, departamento ou usuario; UNIQUE garante uma entrada por (company,key,scope,scope_id).

CREATE TABLE kernel.company_settings (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  key         TEXT         NOT NULL CHECK (char_length(trim(key)) >= 1),
  value       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  scope       TEXT         NOT NULL DEFAULT 'company'
                CHECK (scope IN ('company','department','user')),
  scope_id    UUID,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, key, scope, scope_id)
);

CREATE INDEX kernel_company_settings_company_idx
  ON kernel.company_settings (company_id, key);
CREATE INDEX kernel_company_settings_scope_idx
  ON kernel.company_settings (company_id, scope, scope_id)
  WHERE scope_id IS NOT NULL;

ALTER TABLE kernel.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_settings_rls" ON kernel.company_settings
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

CREATE TRIGGER kernel_company_settings_updated_at
  BEFORE UPDATE ON kernel.company_settings
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

COMMENT ON TABLE kernel.company_settings IS
  'Settings hierarquicos da empresa. scope ∈ {company,department,user}. UNIQUE(company_id,key,scope,scope_id) garante uma entrada por escopo.';
