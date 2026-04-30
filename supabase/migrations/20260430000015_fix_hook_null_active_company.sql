-- Sprint 9.5 / MX26b — bug #6b: hook retorna SQL NULL quando user nao tem memberships
-- Causa: to_jsonb(NULL::text) retorna SQL NULL (nao JSON null 'null'::jsonb).
-- jsonb_set com new_value = SQL NULL retorna SQL NULL, quebrando toda a cadeia.
-- GoTrue ve o retorno do hook como null e rejeita com schema validation error.
-- Fix: COALESCE(to_jsonb(first_company), 'null'::jsonb) garante jsonb valido sempre.

CREATE OR REPLACE FUNCTION kernel.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kernel, auth, public, extensions
AS $$
DECLARE
  claims          jsonb;
  user_id_val     uuid;
  companies_arr   jsonb;
  first_company   text;
  is_staff_flag   boolean;
BEGIN
  claims      := event -> 'claims';
  user_id_val := (event ->> 'user_id')::uuid;

  SELECT jsonb_agg(company_id ORDER BY created_at)
  INTO   companies_arr
  FROM   kernel.tenant_memberships
  WHERE  user_id = user_id_val;

  IF companies_arr IS NULL THEN
    companies_arr := '[]'::jsonb;
  END IF;

  SELECT company_id::text
  INTO   first_company
  FROM   kernel.tenant_memberships
  WHERE  user_id = user_id_val
  ORDER  BY created_at
  LIMIT  1;

  SELECT (raw_app_meta_data ->> 'is_staff')::boolean
  INTO   is_staff_flag
  FROM   auth.users
  WHERE  id = user_id_val;

  claims := jsonb_set(claims, '{companies}',         companies_arr);
  -- COALESCE garante 'null'::jsonb (JSON null) em vez de SQL NULL quando nao ha membership.
  -- SQL NULL como new_value em jsonb_set retorna SQL NULL — quebra a cadeia.
  claims := jsonb_set(claims, '{active_company_id}', COALESCE(to_jsonb(first_company), 'null'::jsonb));
  claims := jsonb_set(claims, '{is_staff}',          to_jsonb(COALESCE(is_staff_flag, false)));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

COMMENT ON FUNCTION kernel.custom_access_token_hook(jsonb) IS
  'Hook JWT do Supabase Auth. Injeta companies, active_company_id e is_staff nos claims do token. '
  'is_staff lê app_metadata.is_staff — modificável apenas via service_role/admin.';
