-- kernel-files bucket — Storage físico para o app Drive (kernel.files)
-- Bucket privado: arquivos isolados por company_id (multi-tenant).
-- Caminho no storage: {company_id}/{folder_id|root}/{uuid}-{filename}
--
-- Modelo de segurança: company-scoped, NÃO user-private.
-- Qualquer usuário autenticado da mesma company pode ler/escrever/deletar
-- arquivos da company (consistente com a RLS de kernel.files que usa
-- kernel.current_company_id() — ver migration 20260430000002_kernel_files.sql).
--
-- O primeiro segmento do path DEVE ser o company_id, e é validado contra
-- kernel.current_company_id() (claim active_company_id no JWT).

-- ─── Bucket privado ───────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'kernel-files',
  'kernel-files',
  false,
  524288000  -- 500 MB por arquivo (sem allowed_mime_types: Drive aceita qualquer tipo)
) ON CONFLICT (id) DO NOTHING;

-- ─── Policies (idempotentes via DROP IF EXISTS + CREATE) ─────────────────────

-- SELECT: usuário autenticado pode ler objetos cuja primeira pasta é a sua
-- company ativa (kernel.current_company_id()).
DROP POLICY IF EXISTS "kernel_files_select" ON storage.objects;
CREATE POLICY "kernel_files_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kernel-files'
    AND (storage.foldername(name))[1] = kernel.current_company_id()::text
  );

-- INSERT: usuário autenticado pode fazer upload SOMENTE para o prefixo da
-- sua company ativa.
DROP POLICY IF EXISTS "kernel_files_insert" ON storage.objects;
CREATE POLICY "kernel_files_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kernel-files'
    AND (storage.foldername(name))[1] = kernel.current_company_id()::text
  );

-- UPDATE: idem (necessário para upsert e atualização de metadata).
DROP POLICY IF EXISTS "kernel_files_update" ON storage.objects;
CREATE POLICY "kernel_files_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'kernel-files'
    AND (storage.foldername(name))[1] = kernel.current_company_id()::text
  )
  WITH CHECK (
    bucket_id = 'kernel-files'
    AND (storage.foldername(name))[1] = kernel.current_company_id()::text
  );

-- DELETE: usuário autenticado pode deletar qualquer arquivo da sua company
-- ativa (consistente com a RLS company-scoped de kernel.files).
DROP POLICY IF EXISTS "kernel_files_delete" ON storage.objects;
CREATE POLICY "kernel_files_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kernel-files'
    AND (storage.foldername(name))[1] = kernel.current_company_id()::text
  );

COMMENT ON POLICY "kernel_files_select" ON storage.objects IS
  'Drive (kernel-files): leitura company-scoped via kernel.current_company_id().';
COMMENT ON POLICY "kernel_files_insert" ON storage.objects IS
  'Drive (kernel-files): upload restrito ao prefixo da company ativa.';
COMMENT ON POLICY "kernel_files_update" ON storage.objects IS
  'Drive (kernel-files): update restrito ao prefixo da company ativa.';
COMMENT ON POLICY "kernel_files_delete" ON storage.objects IS
  'Drive (kernel-files): delete restrito ao prefixo da company ativa.';
