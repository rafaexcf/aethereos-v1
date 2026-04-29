-- M46: Shadow Mode — kernel.agent_proposals
-- Propostas de ação do Copilot aguardando aprovação humana
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kernel.agent_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES kernel.agents(id),
  conversation_id UUID REFERENCES kernel.copilot_conversations(id),
  supervising_user_id UUID NOT NULL REFERENCES kernel.users(id),
  intent_type     TEXT NOT NULL CHECK (intent_type IN (
    'create_person',
    'create_file',
    'send_notification',
    'update_settings',
    'create_channel'
  )),
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'expired')),
  correlation_id  UUID,
  reviewed_by     UUID REFERENCES kernel.users(id),
  reviewed_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS kernel_agent_proposals_company_status_idx
  ON kernel.agent_proposals (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS kernel_agent_proposals_conversation_idx
  ON kernel.agent_proposals (conversation_id);

-- Proposals expiram automaticamente (status=expired) via pg_cron em produção
-- Para MVP: status checked at read time no driver

-- RLS
ALTER TABLE kernel.agent_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_agent_proposals_select" ON kernel.agent_proposals
  FOR SELECT USING (company_id = kernel.current_company_id());

-- Apenas agents (service_role) inserem proposals — authenticated não pode INSERT direto
CREATE POLICY "tenant_agent_proposals_update" ON kernel.agent_proposals
  FOR UPDATE USING (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());
