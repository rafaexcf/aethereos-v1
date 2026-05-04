-- Sprint 19 MX99 — permite source_type='context_record' em kernel.embeddings.
-- O EmbeddingConsumer agora gera embeddings tanto de arquivos quanto de
-- registros derivados (context_records) para que o RAG do Copilot tenha
-- acesso a metadados estruturados via similarity search.

ALTER TABLE kernel.embeddings
  DROP CONSTRAINT IF EXISTS embeddings_source_type_check;

ALTER TABLE kernel.embeddings
  ADD CONSTRAINT embeddings_source_type_check
  CHECK (source_type = ANY (ARRAY[
    'file'::text,
    'event'::text,
    'note'::text,
    'custom'::text,
    'context_record'::text
  ]));
