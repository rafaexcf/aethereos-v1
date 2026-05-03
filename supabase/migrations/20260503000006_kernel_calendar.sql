-- kernel.calendar_defs — user-owned calendar categories (Pessoal, Trabalho, etc.)
CREATE TABLE kernel.calendar_defs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  label       TEXT         NOT NULL,
  color       TEXT         NOT NULL DEFAULT '#8b5cf6',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX calendar_defs_user_company_idx
  ON kernel.calendar_defs (user_id, company_id, created_at);

ALTER TABLE kernel.calendar_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_defs_rls" ON kernel.calendar_defs
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER calendar_defs_updated_at
  BEFORE UPDATE ON kernel.calendar_defs
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- kernel.calendar_events — individual events belonging to a calendar def
CREATE TABLE kernel.calendar_events (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  calendar_def_id UUID         REFERENCES kernel.calendar_defs(id) ON DELETE SET NULL,
  title           TEXT         NOT NULL,
  event_date      DATE         NOT NULL,
  time_start      TEXT,
  time_end        TEXT,
  all_day         BOOLEAN      NOT NULL DEFAULT false,
  description     TEXT,
  reminders       JSONB        NOT NULL DEFAULT '[]',
  color           TEXT         NOT NULL DEFAULT '#8b5cf6',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX calendar_events_user_company_date_idx
  ON kernel.calendar_events (user_id, company_id, event_date DESC);

CREATE INDEX calendar_events_def_idx
  ON kernel.calendar_events (calendar_def_id);

ALTER TABLE kernel.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_rls" ON kernel.calendar_events
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON kernel.calendar_events
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();
