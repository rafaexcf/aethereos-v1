-- Sprint 29 MX157: kernel.tasks — persistência real do app Tarefas.
-- Drop+recreate: schema antigo de 20260502000002 era user-scoped (com task_lists)
-- e não bate com o uso real planejado pra MX158. Tabela não tinha dados em prod.

DROP TABLE IF EXISTS kernel.tasks CASCADE;
DROP TABLE IF EXISTS kernel.task_lists CASCADE;

CREATE TABLE kernel.tasks (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  title        TEXT         NOT NULL,
  description  TEXT         NOT NULL DEFAULT '',
  status       TEXT         NOT NULL DEFAULT 'todo'
                                CHECK (status IN ('todo','in_progress','done','cancelled')),
  priority     TEXT         NOT NULL DEFAULT 'medium'
                                CHECK (priority IN ('low','medium','high','urgent')),
  due_date     DATE,
  assigned_to  UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by   UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX kernel_tasks_company_status_idx
  ON kernel.tasks (company_id, status, sort_order);
CREATE INDEX kernel_tasks_company_assignee_idx
  ON kernel.tasks (company_id, assigned_to)
  WHERE assigned_to IS NOT NULL;

ALTER TABLE kernel.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_rls" ON kernel.tasks
  FOR ALL
  USING  (company_id = kernel.current_company_id())
  WITH CHECK (company_id = kernel.current_company_id());

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON kernel.tasks
  FOR EACH ROW EXECUTE FUNCTION kernel.touch_updated_at();

COMMENT ON TABLE kernel.tasks IS
  'Tarefas do app Tarefas. Multi-tenant via RLS company_id.';
