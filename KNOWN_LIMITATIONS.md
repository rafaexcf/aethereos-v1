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
