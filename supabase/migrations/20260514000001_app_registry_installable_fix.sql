-- HOTFIX — Corrige installable=false em apps internos do OS que deveriam
-- estar disponíveis para instalação na Magic Store.
--
-- Bug originalmente em 20260504000006_seed_app_registry.sql: 5 apps
-- (governanca, auditoria, camera, lixeira, reuniao) foram seedados com
-- installable=false, mesmo NÃO sendo always_enabled. O Magic Store
-- esconde o botão "Instalar" para apps com installable=false e mostra
-- apenas o botão desabilitado "Instale para abrir".
--
-- Esses apps existem no frontend registry sem requiresAdmin, então
-- devem aparecer na Magic Store como instaláveis para qualquer
-- colaborador da company.
--
-- Apps protegidos (mesa, magic-store, ae-ai, settings, notifications)
-- continuam com installable=false porque always_enabled=true os marca
-- como "Incluído no OS" — sem botão de install.

UPDATE kernel.app_registry
SET installable = TRUE
WHERE id IN ('governanca', 'auditoria', 'camera', 'lixeira', 'reuniao')
  AND always_enabled = FALSE;
