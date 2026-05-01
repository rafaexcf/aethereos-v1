-- Suporte a wallpaper customizado (foto enviada pelo usuário) na Mesa.
-- 1) Coluna wallpaper_url em kernel.mesa_layouts (independente da coluna
--    wallpaper, que mantém o id do preset; quando wallpaper = 'custom',
--    o cliente usa wallpaper_url como background).
-- 2) Bucket público user-wallpapers (≤ 5 MB, JPG/PNG/WebP/GIF).

alter table kernel.mesa_layouts
  add column if not exists wallpaper_url text;

comment on column kernel.mesa_layouts.wallpaper_url is
  'URL pública do wallpaper customizado (bucket user-wallpapers). Aplicado quando wallpaper = ''custom''.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-wallpapers',
  'user-wallpapers',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
) on conflict (id) do nothing;

create policy "user-wallpapers: authenticated insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'user-wallpapers');

create policy "user-wallpapers: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'user-wallpapers')
  with check (bucket_id = 'user-wallpapers');

create policy "user-wallpapers: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'user-wallpapers');

create policy "user-wallpapers: public select"
  on storage.objects for select
  using (bucket_id = 'user-wallpapers');
