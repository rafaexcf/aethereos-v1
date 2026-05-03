-- kernel.alarms — Despertadores persistentes por usuário/tenant
-- kernel.pomodoro_sessions — Histórico de sessões Pomodoro
-- kernel.clock_preferences — Preferências de relógio por usuário/tenant
-- RLS: user_id = auth.uid() AND company_id = kernel.current_company_id()

-- ─── Alarmes ──────────────────────────────────────────────────────────────────

CREATE TABLE kernel.alarms (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id       UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL DEFAULT 'Alarme',
  time             TEXT        NOT NULL CHECK (time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  repeat_days      INTEGER[]   NOT NULL DEFAULT '{}',
  is_enabled       BOOLEAN     NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX alarms_user_company_idx
  ON kernel.alarms (user_id, company_id, time);

ALTER TABLE kernel.alarms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alarms_user_isolation" ON kernel.alarms
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER alarms_updated_at
  BEFORE UPDATE ON kernel.alarms
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── Sessões Pomodoro ─────────────────────────────────────────────────────────

CREATE TABLE kernel.pomodoro_sessions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id           UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  mode                 TEXT        NOT NULL CHECK (mode IN ('focus', 'short', 'long')),
  focus_minutes        INTEGER     NOT NULL DEFAULT 25,
  short_break_minutes  INTEGER     NOT NULL DEFAULT 5,
  long_break_minutes   INTEGER     NOT NULL DEFAULT 15,
  cycles_completed     INTEGER     NOT NULL DEFAULT 0,
  started_at           TIMESTAMPTZ NOT NULL,
  ended_at             TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX pomodoro_sessions_user_idx
  ON kernel.pomodoro_sessions (user_id, company_id, started_at DESC);

ALTER TABLE kernel.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pomodoro_sessions_user_isolation" ON kernel.pomodoro_sessions
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

-- ─── Preferências de relógio ──────────────────────────────────────────────────

CREATE TABLE kernel.clock_preferences (
  id                             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id                     UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  default_timezone               TEXT        NOT NULL DEFAULT 'America/Sao_Paulo',
  pomodoro_focus_minutes         INTEGER     NOT NULL DEFAULT 25,
  pomodoro_short_break_minutes   INTEGER     NOT NULL DEFAULT 5,
  pomodoro_long_break_minutes    INTEGER     NOT NULL DEFAULT 15,
  pomodoro_cycles_before_long    INTEGER     NOT NULL DEFAULT 4,
  world_clocks                   TEXT        NOT NULL DEFAULT '[]',
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, company_id)
);

ALTER TABLE kernel.clock_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clock_preferences_user_isolation" ON kernel.clock_preferences
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER clock_preferences_updated_at
  BEFORE UPDATE ON kernel.clock_preferences
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

COMMENT ON TABLE kernel.alarms IS 'Despertadores do usuário. RLS garante isolamento por user+tenant. Alarmes dependem do app estar aberto no navegador.';
COMMENT ON TABLE kernel.pomodoro_sessions IS 'Histórico de sessões Pomodoro concluídas por usuário/tenant.';
COMMENT ON TABLE kernel.clock_preferences IS 'Preferências do app Relógio: timezone padrão, configurações Pomodoro, fusos favoritos (JSON).';
