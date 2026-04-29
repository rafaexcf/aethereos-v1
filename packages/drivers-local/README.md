# @aethereos/drivers-local

Browser-only implementations of the Aethereos Driver Model interfaces (Camada 0 — local-first).

## Overview

This package provides concrete implementations of all `@aethereos/drivers` interfaces that run entirely in the browser — no server required.

| Interface           | Implementation                   | Storage                               |
| ------------------- | -------------------------------- | ------------------------------------- |
| `DatabaseDriver`    | `LocalDatabaseDriver`            | sql.js (SQLite WASM) + OPFS/IndexedDB |
| `StorageDriver`     | `OPFSStorageDriver`              | Origin Private File System            |
| `AuthDriver`        | `LocalAuthDriver`                | Ed25519 JWTs via Web Crypto API       |
| `SecretsDriver`     | `WebCryptoSecretsDriver`         | AES-GCM encrypted, in-memory          |
| `CacheDriver`       | `MemoryCacheDriver`              | In-memory Map with TTL                |
| `FeatureFlagDriver` | `StaticFlagsDriver`              | Static JSON embedded in bundle        |
| `EventBusDriver`    | `BroadcastChannelEventBusDriver` | BroadcastChannel API (cross-tab)      |

**NOT implemented** (no local equivalent makes sense in Camada 0):

- `VectorDriver` — vector search requires a backend; use pgvector in Camada 1
- `LLMDriver` — LLM inference requires a gateway; use LiteLLM in Camada 1
- `ObservabilityDriver` — distributed tracing requires a collector; use OpenTelemetry in Camada 1

## Key constraints

- **Zero runtime WASM dependencies** — sql.js is loaded dynamically by the host app (not this package)
- **Pure Web APIs** — Ed25519, AES-GCM, PBKDF2 via `crypto.subtle`; BroadcastChannel; OPFS; IndexedDB
- **No `node:*` imports** — this package is `"browser": true`
- **`sql.js` is a peer dependency** — add it to the host app (`apps/shell-base`)

## Usage

```typescript
// In boot.ts (apps/shell-base):
import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import {
  LocalDatabaseDriver,
  loadDbFromStorage,
  saveDbToStorage,
} from "@aethereos/drivers-local";

const SQL = await initSqlJs({ locateFile: () => wasmUrl });
const stored = await loadDbFromStorage("workspace.sqlite");
const rawDb = stored ? new SQL.Database(stored) : new SQL.Database();
const dbDriver = new LocalDatabaseDriver(rawDb);

// After writes, persist:
await saveDbToStorage("workspace.sqlite", dbDriver.export());
```

## Auth — first run

```typescript
import {
  generateLocalIdentity,
  LocalAuthDriver,
} from "@aethereos/drivers-local";

// First run: generate device identity
const identity = await generateLocalIdentity({
  userId: crypto.randomUUID(),
  companyId,
});
const authDriver = new LocalAuthDriver({ identity });

// Issue a session token (for use in TenantContext)
const tokenResult = await authDriver.issueSessionToken();
```

## Key derivation (PBKDF2)

This package uses PBKDF2 with SHA-256 (600,000 iterations) for all passphrase-based key derivation. This meets OWASP 2023 recommendations for PBKDF2-SHA-256. Argon2id can be substituted by the host app via `hash-wasm` if security requirements increase.
