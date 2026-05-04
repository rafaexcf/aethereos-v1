-- kernel.app_registry — Sprint 21 MX111.
--
-- Catalogo central de apps unificando o que antes estava hardcoded em:
--  - apps/shell-commercial/src/apps/registry.ts (APP_REGISTRY)
--  - apps/shell-commercial/src/data/magic-store-catalog.ts (MAGIC_STORE_CATALOG)
--
-- E GLOBAL (sem company_id) — todos os tenants veem o mesmo catalogo.
-- Instalacao por-tenant continua via kernel.company_modules.
-- Component map (React.lazy) fica em codigo: apps iframe/weblink nao
-- precisam de entrada no map.

CREATE TABLE kernel.app_registry (
  id               TEXT         PRIMARY KEY,
  slug             TEXT         NOT NULL UNIQUE,
  name             TEXT         NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 200),
  description      TEXT         NOT NULL DEFAULT '',
  long_description TEXT         NOT NULL DEFAULT '',
  icon             TEXT         NOT NULL DEFAULT 'Package',
  color            TEXT         NOT NULL DEFAULT '#64748b',
  category         TEXT         NOT NULL DEFAULT 'utilities',
  app_type         TEXT         NOT NULL DEFAULT 'native',
  entry_mode       TEXT         NOT NULL DEFAULT 'internal',
  entry_url        TEXT,
  version          TEXT         NOT NULL DEFAULT '1.0.0',
  status           TEXT         NOT NULL DEFAULT 'published',
  pricing_model    TEXT         NOT NULL DEFAULT 'free',
  permissions      TEXT[]       NOT NULL DEFAULT '{}',
  tags             TEXT[]       NOT NULL DEFAULT '{}',
  license          TEXT         NOT NULL DEFAULT 'proprietary',
  developer_name   TEXT         NOT NULL DEFAULT 'Aethereos',
  show_in_dock     BOOLEAN      NOT NULL DEFAULT true,
  closeable        BOOLEAN      NOT NULL DEFAULT true,
  has_internal_nav BOOLEAN      NOT NULL DEFAULT false,
  always_enabled   BOOLEAN      NOT NULL DEFAULT false,
  opens_as_modal   BOOLEAN      NOT NULL DEFAULT false,
  installable      BOOLEAN      NOT NULL DEFAULT true,
  offline_capable  BOOLEAN      NOT NULL DEFAULT false,
  external_url     TEXT,
  install_count    INTEGER      NOT NULL DEFAULT 0 CHECK (install_count >= 0),
  sort_order       INTEGER      NOT NULL DEFAULT 100,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT app_registry_app_type_check
    CHECK (app_type IN ('native','open_source','embedded_external','external_shortcut','template_app','ai_app')),
  CONSTRAINT app_registry_entry_mode_check
    CHECK (entry_mode IN ('internal','iframe','weblink')),
  CONSTRAINT app_registry_status_check
    CHECK (status IN ('draft','published','suspended','deprecated')),
  CONSTRAINT app_registry_pricing_check
    CHECK (pricing_model IN ('free','one_time','subscription','usage_based')),
  CONSTRAINT app_registry_category_check
    CHECK (category IN ('vertical','optional','ai','productivity','games','utilities','puter','system'))
);

CREATE INDEX app_registry_status_category_idx
  ON kernel.app_registry (status, category);

ALTER TABLE kernel.app_registry ENABLE ROW LEVEL SECURITY;

-- SELECT global para qualquer authenticated (catalogo eh publico para usuarios logados).
CREATE POLICY "app_registry_authenticated_select" ON kernel.app_registry
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE so via service_role (admin de plataforma).
-- Nao criar policies para authenticated em mutacoes — service_role bypassa RLS.

GRANT SELECT ON kernel.app_registry TO authenticated;

CREATE TRIGGER app_registry_updated_at
  BEFORE UPDATE ON kernel.app_registry
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

COMMENT ON TABLE kernel.app_registry IS
  'Sprint 21: catalogo central de apps. Global (sem company_id). Apps nativos resolvem componente via COMPONENT_MAP em codigo; iframe/weblink usam entry_url.';
