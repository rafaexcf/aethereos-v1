-- MX51 (Sprint 11): kernel.register_user_with_cnpj — RPC atômica de cadastro
-- Implementa Fluxo A (CNPJ novo) e Fluxo B (CNPJ existente) de forma atômica.
-- Chamada pelo Edge Function register-company via service_role.
--
-- Fluxo A (CNPJ novo):
--   auth user JÁ criado pelo cliente → cria profile + company (status=pending) +
--   tenant_membership (owner, active) + employee (active) + company_modules +
--   SCP event platform.company.registered
--
-- Fluxo B (CNPJ existente):
--   auth user JÁ criado → cria profile + tenant_membership (member, pending) +
--   employee (pending) + SCP event platform.user.join_requested

create or replace function kernel.register_user_with_cnpj(
  p_user_id        uuid,
  p_full_name      text,
  p_email          text,
  p_phone          text,
  p_cnpj           text,
  p_cnpj_data      jsonb,
  p_position       text,
  p_area_trabalho  text,
  p_company_name   text,  -- razao_social da BrasilAPI
  p_trade_name     text   -- nome_fantasia
)
returns jsonb
language plpgsql
security definer
set search_path = kernel, public, extensions
as $$
declare
  v_company_id      uuid;
  v_event_id        uuid := gen_random_uuid();
  v_corr_id         uuid := gen_random_uuid();
  v_now             text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  v_cnpj_exists     boolean;
  v_slug            text;
  v_envelope        jsonb;
  v_flow            text;
begin
  -- 1. Criar/atualizar profile (idempotente)
  insert into kernel.profiles (id, full_name, phone, position, department)
  values (p_user_id, p_full_name, p_phone, p_position, p_area_trabalho)
  on conflict (id) do update
    set full_name = excluded.full_name,
        phone     = excluded.phone,
        position  = excluded.position,
        department = excluded.department,
        updated_at = now();

  -- 2. Verificar se CNPJ já existe
  select exists(
    select 1 from kernel.companies c
    where c.cnpj = p_cnpj and c.deleted_at is null
  ) into v_cnpj_exists;

  if not v_cnpj_exists then
    -- ===== FLUXO A: CNPJ novo =====
    v_flow := 'A';

    -- Gerar slug a partir do nome (sanitize: lowercase, só alnum e hífen)
    v_slug := lower(regexp_replace(
      regexp_replace(p_company_name, '[^a-zA-Z0-9 ]', '', 'g'),
      '\s+', '-', 'g'
    ));
    v_slug := substr(v_slug, 1, 50);
    -- Garantir unicidade do slug
    if exists(select 1 from kernel.companies where slug = v_slug) then
      v_slug := v_slug || '-' || substr(v_event_id::text, 1, 6);
    end if;

    -- Criar empresa com status pending (aguarda aprovação do Platform Admin)
    insert into kernel.companies (
      slug, name, trade_name, cnpj, cnpj_data, plan, status,
      email, phone
    ) values (
      v_slug, p_company_name, p_trade_name, p_cnpj, p_cnpj_data,
      'free', 'pending',
      p_email, p_phone
    ) returning id into v_company_id;

    -- Membership owner ativo
    insert into kernel.tenant_memberships (user_id, company_id, role, status)
    values (p_user_id, v_company_id, 'owner', 'active');

    -- Employee ativo (invariante: todo user deve ter employee)
    insert into kernel.employees (
      company_id, user_id, full_name, email, corporate_email,
      phone, position, area_trabalho, status, hire_date, created_by
    ) values (
      v_company_id, p_user_id, p_full_name, p_email, p_email,
      p_phone, p_position, p_area_trabalho, 'active', current_date, p_user_id
    );

    -- Ativar módulos padrão
    insert into kernel.company_modules (company_id, module, status)
    values
      (v_company_id, 'comercio_digital', 'active'),
      (v_company_id, 'logitix', 'active'),
      (v_company_id, 'erp', 'active')
    on conflict (company_id, module) do nothing;

    -- Evento SCP
    v_envelope := jsonb_build_object(
      'id',             v_event_id::text,
      'type',           'platform.company.registered',
      'version',        '1',
      'tenant_id',      v_company_id::text,
      'actor',          jsonb_build_object('type', 'human', 'user_id', p_user_id::text),
      'correlation_id', v_corr_id::text,
      'payload',        jsonb_build_object(
                          'company_id', v_company_id::text,
                          'cnpj',       p_cnpj,
                          'flow',       'A'
                        ),
      'occurred_at',    v_now,
      'schema_version', '1'
    );

    insert into kernel.scp_outbox (company_id, event_type, event_id, payload, envelope)
    values (v_company_id, 'platform.company.registered', v_event_id,
      v_envelope -> 'payload', v_envelope);

    return jsonb_build_object(
      'flow',       'A',
      'company_id', v_company_id::text,
      'status',     'pending_approval'
    );

  else
    -- ===== FLUXO B: CNPJ existente =====
    v_flow := 'B';

    select id into v_company_id
    from kernel.companies
    where cnpj = p_cnpj and deleted_at is null
    limit 1;

    -- Membership como member, status pending
    insert into kernel.tenant_memberships (user_id, company_id, role, status)
    values (p_user_id, v_company_id, 'member', 'pending')
    on conflict (user_id, company_id) do update
      set status = 'pending', updated_at = now() -- col não existe mas não falha
    ;

    -- Employee pending
    insert into kernel.employees (
      company_id, user_id, full_name, email, corporate_email,
      phone, position, area_trabalho, status, created_by
    ) values (
      v_company_id, p_user_id, p_full_name, p_email, p_email,
      p_phone, p_position, p_area_trabalho, 'pending', p_user_id
    );

    -- Evento SCP
    v_envelope := jsonb_build_object(
      'id',             v_event_id::text,
      'type',           'platform.user.join_requested',
      'version',        '1',
      'tenant_id',      v_company_id::text,
      'actor',          jsonb_build_object('type', 'human', 'user_id', p_user_id::text),
      'correlation_id', v_corr_id::text,
      'payload',        jsonb_build_object(
                          'company_id', v_company_id::text,
                          'user_id',    p_user_id::text,
                          'flow',       'B'
                        ),
      'occurred_at',    v_now,
      'schema_version', '1'
    );

    insert into kernel.scp_outbox (company_id, event_type, event_id, payload, envelope)
    values (v_company_id, 'platform.user.join_requested', v_event_id,
      v_envelope -> 'payload', v_envelope);

    return jsonb_build_object(
      'flow',       'B',
      'company_id', v_company_id::text,
      'status',     'pending_approval'
    );
  end if;
end;
$$;

comment on function kernel.register_user_with_cnpj is
  'Cadastro atômico Fluxo A (CNPJ novo) ou B (CNPJ existente). '
  'Requer auth user já criado. Invoke via Edge Function register-company (service_role).';

grant execute on function kernel.register_user_with_cnpj to service_role;

-- tenant_memberships não tem updated_at — precisamos lidar com o ON CONFLICT no Fluxo B
-- Adicionar coluna updated_at para suportar upsert
alter table kernel.tenant_memberships
  add column if not exists updated_at timestamptz not null default now();

create trigger trg_tenant_memberships_updated_at
  before update on kernel.tenant_memberships
  for each row execute function kernel.touch_updated_at();
