-- Sprint 9.5 / MX26 — Fix bug #6 descoberto no smoke test de 2026-04-30
-- Contexto: supabase_auth_admin precisa de USAGE no schema kernel para invocar
-- custom_access_token_hook. Sem USAGE, Postgres retorna:
--   permission denied for schema kernel (SQLSTATE 42501)
-- mesmo que GRANT EXECUTE ON FUNCTION já exista (o EXECUTE é pré-requisito secundário;
-- USAGE no schema é o pré-requisito primário — sem ele o role não enxerga o namespace).

GRANT USAGE ON SCHEMA kernel TO supabase_auth_admin;

-- EXECUTE já foi concedido em 20260429000002_tenant_memberships.sql, mas repetir
-- aqui garante idempotência caso a ordem de migrations mude.
GRANT EXECUTE ON FUNCTION kernel.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- set_tenant_context_from_jwt é chamado como db-pre-request pelo PostgREST.
-- Também precisa ser visível ao role que o PostgREST usa (authenticator).
GRANT EXECUTE ON FUNCTION kernel.set_tenant_context_from_jwt() TO authenticator;
GRANT EXECUTE ON FUNCTION kernel.set_tenant_context_from_jwt() TO authenticated;
