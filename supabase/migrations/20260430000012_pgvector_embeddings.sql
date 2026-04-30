-- MX15: pgvector + kernel.embeddings
-- RAG infrastructure. Embeddings gerados pelo embed-text Edge Function.
-- NOTA: validação E2E requer LLM real (Copilot em degradado — decisão humana Sprint 8)

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE kernel.embeddings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  source_type  TEXT        NOT NULL CHECK (source_type IN ('file', 'event', 'note', 'custom')),
  source_id    UUID        NOT NULL,
  chunk_index  INT         NOT NULL,
  chunk_text   TEXT        NOT NULL,
  embedding    extensions.vector(1536),
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, source_id, chunk_index)
);

COMMENT ON TABLE kernel.embeddings IS
  'Embeddings vetoriais para RAG. Gerados pelo embed-text Edge Function via LiteLLM. '
  'Validação E2E requer LLM real — ver Sprint 8 log.';

-- HNSW index para busca por similaridade (melhor que ivfflat para datasets menores)
CREATE INDEX kernel_embeddings_hnsw_idx
  ON kernel.embeddings
  USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX kernel_embeddings_company_source_idx
  ON kernel.embeddings (company_id, source_type, source_id);

ALTER TABLE kernel.embeddings ENABLE ROW LEVEL SECURITY;

-- Members da company podem ler seus próprios embeddings
CREATE POLICY kernel_embeddings_select ON kernel.embeddings
  FOR SELECT
  USING (company_id = kernel.current_company_id());

-- INSERT via service_role apenas (Edge Function embed-text)
-- SELECT via authenticated com RLS

-- Função RPC para busca por similaridade via browser (contorna limitação do supabase-js com vetores)
CREATE OR REPLACE FUNCTION kernel.search_embeddings(
  p_company_id    UUID,
  p_query_vector  extensions.vector(1536),
  p_top_k         INT     DEFAULT 10,
  p_source_type   TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id           UUID,
  source_type  TEXT,
  source_id    UUID,
  chunk_index  INT,
  chunk_text   TEXT,
  metadata     JSONB,
  score        FLOAT8
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT
    e.id,
    e.source_type,
    e.source_id,
    e.chunk_index,
    e.chunk_text,
    e.metadata,
    1 - (e.embedding <=> p_query_vector) AS score
  FROM kernel.embeddings e
  WHERE e.company_id = p_company_id
    AND (p_source_type IS NULL OR e.source_type = p_source_type)
  ORDER BY e.embedding <=> p_query_vector
  LIMIT p_top_k;
$$;

COMMENT ON FUNCTION kernel.search_embeddings IS
  'RPC para busca por similaridade vetorial com RLS. Usada pelo SupabaseBrowserVectorDriver.';

GRANT EXECUTE ON FUNCTION kernel.search_embeddings TO authenticated;
