-- M45: Copilot — extend kernel.agents + copilot tables
-- ---------------------------------------------------------------------------

-- Extend agents with kind + autonomy_level
ALTER TABLE kernel.agents
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'copilot'
    CHECK (kind IN ('copilot', 'autonomous', 'observer')),
  ADD COLUMN IF NOT EXISTS autonomy_level INTEGER NOT NULL DEFAULT 0
    CHECK (autonomy_level BETWEEN 0 AND 1);

COMMENT ON COLUMN kernel.agents.kind IS 'copilot = assistivo; autonomous = age sem aprovação; observer = só lê';
COMMENT ON COLUMN kernel.agents.autonomy_level IS '0 = sugerir (human executes); 1 = executar (human approves)';

-- Agent capabilities
CREATE TABLE IF NOT EXISTS kernel.agent_capabilities (
  agent_id   UUID NOT NULL REFERENCES kernel.agents(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  granted_by UUID NOT NULL REFERENCES kernel.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agent_id, capability)
);

CREATE INDEX IF NOT EXISTS kernel_agent_capabilities_agent_idx
  ON kernel.agent_capabilities (agent_id);

-- Copilot conversations
CREATE TABLE IF NOT EXISTS kernel.copilot_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES kernel.agents(id),
  user_id         UUID NOT NULL REFERENCES kernel.users(id),
  title           TEXT,
  correlation_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kernel_copilot_conversations_company_user_idx
  ON kernel.copilot_conversations (company_id, user_id, created_at DESC);

-- Copilot messages
CREATE TABLE IF NOT EXISTS kernel.copilot_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES kernel.copilot_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  model           TEXT,
  prompt_tokens   INTEGER,
  completion_tokens INTEGER,
  cost_usd        NUMERIC(12, 8),
  correlation_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kernel_copilot_messages_conversation_idx
  ON kernel.copilot_messages (conversation_id, created_at);

-- RLS for agent_capabilities
ALTER TABLE kernel.agent_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_agent_capabilities" ON kernel.agent_capabilities
  USING (
    agent_id IN (
      SELECT id FROM kernel.agents
      WHERE company_id = kernel.current_company_id()
    )
  );

-- RLS for copilot_conversations
ALTER TABLE kernel.copilot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_copilot_conversations" ON kernel.copilot_conversations
  USING (company_id = kernel.current_company_id());

-- RLS for copilot_messages
ALTER TABLE kernel.copilot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_copilot_messages" ON kernel.copilot_messages
  USING (
    conversation_id IN (
      SELECT id FROM kernel.copilot_conversations
      WHERE company_id = kernel.current_company_id()
    )
  );

-- Updated_at trigger for conversations
CREATE OR REPLACE FUNCTION kernel.set_copilot_conversation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_copilot_conversations_updated_at
  BEFORE UPDATE ON kernel.copilot_conversations
  FOR EACH ROW EXECUTE FUNCTION kernel.set_copilot_conversation_updated_at();
