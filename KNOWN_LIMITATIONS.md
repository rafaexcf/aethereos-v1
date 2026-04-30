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
