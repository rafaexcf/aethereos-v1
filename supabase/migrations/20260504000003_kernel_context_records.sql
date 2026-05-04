-- kernel.context_records — Camada 2 SCP: Derived Context Records.
--
-- Sprint 19 MX97. Registros derivados calculados a partir de eventos brutos
-- do scp_outbox pelos enrichment consumers. Append-friendly mas permite
-- UPDATE via versioning. Lookup principal por (entity_type, entity_id, record_type).
--
-- Exemplos de record_type: summary, activity_count, last_seen, relationship,
-- company_stats.

CREATE TABLE kernel.context_records (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  entity_type     TEXT         NOT NULL CHECK (char_length(trim(entity_type)) BETWEEN 1 AND 64),
  entity_id       UUID         NOT NULL,
  record_type     TEXT         NOT NULL CHECK (char_length(trim(record_type)) BETWEEN 1 AND 64),
  version         INTEGER      NOT NULL DEFAULT 1 CHECK (version >= 1),
  data            JSONB        NOT NULL DEFAULT '{}'::jsonb,
  source_event_id UUID,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, entity_type, entity_id, record_type)
);

CREATE INDEX context_records_lookup_idx
  ON kernel.context_records (company_id, entity_type, entity_id, record_type);

CREATE INDEX context_records_company_created_idx
  ON kernel.context_records (company_id, created_at DESC);

ALTER TABLE kernel.context_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "context_records_rls" ON kernel.context_records
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

GRANT SELECT, INSERT, UPDATE ON kernel.context_records TO authenticated;

CREATE TRIGGER context_records_updated_at
  BEFORE UPDATE ON kernel.context_records
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

COMMENT ON TABLE kernel.context_records IS
  'Sprint 19: Camada 2 SCP — derived context records calculados pelos enrichment consumers a partir de eventos brutos do scp_outbox.';
