-- Sprint 23 MX124 — popula app_registry.permissions[] e auto-grants
-- para apps alwaysEnabled.

-- Apps system / alwaysEnabled
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','windows.manage']
  WHERE id = 'mesa';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','settings.read','windows.manage']
  WHERE id = 'magic-store';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','ai.chat','ai.embed','drive.read','people.read','notifications.send','scp.emit']
  WHERE id = 'ae-ai';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','settings.read','settings.write','theme.read']
  WHERE id = 'settings';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','notifications.send']
  WHERE id = 'notifications';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','drive.read','drive.write','drive.delete','people.read']
  WHERE id = 'lixeira';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read']
  WHERE id IN ('governanca','auditoria');

-- Apps de produtividade / utilitarios
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','drive.read','drive.write','drive.delete','notifications.send']
  WHERE id = 'drive';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','people.read','people.write','notifications.send']
  WHERE id = 'pessoas';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','chat.read','chat.write','notifications.send']
  WHERE id = 'chat';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','people.read','people.write']
  WHERE id = 'rh';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','theme.read']
  WHERE id = 'weather';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','people.read','notifications.send']
  WHERE id = 'gestor';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','notifications.send']
  WHERE id = 'calendar';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','drive.read']
  WHERE id = 'bloco-de-notas';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','notifications.send']
  WHERE id = 'tarefas';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','people.read']
  WHERE id = 'agenda-telefonica';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read']
  WHERE id IN ('calculadora','navegador');
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','notifications.send']
  WHERE id = 'relogio';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','drive.write']
  WHERE id IN ('camera','gravador-de-voz');
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','people.read']
  WHERE id = 'enquetes';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','drive.read','drive.write','people.read']
  WHERE id = 'kanban';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','drive.read','drive.write']
  WHERE id IN ('planilhas','documentos','apresentacoes','pdf');
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','scp.emit','scp.subscribe','notifications.send']
  WHERE id = 'automacoes';
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','people.read','chat.write','notifications.send']
  WHERE id = 'reuniao';

-- Demo iframe app — declara todos os scopes que demonstra na UI
UPDATE kernel.app_registry SET permissions =
  ARRAY['auth.read','drive.read','people.read','notifications.send','settings.read','theme.read']
  WHERE id = 'demo-iframe';

-- ─── Auto-grant para apps alwaysEnabled (R11) ─────────────────────────────
-- Para cada company que ja tem um modulo alwaysEnabled instalado (todas
-- via boot defaults), conceder todos os scopes declarados.
-- granted_by = primeiro user da company (heuristica).

INSERT INTO kernel.app_permission_grants (company_id, app_id, scope, granted_by)
SELECT DISTINCT
  cm.company_id,
  ar.id AS app_id,
  unnest(ar.permissions) AS scope,
  COALESCE(
    (SELECT u.id FROM kernel.users u
       WHERE u.id IN (
         SELECT user_id FROM kernel.tenant_memberships
          WHERE company_id = cm.company_id LIMIT 1)),
    (SELECT id FROM auth.users LIMIT 1)
  ) AS granted_by
FROM kernel.company_modules cm
JOIN kernel.app_registry ar ON ar.id = cm.module
WHERE ar.always_enabled = true
  AND array_length(ar.permissions, 1) IS NOT NULL
ON CONFLICT (company_id, app_id, scope) DO NOTHING;

-- Tambem conceder auth.read (BASE_SCOPE) para TODOS os apps ja instalados,
-- mesmo nao-alwaysEnabled. R14: scope base concedido automaticamente.
INSERT INTO kernel.app_permission_grants (company_id, app_id, scope, granted_by)
SELECT DISTINCT
  cm.company_id,
  cm.module,
  'auth.read',
  COALESCE(
    (SELECT u.id FROM kernel.users u
       WHERE u.id IN (
         SELECT user_id FROM kernel.tenant_memberships
          WHERE company_id = cm.company_id LIMIT 1)),
    (SELECT id FROM auth.users LIMIT 1)
  )
FROM kernel.company_modules cm
WHERE EXISTS (SELECT 1 FROM kernel.app_registry ar WHERE ar.id = cm.module)
ON CONFLICT (company_id, app_id, scope) DO NOTHING;

-- Backfill: para apps ja instalados, conceder TODOS os scopes nao-sensiveis
-- declarados em app_registry.permissions[]. Scopes sensiveis (drive.delete,
-- people.write, settings.write, scp.emit, ai.chat) ainda exigem consentimento.
-- Isso evita quebrar apps ja instalados ao introduzir o sistema de permissoes.
INSERT INTO kernel.app_permission_grants (company_id, app_id, scope, granted_by)
SELECT DISTINCT
  cm.company_id,
  cm.module,
  scope_id,
  COALESCE(
    (SELECT u.id FROM kernel.users u
       WHERE u.id IN (
         SELECT user_id FROM kernel.tenant_memberships
          WHERE company_id = cm.company_id LIMIT 1)),
    (SELECT id FROM auth.users LIMIT 1)
  )
FROM kernel.company_modules cm
JOIN kernel.app_registry ar ON ar.id = cm.module
CROSS JOIN LATERAL unnest(ar.permissions) AS scope_id
WHERE scope_id NOT IN (
  'drive.delete','people.write','settings.write','scp.emit','ai.chat'
)
ON CONFLICT (company_id, app_id, scope) DO NOTHING;
