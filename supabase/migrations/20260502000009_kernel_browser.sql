-- kernel.browser_bookmarks — Favoritos do navegador interno por usuário/empresa
-- kernel.browser_history  — Histórico de navegação por usuário/empresa

-- ─── Bookmarks ────────────────────────────────────────────────────────────────

CREATE TABLE kernel.browser_bookmarks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL DEFAULT '',
  url          TEXT        NOT NULL CHECK (char_length(trim(url)) >= 1),
  favicon_url  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX browser_bookmarks_user_company_idx
  ON kernel.browser_bookmarks (user_id, company_id, created_at DESC);

ALTER TABLE kernel.browser_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "browser_bookmarks_user_isolation" ON kernel.browser_bookmarks
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER browser_bookmarks_updated_at
  BEFORE UPDATE ON kernel.browser_bookmarks
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── History ──────────────────────────────────────────────────────────────────

CREATE TABLE kernel.browser_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL DEFAULT '',
  url          TEXT        NOT NULL,
  visited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX browser_history_user_company_idx
  ON kernel.browser_history (user_id, company_id, visited_at DESC);

ALTER TABLE kernel.browser_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "browser_history_user_isolation" ON kernel.browser_history
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.browser_bookmarks IS 'Favoritos do navegador interno por usuário/empresa. Sem senhas ou cookies armazenados.';
COMMENT ON TABLE kernel.browser_history IS 'Histórico de navegação do navegador interno. Mantido apenas para o próprio usuário.';
