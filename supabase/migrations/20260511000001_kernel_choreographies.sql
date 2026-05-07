-- Super Sprint D / MX227 — SCP Choreography Engine.
--
-- Coreografias declarativas multi-step: um trigger SCP dispara uma sequência
-- de steps, cada um podendo emitir eventos, criar notificações, chamar
-- activities, e (se incluir agente) passar pelo Policy Engine.
--
-- Modelo:
--   - kernel.choreographies — definições por empresa (YAML + JSON canônico)
--   - kernel.choreography_executions — instâncias rodando ou finalizadas
--   - kernel.choreography_step_approvals — gates manuais quando require_approval
--
-- Conexão com Temporal: cada execução pode ser materializada como Temporal
-- workflow (`choreographyWorkflow`) para resiliência e timers longos. Em
-- modo simples (sem Temporal), o engine executa inline e registra na tabela.

-- ─── 1. choreographies ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.choreographies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name                TEXT         NOT NULL CHECK (char_length(trim(name)) >= 1),
  description         TEXT         NOT NULL DEFAULT '',
  choreography_yaml   TEXT         NOT NULL,
  choreography_json   JSONB        NOT NULL,
  status              TEXT         NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  trigger_event_type  TEXT         NOT NULL,
  trigger_condition   JSONB,
  steps               JSONB        NOT NULL DEFAULT '[]'::jsonb,
  error_handling      JSONB        NOT NULL DEFAULT '{"on_failure":"notify_human"}'::jsonb,
  created_by          UUID         REFERENCES kernel.users(id) ON DELETE SET NULL,
  execution_count     INTEGER      NOT NULL DEFAULT 0,
  last_executed_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS kernel_choreographies_company_status_idx
  ON kernel.choreographies (company_id, status);

CREATE INDEX IF NOT EXISTS kernel_choreographies_trigger_idx
  ON kernel.choreographies (trigger_event_type)
  WHERE status = 'active';

COMMENT ON TABLE kernel.choreographies IS
  'Coreografias multi-step disparadas por eventos SCP. company-scoped via RLS.';
COMMENT ON COLUMN kernel.choreographies.steps IS
  'Array de steps: [{id, description, intent?, agent?, inputs?, emit?, wait?, condition?, on_failure?}, ...]';

ALTER TABLE kernel.choreographies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "choreographies_tenant_isolation" ON kernel.choreographies
  FOR ALL
  TO authenticated
  USING (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

CREATE POLICY "choreographies_service_role" ON kernel.choreographies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER choreographies_updated_at
  BEFORE UPDATE ON kernel.choreographies
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── 2. choreography_executions ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.choreography_executions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choreography_id       UUID         NOT NULL REFERENCES kernel.choreographies(id) ON DELETE CASCADE,
  company_id            UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  trigger_event_id      UUID,
  trigger_event_type    TEXT         NOT NULL,
  trigger_payload       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  temporal_workflow_id  TEXT,
  temporal_run_id       TEXT,
  status                TEXT         NOT NULL DEFAULT 'running'
                          CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'awaiting_approval')),
  steps_completed       JSONB        NOT NULL DEFAULT '[]'::jsonb,
  current_step_id       TEXT,
  started_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  error                 TEXT
);

CREATE INDEX IF NOT EXISTS kernel_choreography_executions_company_idx
  ON kernel.choreography_executions (company_id, started_at DESC);

CREATE INDEX IF NOT EXISTS kernel_choreography_executions_choreography_idx
  ON kernel.choreography_executions (choreography_id, started_at DESC);

CREATE INDEX IF NOT EXISTS kernel_choreography_executions_status_idx
  ON kernel.choreography_executions (status)
  WHERE status IN ('running', 'awaiting_approval');

COMMENT ON TABLE kernel.choreography_executions IS
  'Histórico append-only de execuções de coreografias. Append/update apenas; sem DELETE.';

ALTER TABLE kernel.choreography_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "choreography_executions_tenant_select" ON kernel.choreography_executions
  FOR SELECT TO authenticated
  USING (company_id = kernel.current_company_id());

-- INSERT/UPDATE só service_role (engine roda server-side).
CREATE POLICY "choreography_executions_service_role" ON kernel.choreography_executions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 3. choreography_step_approvals ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kernel.choreography_step_approvals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id        UUID         REFERENCES kernel.choreography_executions(id) ON DELETE CASCADE,
  choreography_id     UUID         NOT NULL REFERENCES kernel.choreographies(id) ON DELETE CASCADE,
  company_id          UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  step_id             TEXT         NOT NULL,
  intent_id           TEXT         NOT NULL,
  parameters          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  status              TEXT         NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  decided_by          UUID         REFERENCES kernel.users(id) ON DELETE SET NULL,
  decided_at          TIMESTAMPTZ,
  decision_reason     TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS kernel_choreography_approvals_company_pending_idx
  ON kernel.choreography_step_approvals (company_id, status)
  WHERE status = 'pending';

ALTER TABLE kernel.choreography_step_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "choreography_approvals_tenant_isolation" ON kernel.choreography_step_approvals
  FOR ALL TO authenticated
  USING (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

CREATE POLICY "choreography_approvals_service_role" ON kernel.choreography_step_approvals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 4. realtime opt-in ────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE kernel.choreographies;
ALTER PUBLICATION supabase_realtime ADD TABLE kernel.choreography_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE kernel.choreography_step_approvals;
