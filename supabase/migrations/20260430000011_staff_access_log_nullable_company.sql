-- MX14: tornar company_id nullable em kernel.staff_access_log
-- Motivo: acessos globais (listar todas as companies) não têm company_id específico.
-- Acessos a company específica continuam referenciando o company_id.
-- O índice de company permanece útil para buscas por company.

ALTER TABLE kernel.staff_access_log
  ALTER COLUMN company_id DROP NOT NULL;
