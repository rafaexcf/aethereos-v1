-- ─── kernel.trash_items ───────────────────────────────────────────────────────
-- Tabela de lixeira unificada para itens excluídos de qualquer app do OS.
-- Notas continuam usando kernel.notes WHERE trashed = true (campo nativo).
-- Esta tabela é usada para futuros apps (tarefas, kanban, gravações, etc.).

CREATE TABLE kernel.trash_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  app_id        TEXT        NOT NULL,
  item_type     TEXT        NOT NULL,
  item_name     TEXT        NOT NULL DEFAULT '',
  item_data     JSONB       NOT NULL DEFAULT '{}',
  original_id   UUID,
  deleted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX trash_items_user_company_idx
  ON kernel.trash_items (user_id, company_id, deleted_at DESC);

ALTER TABLE kernel.trash_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trash_items_rls" ON kernel.trash_items
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

-- Reutiliza set_updated_at do kernel para atualizar expires_at na inserção
-- (trigger de conveniência; expires_at já tem DEFAULT adequado)
CREATE TRIGGER trash_items_expires_set
  BEFORE INSERT ON kernel.trash_items
  FOR EACH ROW
  EXECUTE FUNCTION kernel.set_updated_at();
