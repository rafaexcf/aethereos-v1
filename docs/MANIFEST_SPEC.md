# aethereos.app.json — Especificação do manifesto

> Sprint 23 MX127. Contrato declarativo para apps third-party do Aethereos OS.
> Em F1 o manifesto **não é consumido em runtime** — é referência para developers
> e para o futuro Developer Console (que ingerirá o JSON e popará `kernel.app_registry`).

---

## Localização

`aethereos.app.json` na raiz do diretório do app, ao lado do `index.html` ou
`package.json`. Servido junto com o app (mesmo dominio do `entry.url`).

---

## Schema

Validado por `AethereosManifestSchema` em `@aethereos/client`. Use `parseManifest(json)` em scripts de build para falhar cedo se o manifesto for inválido.

```ts
import { parseManifest } from "@aethereos/client";

const result = parseManifest(JSON.parse(content));
if (!result.ok) {
  console.error(result.issues);
  process.exit(1);
}
```

---

## Exemplo completo

```json
{
  "$schema": "https://aethereos.io/schemas/aethereos.app.schema.json",
  "id": "meu-app",
  "name": "Meu App",
  "version": "1.0.0",
  "description": "App de exemplo que demonstra o manifesto.",
  "long_description": "Descrição mais detalhada — aparece no detail view da Magic Store.",
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
    "large": "/icons/app-512.png",
    "lucide": "Sparkles"
  },
  "color": "#06b6d4",
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
  },
  "license": "MIT",
  "tags": ["produtividade", "demo"]
}
```

---

## Campos

### Identificação

| Campo              | Tipo   | Required | Descrição                                                                          |
| ------------------ | ------ | -------- | ---------------------------------------------------------------------------------- |
| `id`               | string | ✓        | Identificador único kebab-case (`a-z`, `0-9`, `-`). Mapeia para `app_registry.id`. |
| `name`             | string | ✓        | Nome exibido no Dock/Mesa/Magic Store. 1-120 chars.                                |
| `version`          | string | ✓        | Semver (`1.0.0` ou `1.0.0-beta.1`).                                                |
| `description`      | string | ✓        | Descrição curta (até 280 chars).                                                   |
| `long_description` | string |          | Descrição longa para o detail view.                                                |

### Developer

| Campo               | Tipo   | Required |
| ------------------- | ------ | -------- |
| `developer.name`    | string | ✓        |
| `developer.website` | URL    |          |
| `developer.email`   | email  |          |

### Tipo / categoria

`type` ∈ {`native`, `open_source`, `embedded_external`, `external_shortcut`, `template_app`, `ai_app`}.

`category` ∈ {`vertical`, `optional`, `ai`, `productivity`, `games`, `utilities`, `puter`, `system`}.

### Entry

| Campo          | Required quando   | Descrição                                                                            |
| -------------- | ----------------- | ------------------------------------------------------------------------------------ |
| `entry.mode`   | sempre            | `internal` (apps nativos React), `iframe` (embarcados) ou `weblink` (abre nova aba). |
| `entry.url`    | iframe ou weblink | URL absoluta.                                                                        |
| `entry.target` | opcional          | Para internal: appId do componente nativo.                                           |

### Icons / color

`icons.small` (64px) e `icons.large` (512px+): URLs relativas ou absolutas. `icons.lucide`: nome de ícone Lucide para fallback (ex: `Sparkles`).

`color`: cor de destaque hex 6 chars.

### Permissions

Array de scope IDs do `SCOPE_CATALOG`. Apenas scopes declarados aqui podem ser solicitados pelo SDK em runtime. Scopes sensíveis exigem consentimento explícito do usuário no install.

Lista completa de scopes em `packages/client/src/scopes.ts`.

### Window

Hints opcionais para o gerenciador de janelas (Sprint futuro):

```json
{
  "defaultWidth": 980,
  "defaultHeight": 720,
  "minWidth": 520,
  "minHeight": 420,
  "resizable": true,
  "maximizable": true
}
```

### Pricing

```json
{
  "model": "subscription",
  "currency": "BRL",
  "amount": 49.9
}
```

`model` ∈ {`free`, `one_time`, `subscription`, `usage_based`}. Cobrança real vem em sprint futuro (integração Lago).

### Security

```json
{
  "sandbox": true,
  "allowedOrigins": ["https://meu-app.example.com"]
}
```

`sandbox` (default `true`): aplica iframe sandbox. `allowedOrigins`: origins permitidos para postMessage. Em F1, `'*'` ainda é usado pelo bridge — `allowedOrigins` será aplicado quando origin validation entrar em sprint futuro.

### License + tags

`license`: SPDX identifier ou nome livre (max 120 chars).
`tags`: array de strings curtas para busca (max 32 chars cada).

---

## Validação local

```bash
node -e "
  const m = require('./aethereos.app.json');
  const { parseManifest } = require('@aethereos/client');
  const r = parseManifest(m);
  if (!r.ok) { console.error(JSON.stringify(r.issues, null, 2)); process.exit(1); }
  console.log('manifest OK:', r.value.id);
"
```

---

## Roadmap

- **F1 (atual)**: spec + schema validação local. Manifesto é referência.
- **F2**: Developer Console ingere o manifesto e popula `app_registry` automaticamente.
- **F2**: `allowedOrigins` ativo (postMessage origin validation no bridge).
- **F3**: cobrança real via Lago para `pricing.model != 'free'`.
