-- kernel.automations — Regras "quando X acontecer, faça Y" por usuário+tenant.
-- Execução é browser-side (skeleton), via hook `useAutomationEngine` montado
-- em OSDesktop. Não há worker server-side neste estágio.

CREATE TABLE kernel.automations (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name            TEXT         NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  enabled         BOOLEAN      NOT NULL DEFAULT true,
  trigger_type    TEXT         NOT NULL CHECK (
                                 trigger_type IN (
                                   'task.created',
                                   'note.created',
                                   'event.upcoming',
                                   'notification.received',
                                   'time.daily'
                                 )
                               ),
  trigger_config  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  action_type     TEXT         NOT NULL CHECK (
                                 action_type IN (
                                   'notify',
                                   'create_task',
                                   'create_note',
                                   'webhook'
                                 )
                               ),
  action_config   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  last_run_at     TIMESTAMPTZ,
  last_run_status TEXT         CHECK (
                                 last_run_status IS NULL
                                 OR last_run_status IN ('success', 'error', 'skipped')
                               ),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX automations_user_company_enabled_idx
  ON kernel.automations (user_id, company_id, enabled);

ALTER TABLE kernel.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automations_user_isolation" ON kernel.automations
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

-- kernel.set_updated_at() vem da migration 20260502000001_kernel_notes.sql
CREATE TRIGGER automations_updated_at
  BEFORE UPDATE ON kernel.automations
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- Realtime para o engine recarregar regras quando inseridas/atualizadas
ALTER PUBLICATION supabase_realtime ADD TABLE kernel.automations;

COMMENT ON TABLE kernel.automations IS
  'Regras de automação "when X happens, do Y" por usuário+tenant. '
  'Execução browser-side via useAutomationEngine. '
  'Limitações: requer browser aberto, sem retry queue, time.daily best-effort.';
