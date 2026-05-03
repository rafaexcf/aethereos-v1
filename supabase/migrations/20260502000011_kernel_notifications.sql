-- kernel.notifications — Sistema de notificações in-app emitidas por qualquer
-- app interno do shell. Cada notificação é por usuário (user_id) e empresa
-- (company_id), e atravessa Realtime para entrega imediata.

CREATE TABLE kernel.notifications (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  type         TEXT         NOT NULL CHECK (type IN ('info','warning','error','success')),
  title        TEXT         NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  body         TEXT         NOT NULL DEFAULT '',
  source_app   TEXT,
  source_id    TEXT,
  metadata     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_company_unread_idx
  ON kernel.notifications (user_id, company_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX notifications_user_company_idx
  ON kernel.notifications (user_id, company_id, created_at DESC);

ALTER TABLE kernel.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_rls" ON kernel.notifications
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE kernel.notifications;
