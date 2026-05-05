# SPRINT 16 — Magic Store Real: Install/Uninstall Afeta Dock, Mesa e Shell

> **Objetivo:** Quando usuario instala ou desinstala um app na Magic Store, o app aparece/desaparece do Dock, Mesa e Apps Launcher. Apps alwaysEnabled (Mesa, Magic Store, Aether AI) sao imunes a desinstalacao.
> **NAO inclui:** SCP consumer, Policy Engine, Client SDK, staging deploy, verticais.
> **Estimativa:** 3-5 horas. Custo: $20-35.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar Sprint 15 documentado
3. git log --oneline -10 — confirmar HEAD
4. apps/shell-commercial/src/apps/registry.ts — APP_REGISTRY (33 apps hardcoded, campo alwaysEnabled)
5. apps/shell-commercial/src/apps/magic-store/MagicStoreApp.tsx — useInstalledModules hook (CRUD em kernel.company_modules)
6. apps/shell-commercial/src/stores/dockStore.ts — useDockStore (ordem do Dock)
7. apps/shell-commercial/src/stores/osStore.ts — useOSStore (openApp, tabs, etc)
8. apps/shell-commercial/src/components/Dock.tsx ou equivalente — como renderiza icones
9. apps/shell-commercial/src/components/AppsLauncher.tsx ou bU no bundle — modal de todos os apps
10. kernel.company_modules — tabela com (company_id, module, status) + RLS

### Estado atual

- Magic Store tem UI completa: catalogo, categorias, sidebar, hero banner, detail view, carrosel
- useInstalledModules() faz INSERT/DELETE em kernel.company_modules — funciona corretamente
- company_modules tem dados seed (comercio_digital, logitix, erp para cada company)
- PROBLEMA CENTRAL: instalar/desinstalar NAO afeta o que aparece no Dock, Mesa ou Apps Launcher
- APP_REGISTRY e hardcoded com 33 apps — todos aparecem sempre, independente de company_modules
- Dock filtra por showInDock mas NAO por installed
- Mesa mostra icones fixos de mesa_layouts — NAO filtra por installed
- Apps Launcher (modal com todos os apps) mostra todos os 33 — NAO filtra por installed

### Arquitetura da solucao

A ideia e criar um store reativo (Zustand) que:

1. No boot, carrega company_modules da company ativa
2. Expoe um Set reativo de module IDs instalados
3. Dock, Mesa, Apps Launcher e registry consultam esse Set para decidir visibilidade
4. Quando Magic Store faz install/uninstall, atualiza o Set (alem de gravar no banco)
5. Apps com alwaysEnabled: true no registry SEMPRE aparecem, independente do Set
6. Realtime subscription em company_modules para sincronizar entre abas/devices

Regra de visibilidade:

- App aparece se: alwaysEnabled === true OU module ID esta no Set de instalados
- App NAO aparece se: alwaysEnabled !== true E module ID NAO esta no Set
- Mesa mostra apenas icones de apps visiveis
- Dock mostra apenas apps visiveis que tem showInDock: true
- Apps Launcher mostra todos os apps visiveis

---

## MILESTONES

### MX78 — Store Zustand de modulos instalados (useInstalledModulesStore)

O que fazer:

1. Criar um store Zustand global em apps/shell-commercial/src/stores/installedModulesStore.ts:

   Estado:
   - installed: Set de string (module IDs ativos para a company)
   - isLoading: boolean
   - error: string ou null

   Acoes:
   - loadModules(drivers, companyId): carrega de kernel.company_modules WHERE company_id AND status=active
   - installModule(drivers, companyId, moduleId): INSERT + atualiza Set
   - uninstallModule(drivers, companyId, moduleId): DELETE + atualiza Set
   - subscribeRealtime(drivers, companyId): subscribe em INSERT/DELETE de company_modules, atualiza Set
   - reset(): limpa tudo (para troca de company)

2. O store deve ser inicializado no boot do desktop (junto com mesa_layouts, workspace_state, etc).

3. Expor hook derivado: useIsAppVisible(appId: string): boolean que retorna true se alwaysEnabled ou installed.has(appId).

4. NAO mexer no useInstalledModules() que ja existe dentro do MagicStoreApp.tsx — ele sera refatorado na MX80 para usar esse store global.

Criterio de aceite: Store compila, carrega modulos corretamente, hook useIsAppVisible funciona.

Commit: feat(shell): installedModulesStore — Zustand store for company_modules (MX78)

---

### MX79 — Dock e Apps Launcher filtram por visibilidade

O que fazer:

1. No componente Dock (Ore no bundle, provavelmente em src/components/Dock.tsx ou stores/dockStore.ts):
   - Filtrar a lista de apps renderizados: so mostrar apps onde useIsAppVisible(app.id) === true
   - Apps com alwaysEnabled: true sempre aparecem (Mesa, Magic Store, Aether AI)
   - O Dock deve reagir em tempo real quando o Set muda

2. No Apps Launcher (bU no bundle, provavelmente em src/components/AppsLauncher.tsx):
   - Filtrar a lista: so mostrar apps visiveis
   - OU: mostrar todos mas com visual diferenciado (instalados vs nao instalados, com botao instalar direto)
   - Decisao recomendada: mostrar apenas visiveis (consistente com Dock)

3. Se a Mesa (MesaApp) renderiza icones a partir de mesa_layouts (que referenciam appId), filtrar:
   - Icones de apps nao instalados ficam ocultos ou mostram estado disabled
   - Quando o app e instalado, o icone reaparece

4. Garantir que a busca global de apps (Search) tambem respeita visibilidade.

Criterio de aceite: Abrir o shell, Dock mostra apenas apps instalados + alwaysEnabled. Apps Launcher idem. Instalar um app na Magic Store faz ele aparecer no Dock imediatamente (sem reload).

Commit: feat(shell): Dock + AppsLauncher filter by installed modules (MX79)

---

### MX80 — Refatorar Magic Store para usar store global

O que fazer:

1. Refatorar MagicStoreApp.tsx para usar useInstalledModulesStore em vez do useInstalledModules() hook local:
   - installed: vem do store global
   - install(): chama store.installModule()
   - uninstall(): chama store.uninstallModule()
   - Remover o hook useInstalledModules() local (ou manter como wrapper fino sobre o store)

2. Garantir que o fluxo de install/uninstall:
   - Grava no banco (kernel.company_modules)
   - Atualiza o store global
   - Dock e Mesa reagem imediatamente
   - Emitir evento SCP: kernel.module.installed / kernel.module.uninstalled (via scp-publisher-browser)

3. O botao Abrir no Magic Store deve abrir o app como tab (via openApp do osStore), nao como window separada:
   - Verificar se handleOpen() usa openWindow ou openApp — deve usar openApp (tab)

Criterio de aceite: Instalar app na Magic Store -> aparece no Dock. Desinstalar -> desaparece. Sem reload. Eventos SCP emitidos.

Commit: feat(magic-store): use global installed modules store + SCP events (MX80)

---

### MX81 — Seed padrao de modulos para companies novas

O que fazer:

1. Quando uma company e criada (via create-company Edge Function ou onboarding), inserir modulos padrao em company_modules:
   - Apps kernel que sao utilitarios basicos: drive, pessoas, chat, settings, rh, calendar, tarefas, bloco-de-notas, calculadora, relogio
   - NAO inserir verticais (comercio_digital, logitix, erp) — esses sao instalados explicitamente via Magic Store

2. Atualizar o seed TS (tooling/seed/) para inserir esses modulos padrao para as companies de teste.

3. Garantir que companies existentes (meridian, atalaia, solaris) tenham os modulos kernel basicos alem dos verticais que ja tem.

4. Migration ou seed SQL para popular company_modules das companies existentes que nao tem os modulos kernel:
   - NAO fazer migration DDL — usar seed ou script one-time
   - Os modulos kernel basicos devem ser idempotentes (ON CONFLICT DO NOTHING)

Criterio de aceite: Nova company criada ja tem apps basicos instalados. Companies existentes mantem seus modulos + ganham os basicos.

Commit: feat(seed): default kernel modules for new companies (MX81)

---

### MX82 — Protecao contra desinstalacao de apps criticos

O que fazer:

1. Definir lista de apps que NAO podem ser desinstalados (protegidos):
   - mesa, magic-store, ae-ai, settings, notifications
   - Esses tem alwaysEnabled: true no registry

2. Na UI do Magic Store: nao mostrar botao Desinstalar para apps protegidos. Mostrar badge Incluido no OS ou similar.

3. No store: uninstallModule() deve rejeitar silenciosamente se moduleId esta na lista protegida.

4. No banco: a RLS ja permite DELETE, entao a protecao e no frontend. Em producao futura, adicionar CHECK constraint ou trigger — mas para MVP, frontend basta.

Criterio de aceite: Usuario nao consegue desinstalar Mesa, Magic Store, Aether AI, Settings, Notifications.

Commit: feat(magic-store): protect critical apps from uninstall (MX82)

---

### MX83 — Testes E2E + documentacao

O que fazer:

1. Adicionar ou atualizar teste E2E magic-store.spec.ts:
   - Teste: instalar um app e verificar que aparece no Dock
   - Teste: desinstalar um app e verificar que desaparece do Dock
   - Teste: app protegido (Magic Store) nao tem botao desinstalar

2. Rodar suite completa:
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

3. Resultado esperado: 32+ passed (os existentes + novos), 0 failed.

4. Atualizar SPRINT_LOG.md com Sprint 16.

5. Atualizar QUICK_START.md se fluxo de Magic Store mudou.

Criterio de aceite: Testes passam, documentacao atualizada.

Commit: docs: sprint 16 — Magic Store real (MX83)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem feat/fix/docs(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. Nova dep exige justificativa em commit.
R5. Bloqueios mantidos: sem next em shells, sem inngest, sem @clerk/\*, sem prisma.
R6. Antes de cada commit: pnpm typecheck && pnpm lint.
R7. Atualize SPRINT_LOG.md ao fim de cada milestone.
R8. Nao execute fora de ~/Projetos/aethereos. Nao escreva em ~/Projetos/aethereos-v2.
R9. Ao perceber contexto cheio: pare, escreva pickup point.
R10. NAO adicionar apps novos ao registry. O objetivo e tornar o registry existente dinamico.
R11. NAO quebrar os 32 E2E existentes.
R12. alwaysEnabled e o invariante de visibilidade. Se alwaysEnabled === true, o app aparece SEMPRE, independente de company_modules.

---

## TERMINO DO SPRINT

Quando MX83 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte o resultado (X passed, Y failed, Z skipped).

3. Pare aqui. Nao inicie Sprint 17.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 16 (Magic Store Real) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX78-MX83 nao concluida
5. Continue a partir dela

Lembrar:

- Objetivo: instalar/desinstalar na Magic Store afeta Dock, Mesa, Apps Launcher em tempo real.
- installedModulesStore (Zustand) e o store global reativo.
- useIsAppVisible(appId) e o hook que Dock/Mesa/Launcher consultam.
- alwaysEnabled === true e imune a desinstalacao.
- Realtime subscription em company_modules para sync multi-aba.
- 32 E2E existentes nao podem quebrar.

Roadmap em SPRINT_16_PROMPT.md na raiz.
