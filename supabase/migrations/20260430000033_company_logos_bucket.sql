-- MX57 (Sprint 12): bucket company-logos para upload de logos via onboarding
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/jpeg','image/png','image/webp','image/gif']
) on conflict (id) do nothing;

create policy "company-logos: authenticated insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'company-logos');

create policy "company-logos: public select"
  on storage.objects for select
  using (bucket_id = 'company-logos');
