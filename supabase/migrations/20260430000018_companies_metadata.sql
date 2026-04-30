-- Bug #7 (Sprint 9.6 MX33): kernel.companies sem coluna metadata
-- Seed tentava inserir metadata mas coluna nao existia → upsert silenciosamente falhava.
-- Opção A escolhida: adicionar coluna útil (primary_color, seeded flag, config por company).

ALTER TABLE kernel.companies
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
