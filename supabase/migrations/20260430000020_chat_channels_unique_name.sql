-- Bug descoberto no seed (Sprint 9.6 MX33): chat_channels.upsert(onConflict: "company_id,name")
-- falhava com "no unique constraint matching" porque a constraint não existia.
-- Semanticamente correto: nomes de canal devem ser únicos dentro de uma company.

ALTER TABLE kernel.chat_channels
  ADD CONSTRAINT chat_channels_company_name_key UNIQUE (company_id, name);
