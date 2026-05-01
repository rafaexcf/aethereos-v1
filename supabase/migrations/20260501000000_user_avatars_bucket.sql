-- bucket user-avatars para upload da foto de perfil em Configurações > Meu Perfil
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-avatars',
  'user-avatars',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp','image/gif']
) on conflict (id) do nothing;

create policy "user-avatars: authenticated insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'user-avatars');

create policy "user-avatars: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'user-avatars')
  with check (bucket_id = 'user-avatars');

create policy "user-avatars: public select"
  on storage.objects for select
  using (bucket_id = 'user-avatars');
