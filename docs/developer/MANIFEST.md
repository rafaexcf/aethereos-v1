# Manifesto — `aethereos.app.json`

> Arquivo declarativo que descreve seu app para o Aethereos. Validado por Zod no submit.

## Formato

```json
{
  "slug": "meu-app",
  "name": "Meu Super App",
  "version": "1.0.0",
  "description": "Descrição curta (máx 200 chars)",
  "scopes": ["auth.read", "drive.read"],
  "justifications": {
    "settings.write": "Salvar preferências do usuário no app"
  }
}
```

## Campos

### Obrigatórios

| Campo     | Tipo     | Descrição                                                       |
| --------- | -------- | --------------------------------------------------------------- |
| `slug`    | string   | ID único: `[a-z0-9][a-z0-9-]{2,63}`                             |
| `name`    | string   | Nome exibido (1-200 chars)                                      |
| `version` | string   | Versão semver (ex: `1.0.0`)                                     |
| `scopes`  | string[] | Permissões necessárias (ver [PERMISSIONS.md](./PERMISSIONS.md)) |

### Opcionais

| Campo              | Tipo                                                     | Descrição                                                        |
| ------------------ | -------------------------------------------------------- | ---------------------------------------------------------------- |
| `description`      | string                                                   | Descrição curta (máx 200)                                        |
| `long_description` | string                                                   | Markdown (máx 2000 chars)                                        |
| `icon`             | string                                                   | Nome de ícone Lucide (default `Box`)                             |
| `color`            | string                                                   | Hex do tema (default `#6366f1`)                                  |
| `category`         | string                                                   | productivity / dev-tools / design / ai / utilities / games / ... |
| `entry_mode`       | `"iframe"` ou `"weblink"`                                | Como o app abre (default `iframe`)                               |
| `entry_url`        | string                                                   | URL HTTPS do app                                                 |
| `external_url`     | string                                                   | Site/projeto (link externo)                                      |
| `screenshots`      | string[]                                                 | URLs de screenshots (máx 5)                                      |
| `tags`             | string[]                                                 | Tags (máx 10)                                                    |
| `license`          | string                                                   | MIT / Apache-2.0 / GPL-3.0 / proprietary / ...                   |
| `pricing_model`    | `"free"` ou `"freemium"` ou `"paid"` ou `"subscription"` | Default `free`                                                   |
| `price_cents`      | number                                                   | Preço em centavos (R$). Obrigatório se não-free                  |
| `justifications`   | object                                                   | `{ "scope.id": "motivo" }` para scopes sensíveis (10+ chars)     |

## Validação Zod

```typescript
import { AethereosManifestSchema } from "@aethereos/client";

const result = AethereosManifestSchema.safeParse(manifest);
if (!result.success) {
  console.error(result.error.flatten());
}
```

## Exemplo completo

```json
{
  "slug": "task-master",
  "name": "Task Master",
  "version": "1.2.0",
  "description": "Kanban + GTD em um app",
  "long_description": "# Task Master\n\nO **Task Master** combina kanban tradicional com técnicas GTD para...",
  "icon": "ListChecks",
  "color": "#10b981",
  "category": "productivity",
  "entry_mode": "iframe",
  "entry_url": "https://taskmaster.app/aethereos-embed",
  "external_url": "https://taskmaster.app",
  "screenshots": [
    "https://taskmaster.app/shots/board.png",
    "https://taskmaster.app/shots/details.png"
  ],
  "tags": ["kanban", "gtd", "productivity"],
  "license": "MIT",
  "pricing_model": "freemium",
  "price_cents": 2990,
  "scopes": [
    "auth.read",
    "drive.read",
    "drive.write",
    "people.read",
    "notifications.send"
  ],
  "justifications": {
    "drive.write": "Salvar tarefas como arquivos no Drive do usuário"
  }
}
```

## Versionamento

Apps publicados são imutáveis na sua versão. Para atualizar:

1. No Developer Console, abra o app publicado.
2. Clique "v1.0.0 → bump" no header do wizard (incrementa patch automaticamente; ajuste manualmente para minor/major).
3. Edite os campos que mudaram.
4. Salve como rascunho e submeta para revisão da nova versão.
5. Após aprovação, a nova versão é publicada e substitui a anterior na Magic Store.

Versões anteriores continuam disponíveis para tenants que já tinham instalado.
