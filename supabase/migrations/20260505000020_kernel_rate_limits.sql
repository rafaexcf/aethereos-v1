-- Sprint 27 MX147: rate limiting baseado em counter + janela deslizante.
-- Edge Functions chamam kernel.check_and_increment_rate_limit(...) antes
-- de processar request. Limite excedido → função retorna { allowed: false }.
--
-- Buckets:
--   scp-publish   — 100 req/min por user
--   invite-member — 10 req/hora por user
--   create-company — 5 req/hora por IP (ip_or_user via 'ip:1.2.3.4')
--   cnpj-lookup   — 20 req/min por IP
--   embed-text    — 30 req/min por user

CREATE TABLE IF NOT EXISTS kernel.rate_limits (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       TEXT         NOT NULL,        -- user_id ou 'ip:x.x.x.x'
  bucket        TEXT         NOT NULL,        -- nome da edge function
  count         INTEGER      NOT NULL DEFAULT 1,
  window_start  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT kernel_rate_limits_unique UNIQUE (subject, bucket)
);

CREATE INDEX IF NOT EXISTS kernel_rate_limits_window_idx
  ON kernel.rate_limits (window_start);

ALTER TABLE kernel.rate_limits ENABLE ROW LEVEL SECURITY;

-- Apenas service_role pode ler/escrever — Edge Functions sempre usam
-- service_role pra chamadas privilegiadas. Sem RLS pra authenticated.
CREATE POLICY "rate_limits_service_only" ON kernel.rate_limits
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Função atômica: insere/atualiza counter, expira janela, retorna estado.
-- subject_in: user_id (UUID stringificado) ou 'ip:1.2.3.4'.
-- bucket_in:  nome canonico da edge function.
-- limit_in:   maximo de requests permitido na janela.
-- window_seconds_in: tamanho da janela em segundos.
CREATE OR REPLACE FUNCTION kernel.check_and_increment_rate_limit(
  subject_in        TEXT,
  bucket_in         TEXT,
  limit_in          INTEGER,
  window_seconds_in INTEGER
) RETURNS TABLE (allowed BOOLEAN, remaining INTEGER, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  now_ts TIMESTAMPTZ := NOW();
  window_age INTERVAL;
BEGIN
  SELECT * INTO rec
    FROM kernel.rate_limits
    WHERE subject = subject_in AND bucket = bucket_in
    FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO kernel.rate_limits (subject, bucket, count, window_start)
      VALUES (subject_in, bucket_in, 1, now_ts);
    RETURN QUERY SELECT true, limit_in - 1, 0;
    RETURN;
  END IF;

  window_age := now_ts - rec.window_start;

  IF EXTRACT(EPOCH FROM window_age) >= window_seconds_in THEN
    -- Janela expirou — reset.
    UPDATE kernel.rate_limits
      SET count = 1, window_start = now_ts
      WHERE id = rec.id;
    RETURN QUERY SELECT true, limit_in - 1, 0;
    RETURN;
  END IF;

  IF rec.count >= limit_in THEN
    -- Limite excedido.
    RETURN QUERY SELECT
      false,
      0,
      (window_seconds_in - EXTRACT(EPOCH FROM window_age))::INTEGER;
    RETURN;
  END IF;

  UPDATE kernel.rate_limits
    SET count = count + 1
    WHERE id = rec.id;
  RETURN QUERY SELECT true, limit_in - rec.count - 1, 0;
END;
$$;

COMMENT ON TABLE kernel.rate_limits IS
  'Counter de rate limiting por (subject, bucket). subject = user_id ou ip:x.x.x.x. '
  'window_start expira após window_seconds. Edge Functions chamam '
  'kernel.check_and_increment_rate_limit() antes de processar request.';
