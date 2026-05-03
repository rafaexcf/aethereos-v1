-- kernel.meetings — Reuniões app (Jitsi-embedded video meetings).
-- Persistência da fila de reuniões + path opcional para gravação (kernel-meetings bucket)
-- e transcrição texto plano (Web Speech API client-side).

CREATE TABLE kernel.meetings (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title           TEXT         NOT NULL,
  room_id         TEXT         NOT NULL UNIQUE,
  description     TEXT,
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  recording_url   TEXT,
  transcript      TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX meetings_user_company_scheduled_idx
  ON kernel.meetings (user_id, company_id, scheduled_at DESC);

ALTER TABLE kernel.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meetings_rls" ON kernel.meetings
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON kernel.meetings
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- kernel-meetings — Bucket privado para gravações de tela (MediaRecorder + getDisplayMedia).
-- Caminho no storage: {user_id}/{company_id}/{meeting_id}-{timestamp}.webm
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kernel-meetings',
  'kernel-meetings',
  false,
  524288000,  -- 500 MB por arquivo
  ARRAY['video/webm', 'video/mp4', 'video/x-matroska']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "kernel_meetings_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kernel-meetings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "kernel_meetings_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kernel-meetings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "kernel_meetings_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kernel-meetings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
