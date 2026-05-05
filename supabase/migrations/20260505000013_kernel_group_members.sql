-- kernel.group_members — Vinculo usuario <-> grupo (Sprint 26)

CREATE TABLE kernel.group_members (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  group_id    UUID         NOT NULL REFERENCES kernel.groups(id) ON DELETE CASCADE,
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX kernel_group_members_company_idx
  ON kernel.group_members (company_id);
CREATE INDEX kernel_group_members_group_idx
  ON kernel.group_members (group_id);
CREATE INDEX kernel_group_members_user_idx
  ON kernel.group_members (user_id);

ALTER TABLE kernel.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_members_rls" ON kernel.group_members
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.group_members IS
  'Membros de cada grupo. Junction table user_id <-> group_id, escopada por company_id (RLS).';
