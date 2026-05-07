-- Rename "Gestor" → "Admin Console" no display.
--
-- DB id e slug permanecem 'gestor' para preservar referências em
-- kernel.app_permission_grants, kernel.company_modules e qualquer
-- outro lugar que use o id como chave estrangeira/lookup. Apenas
-- o name (e a description, para refletir o reposicionamento)
-- mudam — o usuário vê "Admin Console" no Magic Store / launcher.

UPDATE kernel.app_registry
SET name = 'Admin Console',
    description = 'Console administrativo: colaboradores, planos, integrações, segurança e auditoria.',
    long_description = 'Admin Console centraliza a operação interna da empresa. Colaboradores, departamentos, perfis de acesso, plano + cobrança, integrações, segurança, LGPD e auditoria — tudo sob um teto. Restrito a owner/admin.'
WHERE id = 'gestor';
