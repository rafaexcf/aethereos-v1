-- MX52 fix: unique partial index em employees(company_id, user_id)
-- Um user_id só pode existir uma vez por empresa (V2 CLAUDE.md invariante).
-- Partial: apenas quando user_id IS NOT NULL (employees sem user podem existir N vezes).

create unique index kernel_employees_unique_user_per_company
  on kernel.employees (company_id, user_id)
  where user_id is not null;
