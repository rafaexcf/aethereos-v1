-- Migration: kernel.chat_channels, chat_channel_members, chat_messages
-- M43, Sprint 6

CREATE TABLE kernel.chat_channels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name       TEXT,
  kind       TEXT NOT NULL DEFAULT 'channel'
                CHECK (kind IN ('channel','dm')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX kernel_chat_channels_company_idx ON kernel.chat_channels (company_id, kind);

CREATE TABLE kernel.chat_channel_members (
  channel_id UUID NOT NULL REFERENCES kernel.chat_channels(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX kernel_chat_members_user_idx ON kernel.chat_channel_members (user_id);

CREATE TABLE kernel.chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES kernel.chat_channels(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id),
  body       TEXT NOT NULL,
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX kernel_chat_messages_channel_idx
  ON kernel.chat_messages (channel_id, created_at DESC);

-- RLS
ALTER TABLE kernel.chat_channels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kernel.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE kernel.chat_messages        ENABLE ROW LEVEL SECURITY;

-- Canal: visible se pertence à company ativa
CREATE POLICY "channels_company" ON kernel.chat_channels
  FOR ALL USING (company_id = kernel.current_company_id())
  WITH CHECK  (company_id = kernel.current_company_id());

-- Membros: visible se o canal pertence à company ativa
CREATE POLICY "channel_members_via_channel" ON kernel.chat_channel_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM kernel.chat_channels c
      WHERE c.id = channel_id
        AND c.company_id = kernel.current_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kernel.chat_channels c
      WHERE c.id = channel_id
        AND c.company_id = kernel.current_company_id()
    )
  );

-- Mensagens: visible se o canal pertence à company ativa
CREATE POLICY "chat_messages_via_channel" ON kernel.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM kernel.chat_channels c
      WHERE c.id = channel_id
        AND c.company_id = kernel.current_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kernel.chat_channels c
      WHERE c.id = channel_id
        AND c.company_id = kernel.current_company_id()
    )
  );
