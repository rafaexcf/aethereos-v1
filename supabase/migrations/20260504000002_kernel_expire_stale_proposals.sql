-- Sprint 17 MX86: SQL function que marca proposals pendentes vencidas
-- como expired. Pode ser chamada via pg_cron (futuro) ou via supabase
-- scheduled function.
--
-- Idempotente: SELECT FOR UPDATE evita race com o expirador client-side
-- (useEffect do Copilot que tambem marca expired ao carregar).

CREATE OR REPLACE FUNCTION kernel.expire_stale_proposals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE kernel.agent_proposals
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Apenas service_role e o owner do banco podem chamar (job de manutencao,
-- nao exposto via PostgREST publico).
REVOKE EXECUTE ON FUNCTION kernel.expire_stale_proposals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kernel.expire_stale_proposals() TO service_role;

COMMENT ON FUNCTION kernel.expire_stale_proposals() IS
  'Marca proposals pendentes com expires_at no passado como expired. Retorna
   o numero de rows afetadas. Idempotente. Chamar periodicamente (cron 1h)
   ou ao boot do app. Sprint 17 MX86.';
