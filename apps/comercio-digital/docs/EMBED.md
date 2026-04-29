# EMBED Protocol — Comércio Digital

Comércio Digital suporta modo embed: o mesmo build Next.js roda dentro de um
`<iframe>` no shell-commercial sem código separado.

## Protocolo de mensagens

### 1. Iframe carrega (`/embed` ou qualquer rota `/embed/*`)

O layout `app/embed/layout.tsx` (Client Component) é montado. Ele:

- Registra listener `window.message`
- Emite imediatamente para o parent:
  ```json
  { "type": "embed.ready", "version": "1" }
  ```

### 2. Parent recebe `embed.ready`

O componente `<EmbeddedApp>` no shell-commercial detecta e responde:

```json
{
  "type": "host.token.set",
  "access_token": "<supabase-access-token>",
  "refresh_token": "<supabase-refresh-token>"
}
```

### 3. Iframe chama `setSession()`

O layout chama `SupabaseBrowserAuthDriver.setSession({ access_token, refresh_token })`.
Se bem-sucedido:

```json
{ "type": "embed.ready", "version": "1" }
```

Se falhar:

```json
{
  "type": "embed.error",
  "code": "session_restore_failed",
  "message": "Failed to restore session from host token."
}
```

## Configuração do parent

```tsx
import { EmbeddedApp } from "src/components/EmbeddedApp";

<EmbeddedApp
  src="http://localhost:3000/embed"
  accessToken={session.access_token}
  refreshToken={session.refresh_token}
  title="Comércio Digital"
/>;
```

Variável de ambiente no shell:

```
VITE_COMERCIO_EMBED_URL=https://comercio.seudominio.com/embed
```

## CSP — `frame-ancestors`

O Next.js configura `frame-ancestors` nos headers de `/embed/*` via `next.config.ts`.

**Desenvolvimento:** `frame-ancestors localhost:* 127.0.0.1:*`  
**Produção:** configure `ALLOWED_EMBED_ORIGINS` no `.env.local`:

```
ALLOWED_EMBED_ORIGINS=https://app.aethereos.io https://app.seudominio.com
```

## Limitações conhecidas

- **Cookies third-party**: em Safari e Firefox (modo strict), cookies de
  sessão Supabase podem ser bloqueados dentro do iframe. O protocolo
  `host.token.set` contorna isso para o primeiro carregamento, mas refresh
  automático pode falhar. Solução definitiva: subdomain com `SameSite=None`.
- **Logout**: o iframe não sincroniza logout com o parent. O parent deve
  fechar o iframe e limpar a sessão do shell.
- **Deep-link**: rotas `/embed/*` são isoladas. Navegação interna não muda a
  URL do parent.

## Rotas disponíveis no modo embed

| Rota              | Descrição                        |
| ----------------- | -------------------------------- |
| `/embed`          | Dashboard com links para módulos |
| `/embed/checkout` | Checkout (redireciona ao Stripe) |
