-- pgcrypto necessário para gen_random_bytes() em api_key default.
-- Em Supabase, extensions ficam no schema 'extensions' (não public).
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Super Sprint F / MX243 — Developer Console schema.
--
-- Portal para desenvolvedores terceiros publicarem apps na Magic Store.
-- Modelo:
--   - kernel.developer_accounts: conta de developer (1:1 com user)
--   - kernel.app_submissions: drafts/submits/published por developer
--   - kernel.app_reviews: histórico de decisões de staff
--   - kernel.app_installations: tracking append-only para métricas
--   - kernel.developer_earnings: revenue share 70/30 (MX251)
--
-- R7: Developer Console acessível por QUALQUER user authenticated.
-- R8: review é STAFF only (verificado via flag is_staff no JWT).
-- R10: api_key gerada com gen_random_bytes(32).
-- R17: price_cents em INTEGER (centavos).
-- R18: apps third-party recebem app_type='third_party' no registry.

-- ─── 1. developer_accounts ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.developer_accounts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID         NOT NULL REFERENCES kernel.users(id) ON DELETE CASCADE,
  display_name         TEXT         NOT NULL CHECK (char_length(trim(display_name)) >= 1),
  company_name         TEXT,
  website              TEXT,
  email                TEXT         NOT NULL,
  bio                  TEXT         NOT NULL DEFAULT '',
  avatar_url           TEXT,
  api_key              TEXT         NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  status               TEXT         NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','suspended','banned')),
  accepted_terms_at    TIMESTAMPTZ,
  -- Dados bancários para revenue share (MX251). Manuais por enquanto.
  bank_account_data    JSONB,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id),
  UNIQUE (api_key)
);

COMMENT ON TABLE kernel.developer_accounts IS
  'Conta de developer (1:1 com auth user). Separada de tenant memberships.';

ALTER TABLE kernel.developer_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "developer_accounts_self_select" ON kernel.developer_accounts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "developer_accounts_self_insert" ON kernel.developer_accounts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "developer_accounts_self_update" ON kernel.developer_accounts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "developer_accounts_service_role" ON kernel.developer_accounts
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE OR REPLACE TRIGGER developer_accounts_updated_at
  BEFORE UPDATE ON kernel.developer_accounts
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── 2. app_submissions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.app_submissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id         UUID         NOT NULL REFERENCES kernel.developer_accounts(id) ON DELETE CASCADE,
  app_slug             TEXT         NOT NULL CHECK (app_slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  version              TEXT         NOT NULL DEFAULT '1.0.0',
  name                 TEXT         NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 200),
  description          TEXT         NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 200),
  long_description     TEXT         NOT NULL DEFAULT '',
  icon                 TEXT         NOT NULL DEFAULT 'Box',
  color                TEXT         NOT NULL DEFAULT '#6366f1',
  category             TEXT         NOT NULL,
  entry_mode           TEXT         NOT NULL DEFAULT 'iframe'
                          CHECK (entry_mode IN ('iframe','weblink')),
  entry_url            TEXT         NOT NULL,
  external_url         TEXT,
  manifest_json        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  screenshots          TEXT[]       NOT NULL DEFAULT '{}',
  tags                 TEXT[]       NOT NULL DEFAULT '{}',
  pricing_model        TEXT         NOT NULL DEFAULT 'free'
                          CHECK (pricing_model IN ('free','freemium','paid','subscription')),
  price_cents          INTEGER      NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency             TEXT         NOT NULL DEFAULT 'BRL',
  license              TEXT         NOT NULL DEFAULT 'proprietary',
  status               TEXT         NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','submitted','in_review','approved','rejected','published','removed')),
  submitted_at         TIMESTAMPTZ,
  reviewed_at          TIMESTAMPTZ,
  published_at         TIMESTAMPTZ,
  rejection_reason     TEXT,
  changelog            TEXT         NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (developer_id, app_slug, version)
);

CREATE INDEX IF NOT EXISTS kernel_app_submissions_developer_idx
  ON kernel.app_submissions (developer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS kernel_app_submissions_status_idx
  ON kernel.app_submissions (status, submitted_at DESC)
  WHERE status IN ('submitted','in_review');

ALTER TABLE kernel.app_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_submissions_owner_select" ON kernel.app_submissions
  FOR SELECT TO authenticated
  USING (
    developer_id IN (
      SELECT id FROM kernel.developer_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "app_submissions_owner_modify" ON kernel.app_submissions
  FOR ALL TO authenticated
  USING (
    developer_id IN (
      SELECT id FROM kernel.developer_accounts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    developer_id IN (
      SELECT id FROM kernel.developer_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "app_submissions_service_role" ON kernel.app_submissions
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE OR REPLACE TRIGGER app_submissions_updated_at
  BEFORE UPDATE ON kernel.app_submissions
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── 3. app_reviews ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.app_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID         NOT NULL REFERENCES kernel.app_submissions(id) ON DELETE CASCADE,
  reviewer_id     UUID         NOT NULL REFERENCES kernel.users(id) ON DELETE SET NULL,
  action          TEXT         NOT NULL CHECK (action IN ('approve','reject','request_changes')),
  notes           TEXT         NOT NULL DEFAULT '',
  checklist       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kernel_app_reviews_submission_idx
  ON kernel.app_reviews (submission_id, created_at DESC);

ALTER TABLE kernel.app_reviews ENABLE ROW LEVEL SECURITY;

-- Developers veem reviews dos próprios apps (via JOIN com submissions).
CREATE POLICY "app_reviews_owner_select" ON kernel.app_reviews
  FOR SELECT TO authenticated
  USING (
    submission_id IN (
      SELECT s.id FROM kernel.app_submissions s
      JOIN kernel.developer_accounts d ON d.id = s.developer_id
      WHERE d.user_id = auth.uid()
    )
  );

-- Insert apenas service_role (Edge Function de review opera com service key).
CREATE POLICY "app_reviews_service_role" ON kernel.app_reviews
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─── 4. app_installations ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.app_installations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_slug        TEXT         NOT NULL,
  company_id      UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  installed_by    UUID         NOT NULL REFERENCES kernel.users(id) ON DELETE SET NULL,
  installed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  uninstalled_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS kernel_app_installations_slug_idx
  ON kernel.app_installations (app_slug, installed_at DESC);

CREATE INDEX IF NOT EXISTS kernel_app_installations_company_idx
  ON kernel.app_installations (company_id, installed_at DESC);

CREATE INDEX IF NOT EXISTS kernel_app_installations_active_idx
  ON kernel.app_installations (app_slug)
  WHERE uninstalled_at IS NULL;

ALTER TABLE kernel.app_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_installations_tenant_select" ON kernel.app_installations
  FOR SELECT TO authenticated
  USING (company_id = kernel.current_company_id());

CREATE POLICY "app_installations_service_role" ON kernel.app_installations
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─── 5. developer_earnings (MX251) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.developer_earnings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id             UUID         NOT NULL REFERENCES kernel.developer_accounts(id) ON DELETE CASCADE,
  app_slug                 TEXT         NOT NULL,
  company_id               UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  amount_cents             INTEGER      NOT NULL CHECK (amount_cents >= 0),
  developer_share_cents    INTEGER      NOT NULL CHECK (developer_share_cents >= 0),
  platform_share_cents     INTEGER      NOT NULL CHECK (platform_share_cents >= 0),
  status                   TEXT         NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','paid','cancelled')),
  period_start             TIMESTAMPTZ  NOT NULL,
  period_end               TIMESTAMPTZ  NOT NULL,
  paid_at                  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kernel_developer_earnings_developer_idx
  ON kernel.developer_earnings (developer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS kernel_developer_earnings_status_idx
  ON kernel.developer_earnings (status, period_end);

COMMENT ON TABLE kernel.developer_earnings IS
  'Revenue share 70/30. Em F1 sem cobrança real, esta tabela fica vazia. Pagamentos manuais até automação.';

ALTER TABLE kernel.developer_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "developer_earnings_owner_select" ON kernel.developer_earnings
  FOR SELECT TO authenticated
  USING (
    developer_id IN (
      SELECT id FROM kernel.developer_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "developer_earnings_service_role" ON kernel.developer_earnings
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─── 6. realtime opt-in ────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE kernel.developer_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE kernel.app_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE kernel.app_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE kernel.app_installations;
