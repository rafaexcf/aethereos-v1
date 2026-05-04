-- Sprint 22 MX121 — registra app "Demo SDK" no app_registry e instala
-- automaticamente em todas as companies de teste para facilitar QA.

INSERT INTO kernel.app_registry
  (id, slug, name, description, long_description, icon, color, category,
   app_type, entry_mode, entry_url, status, license, developer_name,
   show_in_dock, closeable, has_internal_nav, installable, offline_capable,
   tags, sort_order)
VALUES
  ('demo-iframe', 'demo-iframe', 'Demo SDK',
   'App de demonstracao do @aethereos/client',
   'Mini app iframe que usa o @aethereos/client SDK via App Bridge para chamar metodos reais do shell (auth, drive, people, notifications, settings, theme). Sirvo de smoke test do protocolo postMessage.',
   'Puzzle', '#06b6d4', 'utilities', 'native', 'iframe',
   '/demo-iframe-app/index.html', 'published',
   'BUSL-1.1 (Aethereos)', 'Aethereos',
   false, true, false, true, true,
   ARRAY['demo','sdk','bridge','iframe'], 700)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  long_description = EXCLUDED.long_description,
  entry_url = EXCLUDED.entry_url,
  updated_at = NOW();

-- Instala o demo em todas companies que ja tenham qualquer modulo
-- (Atalaia, Meridian, Solaris, Onbtest). Idempotente.
INSERT INTO kernel.company_modules (company_id, module)
SELECT DISTINCT cm.company_id, 'demo-iframe'
  FROM kernel.company_modules cm
 WHERE NOT EXISTS (
   SELECT 1 FROM kernel.company_modules
    WHERE company_id = cm.company_id AND module = 'demo-iframe'
 );
