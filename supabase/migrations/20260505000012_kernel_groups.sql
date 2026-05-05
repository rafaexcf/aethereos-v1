-- kernel.groups — Grupos arbitrarios de usuarios (Sprint 26)
-- Diferentes de departamentos: agrupamento livre p/ permissoes ou comunicacao
-- (ex.: "lideres de squad", "comite ESG", "early access beta").

CREATE TABLE kernel.groups (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name        TEXT         NOT NULL CHECK (char_length(trim(name)) >= 1),
  description TEXT,
  created_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX kernel_groups_company_idx
  ON kernel.groups (company_id, name);

ALTER TABLE kernel.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_rls" ON kernel.groups
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

CREATE TRIGGER kernel_groups_updated_at
  BEFORE UPDATE ON kernel.groups
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

COMMENT ON TABLE kernel.groups IS
  'Grupos arbitrarios de usuarios para fins de permissao/comunicacao. Diferente de departamentos. RLS por company_id.';
