-- Adiciona policies de UPDATE e DELETE no bucket company-logos.
-- A migration original (20260430000033) só adicionou INSERT + public SELECT,
-- então o re-upload (upsert: true → UPDATE) falhava com RLS.

create policy "company-logos: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'company-logos')
  with check (bucket_id = 'company-logos');

create policy "company-logos: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'company-logos');
