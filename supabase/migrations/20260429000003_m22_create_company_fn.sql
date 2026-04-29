-- Migration: M22 — create_company_for_user + outbox SELECT policy + PostgREST hook
-- Entrega: função atômica de criação de empresa, política de leitura do outbox
-- e configuração do db-pre-request para injeção de contexto tenant.

-- ============================================================
-- 1. SELECT policy em kernel.scp_outbox
-- ============================================================
-- Permite ao usuário autenticado contar eventos da própria empresa no desktop.
-- O RLS filtra por company_id = kernel.current_company_id() (setado pelo hook JWT).

create policy "scp_outbox: tenant can read own"
  on kernel.scp_outbox for select
  to authenticated
  using (company_id = kernel.current_company_id());

grant select on kernel.scp_outbox to authenticated;

-- ============================================================
-- 2. PostgREST db-pre-request hook
-- ============================================================
-- Define a função chamada ANTES de cada request PostgREST para injetar
-- o contexto de tenant a partir dos JWT claims. Sem isso, kernel.current_company_id()
-- retorna NULL e nenhuma linha passa no RLS.

alter role authenticator
  set pgrst.db_pre_request to 'kernel.set_tenant_context_from_jwt';

notify pgrst, 'reload config';

-- ============================================================
-- 3. Função pública: public.create_company_for_user
-- ============================================================
-- SECURITY DEFINER: executa com privilégios do owner (ignora RLS).
-- Garante atomicidade: company + membership + evento outbox em UMA transação.
-- Chamada pelo Edge Function create-company após validação do JWT.

create or replace function public.create_company_for_user(
  p_name    text,
  p_slug    text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = kernel, public, extensions
as $$
declare
  v_company_id  uuid;
  v_event_id    uuid := gen_random_uuid();
  v_corr_id     uuid := gen_random_uuid();
  v_now         text := to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  v_envelope    jsonb;
begin
  if p_name is null or trim(p_name) = '' then
    raise exception 'name is required' using errcode = 'P0001';
  end if;

  if p_slug !~ '^[a-z0-9-]{3,63}$' then
    raise exception 'slug must match [a-z0-9-]{3,63}' using errcode = 'P0001';
  end if;

  -- Cria a empresa
  insert into kernel.companies (name, slug)
  values (p_name, p_slug)
  returning id into v_company_id;

  -- Cria membership owner
  insert into kernel.tenant_memberships (user_id, company_id, role)
  values (p_user_id, v_company_id, 'owner');

  -- Monta envelope canônico do evento SCP (EventEnvelope v1)
  v_envelope := jsonb_build_object(
    'id',             v_event_id::text,
    'type',           'platform.company.created',
    'version',        '1',
    'tenant_id',      v_company_id::text,
    'actor',          jsonb_build_object('type', 'human', 'user_id', p_user_id::text),
    'correlation_id', v_corr_id::text,
    'payload',        jsonb_build_object(
                        'company_id', v_company_id::text,
                        'name',       p_name,
                        'slug',       p_slug
                      ),
    'occurred_at',    v_now,
    'schema_version', '1'
  );

  -- Insere evento no Outbox (mesmo TX → atomicidade garantida)
  insert into kernel.scp_outbox (company_id, event_type, event_id, payload, envelope)
  values (
    v_company_id,
    'platform.company.created',
    v_event_id,
    jsonb_build_object('company_id', v_company_id::text, 'name', p_name, 'slug', p_slug),
    v_envelope
  );

  return jsonb_build_object(
    'company_id', v_company_id::text,
    'name',       p_name,
    'slug',       p_slug
  );
end;
$$;

comment on function public.create_company_for_user(text, text, uuid) is
  'Cria empresa + membership owner + evento SCP outbox atomicamente. '
  'Invoke pelo Edge Function create-company (service_role).';

grant execute on function public.create_company_for_user to service_role;
