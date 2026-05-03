CREATE TABLE kernel.documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'Documento sem título',
  content     TEXT        NOT NULL DEFAULT '',
  word_count  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX documents_user_company_idx ON kernel.documents (user_id, company_id, updated_at DESC);
ALTER TABLE kernel.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_rls" ON kernel.documents
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON kernel.documents
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();
