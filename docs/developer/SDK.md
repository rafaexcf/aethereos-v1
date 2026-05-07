# SDK Reference — `@aethereos/client`

> SDK TypeScript que apps terceiros usam para se comunicar com o shell Aethereos.

## Instalação

```bash
npm install @aethereos/client
```

## Setup

```typescript
import { createAethereosClient, BridgeTransport } from "@aethereos/client";

const client = createAethereosClient({
  transport: new BridgeTransport(),
});
```

`BridgeTransport` usa `postMessage` para falar com o shell que hospeda
seu iframe. Se rodar fora do shell (testes locais), use `DirectTransport`
com router e event bus mockados.

## Módulos

Todos os módulos retornam `Promise`. Erros são tipados como `SdkError`
com `code` (string) + `message`.

### `auth`

```typescript
const session = await client.auth.session();
// { user: { id, full_name, email }, company: { id, name } }
```

### `drive`

```typescript
const files = await client.drive.list({ parent_id: null, kind: "file" });
const file = await client.drive.get("file-uuid");
const newFile = await client.drive.create({
  name: "report.pdf",
  parent_id: null,
  size_bytes: 1024,
  mime_type: "application/pdf",
});
await client.drive.delete("file-uuid");
```

Scope: `drive.read` + `drive.write` + `drive.delete` conforme operação.

### `people`

```typescript
const contacts = await client.people.list();
const created = await client.people.create({
  full_name: "Maria Silva",
  email: "maria@example.com",
});
```

Scope: `people.read` + `people.write`.

### `chat`

```typescript
const channels = await client.chat.channels();
const messages = await client.chat.messages("channel-id");
await client.chat.send("channel-id", "Olá!");
```

Scope: `chat.read` + `chat.write`.

### `notifications`

```typescript
await client.notifications.send({
  title: "Tarefa concluída",
  body: "Sua exportação está pronta",
  type: "success",
});
```

Scope: `notifications.send`.

### `scp`

```typescript
const result = await client.scp.emit({
  type: "myapp.entity.created",
  payload: { id: "abc", name: "Foo" },
});

const unsub = await client.scp.subscribe("myapp.*", (event) => {
  console.log("Event received:", event);
});
```

Scopes: `scp.emit` + `scp.subscribe`.

### `ai`

```typescript
const result = await client.ai.chat({
  messages: [{ role: "user", content: "Resuma este texto" }],
  model: "claude-sonnet-4",
});

const embedding = await client.ai.embed({ text: "Hello world" });
```

Scopes: `ai.chat` + `ai.embed`. Custos descontam da quota do tenant
(ver `Gestor > Plano & Assinatura > Consumo`).

### `settings`

```typescript
const value = await client.settings.get("my-app:preference");
await client.settings.set("my-app:preference", "dark");
```

Scopes: `settings.read` + `settings.write`.

### `windows`

```typescript
await client.windows.openExternal("https://example.com");
await client.windows.close();
```

Scope: `windows.manage`.

### `theme`

```typescript
const theme = await client.theme.current();
// { name: "aethereos-dark", colors: { primary: "#6366f1", ... } }
```

Scope: `theme.read`.

## Bridge protocol

`BridgeTransport` implementa o protocolo:

1. **Handshake.** App envia `{ type: "handshake" }`. Shell responde com
   `{ type: "handshake_ack", context: { user, company, ... } }`.
2. **RPC.** App envia `{ id, method, params }`. Shell responde com
   `{ id, ok: true, result }` ou `{ id, ok: false, error }`.
3. **Subscribe.** App envia `{ id, method: "scp.subscribe", params: { pattern } }`.
   Shell envia eventos como `{ type: "scp.event", subscriptionId, event }`.

Ver `docs/developer/PERMISSIONS.md` para a lista de métodos por scope.
