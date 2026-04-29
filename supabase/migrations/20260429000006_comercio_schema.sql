-- ============================================================================
-- Migration: comercio schema — produtos (M27)
-- Cria o schema `comercio` com a tabela de produtos multi-tenant.
-- RLS por company_id via set_tenant_context_from_jwt (db-pre-request hook).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS comercio;

-- ──────────────────────────────────────────────────────────────────────────────
-- Tabela: comercio.products
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE comercio.products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  slug         TEXT NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$' OR char_length(slug) = 1),
  description  TEXT,
  price_cents  INTEGER NOT NULL CHECK (price_cents >= 0),
  currency     TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL','USD','EUR')),
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT products_company_slug_unique UNIQUE (company_id, slug)
);

CREATE INDEX products_company_status_idx ON comercio.products (company_id, status);

-- Trigger: mantém updated_at sincronizado
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON comercio.products
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- RLS: usuário vê apenas produtos de companies onde tem membership
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE comercio.products ENABLE ROW LEVEL SECURITY;

-- Política fail-closed: exige tenant context definido via set_tenant_context_from_jwt
CREATE POLICY "products_tenant_isolation"
  ON comercio.products
  USING (
    company_id::text = current_setting('app.current_company_id', true)
  );

-- Service role bypassa RLS (para scp-worker e migrações)
CREATE POLICY "products_service_role_bypass"
  ON comercio.products
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- Grants
-- ──────────────────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA comercio TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON comercio.products TO authenticated;
GRANT ALL ON comercio.products TO service_role;
