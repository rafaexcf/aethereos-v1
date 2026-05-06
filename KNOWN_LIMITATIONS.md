# KNOWN_LIMITATIONS.md

Limitações conhecidas. Última revisão: **Sprint 32 MX180** (selo final Camada 1).
Histórico: Sprint 20 MX108 (pré-staging), Sprint 31 MX174 (gates finais), Sprint 32 (re-revisão).

Status legend:

- **OPEN** — não resolvida, ativa
- **ACCEPTED_F1** — aceita para Fase 1, resolução planejada para F2+
- **DEFERRED** — adiada para sprint futuro próximo
- **WONTFIX** — não será corrigida (justificativa documentada)
- **VALIDATED_MANUALLY** — não há cobertura automática mas foi validada manualmente
- **RESOLVED** — corrigida (mantida na seção RESOLVIDOS abaixo)

---

## KL-1 — Multiple GoTrueClient instances detected — **WONTFIX**

**Sintoma:** Warning amarelo no console do browser após login.
**Causa:** 6 calls separadas a `createClient()` em `packages/drivers-supabase/src/{auth,data,storage,vector}/*-driver.ts`. Cada driver mantém sua própria instância para isolar concerns.
**Impacto:** Não-crítico. Não causa falha funcional. Refresh tokens podem ser sincronizados duplicadamente, mas não há bug observado.
**Decisão Sprint 20:** **WONTFIX**. Refatorar para factory/DI compartilhado ampliaria escopo significativamente e os 6 drivers se beneficiam de configurações independentes (storage usa service_key, auth usa anon, etc.). Warning é inofensivo no contexto multi-driver-pattern.
**Sprint de origem:** 12.1 — auditado em Sprint 20 MX108.

---

## KL-2 — scp-registry alias aponta para source em vez de dist — **WONTFIX**

**Sintoma:** Vite alias `@aethereos/scp-registry → packages/scp-registry/src/index.ts`.
**Causa:** Adicionado intencionalmente para HMR funcionar sem rebuild prévio.
**Impacto:** Apenas dev-time. Em prod (`pnpm build`), Rollup processa a source corretamente — sem efeito no bundle final. Confirmado em build-time validations.
**Decisão Sprint 20:** **WONTFIX**. Remover o alias forçaria `pnpm --filter @aethereos/scp-registry build` antes de cada `pnpm dev`, prejudicando DX sem benefício real. Manter.
**Sprint de origem:** 12.1 — auditado em Sprint 20 MX108.

---

## KL-5 — Vercel deploy preview ainda não configurado — **DEFERRED (Sprint 21)**

**Sintoma:** PRs não geram URL de preview automático em vercel.app.
**Causa:** Configuração requer (1) conta Vercel ativa, (2) `npx vercel login` interativo, (3) `npx vercel link`, (4) env vars no dashboard, (5) GitHub integration. Nada disso pode ser feito por agente autônomo.
**Impacto:** Sem preview URLs em PRs. Reviewers precisam rodar local pra validar visual.
**Decisão Sprint 20:** **DEFERRED para Sprint 21** (staging deploy é o objetivo desse sprint). Build command: `pnpm --filter @aethereos/shell-commercial build`. Output: `apps/shell-commercial/dist`. Preferir `vercel.json` na raiz para configuração declarativa.
**Sprint de origem:** 14 (MX70).

---

## KL-6 — Validação E2E manual do BYOK Copilot com LLM real — **VALIDATED_MANUALLY**

**Sintoma:** Não há teste E2E automatizado que valide o Copilot conversando com um LLM real (OpenAI/Anthropic/Groq/LM Studio).
**Causa:** Validação requer API key real ou LM Studio/Ollama instalados localmente. Não armazenamos API keys no repo.
**Cobertura existente:** unit tests `__tests__/byok-llm-driver.test.ts` cobrem POST/headers/body para os 3 formatos (openai/anthropic/google) + erros 429/401/network/abort.
**Decisão Sprint 20:** **VALIDATED_MANUALLY**. Wiring testado em unit + Sprint 15 confirmou conversa real. Para staging, reviewer humano executa o checklist manual abaixo.

**QA manual checklist:**

1. Configurações > IA > escolher provedor (ex: OpenAI)
2. Colar API key real (sk-...)
3. Clicar "Testar conexão" → "Conexão OK"
4. Salvar → abrir Aether AI Copilot
5. Banner "Modo Degenerado" deve sumir
6. Enviar mensagem → resposta real do modelo
7. Verificar `kernel.copilot_messages` (model = nome do provedor, não "degraded")

**Fix futuro (F2):** mock provider OpenAI-compatible em `tooling/e2e/mock-llm/` (servidor express com fixtures determinísticas) + teste E2E que configura Custom apontando pra ele.
**Sprint de origem:** 15 (MX76).

---

## KL-7 — SCP pipeline em modo inline (sem fan-out cross-host) — **ACCEPTED_F1**

**Sintoma:** scp-worker consome eventos do outbox e distribui apenas para consumers em-processo. Em multi-host (F2+), eventos NÃO se propagam entre instâncias.
**Causa:** NATS local funcionou dentro do container mas não acessível via host (port forwarding WSL2). Por R13 do Sprint 18 optou-se pelo modo inline. Pacote `@aethereos/drivers-nats` permanece para uso futuro.
**Impacto F1:** Single-host funciona perfeitamente. `FOR UPDATE SKIP LOCKED` garante non-overlap entre múltiplos workers locais lendo o mesmo outbox.
**Decisão Sprint 20:** **ACCEPTED_F1**. Fan-out cross-host é exclusivamente F2+.
**Fix futuro (F2):** ressuscitar drivers-nats, criar `SCP_MODE=inline|nats` env switch, publicar pra subject `scp.<event_type>` paralelo ao INSERT no outbox.
**Sprint de origem:** 18 (MX90).

---

## KL-8 — EmbeddingConsumer só lê texto cru (sem extração de PDF binário) — **ACCEPTED_F1**

**Sintoma:** Upload de PDF binário em Drive faz EmbeddingConsumer ler bytes como texto via Storage REST GET — embeddings ficam ruins para RAG.
**Causa:** EmbeddingConsumer usa `await res.text()` direto. mime types text/plain e text/markdown funcionam; application/pdf precisa de extrator (pdf-parse, unpdf).
**Impacto F1:** PDFs degradam silenciosamente em RAG. Não bloqueia outros consumers (audit + notification corretos).
**Decisão Sprint 20:** **ACCEPTED_F1**. Adicionar `pdf-parse` é trivial mas não-prioritário pré-staging.
**Workaround atual:** Já há skip-by-mime; basta tirar `application/pdf` de `SUPPORTED_TYPES` se a qualidade do RAG estiver visivelmente comprometida.
**Fix futuro:** Adicionar `pdf-parse` em scp-worker, branchar por mime_type → extrair texto → chunkificar.
**Sprint de origem:** 18 (MX93).

---

## KL-10 — Sentry sem DSN configurado — **DEFERRED (pós-dogfood)**

**Sintoma:** `lib/observability.ts` (Sprint 31 MX171) reporta erros via console.error caso `window.Sentry` não esteja inicializado. Em produção atualmente não há Sentry rodando.
**Causa:** R11 do Sprint 31 limita Sentry a 1h de setup. Optamos pela rota lightweight: hook pronto, sem dependência opcional no bundle, ativável depois via VITE_SENTRY_DSN + script CDN ou `@sentry/browser`.
**Impacto:** Erros em prod ficam apenas em console do browser do usuário e Vercel logs (via `[obs] error` prefix). Sem agregação cross-user, sem alerting automatizado.
**Mitigação:** Captura via `installGlobalErrorHandlers()` permanece operacional. ErrorBoundary roteia via `reportError()`.
**Próximo passo:** habilitar Sentry quando dogfood gerar tráfego significativo (>10 erros/dia).
**Sprint de origem:** 31 (MX171).

---

## KL-11 — Eval dataset Copilot com 50 queries (seed) — **DEFERRED (dogfood 30 dias)**

**Sintoma:** `docs/copilot-eval-dataset.json` tem 50 queries (rag/proposal/direct/decline). Gate 4 da Fase 1 pede 500+ queries.
**Causa:** Sintetizar 500 queries sem uso real produz dataset enviesado para o que o time imagina, não para o que usuário pergunta. R12 do Sprint 31: dataset é seed.
**Impacto:** Métrica de eval do Copilot fica em modo manual/qualitativo até dataset crescer.
**Mitigação:** Logar queries reais (anonimizadas) em produção e revisar semanalmente para enriquecer o dataset.
**Próximo passo:** sprint pós-dogfood com 30 dias de uso real → expansão automática + sistema de eval rodando contra o Copilot.
**Sprint de origem:** 31 (MX173).

---

## KL-12 — Pen test externo pendente — **DEFERRED (pós-dogfood)**

**Sintoma:** `docs/SECURITY_CHECKLIST.md` tem 13/13 vetores como MITIGADO mas Gate 6 só fecha 100% após pen test externo.
**Causa:** Pen test exige (1) ambiente staging com tráfego, (2) contratação de fornecedor especializado, (3) janela de 2-4 semanas para execução e remediação.
**Impacto:** Gate 6 permanece PARCIAL. Findings de pen test podem revelar vetores não mapeados.
**Mitigação:** Checklist interno revisado a cada 90 dias. Bug bounty (informal) via SECURITY.md.
**Próximo passo:** sprint dedicada após 30 dias de dogfood com fornecedor selecionado.
**Sprint de origem:** 31 (MX174).

---

## KL-13 — Migrations Supabase sem deploy automático — **OPEN (info)**

**Sintoma:** `supabase db push --linked` é passo manual após merge em main, antes do Vercel deploy completar.
**Causa:** Action que roda push automático precisa de OIDC ou senha do banco no GitHub Secrets — risco operacional não justificado para volume atual.
**Impacto:** Esquecer o push pode resultar em frontend novo + schema antigo = erros em produção.
**Mitigação:** Runbook `docs/runbooks/auto-deploy.md` documenta o fluxo seguro. PR template (futuro) com checkbox.
**Próximo passo:** automatizar via GitHub Action quando volume justificar.
**Sprint de origem:** 31 (MX172).

---

## KL-9 — pnpm.overrides para vulnerabilidades transitivas — **OPEN (info)**

**Sintoma:** `package.json` raiz tem 7 entries em `pnpm.overrides` para forçar versões patched de deps que estavam transitivamente desatualizadas (Sprint 20 MX104).
**Causa:** Vulnerabilidades em deps transitivas (happy-dom via vitest, serialize-javascript via workbox, etc.) não tinham fix sem upgrade major das deps diretas.
**Impacto:** Nenhum operacional. Build, typecheck, lint, tests, E2E todos verdes pós-overrides. Mas adiciona manutenção: cada `pnpm install` precisa respeitar os overrides; se um update direto trouxer fix, o override fica stale.
**Decisão Sprint 20:** **OPEN (info-level)**. Manter overrides até que pacotes upstream propaguem os fixes naturalmente.
**Mitigação:** Revisar mensalmente — `pnpm audit && pnpm outdated` — e remover overrides obsoletos quando deps diretas atualizarem.
**Sprint de origem:** 20 (MX104).

---

## KL-14 — God components em configuracoes/magic-store (Sprint 33 MX188) — **ACCEPTED_F1**

**Sintoma:** `apps/configuracoes/index.tsx` (7278 linhas) e `magic-store/MagicStoreApp.tsx` (3414 linhas) são monolíticos. Sintomas clássicos de god component (alta complexidade, múltiplas responsabilidades).
**Causa:** crescimento orgânico ao longo de Sprints 6-30, nunca pago de volta porque (a) ambos funcionam corretamente em produção, (b) sprints priorizaram features novas, (c) cada split exige E2E novo para evitar regressão silenciosa.
**Impacto:** dívida técnica de manutenção. Modificar uma seção exige carregar 7000 linhas de contexto. Risco de modificações inadvertidas em outras seções.
**Estado atual:** `gestor` já está decomposto (28 tabs em arquivos separados). `configuracoes` e `magic-store` continuam monolíticos.
**Decisão Sprint 33:** **ACCEPTED_F1**. Refatorar agora seria sem cobertura de testes que validem o split — risco de regressão silenciosa durante 30 dias de dogfood. Plano: sprint dedicada pós-dogfood com E2E-first.
**Workaround atual:** code review extra-cuidadoso ao tocar nesses arquivos. Adicionar tests E2E novos antes de tocar em UX.
**Fix futuro (sprint pós-dogfood):**

1. Escrever E2E por tab/seção ANTES da refatoração.
2. Refatorar incrementalmente (1 tab por commit) com CI E2E como gate.
3. Padrão alvo: shell + tabs em arquivos separados (mesmo padrão de gestor).
   **Sprint de origem:** identificado em Sprint 20 MX107, documentado MX188.
   **Doc:** `docs/runbooks/sprint-33-god-component-refactor.md`.

---

## RESOLVIDOS

### ~~KL-3 — 3 testes E2E de onboarding skipped~~ — RESOLVIDO Sprint 14 MX66

Resolvido via seed de company "Onboarding Test Co" (slug `onbtest`, id `10000000-0000-0000-0000-000000000099`, `onboarding_completed=false`) + user dedicado `onboarding.user@onbtest.test` + helper `loginAsOnboardingUser` + env vars `E2E_ONBOARDING_*`. 3 testes saem de skipped → passing.

### ~~KL-4 — 1 teste E2E os-shell:66 conditional skip~~ — RESOLVIDO Sprint 14 MX67

Resolvido reescrevendo o teste para usar Dock (apps fixos do registry) ao invés de Mesa icons (variável conforme `mesa_layouts` do user). Novo helper `waitForDesktopReady` espera os-desktop + dock + 1 `dock-app-*` button. 5/5 testes os-shell passam consistentemente em 3 runs consecutivas.
