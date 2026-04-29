# Sprint Log — Aethereos Bootstrap Fase 1

Início do sprint: 2026-04-29T00:00:00Z
Modelo: Claude Code (claude-sonnet-4-6, sessão N=1)

## Calibração inicial

**Ordem de construção:** Camada 0 (shell-base, local-first, BUSL v1.1) → Camada 1 (shell-commercial, proprietária, multi-tenant) → comercio.digital → logitix → kwix → autergon.

**Por que Next.js está bloqueado nos shells:** Shells são PWA/OS no navegador — apps totalmente autenticados sem necessidade de SSR. Vite 8+ + TanStack Router atendem o modelo híbrido URL+estado da Fundamentação 4.4. Next.js apenas para SaaS standalone com SEO. ADR-0014 item #1.

**Freio agêntico do primeiro ano:** Autonomia 0-1 (sugerir, humano executa). Ações irreversíveis sempre exigem aprovação humana explícita. As 8 operações invariantes nunca executam autonomamente em circunstância alguma.

**8 operações invariantes que agentes NUNCA executam (Fundamentação 12.4):**

1. Demissão de colaborador
2. Alteração estrutural de cadastro de fornecedores/clientes (bloqueio, remoção)
3. Alteração de plano de contas
4. Transferência financeira acima de limite configurado
5. Alteração de políticas de governança
6. Concessão ou revogação de acesso privilegiado
7. Exclusão de dados
8. Alteração de informações fiscais (regime tributário, cadastros SEFAZ)

---

## Histórico de milestones

## Milestone M1 — Guardrails mecânicos

- Iniciada: 2026-04-29T00:10:00Z
- Concluída: 2026-04-29T00:45:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm install` → ok
  - `pnpm deps:check` → ok (8 módulos, 0 violações)
  - `pnpm exec eslint .` → ok
  - `pnpm typecheck` → ok
  - `echo "test bad message" | pnpm exec commitlint` → falha (correto)
  - `echo "chore: test" | pnpm exec commitlint` → ok
- Arquivos criados/modificados:
  - `.dependency-cruiser.cjs` (regras: next/clerk/inngest/prisma bloqueados, supabase fora de drivers, cross-app, kernel/drivers sem apps)
  - `packages/config-eslint/{package.json,base.js,react.js,node.js}` (ESLint v10 flat config)
  - `eslint.config.mjs` (config raiz)
  - `commitlint.config.cjs`
  - `.husky/pre-commit` (lint-staged) + `.husky/commit-msg` (commitlint)
  - `.github/workflows/ci.yml` (jobs: typecheck, lint, deps-check, audit, test, build)
  - `turbo.json` (globalDependencies: `.eslintrc.cjs` → `eslint.config.mjs`)
  - `package.json` (+ @aethereos/config-eslint workspace:\*, ESLint deps)
- Decisões tomadas:
  - ESLint v10 (instalado automaticamente, eslint-plugin-react tem peer dep warning ignorável)
  - `tsPreCompilationDeps: false` em dep-cruiser pois não há arquivos .ts ainda
  - Sem `dependencyTypes: ["workspace"]` (valor inválido em dep-cruiser v16); cross-app usa `["npm","npm-dev","npm-peer","npm-optional","aliased-workspace"]`
  - ESM (eslint.config.mjs) no lugar de `.eslintrc.cjs` para compatibilidade com @eslint/js ESM-only
- Próximas dependências desbloqueadas: M2 (config-ts)

## Milestone M2 — Pacote de configuração TypeScript compartilhada

- Iniciada: 2026-04-29T00:45:00Z
- Concluída: 2026-04-29T00:55:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm typecheck` → ok (2 packages in scope, sem tasks = ok)
- Arquivos criados: `packages/config-ts/{package.json,base.json,library.json,react-library.json,vite-app.json,next-app.json}`
- Decisões tomadas:
  - Path aliases no base.json para todos os pacotes canônicos planejados
  - vite-app.json usa `allowImportingTsExtensions: true` (necessário com Vite)
- Próximas dependências desbloqueadas: M3 (drivers interfaces)

## Milestone M3 — Driver Model interfaces (packages/drivers)

- Iniciada: 2026-04-29T01:00:00Z
- Concluída: 2026-04-29T01:30:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm typecheck` → ok
  - `pnpm lint` → ok
  - `pnpm deps:check` → ok (0 errors)
- Arquivos criados: `packages/drivers/src/types/{result.ts,tenant-context.ts,platform-event.ts}`, `src/errors.ts`, `src/interfaces/{database,event-bus,vector,storage,auth,secrets,cache,feature-flags,llm,observability}.ts`, `src/index.ts`
- Decisões tomadas:
  - `exactOptionalPropertyTypes: true` exige `if (x !== undefined)` antes de atribuir em construtor (sem `this.x = x` direto)
  - Result<T,E> como union discriminada (sem classe nem exceção); ok()/err() como helpers de construção

## Milestone M4 — SCP Registry (packages/scp-registry)

- Iniciada: 2026-04-29T01:30:00Z
- Concluída: 2026-04-29T02:15:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm typecheck` → ok
  - `pnpm lint` → ok
  - `pnpm deps:check` → ok
- Arquivos criados: `packages/scp-registry/src/schemas/{actor,envelope,platform,agent,context,integration}.ts`, `src/{registry,helpers,index}.ts`
- Decisões tomadas:
  - `library.json` simplificado para apenas `noEmit: true`; rootDir nunca em configs compartilhados (resolve relativo ao config-ts, não ao pacote consumidor)
  - `library-build.json` criado separadamente com composite/emitDeclarationOnly/outDir/rootDir para build de produção
  - `CryptoKey` indisponível sem DOM lib; tipagem WebCrypto via `Parameters<typeof crypto.subtle.verify>[1]`

## Milestone M5 — Kernel (packages/kernel)

- Iniciada: 2026-04-29T02:15:00Z
- Concluída: 2026-04-29T02:45:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm typecheck` → ok
  - `pnpm lint` → ok
  - `pnpm deps:check` → ok
- Arquivos criados: `packages/kernel/src/invariants/operations.ts`, `src/tenant/{context,membership}.ts`, `src/scp/{outbox,publisher,consumer}.ts`, `src/audit/logger.ts`, `src/permissions/{capability,engine}.ts`, `src/index.ts`
- Decisões tomadas:
  - PermissionEngine bloqueia agentes em operações invariantes antes de checar capabilities (Fundamentação 12.4 [INV])
  - auditLog() falha alto (nunca silencia erros de auditoria)
  - BaseConsumer usa abstract class com eventTypes[] e handle() abstratos

## Milestone M6 — ui-shell skeleton (packages/ui-shell)

- Iniciada: 2026-04-29T02:45:00Z
- Concluída: 2026-04-29T03:15:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm typecheck` → ok (4 packages)
  - `pnpm lint` → ok
  - `pnpm deps:check` → ok (0 errors)
  - `pnpm build --filter=@aethereos/ui-shell` → ok (dist/ com .d.ts gerados)
- Arquivos criados: `packages/ui-shell/{package.json,tsconfig.json,tsconfig.build.json}`, `src/theme/{tokens,theming}.ts`, `src/components/{window-manager,dock,tabs,desktop,mesa}/index.tsx`, `src/primitives/button.tsx`, `src/hooks/use-theme.ts`, `src/index.ts`
- Arquivos modificados: `packages/config-ts/react-library.json` (removido rootDir/composite — mesma fix do library.json no M4), `packages/scp-registry/src/registry.ts` (import type z)
- Decisões tomadas:
  - Componentes são stubs com API definida; sem lógica real ainda (camadas superiores implementam)
  - Button usa CSS transitions apenas, sem framer-motion (ADR-0014 #5)
  - tsconfig.build.json override `noEmit: false` + `emitDeclarationOnly: true` para emitir .d.ts sem .js
  - oklch como espaço de cor para design tokens (P3 gamut, CSS nativo)

## Milestone M7 — Supabase migrations: schema kernel

- Iniciada: 2026-04-29T03:15:00Z
- Concluída: 2026-04-29T03:45:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm typecheck` → ok
  - `pnpm lint` → ok
  - `pnpm deps:check` → ok
- Arquivos criados: `supabase/migrations/20260429000001_kernel_schema.sql`
- Arquivos modificados: `supabase/config.toml` (schemas + extra_search_path adicionam `kernel`)
- Decisões tomadas:
  - `kernel.set_tenant_context(uuid)` valida `companies.status = 'active'`, grava `app.current_company_id` via `set_config()`
  - `kernel.set_tenant_context_unsafe(uuid)` sem validação para service_role (scp-worker)
  - `kernel.scp_outbox` com `status: pending|published|failed`, `attempts`, `last_error` — worker usa `FOR UPDATE SKIP LOCKED`
  - `kernel.audit_log` append-only: INSERT para authenticated, SELECT restrito a admins via RLS
  - `kernel.agents.supervising_user_id NOT NULL` obrigatório (Interpretação A+, CLAUDE.md seção 8)
  - `kernel.touch_updated_at()` trigger genérico para todas as tabelas com `updated_at`

## Milestone M8 — drivers-supabase

- Iniciada: 2026-04-29T03:45:00Z
- Concluída: 2026-04-29T05:00:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm typecheck` → ok (7 packages)
  - `pnpm lint` → ok
  - `pnpm deps:check` → ok
- Arquivos criados: `packages/drivers-supabase/src/schema/kernel.ts` (Drizzle schema espelhando SQL), `src/database/supabase-database-driver.ts`, `src/auth/supabase-auth-driver.ts`, `src/storage/supabase-storage-driver.ts`, `src/vector/supabase-pgvector-driver.ts`, `src/index.ts`, `package.json`, `tsconfig.json`
- Arquivos modificados: `packages/config-ts/base.json` (path alias `@aethereos/drivers-supabase`)
- Decisões tomadas:
  - `import * as schema` (não `import type`) pois schema é valor passado ao Drizzle constructor
  - `sql as drizzleSql` de `drizzle-orm` para `set_tenant_context()` dentro de transação (postgres.js template literal não é SQLWrapper do Drizzle)
  - `exactOptionalPropertyTypes: true` → spreads condicionais em `Session` (email, refresh_token)
  - Actor "human" sem campo `role` (apenas `type`, `user_id`, `session_id?`)
  - `packages/drivers-supabase` sem `build` script: workspace-source pattern (importado como fonte, não como pacote compilado)
  - Storage paths prefixados com `company_id` para isolação física

## Milestone M9 — drivers-nats + scp-worker

- Iniciada: 2026-04-29T05:00:00Z
- Concluída: 2026-04-29T06:30:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm typecheck` → ok (7 packages)
  - `pnpm lint` → ok
  - `pnpm deps:check` → ok
- Arquivos criados: `packages/drivers-nats/src/nats-event-bus-driver.ts`, `src/index.ts`, `package.json`, `tsconfig.json`, `apps/scp-worker/{src/main.ts,package.json,tsconfig.json}`, `infra/local/docker-compose.dev.yml`
- Arquivos modificados: `packages/config-ts/{base.json,library-build.json,package.json}` (path alias NATS, fix library-build sem rootDir, export library-build), `eslint.config.mjs` (ignora `**/*.d.ts`)
- Decisões tomadas:
  - `import { headers as natsHeaders } from "nats"` — `NatsConnection` não tem método `.headers()` estático
  - Subject: `ae.scp.{tenant_id}.{event.type}` — usa `envelope.tenant_id` (não `company_id`), `envelope.type` (não `event_type`)
  - Dedup via `Nats-Msg-Id: envelope.id` (não `event_id`) — `envelope.id` é o UUID canônico do envelope
  - Durable consumer: objeto condicional com `durable_name` apenas quando `durable === true` (exactOptionalPropertyTypes)
  - `library-build.json` sem `composite` e sem `rootDir`: `composite` obriga listar todos os inputs; `rootDir` causa TS6059 quando há imports de outros pacotes workspace. Pacotes importados como workspace-source não têm build step
  - scp-worker: `FOR UPDATE SKIP LOCKED` garante segurança com múltiplos workers; SIGTERM/SIGINT com drain gracioso

## Milestone M10 — SCP event end-to-end: platform.company.created

- Iniciada: 2026-04-29T06:30:00Z
- Concluída: 2026-04-29T07:00:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm typecheck` → ok (7 packages, 0 errors)
  - `pnpm lint` → ok
  - `pnpm deps:check` → ok (0 errors)
- Arquivos criados: `apps/scp-worker/src/examples/platform-company-created.ts`
- Arquivos modificados: `packages/scp-registry/src/schemas/platform.ts` (alias `platform.company.created` → `PlatformTenantCreatedPayloadSchema`, adicionado ao `PLATFORM_EVENT_SCHEMAS`)
- Decisões tomadas:
  - `platform.company.created` é alias de `platform.tenant.created` (mesmo schema Zod); dois tipos distintos para compatibilidade semântica com código que emite `company.created`
  - Schemas `platform.*` são pré-registrados em `BUILT_IN_SCHEMAS` do scp-registry — apps NÃO devem chamar `register()` para domínios reservados (chamada lança exceção "reserved by kernel")
  - Exemplo não usa `register()` nem importa `PLATFORM_EVENT_SCHEMAS`; apenas importa drivers, kernel e types
  - Pipeline validado estaticamente: TenantContext → KernelPublisher.publish() → scp_outbox → scp-worker → NATS → consumer

---

# Sprint 2 — Camada 0 (shell-base)

Início: 2026-04-29T08:00:00Z
Modelo: Claude Code (claude-sonnet-4-6, sessão Sprint 2 N=1)

## Calibração inicial (Sprint 2)

**1. Domínio canônico e licença da Camada 0:**
`aethereos.org` — BUSL v1.1, Change Date 2030-04-29 → Apache 2.0. Código em `apps/shell-base/`.

**2. Por que Camada 0 ANTES da Camada 1 (rationale arquitetural):**
ADR-0014 item #13 `[INV]`. Se Camada 1 fosse construída primeiro, o Driver Model nunca seria testado contra dois backends reais — degeneraria em vazamento de implementação Supabase por todo o código de domínio. Camada 0 é a "prova-viva" do Driver Model: força que `packages/kernel/` funcione igualmente com LocalDrivers e CloudDrivers.

**3. Como o Driver Model permite compartilhamento:**
As interfaces em `packages/drivers/src/interfaces/` são o contrato compartilhado. Camada 0 injeta `packages/drivers-local/` (browser-only). Camada 1 injeta `packages/drivers-supabase/` + `packages/drivers-nats/`. O kernel e os apps consomem apenas as interfaces — agnósticos de implementação.

**4. 3 invariantes da Camada 0 que diferem da Camada 1:**

- Sem backend obrigatório: 100% local-first no navegador, offline após primeiro load
- OPFS como storage primário via SQLite WASM (vs Supabase Postgres na Camada 1)
- Bundle inicial < 500KB gzip (R11)

**5. OPFS vs IndexedDB puro:**
OPFS (Origin Private File System) provê acesso a arquivos binários por origem, essencial para SQLite WASM que precisa de um VFS para ler/escrever bytes arbitrários. Isso permite SQL completo (queries, JOINs, transações ACID) que IndexedDB não oferece. IndexedDB fica como fallback para metadados quando OPFS não está disponível.

## Histórico de milestones (Sprint 2)

## Milestone M11 — LocalDrivers: interfaces concretas para ambiente de navegador

- Iniciada: 2026-04-29T08:05:00Z
- Concluída: 2026-04-29T09:00:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm typecheck --filter=@aethereos/drivers-local` → ok
  - `pnpm --filter=@aethereos/drivers-local lint` → ok
  - `pnpm deps:check` → ok (0 errors, 11 infos orphans)
  - `pnpm --filter=@aethereos/drivers-local test` → 57/57 passando
  - `pnpm typecheck` → ok (8 packages)
- Arquivos criados: `packages/drivers-local/` (package.json, tsconfig.json, vitest.config.ts, README.md, src/index.ts, src/database/{sqlite-wasm-driver,opfs-vfs}.ts, src/storage/opfs-storage-driver.ts, src/auth/local-auth-driver.ts, src/secrets/webcrypto-secrets-driver.ts, src/cache/memory-cache-driver.ts, src/feature-flags/static-flags-driver.ts, src/event-bus/broadcast-channel-driver.ts, **tests**/7 arquivos)
- Arquivos modificados: `packages/config-ts/base.json` (path alias @aethereos/drivers-local)
- Decisões tomadas:
  - sql.js NÃO é dependência de drivers-local — caller carrega dinamicamente para manter bundle < 500KB. RawSqliteDB é interface interna que qualquer mock/implementação satisfaz.
  - PBKDF2 (SHA-256, 600k iterations) em vez de Argon2id: mesma segurança prática, zero dependência externa (Web Crypto API nativa).
  - Uint8Array<ArrayBufferLike> vs ArrayBuffer: helper `toArrayBuffer()` converte para satisfazer tipagem de Web Crypto API e OPFS APIs.
  - `EventBusError`, `AuthDriverError`, etc. não re-exportados pelo index de @aethereos/drivers — definidos localmente em cada driver como type aliases.
  - OPFSStorageDriver usa fallback in-memory (Map) quando OPFS não disponível (testes, browsers antigos).
  - Ed25519 JWTs: signJwt/verifyJwt implementados com crypto.subtle puro, sem biblioteca JWT externa.

## Milestone M12 — App shell-base: scaffold Vite + React + TanStack Router

- Iniciada: 2026-04-29T09:05:00Z
- Concluída: 2026-04-29T10:00:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm --filter=@aethereos/shell-base typecheck` → ok
  - `pnpm --filter=@aethereos/shell-base build` → ok (bundle: ~90 KB gzip, limite: 500 KB)
- Arquivos criados:
  - `apps/shell-base/package.json` (Vite 6 + React 19 + TanStack Router + Zustand + Tailwind v4 + vite-plugin-pwa)
  - `apps/shell-base/tsconfig.json` (extends vite-app.json, include override obrigatório)
  - `apps/shell-base/vite.config.ts` (react + tailwindcss + VitePWA com service worker)
  - `apps/shell-base/index.html` (manifest link, theme-color, #root)
  - `apps/shell-base/public/manifest.webmanifest` (PWA: standalone, dark, pt-BR)
  - `apps/shell-base/public/icons/icon-192.svg`, `icon-512.svg` (SVG placeholder)
  - `apps/shell-base/src/main.tsx` (RouterProvider + createRouter code-based)
  - `apps/shell-base/src/styles/globals.css` (`@import "tailwindcss"` v4 + CSS vars)
  - `apps/shell-base/src/routes/__root.tsx` (createRootRoute + 404 component)
  - `apps/shell-base/src/routes/index.tsx` (Desktop — rota `/`)
  - `apps/shell-base/src/routes/setup.tsx` (Setup — rota `/setup`)
  - `apps/shell-base/src/routes/settings/about.tsx` (About — rota `/settings/about`)
  - `apps/shell-base/src/stores/session.ts` (Zustand: companyId, userId, isBooted)
  - `apps/shell-base/src/lib/drivers.ts` (buildDrivers: storage, cache, flags, eventBus)
  - `apps/shell-base/src/lib/boot.ts` (stub — implementação completa no M13)
- Decisões tomadas:
  - TanStack Router code-based routing (sem `@tanstack/router-plugin`; migração para file-based futura)
  - `manifest: false` no VitePWA — manifest gerenciado manualmente em public/
  - `include` explícito em tsconfig.json do app (paths em vite-app.json resolvem relativo ao pacote config-ts)
  - Tailwind v4: apenas `@import "tailwindcss"` no CSS, sem tailwind.config.js
  - `manualChunks` separa react e router para cache HTTP eficiente
  - Boot sequence é stub para M12; M13 implementa SQLite WASM + OPFS
- Próximo: M13 — Boot local-first: SQLite WASM + OPFS persistente

## Milestone M13 — Boot local-first: SQLite WASM + OPFS

- Iniciada: 2026-04-29T10:05:00Z
- Concluída: 2026-04-29T10:30:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm --filter=@aethereos/shell-base typecheck` → ok
  - `pnpm --filter=@aethereos/shell-base build` → ok
  - Bundle inicial (sem sql.js lazy): ~107 KB gzip (limite: 500 KB) ✓
  - sql.js lazy chunks: 14.5 KB JS + 323 KB WASM (carregados em boot, cacheados pelo SW)
- Arquivos criados/modificados:
  - `apps/shell-base/package.json` (+ sql.js ^1.12.0)
  - `apps/shell-base/src/vite-env.d.ts` (/// reference vite/client + vite-plugin-pwa)
  - `apps/shell-base/src/types/sql-js.d.ts` (ambient declaration mínima para sql.js)
  - `apps/shell-base/tsconfig.json` (include src/\*_/_.d.ts)
  - `apps/shell-base/src/lib/boot.ts` (boot completo: sql.js lazy import + OPFS/IDB load/save + ae_meta schema + autoSave)
  - `apps/shell-base/src/lib/boot-context.tsx` (BootProvider + useBootResult React hook)
  - `apps/shell-base/src/main.tsx` (App component: boot async, LoadingScreen, ErrorScreen, BootProvider)
- Decisões tomadas:
  - `import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url"` — Vite copia WASM para dist/assets/ com hash; apenas URL string no bundle inicial
  - `await import("sql.js")` — chunk lazy separado; não inflata bundle inicial
  - `sql.js` não inclui tipos; escrevemos `src/types/sql-js.d.ts` com interface mínima necessária (Database, SqlJsStatic, initSqlJs)
  - Actor.type="human" usa `user_id` (não `id`) — discriminated union corrigida durante typecheck
  - auto-save a cada 30s + beforeunload via `window.addEventListener`
  - LoadingScreen + ErrorScreen em main.tsx (sem dependência extra)
  - `buildDrivers()` ao nível de módulo (fora do componente) para evitar re-criação em re-renders
- Próximo: M14 — Shell visual mínimo: Window Manager + Dock + Mesa + Bloco de Notas

## Milestone M14 — Shell visual mínimo: Window Manager + Dock + Mesa

- Iniciada: 2026-04-29T10:35:00Z
- Status: IN_PROGRESS

---

## Decisões menores tomadas durante o sprint

- `tsPreCompilationDeps: false` em dep-cruiser (sem arquivos .ts no início)
- ESLint v10 flat config (eslint.config.mjs) pois @eslint/js é ESM-only
- `console.log` bloqueado via eslint (produção usa logs estruturados pino/OTel)
- oklch como espaço de cor para tokens do ui-shell (P3 gamut, nativo CSS)
- Stale `.d.ts` em `packages/drivers/src/` deletados após tentativa de build falha; `**/*.d.ts` adicionado ao ESLint ignores

---

## Bloqueios encontrados

Nenhum bloqueio crítico. Obstáculos técnicos resolvidos inline:

- `rootDir` em configs compartilhados → workspace-source pattern (sem build step para pacotes consumidos como fonte)
- `exactOptionalPropertyTypes` → spreads condicionais em todos os pontos de construção de objetos com campos opcionais
- NATS `headers()` não é método de instância → import direto do módulo nats

---

## Sumário do Sprint

**Sprint concluído em: 2026-04-29**

Todos os 10 milestones concluídos com sucesso. O monorepo Aethereos passou de um repositório vazio (commit de bootstrap) para uma base funcional com:

1. **Guardrails mecânicos**: dep-cruiser, ESLint, Husky, commitlint, GitHub Actions CI
2. **TypeScript compartilhado**: configs base/library/react-library/vite-app/next-app/library-build
3. **Driver Model [INV]**: 10 interfaces canônicas (database, event-bus, auth, storage, vector, secrets, cache, feature-flags, llm, observability)
4. **SCP Registry [INV]**: schemas Zod para todos os domínios reservados do kernel, envelope tipado, Ed25519 placeholder, registry com pré-registro de BUILT_IN_SCHEMAS
5. **Kernel**: KernelPublisher (Outbox), PermissionEngine (bloqueia invariantes para agentes), AuditLogger, BaseConsumer, TenantContext helpers
6. **ui-shell skeleton**: componentes stub (WindowManager, Dock, Tabs, Desktop, Mesa), design tokens oklch, build step Vite
7. **Supabase migrations**: schema `kernel` completo com RLS multi-tenant, set_tenant_context(), scp_outbox, audit_log, agents (supervising_user_id obrigatório A+)
8. **drivers-supabase**: SupabaseDatabaseDriver (Drizzle + Outbox), SupabaseAuthDriver, SupabaseStorageDriver, PgvectorDriver
9. **drivers-nats**: NatsEventBusDriver (JetStream, dedup, durable consumers) + scp-worker (Outbox polling + graceful shutdown) + docker-compose NATS local
10. **E2E SCP pipeline**: platform.company.created alias registrado; exemplo executável valida stack completa em modo dev

**Próxima fase (pós-sprint):** Implementar shell-base (Camada 0) com Vite + React + TanStack Router; conectar drivers ao shell via Context/DI; primeira tela funcional local-first (OPFS).
