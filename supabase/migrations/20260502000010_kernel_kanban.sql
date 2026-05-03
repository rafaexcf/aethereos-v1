-- kernel.kanban_* — App Kanban: quadros, colunas, cartões, etiquetas, checklist,
-- comentários, anexos e histórico de atividades.
-- Posição: DOUBLE PRECISION para algoritmo midpoint (sem renormalização frequente).

-- ─── Boards ───────────────────────────────────────────────────────────────────

CREATE TABLE kernel.kanban_boards (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID           NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name         TEXT           NOT NULL CHECK (char_length(trim(name)) >= 1),
  description  TEXT           NOT NULL DEFAULT '',
  color        TEXT           NOT NULL DEFAULT '#6366f1',
  is_archived  BOOLEAN        NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX kanban_boards_user_company_idx ON kernel.kanban_boards (user_id, company_id, created_at DESC);

ALTER TABLE kernel.kanban_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_boards_rls" ON kernel.kanban_boards
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER kanban_boards_updated_at
  BEFORE UPDATE ON kernel.kanban_boards
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── Columns ──────────────────────────────────────────────────────────────────

CREATE TABLE kernel.kanban_columns (
  id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id     UUID            NOT NULL REFERENCES kernel.kanban_boards(id) ON DELETE CASCADE,
  user_id      UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID            NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name         TEXT            NOT NULL CHECK (char_length(trim(name)) >= 1),
  position     DOUBLE PRECISION NOT NULL DEFAULT 1000,
  color        TEXT,
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX kanban_columns_board_idx ON kernel.kanban_columns (board_id, position);

ALTER TABLE kernel.kanban_columns ENABLE ROW LEVEL SECURITY;

-- Columns are visible/writable if the parent board belongs to the current user
CREATE POLICY "kanban_columns_read" ON kernel.kanban_columns FOR SELECT
  USING (
    company_id = kernel.current_company_id()
    AND EXISTS (SELECT 1 FROM kernel.kanban_boards b WHERE b.id = board_id AND b.user_id = auth.uid())
  );

CREATE POLICY "kanban_columns_write" ON kernel.kanban_columns FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER kanban_columns_updated_at
  BEFORE UPDATE ON kernel.kanban_columns
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── Cards ────────────────────────────────────────────────────────────────────

CREATE TABLE kernel.kanban_cards (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id     UUID             NOT NULL REFERENCES kernel.kanban_boards(id)   ON DELETE CASCADE,
  column_id    UUID             NOT NULL REFERENCES kernel.kanban_columns(id)  ON DELETE CASCADE,
  user_id      UUID             NOT NULL REFERENCES auth.users(id)             ON DELETE CASCADE,
  company_id   UUID             NOT NULL REFERENCES kernel.companies(id)       ON DELETE CASCADE,
  assignee_id  UUID             REFERENCES auth.users(id) ON DELETE SET NULL,
  title        TEXT             NOT NULL CHECK (char_length(trim(title)) >= 1),
  description  TEXT             NOT NULL DEFAULT '',
  priority     TEXT             NOT NULL DEFAULT 'medium'
                                CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date     DATE,
  status       TEXT             NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'completed', 'archived')),
  position     DOUBLE PRECISION NOT NULL DEFAULT 1000,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX kanban_cards_board_idx      ON kernel.kanban_cards (board_id, position);
CREATE INDEX kanban_cards_column_idx     ON kernel.kanban_cards (column_id, position);
CREATE INDEX kanban_cards_user_idx       ON kernel.kanban_cards (user_id, company_id);
CREATE INDEX kanban_cards_assignee_idx   ON kernel.kanban_cards (assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX kanban_cards_due_date_idx   ON kernel.kanban_cards (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX kanban_cards_status_idx     ON kernel.kanban_cards (board_id, status);

ALTER TABLE kernel.kanban_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_cards_read" ON kernel.kanban_cards FOR SELECT
  USING (
    company_id = kernel.current_company_id()
    AND EXISTS (SELECT 1 FROM kernel.kanban_boards b WHERE b.id = board_id AND b.user_id = auth.uid())
  );

CREATE POLICY "kanban_cards_write" ON kernel.kanban_cards FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER kanban_cards_updated_at
  BEFORE UPDATE ON kernel.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── Labels ───────────────────────────────────────────────────────────────────

CREATE TABLE kernel.kanban_labels (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id     UUID        NOT NULL REFERENCES kernel.kanban_boards(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL CHECK (char_length(trim(name)) >= 1),
  color        TEXT        NOT NULL DEFAULT '#6366f1',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX kanban_labels_board_idx ON kernel.kanban_labels (board_id);

ALTER TABLE kernel.kanban_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_labels_rls" ON kernel.kanban_labels
  FOR ALL
  USING  (company_id = kernel.current_company_id()
          AND EXISTS (SELECT 1 FROM kernel.kanban_boards b WHERE b.id = board_id AND b.user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

-- ─── Card ↔ Label junction ────────────────────────────────────────────────────

CREATE TABLE kernel.kanban_card_labels (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID        NOT NULL REFERENCES kernel.kanban_cards(id)  ON DELETE CASCADE,
  label_id   UUID        NOT NULL REFERENCES kernel.kanban_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (card_id, label_id)
);

CREATE INDEX kanban_card_labels_card_idx  ON kernel.kanban_card_labels (card_id);
CREATE INDEX kanban_card_labels_label_idx ON kernel.kanban_card_labels (label_id);

ALTER TABLE kernel.kanban_card_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_card_labels_rls" ON kernel.kanban_card_labels
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kernel.kanban_cards c
      JOIN kernel.kanban_boards b ON b.id = c.board_id
      WHERE c.id = card_id AND b.user_id = auth.uid()
        AND c.company_id = kernel.current_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kernel.kanban_cards c
      JOIN kernel.kanban_boards b ON b.id = c.board_id
      WHERE c.id = card_id AND b.user_id = auth.uid()
        AND c.company_id = kernel.current_company_id()
    )
  );

-- ─── Checklist items ──────────────────────────────────────────────────────────

CREATE TABLE kernel.kanban_checklist_items (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      UUID             NOT NULL REFERENCES kernel.kanban_cards(id) ON DELETE CASCADE,
  user_id      UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text         TEXT             NOT NULL CHECK (char_length(trim(text)) >= 1),
  is_completed BOOLEAN          NOT NULL DEFAULT false,
  position     DOUBLE PRECISION NOT NULL DEFAULT 1000,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX kanban_checklist_items_card_idx ON kernel.kanban_checklist_items (card_id, position);

ALTER TABLE kernel.kanban_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_checklist_items_rls" ON kernel.kanban_checklist_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kernel.kanban_cards c
      JOIN kernel.kanban_boards b ON b.id = c.board_id
      WHERE c.id = card_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER kanban_checklist_items_updated_at
  BEFORE UPDATE ON kernel.kanban_checklist_items
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── Comments ─────────────────────────────────────────────────────────────────

CREATE TABLE kernel.kanban_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID        NOT NULL REFERENCES kernel.kanban_cards(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(trim(content)) >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX kanban_comments_card_idx ON kernel.kanban_comments (card_id, created_at DESC);

ALTER TABLE kernel.kanban_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_comments_read" ON kernel.kanban_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kernel.kanban_cards c
      JOIN kernel.kanban_boards b ON b.id = c.board_id
      WHERE c.id = card_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "kanban_comments_write" ON kernel.kanban_comments FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER kanban_comments_updated_at
  BEFORE UPDATE ON kernel.kanban_comments
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── Attachments ──────────────────────────────────────────────────────────────
-- file_id: futuro link com kernel.media_files (Drive). storage_path: bucket direto.

CREATE TABLE kernel.kanban_attachments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      UUID        NOT NULL REFERENCES kernel.kanban_cards(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id      UUID        REFERENCES kernel.media_files(id) ON DELETE SET NULL,
  file_name    TEXT        NOT NULL,
  file_url     TEXT,
  storage_path TEXT,
  mime_type    TEXT        NOT NULL DEFAULT 'application/octet-stream',
  size_bytes   BIGINT      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX kanban_attachments_card_idx ON kernel.kanban_attachments (card_id);

ALTER TABLE kernel.kanban_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_attachments_rls" ON kernel.kanban_attachments
  FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM kernel.kanban_cards c
      JOIN kernel.kanban_boards b ON b.id = c.board_id
      WHERE c.id = card_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (user_id = auth.uid());

-- ─── Activity log ─────────────────────────────────────────────────────────────

CREATE TABLE kernel.kanban_activity (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   UUID        NOT NULL REFERENCES kernel.kanban_boards(id) ON DELETE CASCADE,
  card_id    UUID        REFERENCES kernel.kanban_cards(id) ON DELETE SET NULL,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action     TEXT        NOT NULL,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX kanban_activity_board_idx ON kernel.kanban_activity (board_id, created_at DESC);
CREATE INDEX kanban_activity_card_idx  ON kernel.kanban_activity (card_id, created_at DESC)
  WHERE card_id IS NOT NULL;

ALTER TABLE kernel.kanban_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_activity_read" ON kernel.kanban_activity FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM kernel.kanban_boards b WHERE b.id = board_id AND b.user_id = auth.uid())
  );

CREATE POLICY "kanban_activity_insert" ON kernel.kanban_activity FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─── Comments ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE kernel.kanban_boards             IS 'Quadros Kanban por usuário/empresa.';
COMMENT ON TABLE kernel.kanban_columns            IS 'Colunas de um quadro, ordenadas por position.';
COMMENT ON TABLE kernel.kanban_cards              IS 'Cartões de um quadro. priority ∈ {low,medium,high,urgent}; status ∈ {active,completed,archived}.';
COMMENT ON TABLE kernel.kanban_labels             IS 'Etiquetas por quadro; color = hex string.';
COMMENT ON TABLE kernel.kanban_card_labels        IS 'Junção cartão ↔ etiqueta.';
COMMENT ON TABLE kernel.kanban_checklist_items    IS 'Itens de checklist por cartão.';
COMMENT ON TABLE kernel.kanban_comments           IS 'Comentários por cartão.';
COMMENT ON TABLE kernel.kanban_attachments        IS 'Anexos por cartão. file_id prepara integração Drive.';
COMMENT ON TABLE kernel.kanban_activity           IS 'Log de atividades por quadro/cartão. metadata JSONB livre.';
