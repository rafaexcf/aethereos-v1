# Aethereos — Catálogo Open Source na Magic Store (Sprint 25)

> Snapshot do catálogo de apps externos registrados em `kernel.app_registry`
> via migration `20260505000001_app_registry_open_source_catalog.sql`.
> Modos `iframe` vs `weblink` validados pelo script `tools/validate-iframe.mjs`
> (X-Frame-Options + CSP frame-ancestors). Em caso de bloqueio, default é
> weblink (R8). Apps externos têm `show_in_dock=false` e `sort_order >= 200`.

## Resumo

| Métrica                         | Valor   |
| ------------------------------- | ------- |
| Total de apps no `app_registry` | **189** |
| Apps registrados nesta sprint   | **136** |
| Modos: `iframe`                 | 82      |
| Modos: `weblink`                | 76      |
| Modos: `internal` (nativos)     | 31      |

## Distribuição por categoria

| Categoria    | Apps |
| ------------ | ---- |
| productivity | 39   |
| utilities    | 37   |
| games        | 24   |
| dev-tools    | 22   |
| ai           | 15   |
| design       | 17   |
| data         | 17   |
| system       | 11   |
| vertical     | 5    |
| optional     | 1    |
| puter        | 1    |

## Convenções

- `id` = slug minúsculo, hífen-separado (`excalidraw`, `game-2048`, `tradingview-chart`).
- `entry_url` = URL do app. Para iframe, é a URL embedada; para weblink, abre nova aba.
- `external_url` = mesma URL, usado pelo botão "Visitar site".
- `app_type`:
  - `open_source` — código aberto (MIT/Apache/AGPL/GPL).
  - `embedded_external` — proprietário mas embeddável (TradingView widgets, YouTube).
  - `external_shortcut` — proprietário só weblink (Reddit, Khan Academy).
- `pricing_model = 'free'` para todos os listados aqui.
- `installable = true`, `closeable = true`, `has_internal_nav = false`,
  `always_enabled = false`.

## Ordem de sort_order

| Range   | Categoria principal                     |
| ------- | --------------------------------------- |
| 200–219 | productivity (Excalidraw, draw.io, etc) |
| 220–239 | dev-tools                               |
| 240–259 | design (extras)                         |
| 260–269 | ai                                      |
| 270–279 | data                                    |
| 280–299 | utilities                               |
| 300–329 | games                                   |
| 330–349 | finanças & mercado                      |
| 340–349 | educação & referência                   |
| 350–359 | comunicação & colaboração               |
| 360–379 | mídia & conteúdo + design embed + mapas |
| 380–399 | mapas + Google Workspace                |
| 400–409 | notícias                                |

## Lista canônica

Ver migration: `supabase/migrations/20260505000001_app_registry_open_source_catalog.sql`.

A query abaixo lista o catálogo no formato CSV:

```sql
SELECT
  id, name, category, entry_mode, license, sort_order
FROM kernel.app_registry
WHERE sort_order >= 200
ORDER BY sort_order, name;
```

## Como o catálogo é consumido

1. `useMagicStoreCatalog()` lê `kernel.app_registry` via `appRegistryStore`.
2. `catalog-adapter.ts` mapeia `entry_mode` para `MagicStoreSourceType`.
3. `MagicStoreApp.handleOpen()`:
   - `internal` → `osStore.openApp()` (tab interna, componente lazy do registry).
   - `iframe` → `osStore.openApp()` (tab interna; `AppFrame` delega para
     `IframeAppFrame` quando `entry_mode='iframe'`).
   - `weblink` → `window.open(target, '_blank', 'noopener,noreferrer')`.
4. Install/uninstall via `useInstalledModulesStore` →
   `kernel.company_modules` (RLS por `company_id`).

## Limitações conhecidas

- Apps com **frame-buster JavaScript** (não detectado por headers) podem
  ainda assim falhar em iframe. Caso usuário reporte, mover para weblink.
- Cookies `SameSite=Strict` e autenticação podem bloquear sessão dentro de
  iframe (chat.openai.com, copilot.microsoft.com). Validação pelo header foi
  permissiva; usuários podem precisar abrir em nova aba.
- TradingView widgets oficiais têm parametrização extensa via querystring; a
  URL registrada usa exemplo (AAPL) — em produção o app pode permitir
  customização do símbolo via `entry_url` parametrizado.

## Próximos passos sugeridos

- Telemetria de "iframe falhou ao carregar" → fallback automático para weblink.
- Permitir usuário promover weblink para iframe se ele souber que funciona.
- Re-validar headers periodicamente (tools/validate-iframe.mjs).
