-- Magic Store catalog: relax kernel.company_modules para suportar IDs arbitrários
-- do catálogo (apps internos, AI weblinks, jogos, integrações). Adiciona policies
-- de INSERT/DELETE para que qualquer membro autenticado da company instale ou
-- remova módulos. Mantém RLS por company_id via kernel.current_company_id().

ALTER TABLE kernel.company_modules
  DROP CONSTRAINT IF EXISTS company_modules_module_check;

ALTER TABLE kernel.company_modules
  ADD CONSTRAINT company_modules_module_format_check
  CHECK (module ~ '^[a-z0-9][a-z0-9_-]{0,63}$');

CREATE POLICY "company_modules: tenant insert"
  ON kernel.company_modules FOR INSERT
  TO authenticated
  WITH CHECK (company_id = kernel.current_company_id());

CREATE POLICY "company_modules: tenant delete"
  ON kernel.company_modules FOR DELETE
  TO authenticated
  USING (company_id = kernel.current_company_id());

CREATE POLICY "company_modules: tenant update"
  ON kernel.company_modules FOR UPDATE
  TO authenticated
  USING (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

GRANT INSERT, UPDATE, DELETE ON kernel.company_modules TO authenticated;

CREATE INDEX IF NOT EXISTS company_modules_company_idx
  ON kernel.company_modules (company_id, module);
