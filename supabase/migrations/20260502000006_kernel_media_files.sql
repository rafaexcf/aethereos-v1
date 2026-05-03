-- kernel.media_files — Metadados de fotos e vídeos capturados pelo app Câmera
-- Bucket privado kernel-media: apenas o próprio usuário acessa seus arquivos.
-- Caminho no storage: {user_id}/{company_id}/{uuid}-{filename}

-- ─── Bucket privado ───────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kernel-media',
  'kernel-media',
  false,
  524288000,  -- 500 MB por arquivo
  ARRAY[
    'image/jpeg','image/png','image/webp',
    'video/webm','video/mp4','video/ogg'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Upload: usuário só pode enviar para seu próprio prefixo (user_id como primeiro segmento)
CREATE POLICY "kernel_media_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kernel-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Leitura: idem
CREATE POLICY "kernel_media_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kernel-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Exclusão: idem
CREATE POLICY "kernel_media_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kernel-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── Tabela de metadados ──────────────────────────────────────────────────────

CREATE TABLE kernel.media_files (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL CHECK (type IN ('photo', 'video')),
  file_name     TEXT        NOT NULL,
  mime_type     TEXT        NOT NULL,
  storage_path  TEXT        NOT NULL,
  size_bytes    BIGINT      NOT NULL DEFAULT 0,
  duration_ms   BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX media_files_user_company_idx
  ON kernel.media_files (user_id, company_id, created_at DESC);

ALTER TABLE kernel.media_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_files_user_isolation" ON kernel.media_files
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.media_files IS
  'Metadados de fotos e vídeos capturados pelo app Câmera. Arquivos no bucket privado kernel-media.';
