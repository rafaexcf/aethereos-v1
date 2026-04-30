-- Sprint 9.5 / MX31 — bug #9: service_role sem grants nas tabelas do schema kernel
-- service_role tem BYPASSRLS + USAGE no schema, mas precisa de grants em tabelas.
-- Sem isso: seed, Edge Functions e smoke test falham com "permission denied for table".
-- O authenticated role já tem grants — service_role estava omitido.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kernel TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA kernel TO service_role;

-- Garante que futuras tabelas criadas no schema kernel também recebam grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA kernel
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA kernel
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;
