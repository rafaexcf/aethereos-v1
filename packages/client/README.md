# @aethereos/client

SDK tipado para apps third-party rodando no Aethereos OS. Funciona em dois modos:

- **Bridge** (default): SDK detecta que está em iframe e usa `postMessage` para o shell host
- **Direct**: shell injeta um router que executa direto via drivers in-process

> Sprint 22. Permissões granulares e validação de origin entram no Sprint 23.

---

## Instalação

```bash
pnpm add @aethereos/client
```

Para apps iframe servidos como HTML estático, o SDK pode ser inline'ado sem bundler — veja `apps/shell-commercial/public/demo-iframe-app/index.html` no monorepo.

---

## Quick start

```ts
import { createAethereosClient } from "@aethereos/client";

// Modo bridge (default — assume iframe)
const aeth = createAethereosClient();

const session = await aeth.auth.getSession();
console.log(session.userId, session.companyId);

const files = await aeth.drive.list();
const people = await aeth.people.list();

await aeth.notifications.send("Olá", "Mensagem do meu app");

const unsub = aeth.theme.onThemeChange((theme) => {
  document.documentElement.dataset.theme = theme;
});
```

### Modo direct (apps nativos do shell)

```ts
const aeth = createAethereosClient({
  direct: {
    router: async (method, params) => {
      // shell roteia para drivers diretamente
      return executeViaShell(method, params);
    },
  },
});
```

---

## API reference

### `auth`

| Método         | Retorno                           |
| -------------- | --------------------------------- |
| `getSession()` | `{ userId, email, companyId }`    |
| `getUser()`    | `{ id, email, name, avatarUrl? }` |

### `drive`

| Método              | Retorno       |
| ------------------- | ------------- |
| `list(path?)`       | `FileEntry[]` |
| `read(fileId)`      | `Blob`        |
| `write(path, data)` | `{ fileId }`  |
| `delete(fileId)`    | `void`        |

### `people`

| Método             | Retorno    |
| ------------------ | ---------- |
| `list(query?)`     | `Person[]` |
| `create(data)`     | `Person`   |
| `update(id, data)` | `Person`   |

### `chat`

| Método                         | Retorno       |
| ------------------------------ | ------------- |
| `listChannels()`               | `Channel[]`   |
| `sendMessage(channelId, text)` | `ChatMessage` |

### `notifications`

| Método                     | Retorno              |
| -------------------------- | -------------------- |
| `send(title, body, opts?)` | `void`               |
| `list()`                   | `NotificationItem[]` |

### `scp`

| Método                          | Retorno         |
| ------------------------------- | --------------- |
| `emit(eventType, payload)`      | `{ eventId }`   |
| `subscribe(eventType, handler)` | `unsubscribe()` |

### `ai`

| Método                  | Retorno                   |
| ----------------------- | ------------------------- |
| `chat(messages, opts?)` | `{ content, model }`      |
| `embed(text)`           | `{ embedding: number[] }` |

### `settings`

| Método            | Retorno    |
| ----------------- | ---------- |
| `get<T>(key)`     | `T │ null` |
| `set(key, value)` | `void`     |

### `windows`

| Método                              | Retorno         |
| ----------------------------------- | --------------- |
| `close()`                           | `void`          |
| `setTitle(title)`                   | `void`          |
| `sendMessage(targetAppId, message)` | `void`          |
| `onMessage(handler)`                | `unsubscribe()` |

### `theme`

| Método                   | Retorno            |
| ------------------------ | ------------------ |
| `getTheme()`             | `'light' │ 'dark'` |
| `onThemeChange(handler)` | `unsubscribe()`    |

---

## Bridge protocol

Mensagens trocadas via `postMessage` entre iframe (SDK) e parent window (shell host).

### Handshake

Iframe → host:

```json
{ "type": "AETHEREOS_SDK_HANDSHAKE", "version": "1.0.0" }
```

Host → iframe:

```json
{
  "type": "AETHEREOS_SDK_HANDSHAKE_ACK",
  "appId": "demo-iframe",
  "companyId": "uuid",
  "userId": "uuid",
  "theme": "dark"
}
```

### Request / Response

Iframe → host:

```json
{
  "type": "AETHEREOS_SDK_REQUEST",
  "requestId": "uuid",
  "method": "drive.list",
  "params": { "path": "/" }
}
```

Host → iframe (sucesso):

```json
{
  "type": "AETHEREOS_SDK_RESPONSE",
  "requestId": "uuid",
  "success": true,
  "data": [...]
}
```

Host → iframe (erro):

```json
{
  "type": "AETHEREOS_SDK_RESPONSE",
  "requestId": "uuid",
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "file missing" }
}
```

### Push events

Host → iframe (não solicitado):

```json
{
  "type": "AETHEREOS_SDK_EVENT",
  "event": "theme.changed",
  "data": { "theme": "light" }
}
```

Eventos atuais: `theme.changed`. Mais virão em sprints futuros (`scp:*`, `windows.message`).

---

## Errors

Toda chamada falha com `SdkError`:

```ts
import { SdkError } from "@aethereos/client";

try {
  await aeth.drive.read("nonexistent");
} catch (err) {
  if (err instanceof SdkError) {
    console.log(err.code, err.message);
    // BRIDGE_TIMEOUT, EXECUTION_ERROR, NOT_FOUND, etc.
  }
}
```

---

## Permissões (Sprint 23)

Apps declaram permissões no manifesto `aethereos.app.json` em `permissions[]`. Ao instalar, usuário consente nos scopes sensíveis. AppBridgeHandler valida cada request — métodos sem grant retornam `PERMISSION_DENIED`.

```ts
import {
  SCOPE_CATALOG,
  isSensitiveScope,
  METHOD_SCOPE_MAP,
} from "@aethereos/client";

// Catalogo central de 17 scopes
const drive = SCOPE_CATALOG["drive.write"];
console.log(drive.label, drive.description, drive.sensitive);

// Mapeamento method -> scope (usado pelo bridge)
const required = METHOD_SCOPE_MAP["drive.delete"]; // "drive.delete"

// 5 scopes sensíveis exigem consentimento explícito:
// drive.delete, people.write, settings.write, scp.emit, ai.chat
```

`auth.read` (BASE_SCOPE) é sempre concedido implicitamente — todo app instalado pode ler a sessão do usuário.

Tratamento de erro:

```ts
try {
  await aeth.drive.delete("file-id");
} catch (err) {
  if (err instanceof SdkError && err.code === "PERMISSION_DENIED") {
    // App não tem grant para drive.delete — pedir ao usuário para reinstalar
    // ou conceder via Magic Store > app detail > Permissões
  }
}
```

## Manifesto aethereos.app.json (Sprint 23)

Spec declarativa para apps third-party:

```ts
import { parseManifest, type AethereosManifest } from "@aethereos/client";

const result = parseManifest(JSON.parse(content));
if (!result.ok) {
  console.error(result.issues);
  process.exit(1);
}
const m: AethereosManifest = result.value;
```

Spec completa em [`docs/MANIFEST_SPEC.md`](../../docs/MANIFEST_SPEC.md).

## Limitações Sprint 22

- `postMessage` target ainda é `'*'` (origin validation entra com Developer Console)
- `drive.read` não implementado em F1 (Storage requer refactor)
- `chat`, `ai` ainda sem handlers no host (apenas API tipada)
- Cache de grants no bridge não invalida ao revogar via UI — iframe precisa ser remontado para refresh
