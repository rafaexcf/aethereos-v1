-- kernel-pdfs — Bucket privado para binários de PDFs do app PDF Reader.
-- Caminho no storage: {user_id}/{company_id}/{pdf_note_id}.pdf
-- Metadados (notas, ai_summary, storage_path) em kernel.pdf_notes.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kernel-pdfs',
  'kernel-pdfs',
  false,
  104857600,  -- 100 MB por arquivo
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "kernel_pdfs_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kernel-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "kernel_pdfs_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kernel-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "kernel_pdfs_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kernel-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
