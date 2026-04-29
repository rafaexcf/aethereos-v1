# Aethereos Embed Protocol v1

> Protocolo de comunicação entre `shell-commercial` embarcado em iframe e a página host (SaaS standalone).

## Visão Geral

O shell-commercial pode rodar em **modo embed** quando acessado com `?embed=true` na URL. Nesse modo:

- Header e Dock são ocultados
- A área de conteúdo ocupa 100% do viewport do iframe
- Comunicação com o host via `window.postMessage`

## Ativação

```html
<iframe
  src="https://app.aethereos.io/?embed=true"
  title="Aethereos shell"
  allow="storage-access"
>
</iframe>
```

O host pode detectar quando o shell está pronto escutando mensagens postMessage:

```javascript
window.addEventListener("message", (event) => {
  // IMPORTANTE: verificar event.origin em produção
  if (event.origin !== "https://app.aethereos.io") return;

  if (event.data.type === "embed.ready") {
    console.log("Shell pronto, versão:", event.data.version);
  }
});
```

## Eventos Canônicos

### Shell → Host (postMessage para `window.parent`)

| Tipo                  | Payload                                   | Descrição                                                  |
| --------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `embed.ready`         | `{ type, version: "1" }`                  | Shell montado e autenticado. Primeiro evento enviado.      |
| `embed.navigate`      | `{ type, path: string }`                  | Usuário navegou para uma rota interna.                     |
| `embed.token.refresh` | `{ type, expires_at: number }`            | Token de sessão renovado (host pode precisar sincronizar). |
| `embed.error`         | `{ type, code: string, message: string }` | Erro fatal no shell (ex: sessão expirada).                 |

### Host → Shell (postMessage para `iframe.contentWindow`)

| Tipo                  | Payload                          | Descrição                              |
| --------------------- | -------------------------------- | -------------------------------------- |
| `host.navigate`       | `{ type, path: string }`         | Força navegação para rota interna.     |
| `host.company.switch` | `{ type, company_id: string }`   | Muda empresa ativa sem reload.         |
| `host.token.set`      | `{ type, access_token: string }` | Injeta token de sessão (SSO delegado). |

## Segurança

### CSP `frame-ancestors`

O shell-commercial serve o header:

```
Content-Security-Policy: frame-ancestors 'self' https://*.aethereos.io https://*.b2baios.com.br
```

Isso impede clickjacking: o shell só pode ser embarcado em iframes de origens autorizadas.

**Configuração por ambiente** (vite.config.ts / servidor de produção):

```typescript
// Desenvolvimento local
"frame-ancestors 'self' http://localhost:* http://127.0.0.1:*";

// Produção
"frame-ancestors 'self' https://*.aethereos.io https://*.b2baios.com.br";
```

### Verificação de Origem

O host DEVE verificar `event.origin` antes de processar mensagens:

```javascript
const ALLOWED_SHELL_ORIGINS = new Set([
  "https://app.aethereos.io",
  "http://localhost:5174", // apenas dev
]);

window.addEventListener("message", (event) => {
  if (!ALLOWED_SHELL_ORIGINS.has(event.origin)) return;
  // processar event.data
});
```

### Campos Obrigatórios

Todo evento postMessage do shell inclui `type` (string, formato `embed.<noun>.<verb?>`) e segue a mesma convenção de nomenclatura de eventos SCP (`domain.entity.action`).

## Teste Local

```bash
pnpm --filter=@aethereos/shell-commercial build
pnpm --filter=@aethereos/shell-commercial preview
# Abrir: http://localhost:4173/embed-test.html
```

A página `embed-test.html` mostra o shell em iframe e loga eventos postMessage no painel lateral.

## Roadmap

- v1.1: `embed.token.refresh` implementado com rotação automática
- v1.2: `host.company.switch` → handshake bidirecional com confirmação
- v2.0: protocolo sobre BroadcastChannel para mesmo-origem; postMessage mantido para cross-origem

## Referências

- [ADR-0014 — Resolução de Stack](../adr/0014-resolucao-stack-vs-analise-externa.md)
- [ADR-0016 — Camada 1 Arquitetura Cloud-First](../adr/0016-camada-1-arquitetura-cloud-first.md) (pendente M25)
- [Fundamentação v4.3 — P5 SCP como barramento universal](../AETHEREOS_FUNDAMENTACAO_v4_3.md)
