-- Sprint 26: refatora "Informacoes profissionais" do Meu Perfil.
--   - position           : slug do cargo (lista fechada)
--   - area_trabalho      : slug da area (lista fechada agrupada) — substitui o
--                          campo livre "area".
--   - department         : tags livres separadas por ", "
--   - grants_tenant_admin: derivado do cargo (Conselho/Presidencia/Vice-Pres).
--                          Apenas marca intencao — RBAC continua via
--                          tenant_memberships.role + JWT claims.

ALTER TABLE kernel.profiles
  ADD COLUMN IF NOT EXISTS area_trabalho text;

ALTER TABLE kernel.profiles
  ADD COLUMN IF NOT EXISTS grants_tenant_admin boolean NOT NULL DEFAULT false;

-- Backfill: copiar valores existentes do campo "area" (texto livre, ja pode
-- conter slugs ou descricoes). Apos a sprint, "area" pode ser dropada.
UPDATE kernel.profiles
SET area_trabalho = area
WHERE area IS NOT NULL AND area_trabalho IS NULL;

COMMENT ON COLUMN kernel.profiles.area_trabalho IS
  'Slug da area de trabalho (AREA_TRABALHO_GROUPS no front).';
COMMENT ON COLUMN kernel.profiles.grants_tenant_admin IS
  'true quando position in (conselho_adm, presidencia, vice_presidencia). '
  'Marca intencao apenas — autorizacao real via tenant_memberships.role.';
