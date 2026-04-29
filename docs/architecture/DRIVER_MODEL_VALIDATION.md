# Driver Model Validation — Kernel Agnóstico

> Prova empírica que o mesmo código kernel opera sobre drivers locais (Camada 0)
> e drivers cloud (Camada 1) sem branch por camada.

## Resultado: APROVADO

Testes em `packages/kernel/__tests__/driver-agnostic.test.ts` — 8 testes, 0 falhas.

```bash
pnpm test --filter=@aethereos/kernel
# Test Files  1 passed (1)
# Tests  8 passed (8)
```

## Validação por Feature

| Feature                     | LocalDriver mock                       | CloudDriver mock                       | Kernel touch point                       |
| --------------------------- | -------------------------------------- | -------------------------------------- | ---------------------------------------- |
| `KernelPublisher.publish()` | `db.withTenant()` + `db.transaction()` | `db.withTenant()` + `db.transaction()` | Idêntico — sem `if (camada)`             |
| Outbox insert               | `tx.execute()` stub                    | `tx.execute()` stub                    | Idêntico — implementação concreta varia  |
| Validação de schema         | `hasSchema()` / `buildEnvelope()`      | `hasSchema()` / `buildEnvelope()`      | Idêntico — scp-registry agnóstico        |
| `auditLog()`                | `driver.append()` mock                 | `driver.append()` mock                 | Idêntico — fail-loud em ambas as camadas |
| Erro de `withTenant`        | Propaga sem tentar tx                  | Propaga sem tentar tx                  | Idêntico                                 |
| Evento sem schema           | `ValidationError`                      | `ValidationError`                      | Idêntico                                 |

## Ausência de Branch por Camada

Pesquisa em `packages/kernel/src/**/*.ts`:

```bash
grep -r "if.*camada\|cloud\|supabase\|local\|sqlite\|opfs" packages/kernel/src/
# → zero resultados
```

O kernel não contém referência a nenhum driver específico. A injeção de dependência
é feita exclusivamente via construtores (`new KernelPublisher(db, bus)`).

## Mapeamento Camada 0 ↔ Camada 1

| Componente         | Camada 0 (Local-first)                          | Camada 1 (Cloud-first)                            |
| ------------------ | ----------------------------------------------- | ------------------------------------------------- |
| `DatabaseDriver`   | `LocalDatabaseDriver` (SQLite WASM + IndexedDB) | `SupabaseDatabaseDriver` (Postgres via Drizzle)   |
| `EventBusDriver`   | `BroadcastChannelEventBusDriver`                | `NatsEventBusDriver`                              |
| `AuthDriver`       | `LocalAuthDriver` (JWT local, sem rede)         | `SupabaseBrowserAuthDriver` (PKCE, Supabase Auth) |
| `StorageDriver`    | `OPFSStorageDriver` (File System Access API)    | `SupabaseStorageDriver` (S3-compatible)           |
| `VectorDriver`     | Não implementado (F3+)                          | `SupabasePgvectorDriver` (pgvector)               |
| `KernelPublisher`  | **Mesmo código**                                | **Mesmo código**                                  |
| `auditLog()`       | **Mesmo código**                                | **Mesmo código**                                  |
| `PermissionEngine` | **Mesmo código**                                | **Mesmo código**                                  |
| RLS multi-tenant   | `app.current_company_id` via config local       | `app.current_company_id` via JWT + db-pre-request |

## Garantia Arquitetural

O Driver Model [INV] (Fundamentação 4.7, ADR-0014 §5) garante:

1. **Kernel não importa drivers**: `packages/kernel/src/**` não tem referência a `@supabase`, `@aethereos/drivers-supabase`, `@aethereos/drivers-local`, `sql.js` ou qualquer implementação concreta.
2. **Drivers não importam kernel**: os pacotes de drivers são agnósticos ao shell.
3. **Troca de driver sem mudança no kernel**: substituir `SupabaseDatabaseDriver` por um mock (como neste teste) não requer nenhuma alteração em `packages/kernel/`.

## Referências

- [ADR-0014 — Stack definitiva e Driver Model](../adr/0014-resolucao-stack-vs-analise-externa.md)
- [ADR-0015 — Arquitetura Camada 0 local-first](../adr/0015-camada-0-arquitetura-local-first.md)
- [ADR-0016 — Arquitetura Camada 1 cloud-first](../adr/0016-camada-1-arquitetura-cloud-first.md)
- [packages/kernel/**tests**/driver-agnostic.test.ts](../../packages/kernel/__tests__/driver-agnostic.test.ts)
