# KNOWN_LIMITATIONS.md

Limitações conhecidas, não críticas, não corrigidas intencionalmente.
Cada entry indica o sprint de origem e por que não foi corrigido agora.

---

## KL-1 — Multiple GoTrueClient instances detected

**Sintoma:** Warning amarelo no console do browser após login.  
**Causa:** Múltiplas chamadas a `createClient()` de `@supabase/supabase-js` com mesmas credenciais. Supabase JS v2 detecta isso e emite warning.  
**Impacto:** Não-crítico. Não causa falha funcional. Pode causar múltiplos refresh token cycles.  
**Origem:** Sprint 12. `SupabaseBrowserAuthDriver` e `SupabaseBrowserDataDriver` criam clientes independentes.  
**Fix futuro:** Singleton do Supabase client compartilhado entre drivers via factory/DI. Requer ADR.  
**Sprint de origem:** 12.1 (diagnóstico) — não corrigido para não ampliar escopo.

---

## KL-2 — scp-registry alias aponta para source em vez de dist

**Sintoma:** Vite alias `@aethereos/scp-registry → packages/scp-registry/src/index.ts`.  
**Causa:** Adicionado para garantir que mudanças na source sejam refletidas sem rebuild. Dist existe mas pode estar desatualizado.  
**Impacto:** HMR funciona para mudanças no registry. Em prod (`pnpm build`), Rollup processa a source corretamente.  
**Fix futuro:** Rebuildar scp-registry antes de dev e remover o alias, ou usar Turbo watch.  
**Sprint de origem:** 12.1 — alias mantido intencionalmente.

---

## KL-6 — Validacao E2E manual do BYOK Copilot com LLM real (Sprint 15 MX76)

**Sintoma:** Não há teste E2E automatizado que valide o Copilot conversando com um LLM real (OpenAI/Anthropic/Groq/LM Studio/etc).
**Causa:** Validação requer (a) API key real do usuário em algum provedor cloud, ou (b) LM Studio/Ollama instalados localmente. Não é viável armazenar API keys reais no repo (R10) e LM Studio não é instalado pelo agente.
**Impacto:** Wiring (BYOKLLMDriver → LLMDriverSwap → Copilot) está testado por `code review` + unit tests do BYOK driver (10/10), mas o cenário "abrir Copilot, mandar mensagem, receber resposta real" só pode ser testado manualmente.
**Cobertura existente:** unit tests `__tests__/byok-llm-driver.test.ts` cobrem POST/headers/body para os 3 formatos (openai/anthropic/google) + erros 429/401/network/abort. typecheck e lint full repo EXIT 0. E2E suite (Playwright) confirma que o shell ainda boota e o Copilot abre — só não envia mensagem real.
**QA manual checklist:**

1. Configurações > IA > escolher provedor (ex: OpenAI)
2. Colar API key real (sk-...)
3. Clicar "Testar conexão" → deve mostrar "Conexão OK"
4. Salvar
5. Abrir Aether AI Copilot
6. Banner "Modo Degenerado" deve sumir após primeira mensagem
7. Enviar mensagem → resposta real do modelo
8. Verificar histórico em kernel.copilot_messages (model = nome do provedor, não "degraded")

**Fix futuro (Sprint 16+):** mock provider OpenAI-compatible em `tooling/e2e/mock-llm/` (servidor express que retorna fixtures determinísticas) + teste E2E que configura Custom apontando pra ele.
**Sprint de origem:** 15 (MX76).

---

## KL-7 — SCP pipeline em modo inline (sem fan-out cross-host) (Sprint 18)

**Sintoma:** scp-worker consome eventos do outbox e distribui apenas para consumers em-processo. Em multi-host (F2+), eventos NÃO se propagam entre instâncias — cada worker só roda seus próprios consumers.  
**Causa:** NATS JetStream local funcionou dentro do container mas não foi acessível via 127.0.0.1:4222 do host (port forwarding WSL2 falho). Por R13 do spec (limite 30min) optou-se pelo modo inline. Pacote `@aethereos/drivers-nats` permanece para uso futuro.  
**Impacto:** Single-host hoje funciona perfeitamente (FOR UPDATE SKIP LOCKED garante non-overlap entre múltiplos workers locais lendo o mesmo outbox). Para fan-out real cross-host (consumers especializados em hosts diferentes) precisará ligar NATS.  
**Fix futuro (F2+):** ressuscitar drivers-nats, criar SCP_MODE=inline|nats env switch, publicar pra subject `scp.<event_type>` paralelo ao INSERT no outbox, consumers virarem subscribers do NATS.  
**Sprint de origem:** 18 (MX90 decisão).

---

## KL-8 — EmbeddingConsumer só lê texto cru (sem extração de PDF binário) (Sprint 18)

**Sintoma:** Upload de PDF binário em Drive faz EmbeddingConsumer ler bytes como texto via Storage REST GET — chunkificação fica corrompida e embeddings são lixo.  
**Causa:** EmbeddingConsumer usa `await res.text()` direto sem checar Content-Type real. mime types declarados em `kernel.files.mime_type` são confiáveis para text/plain e text/markdown mas application/pdf precisa de extrator (pdf-parse, unpdf etc.).  
**Impacto:** PDFs uplodados degradam silenciosamente — embeddings populados mas qualidade ruim em RAG. Não bloqueia outros consumers (audit + notification continuam corretos).  
**Workaround atual:** Já há skip-by-mime; basta tirar `application/pdf` de SUPPORTED_TYPES até ter extrator.  
**Fix futuro:** Adicionar `pdf-parse` em scp-worker, branchar por mime_type → extrair texto → chunkificar.  
**Sprint de origem:** 18 (MX93 escopo controlado).

---

## KL-5 — Vercel deploy preview ainda nao configurado (Sprint 14 MX70)

**Sintoma:** PRs nao geram URL de preview automatico em vercel.app.  
**Causa:** MX70 do Sprint 14 estava marcado como opcional. A configuracao requer (1) conta Vercel ativa do humano, (2) `npx vercel login` interativo, (3) `npx vercel link` para associar o projeto, (4) variaveis de ambiente do shell-commercial no dashboard Vercel (VITE_SUPABASE_URL etc), (5) GitHub integration habilitada para preview em PRs. Nada disso pode ser feito por agente autonomo (R8 do CLAUDE.md + acoes visiveis externas).  
**Impacto:** Sem preview URLs em PRs. Reviewers precisam rodar local pra validar visual.  
**Fix futuro (Sprint 15):** humano roda os 5 passos acima. Build command: `pnpm --filter @aethereos/shell-commercial build`. Output: `apps/shell-commercial/dist`. Pode usar `vercel.json` na raiz para configuracao declarativa (preferivel a clicks no dashboard).  
**Sprint de origem:** 14 (MX70 deferida).

---

## RESOLVIDOS

### ~~KL-3 — 3 testes E2E de onboarding skipped~~ — RESOLVIDO Sprint 14 MX66

Resolvido via seed de company "Onboarding Test Co" (slug `onbtest`, id `10000000-0000-0000-0000-000000000099`, `onboarding_completed=false`) + user dedicado `onboarding.user@onbtest.test` + helper `loginAsOnboardingUser` + env vars `E2E_ONBOARDING_*`. 3 testes saem de skipped → passing.

### ~~KL-4 — 1 teste E2E os-shell:66 conditional skip~~ — RESOLVIDO Sprint 14 MX67

Resolvido reescrevendo o teste para usar Dock (apps fixos do registry) ao invés de Mesa icons (variável conforme `mesa_layouts` do user). Novo helper `waitForDesktopReady` espera os-desktop + dock + 1 `dock-app-*` button (não depende mais de mesa-app button, que pode não existir se Mesa só tem widgets). 5/5 testes os-shell passam consistentemente em 3 runs consecutivas.
