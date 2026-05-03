-- Adiciona coluna storage_path em kernel.pdf_notes para persistir o binario do PDF
-- no bucket privado kernel-pdfs (migration 20260503000010_kernel_pdfs_bucket.sql).

ALTER TABLE kernel.pdf_notes
  ADD COLUMN IF NOT EXISTS storage_path TEXT;
