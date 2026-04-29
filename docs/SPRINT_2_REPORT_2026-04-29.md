# Sprint 2 Report — Camada 0 (Aethereos)

**Data:** 2026-04-29  
**Milestones:** M11–M18  
**Duração:** 1 sessão (Claude Code, claude-sonnet-4-6)  
**Status:** CONCLUÍDO

---

## Objetivo

Construir a Camada 0 do Aethereos: o shell local-first que roda 100% no navegador, sem backend obrigatório, sob BUSL-1.1. A Camada 0 é o produto base open source e o pré-requisito arquitetural para a Camada 1.

---

## O que foi entregue

### M11 — drivers-local (`packages/drivers-local`)

7 drivers browser-only implementando as interfaces de `@aethereos/drivers`:

| Driver            | Implementação                  | Tecnologia                             |
| ----------------- | ------------------------------ | -------------------------------------- |
| DatabaseDriver    | LocalDatabaseDriver            | sql.js (SQLite WASM) + OPFS VFS        |
| StorageDriver     | OPFSStorageDriver              | OPFS → fallback in-memory              |
| AuthDriver        | LocalAuthDriver                | Ed25519, AES-GCM, PBKDF2 600k iter     |
| SecretsDriver     | WebCryptoSecretsDriver         | AES-GCM, TTL, chave injetada           |
| CacheDriver       | MemoryCacheDriver              | Map em memória com TTL                 |
| FeatureFlagDriver | StaticFlagsDriver              | Record estático no bundle              |
| EventBusDriver    | BroadcastChannelEventBusDriver | BroadcastChannel API + handlers locais |

57 testes unitários (vitest + happy-dom), todos passando.

### M12 — scaffold do shell-base (`apps/shell-base`)

- Vite 6 + React 19 + TanStack Router v1 (code-based)
- Tailwind v4 (`@import "tailwindcss"`, sem config.js)
- vite-plugin-pwa (Workbox, generateSW)
- Estrutura de pastas: `src/components/`, `src/lib/`, `src/stores/`, `src/types/`

### M13 — boot local-first

- `src/lib/boot.ts`: sequência de boot com 8 etapas
- sql.js carregado como chunk lazy (evita inflar bundle inicial)
- WASM importado via `?url` (Vite copia para `dist/assets/`)
- OPFS primário com fallback IndexedDB
- SQLite `ae_meta` criado no first run com `schema_version`, `company_id`, `user_id`
- `setInterval(autoSave, 30_000)` + `beforeunload`

### M14 — shell visual mínimo

- `ShellLayout`: Dock + Mesa + WindowManager
- Zustand stores: `session` (companyId, userId, isBooted) + `windows` (openWindow/closeWindow/focusWindow com Z-index)
- App funcional: Notepad abrível via Dock, posicionável, fechável
- Integração com `@aethereos/ui-shell` via workspace

### M15 — PWA offline-first

- Service Worker com precache de todos os assets (incluindo sql-wasm-\*.wasm ~660 KB)
- `globPatterns: ["**/*.{js,css,html,svg,webmanifest,wasm}"]`
- `maximumFileSizeToCacheInBytes: 5MB` para o WASM
- `navigateFallback: "index.html"` para SPA offline routing
- Após primeira visita: funciona sem rede

### M16 — BUSL-1.1

- `LICENSE.busl-1.1` em 6 packages da Camada 0 (shell-base, drivers-local, drivers, kernel, scp-registry, ui-shell)
- Formato params-only (Licensor, Licensed Work, Change Date 2030-04-29, Change License Apache 2.0, Use Limitation) + URL `https://mariadb.com/bsl11/`

### M17 — Documentação de arquitetura

- `docs/architecture/CAMADA_0.md` — arquitetura completa: diagrama ASCII, mapa de drivers, boot flow, schema SQLite, persistência, SW/offline, bundle/performance, segurança/crypto
- `docs/runbooks/local-dev-shell-base.md` — setup, OPFS DevTools, SQLite dump, troubleshooting, checklist de PR
- `README.md` — seção "Camada 0 — começando" com links para docs

### M18 — ADR-0015 + encerramento

- `docs/adr/0015-camada-0-arquitetura-local-first.md` — ADR completo com contexto, decisão, consequências, alternativas rejeitadas, mapeamento Local↔Cloud, checklist de PR review
- `CLAUDE.md` — referência ao ADR-0015 adicionada na seção 4
- `SPRINT_LOG.md` — M18 SUCCESS + Sumário Sprint 2

---

## Métricas

| Métrica                       | Valor               |
| ----------------------------- | ------------------- |
| Bundle inicial JS+CSS         | ~113 KB gzip        |
| Invariante bundle < 500 KB    | ✓ cumprida          |
| Testes unitários              | 57 (todos passando) |
| Drivers implementados         | 7 de 10             |
| Dependências cloud em runtime | 0                   |
| Works offline                 | ✓ (após 1ª visita)  |
| Instalável como PWA           | ✓                   |

---

## Validação do Driver Model [INV]

A hipótese central do Sprint 2 era:

> "Se as interfaces de drivers forem genuinamente agnósticas, deve ser possível implementá-las inteiramente com APIs do navegador."

**Resultado:** confirmado. O código de domínio (kernel, consumers) rodou **sem modificação** usando drivers de navegador. A mesma `KernelPublisher`, o mesmo `PermissionEngine`, os mesmos consumers — apenas a composição de drivers muda entre Camada 0 e Camada 1. O Driver Model [INV] está empiricamente validado.

---

## Obstáculos resolvidos

| Obstáculo                                                | Solução                                               |
| -------------------------------------------------------- | ----------------------------------------------------- |
| `tsconfig.json include` resolve relativo ao `config-ts/` | `include`/`exclude` explícitos na app                 |
| `Actor.id` não existe (campo é `user_id`)                | Corrigido em `boot.ts`                                |
| `exactOptionalPropertyTypes` com `title: undefined`      | Omitir chave em vez de atribuir `undefined`           |
| BUSL-1.1 verbatim text triggou content filter 400        | Params-only + URL canônica (aprovado por humano)      |
| commitlint rejeitou "PWA"/"WASM" maiúsculos              | lowercase no subject                                  |
| sql.js sem tipos TypeScript                              | `src/types/sql-js.d.ts` com declare module manual     |
| WASM fora do SW precache                                 | `globPatterns` + `maximumFileSizeToCacheInBytes: 5MB` |

---

## Próximo sprint

**Sprint 3 — Camada 1 (`apps/shell-commercial/`)**

- Substituir `drivers-local` por `drivers-supabase` + `drivers-nats`
- Integrar OAuth 2.1 via Supabase Auth como IdP (`idp.aethereos.com`)
- Multi-tenant RLS por `company_id`
- AI Copilot (LiteLLM gateway)
- Primeiro cliente real (piloto)

A Camada 0 é o pré-requisito cumprido. A Camada 1 reutiliza 100% dos packages de kernel e interfaces — zero reescrita.

---

_Gerado em 2026-04-29. Revisão humana obrigatória antes de qualquer merge para produção._
