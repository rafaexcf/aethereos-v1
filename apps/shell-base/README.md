# Aethereos shell-base — Camada 0

OS B2B no navegador. Local-first, offline-capable, sem backend obrigatório.

**Licença:** BUSL-1.1 → Apache 2.0 em 2030-04-29  
**Domínio:** aethereos.org  
**Stack:** Vite 6 · React 19 · TanStack Router · Zustand · Tailwind v4 · SQLite WASM · OPFS

---

## Início rápido

```bash
pnpm install
pnpm --filter=@aethereos/shell-base dev
# Abre em http://localhost:5173
```

### Build de produção

```bash
pnpm --filter=@aethereos/shell-base build
pnpm --filter=@aethereos/shell-base preview
# Abre em http://localhost:4173
```

Bundle inicial: ~113 KB gzip. sql.js (~660 KB WASM) carregado sob demanda no boot.

---

## Instalar como PWA

**Chrome / Edge:**

1. Acesse o app no navegador.
2. Clique no ícone de instalação na barra de endereços (ícone de computador com seta).
3. Confirme "Instalar".

**Firefox:**

1. Acesse o app.
2. Menu (≡) → "Instalar este site como aplicativo".

**Safari (iOS):**

1. Toque em Compartilhar (□↑).
2. "Adicionar à Tela de Início".

Após instalado, o app funciona completamente offline — todos os assets (incluindo o WASM do SQLite) são pré-cacheados pelo Service Worker na primeira visita.

---

## Arquitetura resumida

```
apps/shell-base/
├── src/lib/boot.ts        # boot sequence: OPFS → SQLite WASM → drivers → UI
├── src/lib/drivers.ts     # composição de drivers locais
├── src/routes/            # TanStack Router: /, /setup, /settings/about
├── src/stores/            # Zustand: session, windows
└── src/components/        # ShellLayout, Notepad, ...

packages/drivers-local/    # implementações browser-only das interfaces de drivers
packages/drivers/          # interfaces agnósticas (Driver Model [INV])
packages/ui-shell/         # componentes compartilhados: Dock, Mesa, WindowManager
packages/kernel/           # SCP publisher/consumer, permissões, auditoria
packages/scp-registry/     # schemas Zod de eventos SCP
```

Veja `docs/architecture/CAMADA_0.md` para diagrama completo e modelo de dados.

---

## Contribuindo

Leia `CONTRIBUTING.md`. Requer `pnpm ci:full` verde antes de abrir PR.

## Segurança

Veja `SECURITY.md` para reportar vulnerabilidades.
