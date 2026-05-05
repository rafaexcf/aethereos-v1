-- Sprint 29 MX157: kernel.kanban_boards + kernel.kanban_columns + kernel.kanban_cards.
-- Persistência do app Kanban com 3 níveis: board → colunas → cards.

CREATE TABLE kernel.kanban_boards (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name        TEXT         NOT NULL DEFAULT 'Meu Board',
  created_by  UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX kernel_kanban_boards_company_idx ON kernel.kanban_boards (company_id);

ALTER TABLE kernel.kanban_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_boards_rls" ON kernel.kanban_boards
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

CREATE TRIGGER kanban_boards_updated_at
  BEFORE UPDATE ON kernel.kanban_boards
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

CREATE TABLE kernel.kanban_columns (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID         NOT NULL REFERENCES kernel.kanban_boards(id) ON DELETE CASCADE,
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name        TEXT         NOT NULL,
  color       TEXT         DEFAULT '#64748b',
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX kernel_kanban_columns_board_idx
  ON kernel.kanban_columns (board_id, sort_order);

ALTER TABLE kernel.kanban_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_columns_rls" ON kernel.kanban_columns
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

CREATE TABLE kernel.kanban_cards (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id    UUID         NOT NULL REFERENCES kernel.kanban_columns(id) ON DELETE CASCADE,
  company_id   UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title        TEXT         NOT NULL,
  description  TEXT         NOT NULL DEFAULT '',
  color        TEXT,
  assigned_to  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date     DATE,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  created_by   UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX kernel_kanban_cards_column_idx
  ON kernel.kanban_cards (column_id, sort_order);

ALTER TABLE kernel.kanban_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_cards_rls" ON kernel.kanban_cards
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

CREATE TRIGGER kanban_cards_updated_at
  BEFORE UPDATE ON kernel.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

COMMENT ON TABLE kernel.kanban_boards IS 'Boards do Kanban. Multi-tenant.';
COMMENT ON TABLE kernel.kanban_columns IS 'Colunas dentro de boards.';
COMMENT ON TABLE kernel.kanban_cards IS 'Cards dentro de colunas.';
