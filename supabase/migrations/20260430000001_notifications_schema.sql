-- M37: kernel.notifications — sistema unificado de notificações por tenant
-- Ref: Sprint 5 M37, Fundamentação P4 (multi-tenant por RLS)

CREATE TABLE kernel.notifications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL,
  type           TEXT        NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  title          TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body           TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  read_at        TIMESTAMPTZ,
  correlation_id TEXT,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_company_user_idx
  ON kernel.notifications (company_id, user_id, read_at NULLS FIRST)
  WHERE read_at IS NULL;

CREATE INDEX notifications_created_idx
  ON kernel.notifications (company_id, user_id, created_at DESC);

-- RLS: usuário vê apenas suas próprias notificações dentro do tenant ativo
ALTER TABLE kernel.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_user_isolation" ON kernel.notifications
  FOR ALL
  USING (
    company_id = kernel.current_company_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    company_id = kernel.current_company_id()
    AND user_id = auth.uid()
  );

-- Service role pode inserir notificações para qualquer usuário do tenant
CREATE POLICY "service_role_insert" ON kernel.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.notifications IS
  'Notificações por usuário e tenant. RLS garante isolamento. Criadas por workers via service_role.';
