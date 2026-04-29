-- Migration: kernel.files + kernel.file_versions
-- Drive app — M41, Sprint 6

-- Tabela principal de arquivos e pastas
CREATE TABLE kernel.files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES kernel.files(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('folder','file')),
  name          TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    BIGINT,
  storage_path  TEXT,        -- caminho no Supabase Storage (NULL para pastas)
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- nome único por pasta dentro da mesma company
  CONSTRAINT kernel_files_unique_name UNIQUE (company_id, parent_id, name)
);

CREATE INDEX kernel_files_company_parent_idx ON kernel.files (company_id, parent_id);
CREATE INDEX kernel_files_company_kind_idx   ON kernel.files (company_id, kind);

-- Versionamento (v1: apenas metadados de versão, conteúdo no Storage)
CREATE TABLE kernel.file_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id      UUID NOT NULL REFERENCES kernel.files(id) ON DELETE CASCADE,
  version      INT  NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes   BIGINT,
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT kernel_file_versions_unique UNIQUE (file_id, version)
);

CREATE INDEX kernel_file_versions_file_idx ON kernel.file_versions (file_id, version DESC);

-- Trigger updated_at
CREATE TRIGGER kernel_files_updated_at
  BEFORE UPDATE ON kernel.files
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

-- RLS
ALTER TABLE kernel.files        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kernel.file_versions ENABLE ROW LEVEL SECURITY;

-- Política: usuário vê arquivos da sua company ativa
CREATE POLICY "files_company_isolation" ON kernel.files
  FOR ALL USING (company_id = kernel.current_company_id())
  WITH CHECK  (company_id = kernel.current_company_id());

-- Política: versões visíveis se o arquivo-pai é visível
CREATE POLICY "file_versions_via_file" ON kernel.file_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM kernel.files f
      WHERE f.id = file_id
        AND f.company_id = kernel.current_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kernel.files f
      WHERE f.id = file_id
        AND f.company_id = kernel.current_company_id()
    )
  );

-- service_role não precisa de policy (bypassa RLS por default)
