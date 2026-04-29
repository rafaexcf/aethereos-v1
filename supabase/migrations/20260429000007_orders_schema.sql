-- ============================================================================
-- Migration: orders schema — pedidos (M28)
-- Tabelas comercio.orders e comercio.order_items.
-- RLS por company_id via set_tenant_context_from_jwt (db-pre-request hook).
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- Tabela: comercio.orders
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE comercio.orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  customer_email            TEXT NOT NULL CHECK (char_length(customer_email) BETWEEN 1 AND 320),
  customer_name             TEXT CHECK (char_length(customer_name) <= 255),
  amount_cents              INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency                  TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL','USD','EUR')),
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  stripe_session_id         TEXT UNIQUE,
  stripe_payment_intent_id  TEXT,
  metadata                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX orders_company_status_idx ON comercio.orders (company_id, status);
CREATE INDEX orders_stripe_session_idx ON comercio.orders (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON comercio.orders
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- Tabela: comercio.order_items
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE comercio.order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES comercio.orders(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES comercio.products(id) ON DELETE SET NULL,
  product_name          TEXT NOT NULL,
  quantity              INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_cents_at_purchase INTEGER NOT NULL CHECK (price_cents_at_purchase >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX order_items_order_idx ON comercio.order_items (order_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE comercio.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercio.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_tenant_isolation"
  ON comercio.orders
  USING (company_id::text = current_setting('app.current_company_id', true));

CREATE POLICY "orders_service_role_bypass"
  ON comercio.orders TO service_role
  USING (true) WITH CHECK (true);

-- order_items: acesso via join com orders (mesmo company_id)
CREATE POLICY "order_items_tenant_isolation"
  ON comercio.order_items
  USING (
    EXISTS (
      SELECT 1 FROM comercio.orders o
      WHERE o.id = order_items.order_id
        AND o.company_id::text = current_setting('app.current_company_id', true)
    )
  );

CREATE POLICY "order_items_service_role_bypass"
  ON comercio.order_items TO service_role
  USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- Grants
-- ──────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON comercio.orders TO authenticated;
GRANT ALL ON comercio.orders TO service_role;
GRANT SELECT, INSERT ON comercio.order_items TO authenticated;
GRANT ALL ON comercio.order_items TO service_role;
