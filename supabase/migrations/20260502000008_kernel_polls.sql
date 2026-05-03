-- kernel.polls — Enquetes criadas por usuários/tenant
-- kernel.poll_options — Opções de cada enquete
-- kernel.poll_votes — Votos registrados

-- ─── Polls ────────────────────────────────────────────────────────────────────

CREATE TABLE kernel.polls (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id               UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title                    TEXT        NOT NULL CHECK (char_length(trim(title)) >= 3),
  description              TEXT        NOT NULL DEFAULT '',
  visibility               TEXT        NOT NULL DEFAULT 'private'
                                       CHECK (visibility IN ('private', 'public')),
  status                   TEXT        NOT NULL DEFAULT 'draft'
                                       CHECK (status IN ('draft', 'active', 'closed')),
  allow_multiple_answers   BOOLEAN     NOT NULL DEFAULT false,
  show_results_before_close BOOLEAN    NOT NULL DEFAULT true,
  opens_at                 TIMESTAMPTZ,
  closes_at                TIMESTAMPTZ,
  public_slug              TEXT        UNIQUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX polls_user_company_idx ON kernel.polls (user_id, company_id, created_at DESC);
CREATE INDEX polls_company_public_idx ON kernel.polls (company_id, status) WHERE visibility = 'public';
CREATE INDEX polls_public_slug_idx ON kernel.polls (public_slug) WHERE public_slug IS NOT NULL;

ALTER TABLE kernel.polls ENABLE ROW LEVEL SECURITY;

-- Creator sees all own polls; others see non-draft public polls within company
CREATE POLICY "polls_read" ON kernel.polls FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      company_id = kernel.current_company_id()
      AND visibility = 'public'
      AND status <> 'draft'
    )
  );

CREATE POLICY "polls_insert" ON kernel.polls FOR INSERT
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE POLICY "polls_update" ON kernel.polls FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "polls_delete" ON kernel.polls FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER polls_updated_at
  BEFORE UPDATE ON kernel.polls
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── Poll options ─────────────────────────────────────────────────────────────

CREATE TABLE kernel.poll_options (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    UUID        NOT NULL REFERENCES kernel.polls(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL CHECK (char_length(trim(text)) >= 1),
  position   INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX poll_options_poll_idx ON kernel.poll_options (poll_id, position);

ALTER TABLE kernel.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll_options_read" ON kernel.poll_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM kernel.polls p
      WHERE p.id = poll_id
        AND (
          p.user_id = auth.uid()
          OR (p.company_id = kernel.current_company_id() AND p.visibility = 'public' AND p.status <> 'draft')
        )
    )
  );

CREATE POLICY "poll_options_write" ON kernel.poll_options FOR ALL
  USING (
    EXISTS (SELECT 1 FROM kernel.polls p WHERE p.id = poll_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM kernel.polls p WHERE p.id = poll_id AND p.user_id = auth.uid())
  );

CREATE TRIGGER poll_options_updated_at
  BEFORE UPDATE ON kernel.poll_options
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

-- ─── Poll votes ───────────────────────────────────────────────────────────────

CREATE TABLE kernel.poll_votes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       UUID        NOT NULL REFERENCES kernel.polls(id) ON DELETE CASCADE,
  option_id     UUID        NOT NULL REFERENCES kernel.poll_options(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_key TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent the same authenticated user from voting the same option twice
CREATE UNIQUE INDEX poll_votes_no_dup_auth
  ON kernel.poll_votes (poll_id, user_id, option_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX poll_votes_poll_idx ON kernel.poll_votes (poll_id, option_id);

ALTER TABLE kernel.poll_votes ENABLE ROW LEVEL SECURITY;

-- Read: own votes + votes on polls the user can read (for counting results)
CREATE POLICY "poll_votes_read" ON kernel.poll_votes FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM kernel.polls p
      WHERE p.id = poll_id AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM kernel.polls p
      WHERE p.id = poll_id
        AND p.company_id = kernel.current_company_id()
        AND p.visibility = 'public'
        AND p.status <> 'draft'
    )
  );

-- Insert: only on active polls within time range; option must belong to the poll
CREATE POLICY "poll_votes_insert" ON kernel.poll_votes FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() OR user_id IS NULL)
    AND EXISTS (
      SELECT 1 FROM kernel.polls p
      WHERE p.id = poll_id
        AND p.status = 'active'
        AND (p.opens_at IS NULL OR p.opens_at <= NOW())
        AND (p.closes_at IS NULL OR p.closes_at >= NOW())
    )
    AND EXISTS (
      SELECT 1 FROM kernel.poll_options po
      WHERE po.id = option_id AND po.poll_id = poll_id
    )
  );

-- Validation trigger: enforce option belongs to poll + poll is open
CREATE OR REPLACE FUNCTION kernel.validate_poll_vote()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM kernel.poll_options WHERE id = NEW.option_id AND poll_id = NEW.poll_id
  ) THEN
    RAISE EXCEPTION 'option_id does not belong to poll_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM kernel.polls
    WHERE id = NEW.poll_id
      AND status = 'active'
      AND (opens_at IS NULL OR opens_at <= NOW())
      AND (closes_at IS NULL OR closes_at >= NOW())
  ) THEN
    RAISE EXCEPTION 'poll is not open for voting';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER poll_votes_validate
  BEFORE INSERT ON kernel.poll_votes
  FOR EACH ROW EXECUTE FUNCTION kernel.validate_poll_vote();

COMMENT ON TABLE kernel.polls IS 'Enquetes internas. visibility=public expõe para membros da empresa.';
COMMENT ON TABLE kernel.poll_options IS 'Opções de resposta de cada enquete.';
COMMENT ON TABLE kernel.poll_votes IS 'Votos registrados. Trigger valida que option pertence ao poll e que poll está aberto.';
