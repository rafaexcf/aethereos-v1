-- kernel.notes — Bloco de Notas interno, inspirado no Google Keep
-- Ref: Sprint, Fundamentação P4 (multi-tenant por RLS)

CREATE TABLE kernel.notes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL DEFAULT '',
  content      TEXT        NOT NULL DEFAULT '',
  checklist    JSONB       NOT NULL DEFAULT '[]',
  is_checklist BOOLEAN     NOT NULL DEFAULT false,
  color        TEXT        NOT NULL DEFAULT 'default',
  pinned       BOOLEAN     NOT NULL DEFAULT false,
  archived     BOOLEAN     NOT NULL DEFAULT false,
  trashed      BOOLEAN     NOT NULL DEFAULT false,
  trashed_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notes_user_company_idx
  ON kernel.notes (user_id, company_id, updated_at DESC);

CREATE INDEX notes_trashed_at_idx
  ON kernel.notes (trashed_at)
  WHERE trashed = true;

ALTER TABLE kernel.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_user_isolation" ON kernel.notes
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

-- Labels
CREATE TABLE kernel.note_labels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, company_id, name)
);

ALTER TABLE kernel.note_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_labels_user_isolation" ON kernel.note_labels
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

-- Label links (many-to-many)
CREATE TABLE kernel.note_label_links (
  note_id  UUID NOT NULL REFERENCES kernel.notes(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES kernel.note_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, label_id)
);

ALTER TABLE kernel.note_label_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_label_links_user_isolation" ON kernel.note_label_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kernel.notes n
      WHERE n.id = note_id AND n.user_id = auth.uid() AND n.company_id = kernel.current_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kernel.notes n
      WHERE n.id = note_id AND n.user_id = auth.uid() AND n.company_id = kernel.current_company_id()
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION kernel.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON kernel.notes
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

COMMENT ON TABLE kernel.notes IS
  'Notas internas por usuário (Bloco de Notas). RLS garante isolamento por user+tenant.';
COMMENT ON TABLE kernel.note_labels IS
  'Labels de organização das notas. Escopo user+tenant.';
COMMENT ON TABLE kernel.note_label_links IS
  'Relação N:N entre notas e labels. Herdada do escopo da nota.';
