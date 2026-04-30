-- MX51 fix: wrapper public para register_user_with_cnpj
-- PostgREST expõe apenas funções do schema public via RPC.
-- Wrapper delega para kernel.register_user_with_cnpj (security definer).

create or replace function public.register_user_with_cnpj(
  p_user_id        uuid,
  p_full_name      text,
  p_email          text,
  p_phone          text,
  p_cnpj           text,
  p_cnpj_data      jsonb,
  p_position       text,
  p_area_trabalho  text,
  p_company_name   text,
  p_trade_name     text
)
returns jsonb
language plpgsql
security definer
set search_path = kernel, public, extensions
as $$
begin
  return kernel.register_user_with_cnpj(
    p_user_id, p_full_name, p_email, p_phone, p_cnpj, p_cnpj_data,
    p_position, p_area_trabalho, p_company_name, p_trade_name
  );
end;
$$;

grant execute on function public.register_user_with_cnpj to service_role;
