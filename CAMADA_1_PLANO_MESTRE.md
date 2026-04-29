# Plano-mestre — Consolidação da Camada 1

> Documento estratégico de 3 sprints cobrindo o gap entre o estado atual (após Sprint 4) e a Camada 1 considerada "completa" pela Fundamentação. Após esses 3 sprints, Camada 2 (verticais) está liberada para construção.
>
> **Status:** plano. Cada sprint individual vira `SPRINT_N_PROMPT.md` no momento da execução.

---

## Estado atual (após Sprint 4)

**Entregue:**

- Kernel agnóstico (SCP, audit, permissions, invariants)
- Driver Model com 10 interfaces canônicas
- Camada 0 funcional (shell-base, drivers-local, BUSL-1.1)
- Camada 1 base (shell-commercial, drivers-supabase, drivers-nats, scp-worker)
- comercio.digital como primeiro SaaS standalone (Camada 2 prematura — funcionalmente pronto mas sem suporte completo da plataforma abaixo)
- 4 ADRs (0001, 0014, 0015, 0016, 0017)
- ~40 commits, ~85 testes, CI verde

**Faltando para Camada 1 estar completa:**

- Infra operacional (LiteLLM, Langfuse, Unleash, OTel)
- Apps internos do shell-commercial (Copilot, Governance, Drive, Pessoas, Chat, Configs)
- Hardening do SCP (Ed25519 real, hash chain, replay validation)
- Workflow engine (Temporal) para fluxos longos
- IaC (Pulumi) e estratégia de deploy
- Sistema de notificações unificadas
- Fallback graceful (P14 — Modo Degenerado)
- Billing usage-based (Lago)

**Ordem da consolidação foi decidida assim:**

```
Sprint 5 (Fundação operacional)
  → Sprint 6 (Apps internos + IA)
    → Sprint 7 (Hardening + IaC + Pre-prod)
      → Camada 2 liberada (logitix, kwix, autergon)
```

Lógica: infra operacional (LiteLLM/Langfuse/Unleash/OTel) é dependência de tudo que vem depois. Apps internos consomem essa infra. Hardening + IaC vêm por último porque são preparação para produção real.

---

## Sprint 5 — Fundação operacional

> Detalhamento completo em `SPRINT_5_PROMPT.md` (gerado junto a este plano).

**Objetivo:** Camada 1 ganha sistema nervoso central. Toda feature subsequente passa a ter observabilidade, controle de feature flags e gateway de LLM.

**Milestones (M32-M40, 9 milestones):**

- **M32 — LiteLLM gateway local + LLMDriver concreto.** Container Docker LiteLLM no `docker-compose.dev.yml`. Configuração com providers múltiplos (Anthropic, OpenAI). `LiteLLMDriver` implementando `LLMDriver`. Roteamento adaptativo simples (custo, fallback).
- **M33 — Langfuse self-hosted local + ObservabilityDriver concreto.** Container Langfuse + Postgres. `LangfuseObservabilityDriver`. Instrumentação automática de toda chamada LLM via LiteLLM (traces, custos, qualidade).
- **M34 — Unleash self-hosted local + FeatureFlagDriver concreto.** Container Unleash + Postgres. `UnleashFeatureFlagDriver`. Estratégia de segmentação por `company_id`, `plan`, `role`. UI Unleash acessível em localhost.
- **M35 — OpenTelemetry stack: Tempo + Loki + Prometheus + Grafana.** Container compose completo. SDK OTel-JS instrumentado nos apps (shell-commercial, scp-worker, comercio.digital). Traces fluem para Tempo, logs para Loki, métricas para Prometheus, dashboards iniciais em Grafana.
- **M36 — Correlation ID propagation end-to-end.** Toda request HTTP, todo evento SCP, toda invocação LLM compartilham `correlation_id` via OTel context. Validação: cliquei em produto → trace mostra request → checkout → Stripe webhook → outbox → NATS → consumer → audit.
- **M37 — Sistema de notificações unificadas.** Tabela `kernel.notifications` + `NotificationDriver` interface + implementação Supabase (insert + Realtime broadcast). UI mínima no shell-commercial: badge de count + drawer com lista. Eventos `platform.notification.dispatched`.
- **M38 — Modo Degenerado (P14) operacionalizado.** Pattern de fallback explícito em todo driver: se LLM offline → return canned response com warning; se Langfuse offline → log local + alerta; se feature flag offline → default conservador. Decorator/wrapper helper em `packages/kernel/src/degraded/`.
- **M39 — Health checks + readiness probes.** `/healthz` e `/readyz` em todos os apps backend. Dashboard "Operações" no shell-commercial mostrando status de todos os serviços. Toda integração externa reportando saúde.
- **M40 — ADR-0018 + encerramento Sprint 5.** ADR-0018: arquitetura de observabilidade e feature flags. Atualização CLAUDE.md. Relatório executivo. CI EXIT 0.

**Critério de aceite agregado:** dashboards Grafana mostram métricas reais ao usar comercio.digital localmente. Feature flag desliga checkout em segmentos específicos. LLM call passa por LiteLLM, gera trace em Langfuse, custo aparece em dashboard.

**Estimativa:** 6-10 horas. Custo: US$ 40-70 em tokens.

---

## Sprint 6 — Apps internos da Camada 1 + AI Copilot

> Detalhamento completo será gerado quando Sprint 5 concluir.

**Objetivo:** shell-commercial vira útil de verdade. Apps internos que toda empresa precisa, AI Copilot estrutural.

**Milestones (M41-M50, 10 milestones, esboço):**

- **M41 — App Drive funcional.** UI de gestão de arquivos sobre Supabase Storage. Pastas, versionamento, permissões. Eventos `platform.file.*`. Integra com ui-shell.
- **M42 — App Cadastro de Pessoas.** CRUD de colaboradores com tabela `kernel.people` + memberships. UI completa. Vincula a `kernel.users` quando há login.
- **M43 — App Chat interno.** Supabase Realtime. Canais (broadcast) e DMs (1-a-1). Message persistence. Eventos `platform.message.sent`. UI no shell.
- **M44 — App Configurações.** Perfil, empresa, plano, sistema, integrações. Cada aba é Server Component. Settings persistidos em `kernel.settings` JSONB.
- **M45 — AI Copilot estrutural — UI base.** Atalho global no shell (`/` ou `Cmd+K`). Drawer lateral. Chat com streaming. RAG inicial sobre documentos do Drive. Citação clicável de fontes.
- **M46 — AI Copilot — Action Intents tipadas.** Schema Zod para 3-5 ações iniciais (criar nota, buscar produto, listar pedidos). Modo sombra obrigatório (Copilot sugere, humano executa). Tela de aprovação.
- **M47 — App Governança (preview).** UI para configurar políticas, capability tokens, supervisão de agentes. Editor visual simples (sem React Flow ainda). Lista de invariantes 12.4 em read-only.
- **M48 — App Auditoria + Trust Center.** Lista de eventos SCP filtráveis por tenant/actor/tipo. Métricas: hit rate de LLM, custo, eventos/dia. Cobre P11 (eventos auto-certificáveis — visualização das assinaturas).
- **M49 — Painel Admin Multi-tenant (perspectiva staff).** Acessível só para staff Anthropic-equivalente. Gestão de companies, memberships, planos, suspensão. Audit de cada acesso staff.
- **M50 — ADR-0019 + encerramento Sprint 6.** ADR-0019: AI Copilot e modelo de agentes em produção. Métricas Sprint 6.

**Estimativa:** 8-14 horas. Custo: US$ 50-90.

---

## Sprint 7 — Hardening + IaC + Pre-prod

> Detalhamento completo será gerado quando Sprint 6 concluir.

**Objetivo:** Camada 1 vai para produção real (ou está pronta para). Hardening crítico, IaC declarativa, deploy testado.

**Milestones (M51-M60, 10 milestones, esboço):**

- **M51 — Ed25519 efetivo nos eventos SCP.** Atualmente é placeholder. Geração de keypairs por origem, assinatura no publish, verificação no consume. Rejeitar eventos com assinatura inválida. P11 cumprido.
- **M52 — Hash chain opcional para Event Store.** Cada evento referencia hash do anterior (por tenant/scope). Detecção de tamper. Validação batch.
- **M53 — Replay validation + dedup robusta.** UUID v7 + idempotency_key combinados. Worker rejeita reprocessamento. Testes adversariais (replay attack, out-of-order).
- **M54 — Temporal local + workflows iniciais.** Container Docker Temporal. SDK TS. Primeiros 2 workflows: onboarding completo (com retomada se falha parcial) e modo sombra de agente (decisão proposta → expira em N horas se humano não aprova).
- **M55 — Pulumi TS — IaC para staging.** Stack Pulumi cobrindo: Supabase project (via API), Vercel deployment de comercio.digital + shell-commercial, NATS managed (Synadia ou self-host), DNS, secrets via Pulumi config. Staging env funcional.
- **M56 — Lago billing usage-based — preview.** Container Lago local. Modelagem dos eventos billáveis: events SCP/mês, queries vetoriais, tokens LLM, storage GB. Connect com Stripe como gateway. UI placeholder no Painel Admin.
- **M57 — Stripe live + comercio.digital deploy real (staging).** Decisão crítica do humano: chaves live. Webhook configurado. Cliente test fictício. Deploy staging funcional.
- **M58 — Backup + DR procedure.** RTO/RPO documentados. Backup automatizado de Supabase. Procedure de restore testado. Runbook para incidente.
- **M59 — Adversarial testing.** Time agêntico simulado: tenta SQL injection, RLS bypass, replay attack, agente fora de escopo. Documentar falhas e corrigir.
- **M60 — ADR-0020 + Camada 1 declarada completa.** ADR consolidando estado de prod-ready. Atualização Fundamentação se necessário (proposta humana). Bandeira: Camada 2 (logitix, kwix, autergon) liberada.

**Estimativa:** 10-16 horas. Custo: US$ 60-120.

---

## Decisões humanas pendentes ao longo do plano

Durante a execução desses 3 sprints, alguns pontos exigem decisão humana antes do agente prosseguir. Listados aqui para você se preparar:

1. **Sprint 5 / M32:** Você quer que LiteLLM rote para Anthropic+OpenAI ou só um provider? Isso afeta `.env.local.example`. Recomendo dois para validar fallback.

2. **Sprint 5 / M34:** Unleash tem variant de plano comunidade open source (gratuito) e enterprise (pago). Self-host comunitário cobre tudo deste sprint. Confirmar opção quando chegar lá.

3. **Sprint 6 / M45:** RAG inicial usa qual base — só docs do Drive da company ativa, ou também eventos SCP da company? Recomendo só Drive primeiro, eventos depois.

4. **Sprint 6 / M46:** Quais 3-5 Action Intents iniciais? Sugiro: criar produto, atualizar pedido, buscar nota fiscal, listar relatório, agendar reunião. Você decide quando chegar lá.

5. **Sprint 7 / M55-M57:** Esse é o ponto onde dinheiro real começa. Custos previsíveis em staging: Supabase Pro $25, Vercel $20, domínio $30/ano, NATS managed ~$50, Stripe sem custo fixo. Total ~$100-120/mês para staging operante. Decidir antes do sprint começar.

6. **Sprint 7 / M57:** Stripe live exige você criar conta Stripe verificada (pessoa física ou jurídica brasileira), ativar pagamentos, KYC. Não é instantâneo — pode levar 1-3 dias úteis. Iniciar processo durante Sprint 5 ou 6 para não bloquear.

7. **Sprint 7 / M59:** Adversarial testing pode revelar falha grave que exige refactor. Reservar 1-3 dias de buffer.

---

## Critério de "Camada 1 completa"

Após Sprint 7, considera-se Camada 1 completa quando:

- Todos os 10 drivers do Driver Model têm implementação Cloud funcional ✓
- Apps internos do shell-commercial cobrem operação básica de uma empresa (Drive, Pessoas, Chat, Configs, Notificações)
- AI Copilot estrutural funciona em modo sombra com 3+ Action Intents
- App Auditoria/Trust Center expõe os eventos SCP corretamente
- Eventos SCP são auto-certificáveis com Ed25519 efetivo
- Workflow engine (Temporal) suporta fluxos longos com retomada
- IaC Pulumi sobe staging com 1 comando
- Backup/DR procedure documentado e testado
- Métricas de saúde (latência, custos LLM, taxa de erro) visíveis em Grafana
- comercio.digital roda em staging real, com Stripe live, validado por usuário-piloto

A partir desse ponto, Camada 2 (logitix, kwix, autergon) replica padrões já estabelecidos. Velocidade aumenta significativamente porque infra já existe.

---

## Riscos identificados

**R-PLM-1.** Dependências entre sprints. Sprint 6 assume Sprint 5 entregue. Se M35 (OTel) falhar, Sprint 6 perde observabilidade. Mitigação: regra R3 dos sprints (após 3 tentativas, marcar BLOQUEADA, não bloqueia próximas milestones).

**R-PLM-2.** Custo financeiro acumulado. 3 sprints × $50-100 cada = $200-300 em tokens. Mais $100-200 de infra staging em Sprint 7. Total $300-500 nos próximos 2-4 dias. Confortável dentro do orçamento declarado mas vale visibilidade.

**R-PLM-3.** Acúmulo de dívida de revisão. 4 sprints já passaram sem revisão humana linha-a-linha. Mais 3 = 7 sprints sem revisão. Em algum momento isso vira problema. Mitigação sugerida: após Sprint 5 (fim da fundação operacional), pausa de 1-2 dias para revisão crítica antes de Sprint 6. Você decide.

**R-PLM-4.** Fadiga de calibração. Cada sprint começa com leitura completa de Fundamentação + ADRs + log. Em Sprint 7 isso é ~700KB de doc. O agente pode começar a comprimir leitura. Mitigação: prompt de retomada robusto, validação independente humana (você rodando `pnpm ci:full` após cada sprint).

**R-PLM-5.** Decisões de produto ainda pendentes. Quem é cliente do comercio.digital? Quanto custa? Quem dá suporte? O plano constrói infra mas não responde isso. Sprint 7 pode entregar staging funcional para vácuo de mercado.

---

## Próximo passo imediato

Sprint 5 detalhado está em `SPRINT_5_PROMPT.md` (gerado junto a este plano). Use-o agora.

Sprints 6 e 7 não existem ainda — vou produzir cada um quando o anterior fechar com EXIT 0.

---

**Fim do plano-mestre.**
