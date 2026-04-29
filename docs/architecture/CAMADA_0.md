# Arquitetura da Camada 0 — Aethereos shell-base

> Versão: Sprint 2 (2026-04-29)  
> Subordinado a: Fundamentação v4.3, ADR-0001, ADR-0014, ADR-0015

---

## 1. Visão geral

A Camada 0 é o núcleo open source do Aethereos: um OS B2B que roda inteiramente no navegador, sem backend obrigatório, sob licença BUSL-1.1.

```
┌─────────────────────────────────────────────────────────────┐
│                    apps/shell-base  (Vite + React 19)        │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────────┐   │
│  │  /setup  │  │    /     │  │   /settings/about       │   │
│  │ (first   │  │(desktop) │  │                         │   │
│  │  run)    │  │ ShellLay │  │                         │   │
│  └──────────┘  │  -out    │  └─────────────────────────┘   │
│                │  Dock    │                                 │
│                │  Mesa    │                                 │
│                │  Windows │                                 │
│                └──────────┘                                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  src/lib/boot.ts  (boot sequence)                    │   │
│  │  src/lib/drivers.ts  (driver composition)            │   │
│  │  src/stores/  (Zustand: session, windows)            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                  │
           ▼                  ▼
┌─────────────────┐  ┌────────────────────────────────────────┐
│  packages/      │  │  Browser APIs (sem servidor)           │
│  drivers-local  │  │                                        │
│  (Camada 0      │  │  ┌──────────────────────────────────┐  │
│  Driver impls)  │  │  │ OPFS (Origin Private File System) │  │
│                 │  │  │  └── aethereos.sqlite (sql.js)   │  │
│  LocalDatabase  │  │  └──────────────────────────────────┘  │
│  OPFSStorage    │  │  ┌──────────────────────────────────┐  │
│  LocalAuth      │  │  │ IndexedDB (fallback OPFS)        │  │
│  WebCrypto      │  │  └──────────────────────────────────┘  │
│  Secrets        │  │  ┌──────────────────────────────────┐  │
│  MemoryCache    │  │  │ BroadcastChannel (cross-tab SCP) │  │
│  StaticFlags    │  │  └──────────────────────────────────┘  │
│  BroadcastCh.   │  │  ┌──────────────────────────────────┐  │
└─────────────────┘  │  │ Web Crypto API (Ed25519, AES-GCM)│  │
           │         │  └──────────────────────────────────┘  │
           ▼         └────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  packages/drivers  (interfaces agnósticas — Driver Model)   │
│  packages/kernel   (SCP publisher, permissões, auditoria)   │
│  packages/scp-registry  (schemas Zod de eventos)            │
│  packages/ui-shell (Dock, Mesa, WindowManager, Button...)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Mapa de drivers: interface ↔ implementação local

| Interface (`@aethereos/drivers`) | Implementação Camada 0           | Tecnologia base                             |
| -------------------------------- | -------------------------------- | ------------------------------------------- |
| `DatabaseDriver`                 | `LocalDatabaseDriver`            | sql.js (SQLite WASM) + OPFS VFS             |
| `StorageDriver`                  | `OPFSStorageDriver`              | OPFS → fallback in-memory                   |
| `AuthDriver`                     | `LocalAuthDriver`                | Web Crypto API (Ed25519 + AES-GCM + PBKDF2) |
| `SecretsDriver`                  | `WebCryptoSecretsDriver`         | AES-GCM, chave derivada de passphrase       |
| `CacheDriver`                    | `MemoryCacheDriver`              | Map em memória com TTL                      |
| `FeatureFlagDriver`              | `StaticFlagsDriver`              | Record estático no bundle                   |
| `EventBusDriver`                 | `BroadcastChannelEventBusDriver` | BroadcastChannel API + handlers locais      |
| `VectorDriver`                   | — não implementado               | Sem sentido em Camada 0 sem servidor        |
| `LlmDriver`                      | — não implementado               | Sem sentido em Camada 0 sem servidor        |
| `ObservabilityDriver`            | — não implementado               | Sem servidor de telemetria local            |

O Driver Model [INV] garante que o código de domínio (kernel, apps) é idêntico em Camada 0 e Camada 1 — apenas os drivers diferem.

---

## 3. Fluxo de boot

```
Browser carrega index.html
  │
  ├─ Service Worker registra e precacheia todos os assets (incluindo WASM)
  │
  └─ main.tsx renderiza <App />
        │
        └─ useEffect: boot(appDrivers)
              │
              ├─ 1. ping: eventBus, storage, cache, flags  (todos em memória — instantâneo)
              │
              ├─ 2. await import("sql.js")  ← lazy chunk separado (~40 KB JS)
              │
              ├─ 3. initSqlJs({ locateFile: () => sqlWasmUrl })
              │      └─ busca sql-wasm-*.wasm (~660 KB, do SW cache após 1ª visita)
              │
              ├─ 4. loadDbFromStorage("aethereos.sqlite")
              │      ├─ OPFS disponível? → opfsLoad()
              │      └─ fallback → idbLoad() (IndexedDB)
              │
              ├─ 5. first run? → CREATE TABLE ae_meta + INSERT company_id, user_id
              │      └─ saveDbToStorage() → OPFS ou IndexedDB
              │
              ├─ 6. new LocalDatabaseDriver(rawDb)
              │      └─ db.withTenant({ company_id, actor: { type: "human", user_id } })
              │
              ├─ 7. setInterval(autoSave, 30_000) + beforeunload → autoSave()
              │
              └─ 8. return BootResult { db, drivers, isFirstRun, backend }
                     └─ <BootProvider> → <RouterProvider> → ShellLayout
```

Após o boot, a UI é renderizada. Se `isFirstRun`, o usuário vê a tela de setup.

---

## 4. Modelo de dados local (SQLite — schema v1)

### Tabela `ae_meta`

```sql
CREATE TABLE IF NOT EXISTS ae_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  ts    INTEGER NOT NULL DEFAULT (unixepoch())
);
```

Entradas criadas no first run:

| key              | valor                     |
| ---------------- | ------------------------- |
| `schema_version` | `"1"`                     |
| `company_id`     | UUID v4 gerado localmente |
| `user_id`        | UUID v4 gerado localmente |

Tabelas adicionais são criadas por milestones futuras (notas, configurações, eventos locais).

---

## 5. Persistência e durabilidade

| Camada    | Tecnologia                                             | Quando                                           |
| --------- | ------------------------------------------------------ | ------------------------------------------------ |
| Primária  | OPFS (`navigator.storage.getDirectory()`)              | Chrome 86+, Edge 86+, Firefox 111+, Safari 15.2+ |
| Fallback  | IndexedDB (`ae-sqlite-fallback` DB, store `databases`) | Quando OPFS indisponível                         |
| Auto-save | `setInterval(30 000 ms)` + `beforeunload`              | Após cada boot bem-sucedido                      |

O banco OPFS é um arquivo binário SQLite serializado via `rawDb.export()` (sql.js). Não há WAL no SQLite WASM — o banco é snapshot-based.

---

## 6. Service Worker e offline

Configurado via `vite-plugin-pwa` (modo `generateSW` / Workbox):

- **Precache:** todos os assets do build, incluindo `sql-wasm-*.wasm` (~660 KB)
- **Estratégia:** cache-first para assets com hash; `navigateFallback: index.html` para SPA routing
- **Atualização:** `registerType: "autoUpdate"` — SW atualiza silenciosamente em background
- **Tamanho máximo de asset:** 5 MB (necessário para o WASM)

Após a primeira visita, o app funciona inteiramente offline. Nenhum request de rede é necessário para operação normal.

---

## 7. Bundle e performance

| Chunk                   | Gzip        | Quando carregado           |
| ----------------------- | ----------- | -------------------------- |
| `index-*.js` (main)     | ~78 KB      | inicial                    |
| `router-*.js`           | ~32 KB      | inicial                    |
| `index-*.css`           | ~3.5 KB     | inicial                    |
| **Total inicial**       | **~113 KB** | **< 500 KB [INV]**         |
| `sql-wasm-browser-*.js` | ~15 KB      | lazy (boot)                |
| `sql-wasm-*.wasm`       | ~323 KB     | lazy (boot, após SW cache) |

---

## 8. Segurança e criptografia

Toda criptografia usa **Web Crypto API nativa** — sem bibliotecas externas:

- **Ed25519** — identidade local (gerada em `LocalAuthDriver`)
- **AES-GCM 256-bit** — criptografia de secrets e chave privada em repouso
- **PBKDF2 / SHA-256 / 600.000 iterações** — derivação de chave a partir de passphrase (OWASP 2023)
- **`crypto.randomUUID()`** — geração de IDs

Dados em OPFS são isolados por origem pelo navegador (mesmo domínio, mesmo protocolo). Não há vazamento cross-origin.

---

## 9. O que a Camada 0 faz / não faz

### Faz

- Roda 100% no navegador, sem servidor
- Persiste dados localmente via OPFS + SQLite WASM
- Emite e consome eventos SCP localmente via BroadcastChannel
- Autentica o usuário localmente com identidade Ed25519
- Funciona offline após primeira carga
- É instalável como PWA

### Não faz

- Sincroniza dados com servidor (isso é Camada 1)
- Multi-tenant cloud (Camada 1 — RLS PostgreSQL)
- AI Copilot (Camada 1 — requer LiteLLM gateway)
- Billing, fiscal, compliance cloud (Camada 1 + SaaS standalone)
- VectorDriver, LlmDriver, ObservabilityDriver (sem sentido sem servidor)

---

## 10. Como a Camada 1 estende a Camada 0

A Camada 1 (`apps/shell-commercial/`) usa os **mesmos packages de kernel** (`@aethereos/kernel`, `@aethereos/scp-registry`, `@aethereos/ui-shell`) mas substitui os drivers locais por implementações cloud:

| Driver              | Camada 0                            | Camada 1                                  |
| ------------------- | ----------------------------------- | ----------------------------------------- |
| `DatabaseDriver`    | `LocalDatabaseDriver` (SQLite WASM) | `SupabaseDatabaseDriver` (Postgres + RLS) |
| `StorageDriver`     | `OPFSStorageDriver`                 | `SupabaseStorageDriver`                   |
| `AuthDriver`        | `LocalAuthDriver`                   | `SupabaseAuthDriver` (OAuth 2.1 + OIDC)   |
| `EventBusDriver`    | `BroadcastChannelEventBusDriver`    | `NatsEventBusDriver` (JetStream)          |
| `SecretsDriver`     | `WebCryptoSecretsDriver`            | `SupabaseSecretsDriver` (Vault)           |
| `FeatureFlagDriver` | `StaticFlagsDriver`                 | `UnleashDriver`                           |

O código de domínio (SCP publisher, consumers, kernel) é **idêntico** — apenas a composição de drivers muda. Isso é o Driver Model em ação.

---

## 11. Dependências de terceiros (Camada 0)

| Pacote                              | Versão | Justificativa                                        |
| ----------------------------------- | ------ | ---------------------------------------------------- |
| `react` + `react-dom`               | ^19    | UI framework [INV ADR-0014]                          |
| `@tanstack/react-router`            | ^1     | Router SPA [INV ADR-0014]                            |
| `zustand`                           | ^5     | State management [INV ADR-0014]                      |
| `tailwindcss` + `@tailwindcss/vite` | ^4     | CSS utility [INV ADR-0014]                           |
| `sql.js`                            | ^1.12  | SQLite WASM — único driver de banco local disponível |
| `vite-plugin-pwa`                   | ^0.21  | Service Worker / PWA via Workbox                     |
| `vite`                              | ^6     | Build tool [INV ADR-0014]                            |

Sem `framer-motion`, sem `next`, sem `prisma`, sem `@clerk/*`, sem `inngest`.

---

_Última atualização: Sprint 2, 2026-04-29. Veja `SPRINT_LOG.md` para histórico detalhado._
