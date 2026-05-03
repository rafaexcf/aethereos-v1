-- kernel.task_lists + kernel.tasks — Tarefas (Google Tasks-inspired)
-- Ref: Sprint, Fundamentação P4 (multi-tenant por RLS)

CREATE TABLE kernel.task_lists (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  color      TEXT        NOT NULL DEFAULT 'blue',
  position   INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX task_lists_user_company_idx
  ON kernel.task_lists (user_id, company_id, position);

ALTER TABLE kernel.task_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_lists_user_isolation" ON kernel.task_lists
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

-- ─── Tasks ────────────────────────────────────────────────────────────────────

CREATE TABLE kernel.tasks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id     UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  list_id        UUID        REFERENCES kernel.task_lists(id) ON DELETE SET NULL,
  parent_task_id UUID        REFERENCES kernel.tasks(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  description    TEXT        NOT NULL DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'completed')),
  priority       TEXT        NOT NULL DEFAULT 'medium'
                             CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date       DATE,
  due_time       TIME,
  reminder_at    TIMESTAMPTZ,
  position       INTEGER     NOT NULL DEFAULT 0,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tasks_user_company_idx
  ON kernel.tasks (user_id, company_id, status, position);

CREATE INDEX tasks_due_date_idx
  ON kernel.tasks (user_id, company_id, due_date)
  WHERE due_date IS NOT NULL;

CREATE INDEX tasks_list_idx
  ON kernel.tasks (list_id, position)
  WHERE list_id IS NOT NULL;

CREATE INDEX tasks_parent_idx
  ON kernel.tasks (parent_task_id)
  WHERE parent_task_id IS NOT NULL;

ALTER TABLE kernel.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_user_isolation" ON kernel.tasks
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = kernel.current_company_id()
    AND (
      list_id IS NULL
      OR EXISTS (
        SELECT 1 FROM kernel.task_lists tl
        WHERE tl.id = list_id AND tl.user_id = auth.uid()
      )
    )
  );

-- ─── Triggers ────────────────────────────────────────────────────────────────
-- kernel.set_updated_at() created in migration 20260502000001_kernel_notes.sql

CREATE TRIGGER task_lists_updated_at
  BEFORE UPDATE ON kernel.task_lists
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON kernel.tasks
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();

COMMENT ON TABLE kernel.task_lists IS
  'Listas de tarefas por usuário+tenant. RLS garante isolamento.';
COMMENT ON TABLE kernel.tasks IS
  'Tarefas e subtarefas. parent_task_id != NULL indica subtarefa. RLS + list ownership check.';
