-- Bug #10 (Sprint 9.6 MX33): authenticated role sem GRANT em tabelas kernel
-- Sprint 9.5 fixou service_role mas o comentário "authenticated já tem grants" estava ERRADO.
-- Verificação via has_table_privilege() mostrou que 14 de 20 tabelas kernel não tinham GRANT.
-- Sem GRANT, o Postgres retorna "permission denied" antes de avaliar o RLS.
-- O RLS garante isolamento; o GRANT é pré-requisito para o RLS ser avaliado.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kernel TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA kernel TO authenticated;

-- Futuras tabelas criadas no schema kernel também recebem grants automaticamente.
ALTER DEFAULT PRIVILEGES IN SCHEMA kernel
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA kernel
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
