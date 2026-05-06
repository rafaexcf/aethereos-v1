-- Super Sprint A / MX197 — Policy Engine: action_intents + policies + policy_evaluations.
--
-- Governance-as-Code conforme Fundamentação 11.4, 11.5, 11.14:
--   - action_intents: catálogo global de operações que podem ser executadas
--     pelo kernel (sem company_id — é taxonomia compartilhada).
--   - policies: regras YAML/JSON por empresa que decidem allow/deny/require_approval.
--   - policy_evaluations: log append-only de toda decisão tomada (auditoria).
--
-- Invariantes:
--   R8: deny prevalece sobre allow.
--   R10: policy_evaluations é append-only.
--   R16: action_intents é global (authenticated read). policies/evaluations
--        são company-scoped (RLS).

-- ─── 1. action_intents (catálogo global) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.action_intents (
  id                TEXT PRIMARY KEY,
  category          TEXT         NOT NULL,
  description       TEXT         NOT NULL,
  parameters_schema JSONB        NOT NULL DEFAULT '{}',
  effects           TEXT[]       NOT NULL DEFAULT '{}',
  reversibility     JSONB,
  risk_class        CHAR(1)      NOT NULL DEFAULT 'A'
                       CHECK (risk_class IN ('A', 'B', 'C')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kernel_action_intents_category_idx
  ON kernel.action_intents (category, risk_class);

COMMENT ON TABLE kernel.action_intents IS
  'Catálogo global de operações sujeitas a policy engine. Sem company_id — taxonomia compartilhada.';
COMMENT ON COLUMN kernel.action_intents.risk_class IS
  'A=baixo (criar/leitura), B=médio (deletar/config), C=alto (suspender user, exportar dados).';

ALTER TABLE kernel.action_intents ENABLE ROW LEVEL SECURITY;

-- SELECT para todos authenticated (catálogo global).
CREATE POLICY "action_intents_select_authenticated"
  ON kernel.action_intents
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE só service_role (taxonomia gerenciada via migrations).
CREATE POLICY "action_intents_service_only"
  ON kernel.action_intents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE TRIGGER action_intents_updated_at
  BEFORE UPDATE ON kernel.action_intents
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── 2. policies (por empresa) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.policies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name                  TEXT         NOT NULL CHECK (char_length(trim(name)) >= 1),
  description           TEXT         NOT NULL DEFAULT '',
  policy_yaml           TEXT         NOT NULL,
  policy_json           JSONB        NOT NULL,
  version               INTEGER      NOT NULL DEFAULT 1,
  status                TEXT         NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'active', 'archived')),
  original_intent_text  TEXT,
  applies_to            JSONB        NOT NULL DEFAULT '{}',
  created_by            UUID         REFERENCES kernel.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, name, version)
);

CREATE INDEX IF NOT EXISTS kernel_policies_company_status_idx
  ON kernel.policies (company_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS kernel_policies_active_lookup_idx
  ON kernel.policies (company_id)
  WHERE status = 'active';

COMMENT ON TABLE kernel.policies IS
  'Policies por empresa. policy_yaml é a fonte legível, policy_json é parsed para avaliação rápida.';
COMMENT ON COLUMN kernel.policies.applies_to IS
  'Filtro: { "actor_type": "agent" | "user" | "*", "agent_ids": [], "intent_ids": [] }';

ALTER TABLE kernel.policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policies_rls" ON kernel.policies
  FOR ALL
  USING (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

CREATE OR REPLACE TRIGGER policies_updated_at
  BEFORE UPDATE ON kernel.policies
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── 3. policy_evaluations (append-only audit) ──────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.policy_evaluations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  policy_id       UUID         REFERENCES kernel.policies(id) ON DELETE SET NULL,
  intent_id       TEXT         NOT NULL,
  actor_id        UUID         NOT NULL,
  actor_type      TEXT         NOT NULL CHECK (actor_type IN ('user', 'agent')),
  parameters      JSONB        NOT NULL,
  result          TEXT         NOT NULL CHECK (result IN ('allow', 'deny', 'require_approval')),
  matched_rules   JSONB        NOT NULL DEFAULT '[]',
  reason          TEXT         NOT NULL,
  proposal_id     UUID         REFERENCES kernel.agent_proposals(id) ON DELETE SET NULL,
  evaluated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kernel_policy_evaluations_company_time_idx
  ON kernel.policy_evaluations (company_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS kernel_policy_evaluations_intent_idx
  ON kernel.policy_evaluations (company_id, intent_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS kernel_policy_evaluations_proposal_idx
  ON kernel.policy_evaluations (proposal_id)
  WHERE proposal_id IS NOT NULL;

COMMENT ON TABLE kernel.policy_evaluations IS
  'Log append-only de cada avaliação de policy. NUNCA UPDATE/DELETE (audit trail).';

ALTER TABLE kernel.policy_evaluations ENABLE ROW LEVEL SECURITY;

-- Append-only: SELECT + INSERT mas NÃO UPDATE nem DELETE.
CREATE POLICY "policy_evaluations_select" ON kernel.policy_evaluations
  FOR SELECT
  USING (company_id = kernel.current_company_id());

CREATE POLICY "policy_evaluations_insert" ON kernel.policy_evaluations
  FOR INSERT
  WITH CHECK (company_id = kernel.current_company_id());

-- service_role bypass para o engine (que roda em scp-worker / Edge Function).
CREATE POLICY "policy_evaluations_service_all" ON kernel.policy_evaluations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
