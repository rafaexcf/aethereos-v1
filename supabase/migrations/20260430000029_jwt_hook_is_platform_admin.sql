-- MX49 (Sprint 11): JWT hook estendido com is_platform_admin
-- Lê is_platform_admin de kernel.profiles (criada em MX47).
-- Mantém is_staff de app_metadata (Sprint 9.6 MX14) — ambos coexistem.
-- companies[] agora inclui role e status para o cliente tomar decisões sem roundtrip extra.

CREATE OR REPLACE FUNCTION kernel.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kernel, auth, public, extensions
AS $$
DECLARE
  v_user_id          uuid;
  v_companies        jsonb;
  v_active_company_id text;
  v_is_staff         boolean;
  v_is_platform_admin boolean;
  v_claims           jsonb;
BEGIN
  v_user_id := (event ->> 'user_id')::uuid;
  v_claims  := coalesce(event -> 'claims', '{}'::jsonb);

  -- Companies: lista com role e status (Fluxo A/B ciente de pending)
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',     tm.company_id,
    'role',   tm.role,
    'status', tm.status
  ) ORDER BY tm.created_at), '[]'::jsonb)
  INTO v_companies
  FROM kernel.tenant_memberships tm
  WHERE tm.user_id = v_user_id;

  -- Active company: primeira membership ativa (ou null)
  SELECT tm.company_id::text
  INTO   v_active_company_id
  FROM   kernel.tenant_memberships tm
  WHERE  tm.user_id = v_user_id
    AND  tm.status = 'active'
  ORDER  BY tm.created_at
  LIMIT  1;

  -- is_staff: mantido via app_metadata (backward compat)
  SELECT (raw_app_meta_data ->> 'is_staff')::boolean
  INTO   v_is_staff
  FROM   auth.users
  WHERE  id = v_user_id;

  -- is_platform_admin: lido de kernel.profiles (criado no Fluxo A/B do register-company)
  SELECT coalesce(p.is_platform_admin, false)
  INTO   v_is_platform_admin
  FROM   kernel.profiles p
  WHERE  p.id = v_user_id;

  v_claims := v_claims
    || jsonb_build_object('companies',          v_companies)
    || jsonb_build_object('active_company_id',  v_active_company_id)
    || jsonb_build_object('is_staff',           coalesce(v_is_staff, false))
    || jsonb_build_object('is_platform_admin',  coalesce(v_is_platform_admin, false));

  RETURN jsonb_build_object('claims', v_claims);
END;
$$;

COMMENT ON FUNCTION kernel.custom_access_token_hook(jsonb) IS
  'Hook JWT. Claims: companies[]{id,role,status}, active_company_id, is_staff (app_metadata), is_platform_admin (kernel.profiles).';
