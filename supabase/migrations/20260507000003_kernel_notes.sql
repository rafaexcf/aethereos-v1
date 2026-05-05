-- Sprint 29 MX157: kernel.notes — persistência do app Bloco de Notas.

CREATE TABLE kernel.notes (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title       TEXT         NOT NULL DEFAULT 'Sem título',
  content     TEXT         NOT NULL DEFAULT '',
  color       TEXT         DEFAULT '#fbbf24',
  pinned      BOOLEAN      NOT NULL DEFAULT false,
  archived    BOOLEAN      NOT NULL DEFAULT false,
  created_by  UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX kernel_notes_company_active_idx
  ON kernel.notes (company_id, pinned DESC, updated_at DESC)
  WHERE archived = false;
CREATE INDEX kernel_notes_company_archived_idx
  ON kernel.notes (company_id, updated_at DESC)
  WHERE archived = true;

ALTER TABLE kernel.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_rls" ON kernel.notes
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON kernel.notes
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

COMMENT ON TABLE kernel.notes IS
  'Notas do app Bloco de Notas. archived=true funciona como soft-delete '
  'consumido pela Lixeira (Sprint 29 MX161).';
