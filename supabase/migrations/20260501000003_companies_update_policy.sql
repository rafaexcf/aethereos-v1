-- kernel.companies só tinha policy de SELECT — UPDATE em código de domínio
-- (TabMinhaEmpresa: logo_url, cnpj, name, etc.) era silenciosamente rejeitado
-- pelo RLS (0 rows affected, sem erro), parecendo persistir mas sem efeito.
--
-- Adiciona policy de UPDATE espelhando o critério de SELECT: o usuário só
-- pode atualizar a empresa cujo id é a sua company ativa atual.

create policy "companies: tenant can update own"
  on kernel.companies for update
  to authenticated
  using (id = kernel.current_company_id())
  with check (id = kernel.current_company_id());
