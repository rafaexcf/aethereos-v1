CREATE TABLE kernel.user_preferences (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key         TEXT         NOT NULL CHECK (key IN ('dock_order','theme','notification_prefs','dock_hidden')),
  value       JSONB        NOT NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, key)
);

CREATE INDEX user_preferences_user_idx ON kernel.user_preferences (user_id);

ALTER TABLE kernel.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_rls" ON kernel.user_preferences
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON kernel.user_preferences
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE kernel.user_preferences;
