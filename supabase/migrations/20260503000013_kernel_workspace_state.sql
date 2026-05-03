-- kernel.workspace_state — Persistência das tabs e janelas abertas do OS
-- por usuário+empresa. Substitui o estado in-memory de useOSStore e
-- useWindowsStore após reload. Uma linha por par (user_id, company_id).

CREATE TABLE kernel.workspace_state (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  tabs          JSONB        NOT NULL DEFAULT '[]'::jsonb,
  active_tab_id TEXT,
  windows       JSONB        NOT NULL DEFAULT '[]'::jsonb,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, company_id)
);

CREATE INDEX workspace_state_user_company_idx
  ON kernel.workspace_state (user_id, company_id);

ALTER TABLE kernel.workspace_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_state_rls" ON kernel.workspace_state
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER workspace_state_updated_at
  BEFORE UPDATE ON kernel.workspace_state
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

COMMENT ON TABLE kernel.workspace_state IS
  'Estado persistido do workspace OS (tabs + janelas) por usuário+empresa. '
  'Hidratado em mount via useWorkspacePersistence; upsert debounced 1s. '
  'Não persiste estado transitório (modais, scroll, drag).';
