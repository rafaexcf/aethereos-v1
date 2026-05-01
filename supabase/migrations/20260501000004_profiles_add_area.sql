-- Adiciona coluna "area" em kernel.profiles para o campo "Área" do Meu Perfil.
-- position (Cargo) e department (Setor) já existem em 20260430000022_profiles_table.sql.

alter table kernel.profiles
  add column if not exists area text;

comment on column kernel.profiles.area is
  'Área de atuação do colaborador (ex: Comercial, Tecnologia). Usado em Configurações > Meu Perfil.';
