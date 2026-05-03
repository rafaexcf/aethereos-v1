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

## KL-3 — 3 testes E2E de onboarding skipped (E2E_ONBOARDING_COMPANY_ID)

**Sintoma:** `tooling/e2e/tests/onboarding.spec.ts` (3 testes) skipam quando a env var `E2E_ONBOARDING_COMPANY_ID` não está setada.  
**Causa:** Os testes precisam de uma company com `onboarding_completed = false` E um usuário pertencente a ela. O seed atual (`tooling/seed/src/companies.ts`) cria 3 companies todas com `onboarding_completed: true` (line 75). O E2E user `ana.lima@meridian.test` pertence à Meridian que já tem onboarding completo, então login → vai direto para `/desktop` (não dispara o wizard).  
**Impacto:** Cobertura de E2E reduzida em 3 testes (8/32 do total). Wizard de onboarding não é validado automaticamente. Tem cobertura humana via QA manual no fluxo de criar nova company (`/select-company` → "Criar nova empresa" → wizard aparece para a company recém-criada).  
**Fix futuro (Sprint 14+):** (1) seed de uma 4ª company com `onboarding_completed: false` em ID conhecido (ex: `10000000-0000-0000-0000-000000000099`); (2) seed de membership do E2E user à essa company OU criar usuário dedicado; (3) helper `loginToOnboardingCompany(page)` que seleciona essa company específica em select-company; (4) setar `E2E_ONBOARDING_COMPANY_ID` em `.env.local`.  
**Por que não agora:** Requer modificar 3 arquivos de seed + criar pattern de "test company com estado específico" que pode evoluir para um framework. Spec MX62 explicitamente permite KNOWN_LIMITATION quando complexidade alta.  
**Sprint de origem:** 13 (MX62).

---

## KL-4 — 1 teste E2E os-shell:66 conditional skip (firstIcon visibility)

**Sintoma:** `tooling/e2e/tests/os-shell.spec.ts:66` ("closing all non-pinned tabs hides TabBar") skipa quando o primeiro ícone da Mesa não está visível no momento do `firstIcon.isVisible({ timeout: 5_000 })`.  
**Causa:** Mesa renderiza ícones a partir de `kernel.mesa_layouts` (fetch async). Em alguns runs o layout não está hidratado dentro de 5s — o `firstIcon` retorna invisible — `test.skip()` dispara. Os testes os-shell:51 e drive:48 (mesma checagem) variam: passam quando layout hidrata em tempo, skipam ou falham quando não. Drive:48 e os-shell:51 PASSARAM no run final, mas os-shell:66 skipou na mesma execução — comportamento racy entre testes.  
**Impacto:** Cobertura inconsistente do fluxo "fechar tabs → TabBar some". Coberta indiretamente por outros testes que abrem tabs (os-shell:51).  
**Fix futuro:** (1) seed determinístico de ícones na Mesa para a company de teste — eliminar a corrida; (2) helper `waitForMesaIcons(page)` que faz `await expect(page.locator('[data-testid="mesa-app"] button').first()).toBeVisible({ timeout: 15_000 })` antes de prosseguir.  
**Por que não agora:** Mexer no seed de mesa_layouts pode quebrar outros testes; preferível tratar a flakiness em sprint dedicada de stability.  
**Sprint de origem:** 13 (MX63).
