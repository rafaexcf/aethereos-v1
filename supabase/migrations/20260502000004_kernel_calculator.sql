-- kernel.calculator_history — Histórico de cálculos da Calculadora interna
-- RLS: user_id = auth.uid() AND company_id = kernel.current_company_id()

CREATE TABLE kernel.calculator_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID        NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  expression  TEXT        NOT NULL,
  result      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX calculator_history_user_idx
  ON kernel.calculator_history (user_id, company_id, created_at DESC);

ALTER TABLE kernel.calculator_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calc_history_user_isolation" ON kernel.calculator_history
  FOR ALL
  USING (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

COMMENT ON TABLE kernel.calculator_history IS
  'Histórico de cálculos da Calculadora interna. RLS garante isolamento por user+tenant.';
