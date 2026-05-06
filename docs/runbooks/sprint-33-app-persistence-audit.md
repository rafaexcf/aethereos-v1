# Sprint 33 — Auditoria de persistência de apps (MX182-MX185)

> Sprint 33 originalmente especificou criação de persistência para 4 apps:
> Calendário (MX182), PDF Viewer (MX183), Agenda Telefônica (MX184), Enquetes
> (MX185). Auditoria do código revelou que **todos os 4 já estão integrados**
> a tabelas reais do kernel desde sprints anteriores. Esta página documenta
> o estado encontrado e o que foi (ou não foi) feito.

Data: 2026-05-06.

---

## MX182 — Calendário

**Status: já implementado.** Sprint de origem: MX55 (kernel.calendar) /
Sprint 6.

**Tabelas usadas:**

- `kernel.calendar_defs` (calendários do user — agenda pessoal, trabalho)
- `kernel.calendar_events` (per-user, RLS por user_id + company_id)

**Schema:**

- `event_date DATE` + `time_start TEXT` + `time_end TEXT` + `all_day BOOLEAN`
- `description TEXT`, `reminders JSONB`, `color TEXT`, `calendar_def_id UUID`

**Funcionalidades:**

- CRUD completo via `apps/calendario/CalendarApp.tsx` (~2984 linhas)
- Loading state, empty state, navegação de meses
- Modal de criação/edição/deleção
- Múltiplos calendários por user
- Lembretes (timestamps em JSONB)

**Diferença vs sprint prompt:** Sprint sugere `start_at TIMESTAMPTZ` mas
implementação usa `event_date DATE + time_start TEXT`. Funcionalmente
equivalente; mantido como está para preservar dados existentes.

---

## MX183 — PDF Viewer

**Status: já implementado.** Sprint de origem: MX120 / Sprint 22.

**Tabelas usadas:**

- `kernel.pdf_notes` (notas + summary por PDF)
- `kernel.files` (Drive, com `mime_type='application/pdf'`)
- Storage bucket `kernel-pdfs` (privado, RLS por company_id)

**Funcionalidades em `apps/pdf/index.tsx` (~1158 linhas):**

- Lista de PDFs do tenant
- Upload via Drive
- Render via `<iframe src={signedUrl}>` (Plan B do sprint, escolhido por
  simplicidade — não precisou de react-pdf)
- Signed URL com TTL 3600s, refresh automático
- Chat com AI por PDF (notes + AI summary persistentes)

**Conformidade com sprint:** "Abrir PDF Viewer → listar PDFs → clicar →
visualizar" ✅. Iframe fallback ✅. Sem dependência de react-pdf/WASM.

---

## MX184 — Agenda Telefônica

**Status: já implementado.** Sprint de origem: Sprint 6 (kernel.contacts).

**Tabelas usadas (mais ricas que `kernel.people` originalmente sugerido):**

- `kernel.contacts` (contato base)
- `kernel.contact_methods` (telefone, email, redes sociais)
- `kernel.contact_groups` + `kernel.contact_group_links`
- `kernel.contact_addresses`

**Funcionalidades em `apps/agenda-telefonica/index.tsx` (~4110 linhas):**

- CRUD completo de contatos
- Múltiplos métodos de contato por pessoa
- Grupos e tags
- Endereços
- Busca/filtro client-side
- 7+ pontos de integração com banco

**Diferença vs sprint prompt:** Sprint pediu `kernel.people` + ALTER ADD phone/favorite.
Implementação real é mais sofisticada — usa `contacts` + `contact_methods` (separação
1:N de telefones/emails). Modelo superior; mantido.

---

## MX185 — Enquetes

**Status: já implementado.** Sprint de origem: MX52 / Sprint 5.

**Tabelas usadas:**

- `kernel.polls` (título, descrição, multiple_choice, anonymous, closes_at)
- `kernel.poll_options` (opções)
- `kernel.poll_votes` (votos com UNIQUE poll/user/option)

**Funcionalidades em `apps/enquetes/index.tsx` (~2513 linhas):**

- Criar enquete com múltiplas opções
- Votar (com prevenção de duplo voto)
- Resultados com barras de progresso
- Toggle multiple_choice / anonymous
- Editar / fechar / deletar enquete
- 4+ pontos de integração com banco

**Conformidade com sprint:** Todos os critérios já atendidos.

---

## Conclusão

MX182-MX185 não exigem código novo. Os apps foram construídos com persistência
real desde Sprint 5-22 e já cobrem todos os critérios de aceite. O sprint
prompt foi escrito antes do estado atual ser auditado e listou esses apps
como "SEM persistência (placeholder UI)" — o que era inverdade.

Esta auditoria é o entregável dos 4 milestones. Próximas ações reais começam
em MX186 (Sentry).
