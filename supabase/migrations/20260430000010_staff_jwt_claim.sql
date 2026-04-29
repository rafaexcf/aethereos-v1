-- MX14: injetar is_staff no JWT a partir de app_metadata do auth.users
-- app_metadata é modificável apenas por service_role/admin — não por usuários autenticados.
-- Staff claim é platform-level (não tenant-scoped): o mesmo flag vale em todas as companies.
-- Para marcar um usuário como staff via SQL:
--   UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"is_staff": true}'
--   WHERE id = '<user_id>';
-- Ou via runbook: docs/runbooks/staff-claims.md

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

  -- Lista de company_ids do usuário
  SELECT jsonb_agg(company_id ORDER BY created_at)
  INTO   companies_arr
  FROM   kernel.tenant_memberships
  WHERE  user_id = user_id_val;

  IF companies_arr IS NULL THEN
    companies_arr := '[]'::jsonb;
  END IF;

  -- Primeira company como active_company_id default
  SELECT company_id::text
  INTO   first_company
  FROM   kernel.tenant_memberships
  WHERE  user_id = user_id_val
  ORDER  BY created_at
  LIMIT  1;

  -- is_staff a partir de app_metadata (somente service_role pode setar)
  SELECT (raw_app_meta_data ->> 'is_staff')::boolean
  INTO   is_staff_flag
  FROM   auth.users
  WHERE  id = user_id_val;

  claims := jsonb_set(claims, '{companies}',         companies_arr);
  claims := jsonb_set(claims, '{active_company_id}', to_jsonb(first_company));
  claims := jsonb_set(claims, '{is_staff}',          to_jsonb(COALESCE(is_staff_flag, false)));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

COMMENT ON FUNCTION kernel.custom_access_token_hook(jsonb) IS
  'Hook JWT do Supabase Auth. Injeta companies, active_company_id e is_staff nos claims do token. '
  'is_staff lê app_metadata.is_staff — modificável apenas via service_role/admin.';
