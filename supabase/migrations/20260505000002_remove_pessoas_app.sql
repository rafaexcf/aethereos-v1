-- Sprint 26: remove a app "Pessoas" do catalogo. Tabela kernel.people e
-- scopes people.* permanecem (sao kernel infra usada por RH, Gestor, Kanban,
-- Reuniao, Enquetes, Agenda Telefonica, demo-iframe, Lixeira, Aether AI).

DELETE FROM kernel.app_permission_grants WHERE app_id = 'pessoas';
DELETE FROM kernel.company_modules WHERE module = 'pessoas';
DELETE FROM kernel.app_registry WHERE id = 'pessoas';
