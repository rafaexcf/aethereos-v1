# ADR-0027 — Automações: engine browser-side como skeleton (servidor adiado)

**Status:** Proposto
**Data:** 2026-05-03
**Sprint:** 12 — Continuidade de OS (preferências, workspace, automações)
**Subordinado a:** ADR-0014, ADR-0016, ADR-0020
**Rigidez:** [HIP] (engine browser) / [DEC] (schema da tabela)

---

## Contexto

Usuários querem definir automações "quando X então Y" dentro do OS:

- "Quando uma nota for criada com tag #urgente, criar uma task no kanban"
- "Todo dia às 9h, postar resumo de notificações"
- "Quando um evento estiver a 15min de começar, notificar"

Uma engine de automações **confiável** exige worker server-side: subscriber de NATS JetStream, scheduler distribuído (Temporal cron), retry+DLQ, observabilidade ponta a ponta. Construir isso direito é um sprint inteiro.

O Sprint 12 não tem esse orçamento. Mas deixar a feature fora seria negar uma necessidade real e legítima dos usuários. A alternativa é assumir publicamente um skeleton que entrega valor parcial e limita expectativas.

---

## Decisão

Entregar automações como **skeleton browser-side** com limitações documentadas no produto e neste ADR. A arquitetura "real" (server-side) fica explicitamente declarada como roadmap.

### Persistência (production-grade)

- Tabela `kernel.automations` com schema fechado: `id`, `company_id`, `user_id`, `name`, `trigger JSONB`, `actions JSONB[]`, `is_enabled`, `last_run_at`, `run_count`.
- RLS multi-tenant canônica.
- Migração: `supabase/migrations/20260503000008_kernel_automations.sql`.

A tabela é durável e correta — quando o worker server-side existir, ele lê desta mesma tabela. Nada do schema precisará mudar.

### Engine (skeleton browser-side)

`apps/shell-commercial/src/apps/automacoes/useAutomationEngine.ts`, montada uma vez em `OSDesktop`:

- **5 triggers:**
  - `event.task_created`, `event.note_created`, `event.notification_received` — Realtime sub em `kernel.tasks/notes/notifications`.
  - `time.daily` — `setInterval` 60s checando o horário configurado.
  - `event.upcoming` — `setInterval` 60s lendo `kernel.calendar_events` em janela.
- **4 actions executadas client-side:**
  - `notify` — `useNotify`.
  - `create_task` — insert direto via driver browser.
  - `create_note` — insert direto.
  - `webhook` — `fetch` POST.

### Limitações declaradas (no produto e aqui)

1. **Tab fechada = automação não roda.** Não há execução background.
2. **Sem retry queue.** Se o `fetch` do webhook falhar, perde-se. `last_run_at` registra apenas tentativas bem-sucedidas no caminho feliz.
3. **Multi-tab duplica execução.** Duas tabs abertas dispararão a mesma action duas vezes. Não há lock distribuído.
4. **Webhook sem config de auth headers.** POST anônimo. Bom para webhook.site / Slack incoming, ruim para sistemas autenticados.
5. **Não passa pelo SCP outbox.** Actions são escritas diretas — não emitem evento `automation.executed.*` auditável. Quebra parcial de P5 (SCP universal) e P11 (eventos auto-certificáveis), assumida como dívida técnica.
6. **Sem rate limit.** Loop trigger→action→trigger é teoricamente possível; mitigado pelo design das actions (não retroalimentam triggers da mesma automação no mesmo tick).

A UI da app `automacoes` exibe um banner alertando essas limitações.

---

## Roadmap server-side (não escopo deste sprint)

Quando a engine real for construída:

1. Worker em `apps/automation-worker/` (Node.js) consumindo NATS JetStream subjects `kernel.>`, `domain.>`.
2. Triggers temporais via Temporal cron workflows (`time.daily`, `time.weekly`, `event.upcoming`).
3. Actions executadas server-side com retry exponencial + DLQ.
4. Cada execução emite `automation.executed.<status>` no SCP outbox.
5. Webhook actions com vault de credenciais (header configs em `kernel.automation_credentials`).
6. Lock distribuído por `automation_id` (NATS KV) para impedir double-fire.

Quando o worker existir, o engine browser-side será desativado por feature flag — não removido imediatamente, para não quebrar fallback durante migração.

---

## Alternativas rejeitadas

### A1 — Esperar o worker server-side antes de entregar a feature

**Rejeitado:** dilataria sprint atual em ~2 semanas, sem feedback de usuários sobre quais triggers/actions realmente importam. Skeleton informa o design do worker.

### A2 — Service Worker para rodar automações em background

**Rejeitado:** Service Workers não têm garantia de execução periódica confiável (Periodic Background Sync é opt-in, raramente concedido pelo browser). E ainda assim só roda enquanto o navegador está aberto.

### A3 — Inngest / Trigger.dev como ponte temporária

**Rejeitado:** viola ADR-0014 (event bus é NATS+Outbox, não Inngest). Trazer dependência só para skeleton produz dívida pior do que skeleton browser.

---

## Consequências

### Positivas

- Usuários têm automações funcionais hoje.
- Schema da tabela é o final — worker server-side reusará sem migração.
- Aprende-se quais triggers/actions são populares antes de gastar sprint no worker.

### Negativas

- Reliability ruim (tab fechada = nada roda) — comunicado no produto.
- Quebra parcial de P5 e P11 (sem SCP audit) — explicitamente declarada como dívida.
- Risco de usuário tratar como "production-ready" e ser surpreendido. Mitigado pelo banner de limitações.

---

## Regras operacionais

1. Engine browser **nunca** executa actions destrutivas (delete, drop, payments). Lista atual de 4 actions é o teto até o worker existir.
2. Não adicionar trigger que dependa de eventos NÃO Realtime (ex: triggers de domínio commerce.\* só virão com o worker).
3. Toda nova action exige bandeira no banner de limitações até atingir paridade com worker.

---

## Referências

- Migração: `supabase/migrations/20260503000008_kernel_automations.sql`
- Engine: `apps/shell-commercial/src/apps/automacoes/useAutomationEngine.ts`
- App UI: `apps/shell-commercial/src/apps/automacoes/`
- Ponto de mount: `apps/shell-commercial/src/components/os/OSDesktop.tsx`
- Princípios afetados: P5 (SCP universal — quebra parcial), P11 (eventos auto-certificáveis — quebra parcial)
- ADR-0014 — Stack (NATS+Outbox como event bus do produto final)
