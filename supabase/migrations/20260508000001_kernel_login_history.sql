-- Sprint 30 MX165: kernel.login_history — Sessões ativas + force-logout.
--
-- Supabase Auth não expõe auth.sessions via SDK público, então mantemos um
-- registro custom de logins por user/company. Cada entrada representa uma
-- sessão de navegador detectada (login_at) e atualizada em background a cada
-- boot do shell (last_seen_at).
--
-- Force-logout MVP (R12): UPDATE is_active=false + logout_at=now(); shell
-- consulta no boot e desconecta se sua sessão atual foi marcada inactive.

CREATE TABLE kernel.login_history (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address    INET,
  user_agent    TEXT,
  device_type   TEXT,
  login_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  logout_at     TIMESTAMPTZ,
  is_active     BOOLEAN      NOT NULL DEFAULT true
);

CREATE INDEX kernel_login_history_company_active_idx
  ON kernel.login_history (company_id, is_active, last_seen_at DESC);

CREATE INDEX kernel_login_history_user_idx
  ON kernel.login_history (user_id, last_seen_at DESC);

ALTER TABLE kernel.login_history ENABLE ROW LEVEL SECURITY;

-- SELECT/UPDATE pelos membros da company. service_role passa por cima do RLS
-- nativamente — usado pela Edge Function force-logout.
CREATE POLICY "login_history_rls" ON kernel.login_history
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

-- Trigger: cada UPDATE bumpa last_seen_at automaticamente (a menos que o caller
-- já tenha setado, p. ex. force-logout que escreve logout_at + is_active=false).
CREATE OR REPLACE FUNCTION kernel.touch_login_history_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_seen_at IS NOT DISTINCT FROM OLD.last_seen_at THEN
    NEW.last_seen_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER login_history_touch_last_seen
  BEFORE UPDATE ON kernel.login_history
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_login_history_last_seen();

COMMENT ON TABLE kernel.login_history IS
  'Histórico de sessões/logins por user dentro de uma company. is_active=true '
  'representa sessão viva. Force-logout marca is_active=false + logout_at=now() '
  '(MVP R12); shell consulta no boot e desconecta se sua entrada foi inativada.';
