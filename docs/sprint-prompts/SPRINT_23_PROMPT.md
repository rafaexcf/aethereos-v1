# SPRINT 23 — Permissoes (Scopes) + Manifesto aethereos.app.json

> **Objetivo:** Apps declaram permissoes no manifesto. Ao instalar, usuario vê e aceita scopes sensiveis. AppBridgeHandler valida permissoes antes de executar cada request. Apps sem scope necessario recebem PERMISSION_DENIED.
> **NAO inclui:** Developer Console, monetizacao, admin review, staging deploy.
> **Estimativa:** 4-6 horas. Custo: $25-45.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar Sprint 22 documentado
3. git log --oneline -10 — confirmar HEAD
4. kernel.app_registry — tem coluna permissions TEXT[] (array de scopes declarados pelo app)
5. kernel.agent_capabilities — tabela existente para capabilities de agentes (referencia de design)
6. apps/shell-commercial/src/lib/app-bridge-handler.ts — AppBridgeHandler (sem validacao de permissoes)
7. packages/client/src/ — @aethereos/client SDK com modules (drive, people, chat, etc.)
8. apps/shell-commercial/src/apps/magic-store/MagicStoreApp.tsx — fluxo de install
9. apps/shell-commercial/src/stores/installedModulesStore.ts — installModule()

### Estado atual

- app_registry.permissions: TEXT[] — campo existe mas esta vazio para todos os apps nativos
- AppBridgeHandler executa QUALQUER metodo sem verificar permissoes
- Nao existe tabela de grants (quais scopes o usuario aceitou para cada app)
- Nao existe modal de consentimento ao instalar
- Nao existe spec de manifesto aethereos.app.json
- agent_capabilities existe como referencia (agent_id, capability, granted_by) — design similar

---

## MILESTONES

### MX123 — Definir scopes e migration kernel.app_permission_grants

O que fazer:

1. Definir catalogo de scopes em packages/scp-registry/src/permissions.ts (ou packages/client/src/scopes.ts):

   Scopes basicos:
   - auth.read — ler sessao e perfil do usuario
   - drive.read — listar e ler arquivos
   - drive.write — criar e editar arquivos
   - drive.delete — deletar arquivos
   - people.read — listar e ler pessoas/contatos
   - people.write — criar e editar pessoas
   - chat.read — listar canais e mensagens
   - chat.write — enviar mensagens e criar canais
   - notifications.send — enviar notificacoes
   - scp.emit — emitir eventos SCP
   - scp.subscribe — escutar eventos SCP
   - ai.chat — usar Copilot AI chat
   - ai.embed — gerar embeddings
   - settings.read — ler configuracoes
   - settings.write — alterar configuracoes
   - theme.read — ler tema atual
   - windows.manage — abrir/fechar janelas, enviar mensagens inter-app

   Scopes sensiveis (exigem consentimento explicito):
   - drive.delete
   - people.write
   - settings.write
   - scp.emit
   - ai.chat

   Exportar: SCOPE_CATALOG com label, description, sensitive: boolean para cada scope.

2. Criar migration para tabela kernel.app_permission_grants:

   CREATE TABLE kernel.app_permission_grants (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   company_id UUID NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
   app_id TEXT NOT NULL REFERENCES kernel.app_registry(id) ON DELETE CASCADE,
   scope TEXT NOT NULL,
   granted_by UUID NOT NULL REFERENCES kernel.users(id),
   granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
   UNIQUE (company_id, app_id, scope)
   );

   RLS: company-scoped via kernel.current_company_id()
   GRANT SELECT, INSERT, DELETE TO authenticated

3. Nao precisa de company_id na app_registry.permissions (scopes declarados sao globais). Grants sao per-company.

Criterio de aceite: SCOPE_CATALOG exportado, migration aplicada, tabela com RLS.

Commit: feat(permissions): scope catalog + kernel.app_permission_grants table (MX123)

---

### MX124 — Popular permissions nos apps nativos

O que fazer:

1. Atualizar app_registry para cada app nativo declarar seus scopes:

   UPDATE kernel.app_registry SET permissions = ARRAY['auth.read', 'drive.read', 'drive.write'] WHERE id = 'drive';
   UPDATE kernel.app_registry SET permissions = ARRAY['auth.read', 'people.read', 'people.write'] WHERE id = 'pessoas';
   UPDATE kernel.app_registry SET permissions = ARRAY['auth.read', 'chat.read', 'chat.write'] WHERE id = 'chat';
   UPDATE kernel.app_registry SET permissions = ARRAY['auth.read', 'settings.read', 'settings.write'] WHERE id = 'settings';
   UPDATE kernel.app_registry SET permissions = ARRAY['auth.read', 'ai.chat', 'ai.embed', 'drive.read', 'people.read'] WHERE id = 'ae-ai';
   UPDATE kernel.app_registry SET permissions = ARRAY['auth.read'] WHERE id = 'calculadora';
   -- etc. para cada app

2. Apps nativos com alwaysEnabled=true (mesa, magic-store, settings, notifications, ae-ai):
   - Auto-grant: ao instalar/boot, scopes sao concedidos automaticamente sem modal
   - INSERT em app_permission_grants para cada scope declarado

3. Migration ou seed para popular grants dos apps ja instalados.

Criterio de aceite: Cada app no banco tem permissions preenchido. Apps protegidos tem grants automaticos.

Commit: feat(permissions): populate permissions for all native apps (MX124)

---

### MX125 — Modal de consentimento ao instalar

O que fazer:

1. No fluxo de install da Magic Store (installedModulesStore.installModule ou MagicStoreApp):
   - Antes de INSERT em company_modules: verificar se app tem scopes sensiveis
   - Se tem: mostrar modal de consentimento com lista de permissoes
   - Cada scope mostra: icone, label, descricao, badge "Sensivel" se sensitive=true
   - Botoes: "Instalar e permitir" / "Cancelar"
   - Se usuario aceita: INSERT em company_modules + INSERT em app_permission_grants para cada scope
   - Se cancela: nao instala

2. Se app NAO tem scopes sensiveis: instala direto sem modal (comportamento atual).

3. Se app tem APENAS scopes nao-sensiveis (auth.read, theme.read): instala direto e auto-grant.

4. Design do modal:
   - Titulo: "Permissoes necessarias"
   - Subtitulo: "{appName} solicita acesso a:"
   - Lista de scopes com icones (Lock, Eye, Edit, Trash, etc.)
   - Scopes sensiveis destacados com badge amarelo
   - Footer: "Voce pode revogar permissoes a qualquer momento"

5. Criar componente PermissionConsentModal reutilizavel.

Criterio de aceite: Instalar app com scopes sensiveis mostra modal. Aceitar grava grants. Cancelar nao instala.

Commit: feat(magic-store): permission consent modal on install (MX125)

---

### MX126 — AppBridgeHandler valida permissoes

O que fazer:

1. No AppBridgeHandler, antes de executar cada metodo:
   - Mapear method para scope necessario:
     drive.list -> drive.read
     drive.read -> drive.read
     drive.write -> drive.write
     drive.delete -> drive.delete
     people.list -> people.read
     people.create -> people.write
     people.update -> people.write
     chat.listChannels -> chat.read
     chat.sendMessage -> chat.write
     notifications.send -> notifications.send
     scp.emit -> scp.emit
     ai.chat -> ai.chat
     ai.embed -> ai.embed
     settings.get -> settings.read
     settings.set -> settings.write
     auth.getSession -> auth.read
     auth.getUser -> auth.read
     theme.getTheme -> theme.read
     windows.\* -> windows.manage

   - Verificar se app tem grant para esse scope:
     SELECT 1 FROM kernel.app_permission_grants WHERE company_id AND app_id AND scope
   - Se NAO tem: retornar { success: false, error: { code: 'PERMISSION_DENIED', message: 'App nao tem permissao {scope}' } }
   - Se tem: executar normalmente

2. Cache de grants: carregar grants do app no handshake e manter em memoria. Nao fazer SELECT a cada request.

3. Para apps nativos (entry_mode=internal): nao validar permissoes (acesso direto a drivers, sem bridge).

4. Log: registrar tentativas negadas para auditoria futura.

Criterio de aceite: App iframe sem grant para drive.read recebe PERMISSION_DENIED ao chamar aeth.drive.list(). App com grant funciona normalmente.

Commit: feat(shell): AppBridgeHandler validates permissions per request (MX126)

---

### MX127 — Spec do manifesto aethereos.app.json

O que fazer:

1. Criar docs/MANIFEST_SPEC.md com especificacao:

   {
   "$schema": "https://aethereos.io/schemas/aethereos.app.schema.json",
   "id": "meu-app",
   "name": "Meu App",
   "version": "1.0.0",
   "description": "Descricao curta",
   "developer": {
   "name": "Empresa Dev",
   "website": "https://example.com",
   "email": "dev@example.com"
   },
   "type": "embedded_external",
   "category": "productivity",
   "entry": {
   "mode": "iframe",
   "url": "https://meu-app.example.com"
   },
   "icons": {
   "small": "/icons/app-64.png",
   "large": "/icons/app-512.png"
   },
   "permissions": [
   "auth.read",
   "drive.read",
   "drive.write",
   "notifications.send"
   ],
   "window": {
   "defaultWidth": 980,
   "defaultHeight": 720,
   "minWidth": 520,
   "minHeight": 420,
   "resizable": true,
   "maximizable": true
   },
   "pricing": {
   "model": "free"
   },
   "security": {
   "sandbox": true,
   "allowedOrigins": ["https://meu-app.example.com"]
   }
   }

2. Criar Zod schema para validacao do manifesto:
   packages/scp-registry/src/manifest.ts (ou packages/client/src/manifest.ts)
   AethereosManifestSchema = z.object({ ... })

3. O manifesto NAO e lido em runtime neste sprint — e apenas especificacao documentada. Leitura automatica e para quando houver Developer Console (futuro).

4. Atualizar demo-iframe-app com aethereos.app.json de exemplo.

Criterio de aceite: Spec documentada, Zod schema valida exemplos corretamente.

Commit: feat(manifest): aethereos.app.json spec + Zod validation schema (MX127)

---

### MX128 — UI de permissoes no detail view + revogacao

O que fazer:

1. No detail view do Magic Store (quando usuario clica num app instalado):
   - Mostrar secao "Permissoes" com lista de scopes granted
   - Cada scope mostra: label, descricao, badge sensivel
   - Botao "Revogar" ao lado de cada scope (exceto auth.read que e obrigatorio)
   - Revogar: DELETE de app_permission_grants + confirmar com modal simples

2. No app Configuracoes ou Governanca:
   - Secao "Permissoes de apps" — lista todos os apps instalados com seus grants
   - Permite revogar scopes individuais

3. Ao revogar scope sensivel: proximo request do app via bridge retorna PERMISSION_DENIED.

Criterio de aceite: Usuario pode ver e revogar permissoes de apps instalados.

Commit: feat(magic-store): permission detail view + revocation UI (MX128)

---

### MX129 — Testes + documentacao

O que fazer:

1. Testes unitarios:
   - SCOPE_CATALOG: todos os scopes tem label e description
   - Zod manifest schema: valida exemplo valido, rejeita invalido
   - AppBridgeHandler: request sem grant retorna PERMISSION_DENIED
   - AppBridgeHandler: request com grant executa normalmente

2. Rodar suite completa:
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

3. Resultado esperado: 33+ passed, 0 failed.

4. Atualizar SPRINT_LOG.md com Sprint 23.

5. Atualizar packages/client/README.md com secao de permissoes.

Criterio de aceite: Testes passam, docs atualizados.

Commit: docs: sprint 23 — permissions + manifest spec (MX129)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem feat/fix/docs(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. Nova dep exige justificativa em commit.
R5. Bloqueios mantidos: sem next em shells, sem inngest, sem @clerk/\*, sem prisma.
R6. Antes de cada commit: pnpm typecheck && pnpm lint.
R7. Nao execute fora de ~/Projetos/aethereos.
R8. Ao perceber contexto cheio: pare, escreva pickup point.
R9. NAO quebrar os 33+ E2E existentes.
R10. Apps nativos (entry_mode=internal) NAO passam pelo bridge — acesso direto a drivers, sem validacao de permissoes via bridge.
R11. Apps alwaysEnabled recebem auto-grant de todos os seus scopes declarados.
R12. Grants sao per-company (kernel.app_permission_grants tem company_id). Cada tenant controla seus grants.
R13. Cache de grants no bridge handler — nao fazer SELECT a cada request.
R14. auth.read e scope base que todo app recebe automaticamente.

---

## TERMINO DO SPRINT

Quando MX129 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte o resultado (X passed, Y failed, Z skipped).

3. Pare aqui. Nao inicie Sprint 24.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 23 (Permissoes + Manifesto) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX123-MX129 nao concluida
5. Continue a partir dela

Lembrar:

- SCOPE_CATALOG define 17 scopes (5 sensiveis)
- app_permission_grants armazena grants per-company per-app
- Modal de consentimento aparece ao instalar app com scopes sensiveis
- AppBridgeHandler valida scope antes de executar cada method
- Cache de grants no handshake (nao SELECT a cada request)
- Apps nativos (internal) nao passam pelo bridge
- Apps alwaysEnabled recebem auto-grant
- Manifesto aethereos.app.json e spec documentada + Zod schema
- 33+ E2E existentes nao podem quebrar

Roadmap em SPRINT_23_PROMPT.md na raiz.
