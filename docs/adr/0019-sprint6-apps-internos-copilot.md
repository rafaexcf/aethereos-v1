# ADR-0019 — Sprint 6: Apps Internos Camada 1 + AI Copilot Estrutural

**Data:** 2026-04-30  
**Status:** ACCEPTED  
**Autor:** Claude Code (claude-sonnet-4-6) — Revisão obrigatória por humano antes de merge em produção  
**Sprint:** 6 (M41–M50)

---

## Contexto

Sprint 6 completa a fundação operacional da Camada 1 (`apps/shell-commercial/`) iniciada no Sprint 5. O objetivo era ter os 6 apps internos canônicos funcionais, o AI Copilot estrutural com Shadow Mode, e os apps de governança e auditoria. Todas as features operam em demo state com drivers marcados como TODO para integração real com Supabase.

---

## Decisões

### 1. Modelo de mounting de apps internos [DEC]

Apps internos são **React Components**, não iframes. São gerenciados pelo `useWindowsStore` (Zustand) com `zIndex` para foco. Lazy loading via `React.lazy()` + `Suspense` para code splitting por app.

**Razão:** iframe isolaria contexto de auth e dificultaria acesso ao session store. React components compartilham contexto de forma natural e têm melhor DX.

**Trade-off:** Apps têm acesso ao store global — requer disciplina para não criar acoplamentos indevidos. Verticais distintas ainda isoladas via rotas separadas (e.g., `/staff`).

### 2. AI Copilot como drawer global, fora do Dock [DEC]

Copilot é acessível via Cmd+K ou botão no header — não como ícone no Dock. O Dock contém apenas apps com estado de janela (abertos/fechados). Copilot é transversal: acessível de qualquer contexto.

**Razão:** Copilot não é uma "janela" — é uma camada de assistência sobre qualquer contexto ativo. Mantê-lo separado do modelo de janelas evita confusão de foco.

### 3. Shadow Mode com intent detection por regex [DEC]

M46 implementa Shadow Mode com detecção de intenção por regex sobre o texto do usuário (keyword-based), não LLM-based. 5 intents: `create_person`, `create_file`, `send_notification`, `update_settings`, `create_channel`.

**Razão:** LiteLLM em modo degenerado (sem chave de API real) não pode fazer structured output confiável. Intent detection regex garante que o Shadow Mode demonstre o fluxo completo (proposta → aprovação → execução stub) mesmo sem LLM.

**Em produção:** Substituir por structured output do LLM via function calling, com fallback para regex.

### 4. LiteLLMDriver + withDegradedLLM no frontend [DEC]

Shell-commercial constrói `LiteLLMDriver` com `VITE_LITELLM_URL` e `VITE_LITELLM_KEY`, wraps com `withDegradedLLM()`. Em dev sem chave, `DegradedLLMDriver` responde silenciosamente e o Copilot exibe banner "modo degenerado".

**Razão:** P14 (Modo Degenerado) exige que LLM features nunca travem a UI. O banner informa o estado sem impedir uso do Copilot para intent detection.

**Segurança:** VITE_LITELLM_KEY nunca deve ser a masterKey em produção — criar chave virtual por tenant no LiteLLM admin.

### 5. `kernel.agent_proposals` para Shadow Mode [DEC]

Tabela dedicada para propostas de ação do Copilot. Status: `pending → approved → executed` ou `pending → rejected`. Expiram em 1 hora via campo `expires_at`.

**Razão:** Separar proposals de conversas permite auditoria independente. `expires_at` previne proposals fantasma acumulando indefinidamente.

**INV:** Agentes nunca mudam `status` de `pending → executed` diretamente — a transição requer ação humana explícita (UPDATE com `reviewed_by` do usuário).

### 6. Rota `/staff` separada do OS principal [DEC]

Painel admin multi-tenant vive em `/staff/*`, não no Dock. Acesso via navegação direta ou link. Verificação de role `staff` no JWT (TODO: middleware).

**Razão:** Staff não é membro de nenhuma company específica — sua perspectiva é cross-tenant. Misturá-la com o Dock (que é por-company) criaria inconsistência de contexto.

**Segurança:** Rota `/staff` deve verificar `claims.is_staff=true` no JWT antes de renderizar. Todo acesso staff emite `platform.staff.access` + notifica owner (transparência obrigatória).

### 7. Apps Governança e Auditoria com minRole: admin [DEC]

`GovernancaApp` e `AuditoriaApp` ficam no Dock mas com `minRole: "admin"`. O Dock renderiza todos os apps do registry — filtragem por role é responsabilidade do AppShell futuro ou middleware de routing.

**Razão:** Members não precisam de visibilidade sobre capabilities de agentes ou logs de auditoria. Admin e owner têm contexto e responsabilidade para interpretar essas informações.

---

## Arquitetura resultante (Sprint 6 completo)

```
apps/shell-commercial/
  src/
    apps/
      drive/          M41 — Drive (pastas, upload, breadcrumb)
      pessoas/        M42 — Pessoas (CRUD, desativação dual-confirm)
      chat/           M43 — Chat (canais, mensagens, Realtime stub)
      configuracoes/  M44 — Configurações (5 abas: perfil, empresa, plano, sistema, integrações)
      copilot/        M45+M46 — Copilot global (drawer, Shadow Mode, 5 intents)
      governanca/     M47 — Governança (agentes, capabilities, invariantes, shadow)
      auditoria/      M48 — Auditoria (SCP events, audit log, Trust Center P15)
    routes/
      staff.tsx       M49 — Painel Admin Multi-tenant (/staff)
```

---

## Débitos técnicos identificados (próximo sprint)

1. **Supabase driver integration**: todos os apps usam demo state. Driver real via `SupabaseDatabaseDriver` / `SupabaseStorageDriver` pendente.
2. **Realtime (Supabase)**: Chat não tem Realtime ativo — `channel().on('postgres_changes')` pendente.
3. **Staff role middleware**: `/staff` não verifica `claims.is_staff` — qualquer usuário autenticado pode acessar.
4. **Copilot agent INSERT**: `DEMO_AGENT_ID` hardcoded — produção deve inserir em `kernel.agents` antes de usar o Copilot.
5. **platform.staff.access**: emissão SCP de acesso staff não implementada.
6. **SCP events do Copilot**: `agent.copilot.message_sent` e `agent.copilot.action_proposed` não são emitidos (KernelPublisher não conectado no browser).
7. **RAG/pgvector**: Copilot sem busca semântica — fallback para hints inline de Drive.
8. **Langfuse + OTel collector**: containers em restart loop desde Sprint 5 (falta de chave Anthropic real).

---

## Aprovação

- [ ] Revisão humana obrigatória antes de merge em produção
- [ ] Verificar `pnpm ci:full` em ambiente limpo
- [ ] Configurar `VITE_LITELLM_KEY` com chave virtual antes de habilitar Copilot em produção

_Gerado por Claude Code em sprint autônomo. ADR é humano — este documento precisa de revisão e aprovação explícita._
