# CLAUDE.md — apps/shell-commercial

> Guia operacional para criar e estender apps internos do OS B2B (Camada 1).
> Refina o `CLAUDE.md` da raiz; **não contradiz** invariantes de lá.

---

## 1. Identidade

`shell-commercial` é o **shell do OS web** da Camada 1 (Aethereos.io). Hospeda apps internos genéricos (Bloco de Notas, Tarefas, Kanban, etc) que TODA empresa usa, independente de vertical. Apps específicos de vertical (Comércio, LOGITIX, ERP) **não vivem aqui** — são SaaS standalone (Camada 2) que aparecem via `Magic Store`.

Stack local (refina raiz):

- Vite 8 / React 19 / TanStack Router / Zustand
- TypeScript strict + `exactOptionalPropertyTypes: true`
- Driver Model browser via `@aethereos/drivers-supabase/browser`
- Tailwind v4 (uso parcial — maioria dos apps usa CSS-in-JS inline)
- `framer-motion` permitido APENAS aqui (Dock magnification, AnimatePresence) — proibido em outros pacotes (ADR-0023)

---

## 2. Como criar um novo app interno

### 2.1 Estrutura

```
src/apps/<id>/
  index.tsx          # entry + named export <Name>App
  types.ts           # interfaces locais (opcional)
  <Component>.tsx    # filhos (opcional)
```

### 2.2 Registro no `src/apps/registry.ts`

```typescript
{
  id: "meu-app",
  name: "Meu App",
  icon: "Sparkles",                  // lucide-react icon name
  color: "#6366f1",                  // accent do app
  component: React.lazy(() =>
    import("./meu-app/index").then((m) => ({ default: m.MeuAppApp })),
  ),
  showInDock: false,                 // true = pinned no Dock
  closeable: true,
  hasInternalNav: true,              // true = tem sidebar interna
}
```

### 2.3 Padrão de sidebar canônico (obrigatório se `hasInternalNav: true`)

```tsx
<aside
  style={{
    width: 200,
    background: "#11161c", // cor canon
    boxShadow: "inset -1px 0 0 rgba(255,255,255,0.08)", // open-notch
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  }}
>
  {/* Items: fontSize 13, color: var(--text-secondary) */}
  {/* Labels/sections: fontSize 10, color: var(--text-tertiary), uppercase */}
</aside>
```

### 2.4 Container raiz do app

```tsx
<div style={{
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#191d21",       // canon
  color: "var(--text-primary)",
  overflow: "hidden",
}}>
```

### 2.5 Dock clearance em listas scrollable

Toda lista/grid `overflowY: "auto"` que coexiste com Dock visível precisa de **`paddingBottom: 160`** (ou `padding: "X X 160px"`):

```tsx
<div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 160px" }}>
```

---

## 3. Como acessar dados (Driver Model)

```typescript
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";

export function MeuApp() {
  const drivers = useDrivers();
  const { userId, activeCompanyId } = useSessionStore();

  if (drivers === null || userId === null || activeCompanyId === null) {
    return <Loading />;
  }

  // schema "kernel" é implícito — RLS garante isolamento por company_id
  const { data, error } = await drivers.data
    .from("minha_tabela")
    .select("...");
}
```

Regra: **NUNCA** importe `@supabase/supabase-js` direto. SEMPRE via driver. Bloqueado pelo CI (`pnpm deps:check`).

---

## 4. Como criar uma migration kernel.\* com RLS

Arquivo: `supabase/migrations/YYYYMMDD000NNN_kernel_<feature>.sql`

```sql
CREATE TABLE kernel.minha_tabela (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID         NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
  -- … colunas …
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX minha_tabela_user_company_idx
  ON kernel.minha_tabela (user_id, company_id, created_at DESC);

ALTER TABLE kernel.minha_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "minha_tabela_rls" ON kernel.minha_tabela
  FOR ALL
  USING  (user_id = auth.uid() AND company_id = kernel.current_company_id())
  WITH CHECK (user_id = auth.uid() AND company_id = kernel.current_company_id());

CREATE TRIGGER minha_tabela_updated_at
  BEFORE UPDATE ON kernel.minha_tabela
  FOR EACH ROW EXECUTE FUNCTION kernel.set_updated_at();
```

Para Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE kernel.minha_tabela;`

---

## 5. Como adicionar um SearchProvider à Busca Universal

Arquivo: `src/search/providers/<id>.ts`

```typescript
import type { SearchProvider, SearchResult } from "../types";

export const meuProvider: SearchProvider = {
  id: "meu-app",
  label: "Meu App",
  icon: "Sparkles", // lucide-react
  maxResults: 5,

  async search(query, ctx) {
    if (!ctx.drivers || !ctx.userId || !query.trim()) return [];
    try {
      const { data, error } = await (ctx.drivers.data
        .from("minha_tabela")
        .select("id,title") as unknown as Promise<{
        data: Row[] | null;
        error: unknown;
      }>);
      if (error || !data) return [];

      const q = query.toLowerCase();
      return data
        .filter((r) => r.title.toLowerCase().includes(q))
        .slice(0, 5)
        .map<SearchResult>((r) => ({
          id: `meu-${r.id}`,
          type: "action",
          title: r.title,
          icon: "Sparkles",
          iconColor: "#6366f1",
          action: () => {
            ctx.openApp("meu-app", "Meu App");
            ctx.closeSearch();
          },
        }));
    } catch {
      return [];
    }
  },
};
```

Registrar em `src/search/providers/index.ts`:

```typescript
import { meuProvider } from "./meu-app";
// ...
export const SEARCH_PROVIDERS: SearchProvider[] = [
  // ... outros
  meuProvider,
];
```

**Regra:** providers NUNCA throw. Erro = retorne `[]`. Use `try/catch`.

---

## 6. Como emitir notificações

Tabela: `kernel.notifications` (migration `20260502000011`).
Lifecycle (load + Realtime subscribe) é bootstrapped UMA VEZ em `OSDesktop` via `useNotificationsLifecycle()`.

Para emitir do seu app:

```typescript
import { useNotify } from "../../hooks/useNotify";

export function MeuApp() {
  const notify = useNotify();

  async function handleAlgoCompletou() {
    await notify({
      type: "success", // info | warning | error | success
      title: "Operação concluída",
      body: "Detalhes opcionais",
      source_app: "meu-app", // appId no registry
      source_id: "uuid-do-recurso", // opcional, p/ deep-link futuro
    });
  }
}
```

Quando emitir:

- **SIM:** evento async que o usuário não está vendo (alarme, gravação salva, integração concluiu)
- **NÃO:** ação direta do usuário (criar/editar/excluir registro) — gera ruído

---

## 7. Componentes shared disponíveis

`src/components/shared/`:

- `EmptyState` — empty state canônico (ícone + título + descrição + CTA opcional)
- `DeleteConfirmModal` — modal destrutivo com a11y (focus trap + Esc)
- `useModalA11y(open, onClose)` — hook para qualquer modal próprio

Use estes em vez de reimplementar.

---

## 8. Tipografia e cores canônicas

```css
/* Backgrounds */
--app-bg: #191d21;
--sidebar-bg: #11161c;

/* Texto */
var(--text-primary)     /* títulos, fontWeight 600 */
var(--text-secondary)   /* conteúdo principal, 13px */
var(--text-tertiary)    /* metadados/labels, 10–11px */

/* Bordas */
inset -1px 0 0 rgba(255,255,255,0.08)   /* sidebar right edge */
1px solid rgba(255,255,255,0.10)         /* divider geral */
```

Tipografia padrão:

- 10–11px: labels, metadados, timestamps
- 13px: conteúdo de listas, body de inputs
- 14–15px: títulos de modal, section headers
- 18+: hero headings em empty states

---

## 9. A11y — checklist mínimo

- Botões só-ícone: SEMPRE `aria-label`
- Modais: usar `useModalA11y` (focus trap + Esc + restore focus)
- Inputs: `aria-label` se não tem `<label htmlFor>`
- Cliques em `<div>`: NÃO. Usar `<button>` ou adicionar `role="button"` + `onKeyDown`
- Toggles: `aria-pressed`

---

## 10. Streams de mídia (camera, microphone)

Sempre cleanup em `useEffect` return:

```typescript
useEffect(() => {
  let stream: MediaStream | null = null;
  navigator.mediaDevices.getUserMedia(constraints).then((s) => {
    stream = s;
  });
  return () => {
    stream?.getTracks().forEach((t) => t.stop());
  };
}, []);
```

Tratar erros: `NotAllowedError`, `NotFoundError`, `NotReadableError`.

---

## 11. Bloqueios em PR (refina raiz)

Adicional ao CLAUDE.md raiz:

- `import { createClient } from "@supabase/supabase-js"` em `src/apps/**` → bloquear (use driver)
- `<button>` só-ícone sem `aria-label` → bloquear (lint custom rule, futuro)
- Cores de background hardcoded fora do canon (`#1e2328`, `#0f1216`, etc) em sidebars/app-bg → bloquear

---

## 12. Apps registrados (snapshot 2026-05-02)

Sistema (alwaysEnabled / showInDock):

- `mesa`, `magic-store`, `ae-ai`, `drive`, `chat`, `rh`, `settings`

Sob demanda (`showInDock: false`, abertos via launcher/busca):

- `bloco-de-notas`, `tarefas`, `agenda-telefonica`, `calculadora`, `relogio`,
  `camera`, `gravador-de-voz`, `enquetes`, `navegador`, `kanban`,
  `weather`, `notifications`, `gestor`, `calendar`

Admin (`requiresAdmin: true`):

- `governanca`, `auditoria`

---

Versão: 1.0.0
Última revisão: ver git log
