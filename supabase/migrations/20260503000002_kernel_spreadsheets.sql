CREATE TABLE kernel.spreadsheets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'Nova Planilha',
  sheets      JSONB       NOT NULL DEFAULT '[{"name":"Plan1","cells":{}}]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX spreadsheets_user_company_idx ON kernel.spreadsheets (user_id, company_id, updated_at DESC);
ALTER TABLE kernel.spreadsheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spreadsheets_rls" ON kernel.spreadsheets
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());
CREATE TRIGGER spreadsheets_updated_at
  BEFORE UPDATE ON kernel.spreadsheets
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();
