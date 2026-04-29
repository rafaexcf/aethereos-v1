# Runbook: desenvolvimento local — shell-base (Camada 0)

> Público-alvo: desenvolvedor configurando ambiente pela primeira vez ou depurando problemas comuns.

---

## Setup de ambiente

### Pré-requisitos

- Node.js >= 20.19.0 (ou 22.12+)
- pnpm >= 9.0.0
- Chrome 86+ ou Edge 86+ (OPFS requer HTTPS ou localhost)
- Git

### Instalação

```bash
git clone <repo>
cd aethereos
pnpm install
```

### Rodar em dev

```bash
pnpm --filter=@aethereos/shell-base dev
# Abre em http://localhost:5173
```

O Vite serve em HTTP simples. OPFS funciona em `localhost` sem HTTPS.

### Build + preview

```bash
pnpm --filter=@aethereos/shell-base build
pnpm --filter=@aethereos/shell-base preview
# Abre em http://localhost:4173
```

---

## Inspecionar OPFS via DevTools (Chrome/Edge)

1. Abra o app em `http://localhost:5173` ou `http://localhost:4173`.
2. Abra DevTools (`F12`).
3. Vá em **Application** → **Storage** → **Origin Private File System**.
4. Expanda a árvore — você verá `aethereos.sqlite`.

Para baixar o arquivo:

```javascript
// Cole no console do DevTools:
const root = await navigator.storage.getDirectory();
const fh = await root.getFileHandle("aethereos.sqlite");
const file = await fh.getFile();
const url = URL.createObjectURL(file);
const a = document.createElement("a");
a.href = url;
a.download = "aethereos.sqlite";
a.click();
```

---

## Inspecionar o SQLite local

Após baixar `aethereos.sqlite`:

- **SQLiteStudio** (GUI): abra o arquivo diretamente.
- **sqlite3** (CLI): `sqlite3 aethereos.sqlite .tables`
- **DB Browser for SQLite**: File → Open Database.

Tabelas esperadas após first run:

```sql
SELECT * FROM ae_meta;
-- key            | value                                | ts
-- schema_version | 1                                    | ...
-- company_id     | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | ...
-- user_id        | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | ...
```

---

## Inspecionar IndexedDB (fallback)

Se OPFS não estiver disponível (navegador antigo ou contexto seguro ausente):

1. DevTools → **Application** → **IndexedDB** → `ae-sqlite-fallback` → `databases`.
2. A entrada `aethereos.sqlite` conterá o Uint8Array com o banco.

---

## Troubleshooting

### Service Worker travado / versão antiga

**Sintoma:** app serve assets desatualizados ou SW não atualiza.

**Solução:**

1. DevTools → Application → Service Workers → clique em "Unregister".
2. Recarregue a página (`F5`).
3. Ou: Application → Storage → "Clear site data".

```bash
# Para limpar tudo programaticamente:
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(r => r.unregister()));
```

### OPFS não disponível

**Sintoma:** `storageBackend()` retorna `"indexeddb"` em vez de `"opfs"`.

**Causas comuns:**

- Navegador antigo (Firefox < 111, Safari < 15.2, Chrome < 86).
- App servido em HTTP não-localhost (OPFS requer contexto seguro).
- Storage quota atingido (OPFS é limitado pelo navegador — geralmente 60% do disco).

**Verificar quota:**

```javascript
const estimate = await navigator.storage.estimate();
console.log(`Usado: ${estimate.usage} / Disponível: ${estimate.quota}`);
```

**Ação:** usar Chrome/Edge em localhost. Não há fallback de funcionalidade — o IndexedDB armazena o mesmo SQLite serializado.

### sql.js WASM falha ao carregar

**Sintoma:** tela de loading permanece, console mostra erro de fetch do `.wasm`.

**Causas:**

- WASM não está no Service Worker cache (primeira carga offline).
- `locateFile` retorna URL incorreta.

**Verificar:**

1. DevTools → Network → filtre por `.wasm` — confira se a URL é `/assets/sql-wasm-*.wasm`.
2. DevTools → Application → Cache Storage → `workbox-precache-*` → verifique se `.wasm` está lá.

**Ação:** conectar à rede e recarregar para que o SW precacheie o WASM.

### OPFS corrompido / reset de workspace

Para apagar todos os dados e voltar ao estado de first run:

```javascript
// Console do DevTools:
// 1. Apagar OPFS
const root = await navigator.storage.getDirectory();
for await (const [name] of root.entries()) {
  await root.removeEntry(name, { recursive: true });
}

// 2. Apagar IndexedDB fallback
indexedDB.deleteDatabase("ae-sqlite-fallback");

// 3. Recarregar
location.reload();
```

### Typecheck / lint falha localmente

```bash
pnpm install           # reestabelecer node_modules
pnpm typecheck         # deve passar
pnpm lint              # deve passar
pnpm deps:check        # deve passar
```

Se `pnpm deps:check` reportar violações de boundary (ex: `next` importado em shell), consulte `CLAUDE.md` seção 5.

---

## Variáveis de ambiente

O shell-base não usa variáveis de ambiente de runtime — é 100% estático. Em dev:

- `import.meta.env.DEV` — `true` em `pnpm dev`, `false` em `pnpm build`
- `import.meta.env.PROD` — oposto de DEV
- `import.meta.env.MODE` — `"development"` ou `"production"`

Não adicione `VITE_*` vars para dados sensíveis — elas ficam embutidas no bundle.

---

## Checklist antes de abrir PR

```bash
pnpm typecheck                                  # zero erros TypeScript
pnpm lint                                       # zero erros ESLint
pnpm deps:check                                 # zero violações de boundary
pnpm test                                       # testes unitários verdes
pnpm --filter=@aethereos/shell-base build       # build ok
# Verificar output: bundle inicial JS+CSS < 500 KB gzip
```

_Última atualização: Sprint 2, 2026-04-29._
