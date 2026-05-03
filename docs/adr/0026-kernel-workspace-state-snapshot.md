# ADR-0026 — `kernel.workspace_state`: snapshot persistido do workspace do OS

**Status:** Proposto
**Data:** 2026-05-03
**Sprint:** 12 — Continuidade de OS (preferências, workspace, automações)
**Subordinado a:** ADR-0014, ADR-0016
**Rigidez:** [DEC]

---

## Contexto

O paradigma OS do shell-commercial mantém múltiplas tabs (Mesa, Drive, Pessoas, etc.), posições de janelas e estado de split-screen. Até o Sprint 12 esse estado vivia apenas em memória (Zustand `mesaStore` + estado local de cada app). Todo refresh do navegador descartava o workspace, devolvendo o usuário a uma única tab Mesa em estado vazio.

Um OS B2B sério não tem esse comportamento. macOS, Windows, ChromeOS persistem janelas entre sessões. Para a fidelidade do paradigma OS (R10) e para a UX real de power-users que mantêm dezenas de tabs abertas, o workspace precisa sobreviver a refresh, fechamento de aba e troca de máquina.

---

## Decisão

Persistir o workspace via **snapshot único por (user, company)** em `kernel.workspace_state`.

### Schema

```sql
kernel.workspace_state (
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  tabs JSONB NOT NULL DEFAULT '[]',
  active_tab_id TEXT,
  windows JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
)
```

- RLS dupla canônica: `user_id = auth.uid() AND company_id = current_company_id`.
- Multi-tenant **real**: trocar de empresa ativa via `switchCompany` carrega outro snapshot. Usuário tem um workspace por empresa.
- Migração: `supabase/migrations/20260503000013_kernel_workspace_state.sql`.

### Estratégia: snapshot, não event sourcing

Cada update sobrescreve o documento inteiro. Não é log de eventos.

**Razões:**

- Payload pequeno (lista de tabs + posições de janela ~ poucos KB).
- Operação dominante é "leia tudo no mount" (snapshot favorece isso).
- Reconstruir estado a partir de eventos exigiria replay no client a cada cold start (latência inaceitável).

### Hook: `useWorkspacePersistence`

`apps/shell-commercial/src/hooks/useWorkspacePersistence.ts`:

- **Hidratação:** no mount, busca a row e popula `mesaStore`. Se ausente, mantém o default (Mesa).
- **Persistência:** debounce de **1s** sobre mudanças do `mesaStore` → upsert na row.
- **Flush final:** `beforeunload` dispara um upsert sync best-effort para reduzir perda do último segundo.
- **Sem Realtime cross-device:** workspace não é sincronizado em tempo real entre máquinas — cada dispositivo é uma "sessão" do OS. Tentar sincronizar geraria ping-pong de upserts.

---

## Alternativas rejeitadas

### A1 — Event sourcing puro (`workspace_events`)

Cada `addTab`, `closeTab`, `moveWindow` vira evento; estado reconstruído por replay.

**Rejeitado:** complexidade alta, latência de cold start ruim, payload acumulando indefinidamente. O domínio "estado de janelas abertas" é classicamente snapshot.

### A2 — `localStorage` apenas

**Rejeitado:** mesma falha do `useUserPreference` antes do ADR-0025 — quebra continuidade entre dispositivos. Power-user em desktop deveria poder retomar o workspace no notebook.

### A3 — Sincronização Realtime cross-device

Push de mudanças de workspace via Realtime para todos os dispositivos do usuário ao vivo.

**Rejeitado por ora:** risco de loop (device A escreve → device B recebe → escreve seu próprio estado divergente → device A recebe). Resolver isso exige CRDT ou last-writer-wins explícito. Adiado para sprint dedicado se houver demanda real.

### A4 — Snapshot por empresa **e** por dispositivo

Coluna `device_id` para que o usuário tenha workspaces distintos por máquina.

**Rejeitado por ora:** YAGNI. Comportamento padrão "último workspace ganha entre dispositivos" é aceitável para Sprint 12. Reavaliar quando aparecer fricção real.

---

## Consequências

### Positivas

- Refresh, fechamento de tab e reabrir o app não destroem o workspace.
- Trocar de empresa via `switchCompany` traz o workspace específico daquela empresa.
- Padrão multi-tenant canônico mantido (diferente de ADR-0025).

### Negativas / trade-offs

- **Sub-segundo de mudança vulnerável a tab kill** — se o navegador for morto (ex: OOM) menos de 1s após a última mudança, o último estado pode ser perdido. Aceito porque alinhado ao precedente do `mesaStore` (que não tinha persistência alguma) e mitigado pelo flush em `beforeunload`.
- **Multi-tab racy** — duas tabs do shell-commercial abertas para a mesma empresa fazem upsert competitivo. Comportamento "last writer wins" sem merge. Aceitável: usuários raramente abrem o OS em duas tabs simultâneas.
- **Sem retomada cross-device em tempo real** — resolução adiada (ver A3).

---

## Regras operacionais

1. Apenas `useWorkspacePersistence` escreve em `kernel.workspace_state`. Outros componentes só leem `mesaStore` em memória.
2. Aumento do payload `windows`/`tabs` para > 64KB exige revisão (provável sintoma de bug — workspace virou histórico).
3. Mudanças no shape de `tabs`/`windows` exigem migração + versionamento `schema_version` no JSONB.

---

## Referências

- Migração: `supabase/migrations/20260503000013_kernel_workspace_state.sql`
- Hook: `apps/shell-commercial/src/hooks/useWorkspacePersistence.ts`
- Store em memória: `apps/shell-commercial/src/state/mesaStore.ts`
- ADR-0016 — Camada 1 cloud-first
- ADR-0025 — Exceção `user_preferences` (contraste: aqui o filtro `company_id` é mantido)
