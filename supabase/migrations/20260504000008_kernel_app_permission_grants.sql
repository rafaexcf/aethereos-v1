-- Sprint 23 MX123 — kernel.app_permission_grants
--
-- Grants per-company per-app per-scope. Quando usuario aceita scopes
-- ao instalar um app na Magic Store, uma row eh criada aqui para cada
-- scope autorizado. AppBridgeHandler consulta essa tabela antes de
-- executar metodos via bridge.
--
-- Apps nativos (entry_mode=internal) NAO usam essa tabela — acessam
-- drivers diretamente sem bridge.

CREATE TABLE kernel.app_permission_grants (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  app_id      TEXT         NOT NULL REFERENCES kernel.app_registry(id) ON DELETE CASCADE,
  scope       TEXT         NOT NULL CHECK (char_length(trim(scope)) BETWEEN 1 AND 64),
  granted_by  UUID         NOT NULL REFERENCES kernel.users(id),
  granted_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, app_id, scope)
);

CREATE INDEX app_permission_grants_lookup_idx
  ON kernel.app_permission_grants (company_id, app_id);

ALTER TABLE kernel.app_permission_grants ENABLE ROW LEVEL SECURITY;

-- Membros da company veem grants da propria company.
CREATE POLICY "app_permission_grants_select" ON kernel.app_permission_grants
  FOR SELECT
  TO authenticated
  USING (company_id = kernel.current_company_id());

-- Apenas usuarios da company podem grant/revogar — granted_by deve ser auth.uid().
CREATE POLICY "app_permission_grants_insert" ON kernel.app_permission_grants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = kernel.current_company_id()
    AND granted_by = auth.uid()
  );

CREATE POLICY "app_permission_grants_delete" ON kernel.app_permission_grants
  FOR DELETE
  TO authenticated
  USING (company_id = kernel.current_company_id());

GRANT SELECT, INSERT, DELETE ON kernel.app_permission_grants TO authenticated;

COMMENT ON TABLE kernel.app_permission_grants IS
  'Sprint 23: scopes granted por company para cada app instalado. Bridge handler consulta antes de executar metodos.';
