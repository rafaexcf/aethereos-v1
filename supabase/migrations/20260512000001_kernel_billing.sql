-- Super Sprint E / MX234 — Billing tables.
--
-- Modelo "Alternativa B" (billing próprio sem Lago — ver docs/billing/README.md).
-- Lago colunas (lago_subscription_id, lago_customer_id, lago_invoice_id) ficam
-- reservadas para sincronização futura caso Lago seja adotado em F2+.
--
-- Tabelas:
--   - kernel.subscriptions: assinatura ativa por company (UNIQUE company_id)
--   - kernel.invoices: faturas com status (draft/pending/paid/failed/voided)
--   - kernel.usage_events: append-only de pontos de medição
--   - kernel.plan_limits: limites GLOBAIS por (plan_code, metric_code)
--
-- R10: quotas se aplicam a TODOS (incluindo owner/admin).
-- R12: plan_limits sem company_id — limites iguais para todos no mesmo plano.
-- R13: subscription Free auto-criada para companies novas (e existentes via INSERT final).
-- R17: valores em centavos (amount_cents).

-- ─── 1. subscriptions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  plan_code                TEXT         NOT NULL CHECK (plan_code IN ('free','pro','enterprise')),
  status                   TEXT         NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','past_due','cancelled','trialing')),
  lago_subscription_id     TEXT,
  lago_customer_id         TEXT,
  current_period_start     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  current_period_end       TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  cancel_at_period_end     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS kernel_subscriptions_status_idx
  ON kernel.subscriptions (status, current_period_end);

COMMENT ON TABLE kernel.subscriptions IS
  'Assinatura ativa por company (UNIQUE). Free é default. Lago IDs ficam null em modo Alternativa B.';

ALTER TABLE kernel.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_tenant_select" ON kernel.subscriptions
  FOR SELECT TO authenticated
  USING (company_id = kernel.current_company_id());

CREATE POLICY "subscriptions_service_role" ON kernel.subscriptions
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE OR REPLACE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON kernel.subscriptions
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── 2. invoices ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  subscription_id     UUID         NOT NULL REFERENCES kernel.subscriptions(id) ON DELETE CASCADE,
  lago_invoice_id     TEXT,
  amount_cents        INTEGER      NOT NULL CHECK (amount_cents >= 0),
  currency            TEXT         NOT NULL DEFAULT 'BRL',
  status              TEXT         NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','pending','paid','failed','voided')),
  invoice_number      TEXT,
  invoice_url         TEXT,
  pdf_url             TEXT,
  period_start        TIMESTAMPTZ,
  period_end          TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kernel_invoices_company_status_idx
  ON kernel.invoices (company_id, status, created_at DESC);

COMMENT ON TABLE kernel.invoices IS
  'Faturas. Em modo Alternativa B sem cobrança real, pdf_url fica null e invoice_number é gerado pelo Aethereos.';

ALTER TABLE kernel.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_tenant_select" ON kernel.invoices
  FOR SELECT TO authenticated
  USING (company_id = kernel.current_company_id());

CREATE POLICY "invoices_service_role" ON kernel.invoices
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─── 3. usage_events ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.usage_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  metric_code  TEXT         NOT NULL CHECK (metric_code IN ('active_users','storage_bytes','ai_queries')),
  value        NUMERIC      NOT NULL CHECK (value >= 0),
  recorded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kernel_usage_events_company_metric_idx
  ON kernel.usage_events (company_id, metric_code, recorded_at DESC);

COMMENT ON TABLE kernel.usage_events IS
  'Append-only de pontos de medição. Usado para histórico; o valor corrente vem de COUNT/SUM ad-hoc nas tabelas-origem.';

ALTER TABLE kernel.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_events_tenant_select" ON kernel.usage_events
  FOR SELECT TO authenticated
  USING (company_id = kernel.current_company_id());

CREATE POLICY "usage_events_service_role" ON kernel.usage_events
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─── 4. plan_limits (catálogo global) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.plan_limits (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code               TEXT         NOT NULL CHECK (plan_code IN ('free','pro','enterprise')),
  metric_code             TEXT         NOT NULL CHECK (metric_code IN ('active_users','storage_bytes','ai_queries')),
  max_value               NUMERIC      NOT NULL CHECK (max_value >= 0),
  overage_amount_cents    INTEGER      NOT NULL DEFAULT 0 CHECK (overage_amount_cents >= 0),
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (plan_code, metric_code)
);

COMMENT ON TABLE kernel.plan_limits IS
  'Limites GLOBAIS por (plan_code, metric_code). Sem company_id — R12 do sprint E. Espelha @aethereos/kernel/billing/plans.';

ALTER TABLE kernel.plan_limits ENABLE ROW LEVEL SECURITY;

-- SELECT para todos authenticated (catálogo global).
CREATE POLICY "plan_limits_select_authenticated" ON kernel.plan_limits
  FOR SELECT TO authenticated USING (TRUE);

-- INSERT/UPDATE/DELETE só service_role (gerenciado via migrations).
CREATE POLICY "plan_limits_service_only" ON kernel.plan_limits
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─── 5. seed plan_limits ───────────────────────────────────────────────────
-- 500 MB = 524288000, 10 GB = 10737418240, 100 GB = 107374182400.

INSERT INTO kernel.plan_limits (plan_code, metric_code, max_value, overage_amount_cents) VALUES
  ('free', 'active_users', 3, 0),
  ('free', 'storage_bytes', 524288000, 0),
  ('free', 'ai_queries', 100, 0),
  ('pro', 'active_users', 20, 1990),
  ('pro', 'storage_bytes', 10737418240, 990),
  ('pro', 'ai_queries', 5000, 5),
  ('enterprise', 'active_users', 200, 1490),
  ('enterprise', 'storage_bytes', 107374182400, 490),
  ('enterprise', 'ai_queries', 50000, 3)
ON CONFLICT (plan_code, metric_code) DO UPDATE
  SET max_value = EXCLUDED.max_value,
      overage_amount_cents = EXCLUDED.overage_amount_cents;

-- ─── 6. backfill subscriptions Free para companies existentes ──────────────

INSERT INTO kernel.subscriptions (company_id, plan_code, status)
SELECT id, 'free', 'active'
FROM kernel.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM kernel.subscriptions s WHERE s.company_id = c.id
);

-- ─── 7. trigger: auto-criar subscription Free para nova company ────────────
-- R13: toda company nova nasce Free.

CREATE OR REPLACE FUNCTION kernel.create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO kernel.subscriptions (company_id, plan_code, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_default_subscription ON kernel.companies;
CREATE TRIGGER companies_default_subscription
  AFTER INSERT ON kernel.companies
  FOR EACH ROW EXECUTE FUNCTION kernel.create_default_subscription();

-- ─── 8. realtime opt-in ────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE kernel.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE kernel.invoices;
