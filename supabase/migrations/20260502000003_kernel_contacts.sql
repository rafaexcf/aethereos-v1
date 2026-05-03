-- kernel.contacts — Agenda Telefônica interna, inspirada no Google Contacts
-- RLS: user_id = auth.uid() AND company_id = kernel.current_company_id()

-- ─── Tabela principal ─────────────────────────────────────────────────────────

CREATE TABLE kernel.contacts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  first_name   TEXT        NOT NULL DEFAULT '',
  last_name    TEXT        NOT NULL DEFAULT '',
  display_name TEXT        NOT NULL DEFAULT '',
  company      TEXT        NOT NULL DEFAULT '',
  job_title    TEXT        NOT NULL DEFAULT '',
  notes        TEXT        NOT NULL DEFAULT '',
  birthday     DATE,
  avatar_url   TEXT,
  is_favorite  BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contacts_user_company_idx
  ON kernel.contacts (user_id, company_id, display_name);

CREATE INDEX contacts_favorite_idx
  ON kernel.contacts (user_id, company_id)
  WHERE is_favorite = true;

ALTER TABLE kernel.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_user_isolation" ON kernel.contacts
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

-- Trigger reusa kernel.set_updated_at() criada em 20260502000001_kernel_notes.sql
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON kernel.contacts
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── Métodos de contato (telefone, email, site, rede social) ─────────────────

CREATE TABLE kernel.contact_methods (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID        NOT NULL REFERENCES kernel.contacts(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('phone', 'email', 'website', 'social')),
  label       TEXT        NOT NULL DEFAULT 'pessoal',
  value       TEXT        NOT NULL CHECK (char_length(trim(value)) > 0),
  is_primary  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contact_methods_contact_idx
  ON kernel.contact_methods (contact_id);

CREATE INDEX contact_methods_user_type_idx
  ON kernel.contact_methods (user_id, type);

ALTER TABLE kernel.contact_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_methods_user_isolation" ON kernel.contact_methods
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM kernel.contacts c
      WHERE c.id = contact_id
        AND c.user_id = auth.uid()
        AND c.company_id = kernel.current_company_id()
    )
  );

-- ─── Endereços ───────────────────────────────────────────────────────────────

CREATE TABLE kernel.contact_addresses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID        NOT NULL REFERENCES kernel.contacts(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL DEFAULT 'casa',
  street      TEXT        NOT NULL DEFAULT '',
  number      TEXT        NOT NULL DEFAULT '',
  complement  TEXT        NOT NULL DEFAULT '',
  district    TEXT        NOT NULL DEFAULT '',
  city        TEXT        NOT NULL DEFAULT '',
  state       TEXT        NOT NULL DEFAULT '',
  country     TEXT        NOT NULL DEFAULT 'Brasil',
  postal_code TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contact_addresses_contact_idx
  ON kernel.contact_addresses (contact_id);

ALTER TABLE kernel.contact_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_addresses_user_isolation" ON kernel.contact_addresses
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM kernel.contacts c
      WHERE c.id = contact_id
        AND c.user_id = auth.uid()
        AND c.company_id = kernel.current_company_id()
    )
  );

-- ─── Grupos / etiquetas ──────────────────────────────────────────────────────

CREATE TABLE kernel.contact_groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  color       TEXT        NOT NULL DEFAULT 'blue',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, company_id, name)
);

ALTER TABLE kernel.contact_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_groups_user_isolation" ON kernel.contact_groups
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

-- ─── Links contato ↔ grupo ───────────────────────────────────────────────────

CREATE TABLE kernel.contact_group_links (
  contact_id UUID NOT NULL REFERENCES kernel.contacts(id) ON DELETE CASCADE,
  group_id   UUID NOT NULL REFERENCES kernel.contact_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_id, group_id)
);

CREATE INDEX contact_group_links_group_idx
  ON kernel.contact_group_links (group_id);

ALTER TABLE kernel.contact_group_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_group_links_user_isolation" ON kernel.contact_group_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM kernel.contacts c
      WHERE c.id = contact_id
        AND c.user_id = auth.uid()
        AND c.company_id = kernel.current_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kernel.contacts c
      WHERE c.id = contact_id
        AND c.user_id = auth.uid()
        AND c.company_id = kernel.current_company_id()
    )
  );

COMMENT ON TABLE kernel.contacts IS 'Agenda Telefônica por usuário/tenant. RLS garante isolamento.';
COMMENT ON TABLE kernel.contact_methods IS 'Telefones, emails, sites e redes sociais dos contatos.';
COMMENT ON TABLE kernel.contact_addresses IS 'Endereços dos contatos.';
COMMENT ON TABLE kernel.contact_groups IS 'Grupos/etiquetas para organização dos contatos.';
COMMENT ON TABLE kernel.contact_group_links IS 'Relação N:N entre contatos e grupos.';
