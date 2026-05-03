-- kernel.voice_recordings — Gravações de voz do app Gravador de Voz
-- Bucket privado kernel-voice: acesso restrito ao próprio usuário.
-- Caminho no storage: {user_id}/{company_id}/{uuid}-{filename}

-- ─── Bucket privado ───────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kernel-voice',
  'kernel-voice',
  false,
  524288000,   -- 500 MB por arquivo
  ARRAY[
    'audio/webm','audio/ogg','audio/mp4','audio/mpeg',
    'audio/wav','audio/aac','audio/flac'
  ]
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "kernel_voice_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kernel-voice'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "kernel_voice_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kernel-voice'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "kernel_voice_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kernel-voice'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── Tabela de metadados ──────────────────────────────────────────────────────

CREATE TABLE kernel.voice_recordings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id       UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL DEFAULT 'Gravação',
  description      TEXT        NOT NULL DEFAULT '',
  mime_type        TEXT        NOT NULL,
  storage_path     TEXT        NOT NULL,
  duration_seconds NUMERIC(10,2) NOT NULL DEFAULT 0,
  size_bytes       BIGINT      NOT NULL DEFAULT 0,
  -- preparado para transcrição futura (não implementada nesta fase)
  transcript       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX voice_recordings_user_company_idx
  ON kernel.voice_recordings (user_id, company_id, created_at DESC);

ALTER TABLE kernel.voice_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_recordings_user_isolation" ON kernel.voice_recordings
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER voice_recordings_updated_at
  BEFORE UPDATE ON kernel.voice_recordings
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

COMMENT ON TABLE kernel.voice_recordings IS
  'Metadados de gravações de voz. Arquivos no bucket privado kernel-voice. Campo transcript preparado para integração futura com serviço de STT.';
