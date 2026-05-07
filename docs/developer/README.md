# Aethereos Developer Program

> Guia de início rápido para developers terceiros. Construa apps que rodam no Aethereos OS e publique-os na Magic Store.

## O que é

O Aethereos é um OS B2B no navegador com Magic Store de apps. O Developer Program permite que **qualquer pessoa** construa apps que rodam no shell, acessam dados do tenant via SDK tipado, e são distribuídos para as mais de 188 empresas que já usam o Aethereos.

**Modelos de monetização:** gratuito, freemium, pago, assinatura. Revenue share **70% developer / 30% Aethereos** (ver [MONETIZATION.md](./MONETIZATION.md)).

## Como registrar

1. Faça login em [aethereos.io](https://aethereos.io) (ou local em `localhost:5173`).
2. Abra o **Developer Console** via launcher ou busca universal.
3. Preencha o form de registro: nome, e-mail, bio.
4. Aceite os Termos de Desenvolvimento.
5. Sua **API key** é gerada automaticamente — copie e guarde com segurança.

## Primeiro app em 5 minutos

```bash
npx create-aethereos-app meu-app
cd meu-app
npm install
npm run dev
```

Estrutura mínima:

```
meu-app/
├── package.json
├── aethereos.app.json    # manifesto
├── index.html            # entry HTML
└── src/
    └── main.ts           # entry TypeScript
```

`aethereos.app.json` mínimo:

```json
{
  "slug": "meu-app",
  "name": "Meu App",
  "version": "1.0.0",
  "scopes": ["auth.read"]
}
```

`src/main.ts`:

```typescript
import { createAethereosClient, BridgeTransport } from "@aethereos/client";

const client = createAethereosClient({
  transport: new BridgeTransport(),
});

const session = await client.auth.session();
console.log(`Olá, ${session.user.full_name}`);
```

## Ciclo de vida de um app

```
draft  →  submitted  →  in_review  →  approved  →  published
                              ↓
                        rejected (com motivo, voltar para draft)
                              ↓
                        request_changes → draft (com notas)
```

1. **Draft** — você cria o app no wizard, pode editar livremente.
2. **Submitted** — você submeteu para revisão; staff vai analisar.
3. **In review** — staff está avaliando.
4. **Approved + published** — automaticamente disponível na Magic Store
   (auto-publish via Edge Function `app-review`).
5. **Rejected** — corrija o motivo e resubmita.

Tempo médio de revisão: **48 horas úteis** (estimativa F2 — pode variar).

## Documentos

- [SDK.md](./SDK.md) — referência do `@aethereos/client`
- [MANIFEST.md](./MANIFEST.md) — formato do `aethereos.app.json`
- [PERMISSIONS.md](./PERMISSIONS.md) — 17 scopes detalhados
- [REVIEW.md](./REVIEW.md) — processo de revisão e checklist
- [MONETIZATION.md](./MONETIZATION.md) — modelos pagos e revenue share

## Suporte

- Bugs / dúvidas: abra issue em [github.com/aethereos/aethereos](https://github.com/aethereos/aethereos)
- E-mail: developers@aethereos.io
