CREATE TABLE kernel.presentations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'Nova Apresentação',
  slides      JSONB       NOT NULL DEFAULT '[]',
  theme       TEXT        NOT NULL DEFAULT 'dark',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX presentations_user_company_idx ON kernel.presentations (user_id, company_id, updated_at DESC);
ALTER TABLE kernel.presentations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presentations_rls" ON kernel.presentations
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());
CREATE TRIGGER presentations_updated_at
  BEFORE UPDATE ON kernel.presentations
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();
