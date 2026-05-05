-- Sprint 31 / MX170 — SCP Replay (Gate 3)
--
-- 1) kernel.scp_outbox ganha replay_count + last_replayed_at para
--    rastrear reprocessamentos sem perder o status original.
-- 2) kernel.audit_log ganha event_id (UUID) com UNIQUE para tornar a
--    inserção idempotente sob replay (INSERT ... ON CONFLICT DO NOTHING).

ALTER TABLE kernel.scp_outbox
  ADD COLUMN IF NOT EXISTS replay_count      INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_replayed_at  TIMESTAMPTZ;

ALTER TABLE kernel.audit_log
  ADD COLUMN IF NOT EXISTS event_id UUID;

-- Backfill defensivo: linhas antigas (pre-replay) ganham UUIDs unicos
-- para que a UNIQUE constraint seja aplicavel sem violacao.
UPDATE kernel.audit_log
   SET event_id = gen_random_uuid()
 WHERE event_id IS NULL;

ALTER TABLE kernel.audit_log
  ALTER COLUMN event_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'kernel_audit_log_event_id_key'
  ) THEN
    ALTER TABLE kernel.audit_log
      ADD CONSTRAINT kernel_audit_log_event_id_key UNIQUE (event_id);
  END IF;
END $$;

COMMENT ON COLUMN kernel.scp_outbox.replay_count IS
  'Quantas vezes o evento foi reprocessado pelo replay CLI.';
COMMENT ON COLUMN kernel.scp_outbox.last_replayed_at IS
  'Timestamp do último replay deste evento (NULL se nunca foi).';
COMMENT ON COLUMN kernel.audit_log.event_id IS
  'event_id do envelope SCP que gerou esta linha. UNIQUE — replay é idempotente.';
