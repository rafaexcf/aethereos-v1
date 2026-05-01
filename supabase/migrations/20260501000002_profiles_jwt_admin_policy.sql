-- Corrige recursão infinita na policy "profiles: platform_admin read all".
-- A policy original (20260430000022_profiles_table.sql) consultava
-- kernel.profiles dentro do USING, disparando RLS recursivamente.
--
-- Como is_platform_admin já está no JWT custom claims (MX49,
-- 20260430000029_jwt_hook_is_platform_admin.sql), basta ler de auth.jwt().

drop policy if exists "profiles: platform_admin read all" on kernel.profiles;

create policy "profiles: platform_admin read all"
  on kernel.profiles for select
  to authenticated
  using (
    coalesce((auth.jwt() ->> 'is_platform_admin')::boolean, false) = true
  );
