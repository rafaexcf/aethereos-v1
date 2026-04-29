# ADR-0015 — Arquitetura local-first da Camada 0

**Status:** Aceito  
**Data:** 2026-04-29  
**Subordinado a:** ADR-0001 (Fundação), ADR-0014 (Stack)  
**Autores:** Rafael Costa Franco + Claude Code (Sprint 2)

---

## Contexto

O Aethereos é construído em ordem: Camada 0 → Camada 1 → verticais. Esta ordem não é comercial — é arquitetural.

A Camada 0 precisa existir e funcionar _sem nenhuma dependência de infraestrutura cloud_, por três razões:

1. **Validação do Driver Model [INV]:** se as interfaces de drivers forem genuinamente agnósticas, deve ser possível implementá-las inteiramente com APIs do navegador. O contrário — implementar primeiro a versão cloud e então tentar abstrair — produz vazamentos de abstração.

2. **Produto independente:** o shell-base é distribuível como base open source (BUSL-1.1). Organizações que não querem dependência de backend externo devem conseguir usar a Camada 0 standalone.

3. **Desenvolvimento sem conta cloud:** a equipe precisa trabalhar offline, sem Supabase local rodando, sem NATS, sem credenciais.

A Camada 0 foi construída no Sprint 2 (milestones M11–M18). Todas as decisões técnicas estão documentadas no `SPRINT_LOG.md`.

---

## Decisão

### Stack da Camada 0

| Componente   | Tecnologia                          | Justificativa                                                           |
| ------------ | ----------------------------------- | ----------------------------------------------------------------------- |
| Build tool   | Vite 6                              | [INV ADR-0014]; bundling nativo ESM, suporte a `?url` imports para WASM |
| UI           | React 19                            | [INV ADR-0014]                                                          |
| Router       | TanStack Router v1 (code-based)     | [INV ADR-0014]; file-based routing migrado futuramente                  |
| State        | Zustand 5                           | [INV ADR-0014]; stores: session, windows                                |
| CSS          | Tailwind v4 + CSS vars              | [INV ADR-0014]; `@import "tailwindcss"` sem config.js                   |
| Banco local  | sql.js (SQLite WASM)                | Único SQLite WASM maduro disponível no browser                          |
| Persistência | OPFS primário, IndexedDB fallback   | OPFS: acesso binário direto, maior quota, melhor para SQLite            |
| Auth local   | Web Crypto API (Ed25519)            | Identidade local sem servidor; zero deps externas                       |
| Secrets      | Web Crypto API (AES-GCM + PBKDF2)   | Mesma API, sem biblioteca                                               |
| Event bus    | BroadcastChannel API                | Cross-tab nativo; sem servidor NATS necessário                          |
| PWA          | vite-plugin-pwa (Workbox)           | Precache de todos os assets incluindo WASM (~660 KB)                    |
| Licença      | BUSL-1.1 → Apache 2.0 em 2030-04-29 | Base aberta com proteção comercial durante maturação                    |

### Drivers implementados (packages/drivers-local)

| Interface             | Implementação                    | Observação                                                       |
| --------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `DatabaseDriver`      | `LocalDatabaseDriver`            | sql.js injetado pelo boot; driver não importa sql.js diretamente |
| `StorageDriver`       | `OPFSStorageDriver`              | fallback in-memory para testes e browsers antigos                |
| `AuthDriver`          | `LocalAuthDriver`                | Ed25519, PBKDF2 600k iter, AES-GCM key wrapping                  |
| `SecretsDriver`       | `WebCryptoSecretsDriver`         | AES-GCM, TTL, chave injetada pelo boot                           |
| `CacheDriver`         | `MemoryCacheDriver`              | Map + TTL + deleteByPrefix                                       |
| `FeatureFlagDriver`   | `StaticFlagsDriver`              | Record estático; Unleash na Camada 1                             |
| `EventBusDriver`      | `BroadcastChannelEventBusDriver` | dispatch local + postMessage cross-tab                           |
| `VectorDriver`        | —                                | Não implementado: sem servidor de embeddings em Camada 0         |
| `LlmDriver`           | —                                | Não implementado: LiteLLM gateway é Camada 1                     |
| `ObservabilityDriver` | —                                | Não implementado: sem coletor de telemetria local                |

### Restrições invariantes da Camada 0

Estas regras aplicam-se a qualquer PR que toque `apps/shell-base/` ou `packages/drivers-local/`:

1. **Sem `node:*`** — código roda exclusivamente no navegador.
2. **Bundle inicial < 500 KB gzip** — sql.js é lazy; nenhuma dependência pesada no chunk inicial.
3. **Sem rede em runtime crítico** — após primeiro load, zero requests de rede são necessários.
4. **Sem `localStorage` para dados de domínio** — OPFS + SQLite. LocalStorage apenas para preferências triviais (tema, idioma), cap de 5 KB.
5. **Crypto via Web Crypto API** — sem `crypto-js`, `tweetnacl`, ou similar.
6. **Sem `console.log` em produção** — ESLint bloqueia; logs estruturados via OTel quando disponível.
7. **Sem tracking, sem analytics** — Fundamentação P10.

---

## Consequências

### Positivas

- O Driver Model foi validado empiricamente: as interfaces de `@aethereos/drivers` são genuinamente agnósticas. O código do kernel (`KernelPublisher`, consumers, `PermissionEngine`) rodou sem modificação usando apenas drivers de navegador.
- O shell-base pode ser desenvolvido e testado sem nenhuma infraestrutura local (Docker, Supabase, NATS).
- A Camada 0 é distribuível como produto independente sob BUSL-1.1.
- 57 testes unitários nos drivers locais, todos passando, usando `vitest` + `happy-dom`.

### Custos

- sql.js (SQLite WASM) adiciona ~660 KB ao download total. Mitigado: chunk lazy + precacheado pelo SW após primeira visita.
- OPFS não disponível em contextos não-seguros (HTTP não-localhost). Mitigado: fallback IndexedDB.
- SQLite WASM é snapshot-based (sem WAL) — `db.export()` serializa o banco inteiro. Para bancos grandes (> 50 MB), autoSave a cada 30s pode ter impacto. Mitigado: Camada 0 é single-user local, volumes pequenos esperados.
- BroadcastChannel não persiste mensagens — se não há listener quando a mensagem é enviada, ela é perdida. Mitigado: handlers locais são chamados antes do broadcast; consumers devem ser registrados antes de publishers.

### Mitigações futuras

- Migrar para file-based routing do TanStack Router quando `@tanstack/router-plugin` for adicionado.
- Avaliar `wa-sqlite` ou `sqlite-wasm` oficial (Google) como alternativa ao sql.js quando maturar.
- SQLite WAL mode via OPFS sync access handle para performance em escritas frequentes.

---

## Alternativas rejeitadas

### PouchDB / CouchDB sync

PouchDB oferece sync automático com CouchDB. Rejeitado porque:

- Adiciona complexidade de sync que a Camada 0 não precisa (offline-first sem sync).
- Bundle maior (~45 KB gzip apenas o core).
- Não é SQLite — o Driver Model usa uma interface SQL; PouchDB é document-store.

### Dexie / IndexedDB puro

Dexie é uma abstração excelente sobre IndexedDB. Rejeitado porque:

- IndexedDB não é banco relacional. O `DatabaseDriver` expõe SQL, não document store.
- Migrar para PostgreSQL (Camada 1) exigiria mudança de paradigma; SQLite → PostgreSQL é natural.
- OPFS como VFS para SQLite WASM oferece performance superior ao IndexedDB para operações de banco.

### RxDB

RxDB oferece reatividade e sync. Rejeitado porque:

- Complexidade desnecessária para Camada 0 (sem sync em Camada 0).
- Schema próprio — não usa SQL nativo.
- Bundle significativamente maior.

### Local-First HTTP (ElectricSQL, Replicache, Triplit)

Frameworks de sync local-first pressupõem um servidor de sync. Rejeitado porque:

- A Camada 0 é explicitamente "sem backend obrigatório".
- Esses frameworks são candidatos para Camada 1 (sync cloud-to-local), não Camada 0.

### wa-sqlite (alternativa ao sql.js)

`wa-sqlite` oferece WAL mode via OPFS Sync Access Handle — melhor performance. Rejeitado _por ora_ porque:

- sql.js é mais maduro e amplamente usado.
- A API de wa-sqlite muda frequentemente.
- A Camada 0 não tem volumes que justifiquem WAL mode agora.

---

## Tabela de mapeamento Driver Local ↔ Driver Cloud

| Driver        | Camada 0 (browser)                       | Camada 1 (cloud)                             |
| ------------- | ---------------------------------------- | -------------------------------------------- |
| Database      | LocalDatabaseDriver (SQLite WASM + OPFS) | SupabaseDatabaseDriver (Postgres 16 + RLS)   |
| Storage       | OPFSStorageDriver                        | SupabaseStorageDriver (S3-compatible)        |
| Auth          | LocalAuthDriver (Ed25519 local)          | SupabaseAuthDriver (OAuth 2.1 + OIDC + PKCE) |
| Secrets       | WebCryptoSecretsDriver                   | SupabaseSecretsDriver (Vault)                |
| Cache         | MemoryCacheDriver                        | (Redis via Supabase ou driver dedicado)      |
| Feature Flags | StaticFlagsDriver                        | UnleashDriver                                |
| Event Bus     | BroadcastChannelEventBusDriver           | NatsEventBusDriver (JetStream)               |

O código de domínio (kernel, apps) usa apenas as interfaces — nunca as implementações diretamente.

---

## Anexo: regras de PR review específicas da Camada 0

Para PRs em `apps/shell-base/` ou `packages/drivers-local/`:

- [ ] Nenhum `import ... from 'node:*'`
- [ ] Nenhum `import ... from 'fs'`, `'path'`, `'crypto'` (Node built-ins)
- [ ] Bundle inicial JS+CSS < 500 KB gzip (verificar output do `vite build`)
- [ ] Nenhum `console.log/info/warn/error` em código de produção
- [ ] Nenhuma dependência de rede em hot path (sem `fetch()` sem fallback offline)
- [ ] `localStorage` apenas para preferências triviais (máx 5 KB)
- [ ] Crypto apenas via `crypto.subtle.*` ou `crypto.randomUUID()`
- [ ] Testes unitários para qualquer novo driver ou função de boot
- [ ] `pnpm typecheck && pnpm lint && pnpm deps:check && pnpm test` verdes localmente

---

## Validação empírica do Driver Model (adicionado Sprint 3 / M24)

A agnósticidade do kernel foi provada empiricamente em `packages/kernel/__tests__/driver-agnostic.test.ts`.
Os mesmos métodos `KernelPublisher.publish()` e `auditLog()` operam sobre mocks "local-like" e "cloud-like"
produzindo resultados estruturalmente idênticos.

Detalhes: [DRIVER_MODEL_VALIDATION.md](../architecture/DRIVER_MODEL_VALIDATION.md)
