# Contribuindo com o Aethereos shell-base

## Ambiente de desenvolvimento

```bash
# Pré-requisitos: Node.js >= 20.19, pnpm >= 9
pnpm install
pnpm --filter=@aethereos/shell-base dev
```

O app abre em `http://localhost:5173`. OPFS e IndexedDB funcionam normalmente no Chrome/Edge; Firefox requer servidor HTTPS ou localhost.

## Antes de abrir um PR

```bash
pnpm typecheck          # TypeScript sem erros
pnpm lint               # ESLint limpo
pnpm deps:check         # sem violações de boundary
pnpm test               # testes unitários verdes
pnpm --filter=@aethereos/shell-base build   # bundle < 500 KB gzip inicial
```

## Restrições desta camada

- Sem imports de `node:*` — código roda exclusivamente no navegador.
- Sem dependências de rede em runtime. Toda funcionalidade crítica opera offline.
- Bundle inicial gzip < 500 KB. sql.js é lazy — não inflata o bundle inicial.
- Sem `localStorage` para dados de domínio; use OPFS/SQLite via `LocalDatabaseDriver`.
- Crypto exclusivamente via Web Crypto API nativa.

## Reportar bugs

Abra uma issue em https://github.com/aethereos/aethereos/issues descrevendo:

- Navegador e versão
- Passos para reproduzir
- Comportamento esperado vs. observado
- Console errors se houver

## Licença das contribuições

Ao submeter um PR, você concorda que sua contribuição é licenciada sob os mesmos termos do projeto (BUSL-1.1, Change Date 2030-04-29 → Apache 2.0). Veja `LICENSE.busl-1.1`.
