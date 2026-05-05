-- Sprint 29 MX161: kernel.files — adiciona deleted_at para soft-delete consumido pela Lixeira.
-- A coluna fica nullable: deleted_at IS NULL = ativo, NOT NULL = na lixeira.

ALTER TABLE kernel.files
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS kernel_files_company_deleted_idx
  ON kernel.files (company_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN kernel.files.deleted_at IS
  'Soft-delete consumido pela Lixeira (Sprint 29 MX161). NULL = ativo, NOT NULL = excluído.';
