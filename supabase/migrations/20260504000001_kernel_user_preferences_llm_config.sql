-- Sprint 15 MX74: estende kernel.user_preferences.key CHECK para incluir
-- 'llm_config' (BYOK LLM provider config armazenado como jsonb).
-- Migration nao-destrutiva: drop + add da constraint, dados existentes preservados.

ALTER TABLE kernel.user_preferences
  DROP CONSTRAINT user_preferences_key_check;

ALTER TABLE kernel.user_preferences
  ADD CONSTRAINT user_preferences_key_check
  CHECK (key IN (
    'dock_order',
    'theme',
    'notification_prefs',
    'dock_hidden',
    'lock_timeout_minutes',
    'llm_config'
  ));
