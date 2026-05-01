# REDESIGN_DIAGNOSIS.md — ETAPA 0

Data: 2026-04-30

## Diagnóstico: por que redesign Tahoe não estava visível

### Conclusão

Os commits Tahoe (`9b89604`, `535f699`) **chegaram** ao código. O `tokens.css` atual tem os valores
Tahoe. A razão do "não chegou ao browser" era provavelmente servidor Vite stale + possivelmente
browser cache, não um problema estrutural. Hoje não há bloqueador.

### Evidências

| Item                                    | Estado                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| `tokens.css` importado em `globals.css` | ✅ (`@import "./tokens.css"`)                                      |
| `globals.css` importado em `main.tsx`   | ✅ (`import "./styles/globals.css"`)                               |
| Service Worker em dev                   | ✅ DESABILITADO (`devOptions: { enabled: false }`) — não interfere |
| `dist/` com build stale                 | Existe mas irrelevante em dev — Vite serve da memória              |
| Tokens atuais                           | Tahoe (errado vs canon V2)                                         |

### O que está errado (a ser corrigido em ETAPA 1+)

1. **tokens.css** = paleta Tahoe (`--bg-base: #060912`, `--blur-dock: 80px`, etc.) — a ser substituída pela V2 canon com dark/light split
2. **globals.css** sem `@custom-variant dark`, sem `@theme inline`, sem skeleton utilities
3. **index.html** sem script anti-flash, faltando Outfit font, theme-color errado
4. **Sem ThemeProvider/ThemeToggle** em `src/lib/theme/`
5. **Sem tokens HSL** para shadcn/Tailwind v4

### Ação

Ir direto para ETAPA 1 — sem necessidade de fixes de cache/SW.
Limpar `apps/shell-commercial/node_modules/.vite/` antes de subir servidor.
