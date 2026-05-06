-- Super Sprint A / MX200 — Agent Proposals integrado com Policy Engine.
--
-- Adiciona campos para rastrear avaliação automática:
--   policy_evaluation_id: FK para a row em policy_evaluations que decidiu.
--   auto_resolved: true se a proposal foi resolvida sem aprovação humana.
--   auto_resolved_reason: motivo legível para humanos (mostrado na UI).

ALTER TABLE kernel.agent_proposals
  ADD COLUMN IF NOT EXISTS policy_evaluation_id UUID
    REFERENCES kernel.policy_evaluations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_resolved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_resolved_reason TEXT;

CREATE INDEX IF NOT EXISTS kernel_agent_proposals_auto_resolved_idx
  ON kernel.agent_proposals (company_id, auto_resolved, created_at DESC)
  WHERE auto_resolved = true;

COMMENT ON COLUMN kernel.agent_proposals.policy_evaluation_id IS
  'FK para policy_evaluations row que decidiu allow/deny/require_approval. NULL se proposal foi criada antes do Policy Engine.';
COMMENT ON COLUMN kernel.agent_proposals.auto_resolved IS
  'true se a proposal foi auto-aprovada ou auto-rejeitada por policy. false se requer aprovação humana.';
COMMENT ON COLUMN kernel.agent_proposals.auto_resolved_reason IS
  'Motivo da auto-resolução (ex: "Bloqueado pela política Padrão Conservador").';
