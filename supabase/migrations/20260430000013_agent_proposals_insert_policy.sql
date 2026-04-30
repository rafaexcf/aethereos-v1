-- MX19: Política INSERT para kernel.agent_proposals
-- Browser Copilot propõe ações; usuário autenticado insere em nome do agent.
-- SELECT e UPDATE já existem em 20260430000007_kernel_agent_proposals.sql

CREATE POLICY "tenant_agent_proposals_insert" ON kernel.agent_proposals
  FOR INSERT WITH CHECK (company_id = kernel.current_company_id());
