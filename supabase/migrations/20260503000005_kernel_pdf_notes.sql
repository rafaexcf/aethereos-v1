CREATE TABLE kernel.pdf_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  file_name   TEXT        NOT NULL,
  notes       TEXT        NOT NULL DEFAULT '',
  ai_summary  TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX pdf_notes_user_company_idx ON kernel.pdf_notes (user_id, company_id, updated_at DESC);
ALTER TABLE kernel.pdf_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_notes_rls" ON kernel.pdf_notes
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());
CREATE TRIGGER pdf_notes_updated_at
  BEFORE UPDATE ON kernel.pdf_notes
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();
