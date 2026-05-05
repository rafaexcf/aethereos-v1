# STAGING_VALIDATION.md — Sprint 24 MX135

> Validação do primeiro deploy de staging.
> Data: **2026-05-05** (UTC).

---

## URLs

| Serviço          | URL                                                         |
| ---------------- | ----------------------------------------------------------- |
| Shell Frontend   | https://aethereos.vercel.app                                |
| Vercel deploy    | https://aethereos-h8ibszd3o-metaquantics.vercel.app         |
| Supabase API     | https://oublhirkojyipwtmkzvw.supabase.co                    |
| Vercel inspector | https://vercel.com/metaquantics/aethereos                   |
| Supabase admin   | https://supabase.com/dashboard/project/oublhirkojyipwtmkzvw |

Deployment ID: `dpl_2rsUdxtShEbbgQdcNgv9aiDcob3L`
Supabase ref: `oublhirkojyipwtmkzvw`
Vercel project: `metaquantics/aethereos`

---

## Checklist automatizado (AUTO PASS)

Executado via `curl` direto contra REST API + Edge Functions. Todos green.

| #   | Teste                    | Comando resumido                                        | Resultado                                             |
| --- | ------------------------ | ------------------------------------------------------- | ----------------------------------------------------- |
| 1   | Vercel HTML              | `GET https://aethereos.vercel.app/`                     | ✅ HTTP 200, 1179 bytes                               |
| 2   | Vercel JS bundle         | `<script src="/assets/index-HrY7nS9A.js">` referenciado | ✅ presente                                           |
| 3   | Auth login (meridian)    | `POST /auth/v1/token grant_type=password`               | ✅ HTTP 200 + JWT 1096b com `active_company_id` claim |
| 4   | Auth login (atalaia)     | idem com user de outra empresa                          | ✅ HTTP 200 + JWT 1106b                               |
| 5   | Schema kernel exposto    | `GET /rest/v1/people` com `Accept-Profile: kernel`      | ✅ HTTP 200, dados retornados                         |
| 6   | Multi-tenant isolation   | Meridian lista 3 pessoas próprias (UUIDs A)             | ✅ rows da própria company                            |
| 7   | Multi-tenant isolation   | Atalaia lista 3 pessoas próprias (UUIDs B ≠ A)          | ✅ rows distintos                                     |
| 8   | RLS cross-tenant denial  | Meridian tenta `people?id=eq.<atalaia_uuid>`            | ✅ retorna `[]` (RLS negou)                           |
| 9   | App registry global      | `GET /rest/v1/app_registry`                             | ✅ 53 entries (52 Sprint 21 + 1 demo Sprint 22)       |
| 10  | Edge fn scp-publish      | `POST /functions/v1/scp-publish` sem JWT                | ✅ HTTP 401 (validação interna funcionou, não 404)    |
| 11  | Edge fn cnpj-lookup      | `GET /functions/v1/cnpj-lookup` (público)               | ✅ HTTP 400 validação CNPJ funciona                   |
| 12  | Edge fn context-snapshot | `POST` com JWT meridian + entity válida                 | ✅ HTTP 200, JSON shape correto                       |

---

## Checklist manual (PENDENTE — aguarda validação humana)

> Esses passos exigem browser headed e validação visual. Reviewer humano executa
> abrindo `https://aethereos.vercel.app/` em Chrome/Edge.

| #   | Teste                                                  | Esperado                             | Status            |
| --- | ------------------------------------------------------ | ------------------------------------ | ----------------- |
| M1  | Splash screen ÆTHEREOS aparece                         | logo + animação                      | ⏳                |
| M2  | Login com `ana.lima@meridian.test` / `Aethereos@2026!` | redireciona pra desktop              | ⏳                |
| M3  | Dock renderiza com apps instalados                     | Drive, Pessoas, Chat, Magic Store    | ⏳                |
| M4  | Mesa (wallpaper + ícones)                              | renderiza sem flicker                | ⏳                |
| M5  | Abrir Drive                                            | tab abre, lista vazia                | ⏳                |
| M6  | Abrir Pessoas                                          | tab abre, lista 20 pessoas           | ⏳                |
| M7  | Abrir Magic Store                                      | catálogo com 53 apps + cards         | ⏳                |
| M8  | Instalar um app na Magic Store                         | aparece no Dock após install         | ⏳                |
| M9  | Configurações > IA                                     | seção BYOK provider config renderiza | ⏳                |
| M10 | Governança > Context Engine tab                        | tabela de records (vazia OK)         | ⏳                |
| M11 | Aether AI Copilot                                      | abre como modal sobre Dock           | ⏳                |
| M12 | Logout + login com `rafael.costa@atalaia.test`         | desktop com dados de Atalaia         | ⏳                |
| M13 | Abrir Pessoas em Atalaia                               | dados ≠ Meridian (RLS)               | ⏳                |
| M14 | Aether AI Copilot fala (BYOK obrigatório)              | resposta real do LLM                 | ⏳ (precisa BYOK) |

Para preencher M1-M14: humano abre `https://aethereos.vercel.app`, segue passos
acima, anota sucesso/falha em cada item (✅/❌). Issues novos viram entries em
`KNOWN_LIMITATIONS.md`.

---

## Dados seed no cloud

Validado via `pnpm --filter @aethereos/seed start` com `ALLOW_CLOUD_SEED=true`:

| Tabela             | Linhas |
| ------------------ | ------ |
| companies          | 4      |
| profiles           | 11     |
| users              | 10     |
| employees          | 10     |
| tenant_memberships | 10     |
| company_modules    | 40     |
| people             | 80     |
| files              | 64     |
| chat_channels      | 12     |
| chat_messages      | 84     |
| agent_proposals    | 20     |
| app_registry       | 53     |

**Usuários de teste** (todos com senha `Aethereos@2026!`):

- `staff@aethereos.test` — `is_platform_admin=true`
- `ana.lima@meridian.test` — owner Meridian (plan: pro)
- `rafael.costa@atalaia.test` — owner Atalaia (plan: starter)
- `patricia.rodrigues@solaris.test` — owner Solaris (plan: enterprise)
- `onboarding.user@onbtest.test` — onboarding pendente

---

## Issues encontradas durante o deploy

### #1 — Migração pgvector quebrou no cloud

**Sintoma:** `supabase db push` falhou em `20260430000012_pgvector_embeddings.sql` com `operator does not exist: extensions.vector <=> extensions.vector`.

**Causa:** A função `kernel.search_embeddings` usava operador `<=>` sem qualificação de schema. Localmente passava porque `search_path` da função incluía `extensions`. No Supabase Cloud o `search_path` default não incluía.

**Fix:** Adicionado `SET search_path = public, extensions` na função + uso explícito `OPERATOR(extensions.<=>)` nas duas referências (score e ORDER BY).

**Status:** RESOLVIDO no commit `0fe6319` (MX130).

### #2 — Schema `kernel` não exposto via PostgREST

**Sintoma:** REST queries com `Accept-Profile: kernel` retornavam HTTP 406 `"Invalid schema: kernel"`.

**Causa:** PostgREST cloud só expõe `public` + `graphql_public` por default. `config.toml` local listava `["public", "graphql_public", "kernel", "comercio"]` mas precisa ser `push`ed.

**Fix:** `supabase config push --yes` sincronizou as configs (api/db/auth/storage).

**Status:** RESOLVIDO sem commit (config push é operação CLI direta).

### #3 — Seed rejeitando cloud key como "Invalid API key"

**Sintoma:** `Error: seed companies.upsert(meridian): Invalid API key` mesmo passando `SUPABASE_SERVICE_ROLE_KEY` correto via env.

**Causa:** `tooling/seed/src/client.ts` lia `SUPABASE_SERVICE_KEY` ANTES de `SUPABASE_SERVICE_ROLE_KEY` no fallback. O `.env.local` definia `SUPABASE_SERVICE_KEY=<local-demo-key>` que sobrescrevia silenciosamente a cloud key (loadEnvLocal só seta vars não-definidas, mas SUPABASE_SERVICE_KEY estava setado pelo .env.local antes do export do shell).

**Fix:** Inverteu precedência: `SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_SERVICE_KEY ?? ""`.

**Status:** RESOLVIDO no commit `56fd32f` (MX134).

### #4 — Seed rejeitando rodar contra cloud

**Sintoma:** Seed tem guard `assertLocalOnly()` que recusava URLs não-localhost.

**Fix:** Adicionada flag opt-in `ALLOW_CLOUD_SEED=true` que libera o guard apenas com consentimento explícito.

**Status:** RESOLVIDO no mesmo commit `56fd32f` (MX134).

---

## Próximos passos pós-staging

1. **Validação humana** dos M1-M14 — agendar reviewer humano com browser
2. **Domínio customizado** (futuro): `app.aethereos.io` apontando pro Vercel deployment
3. **CI/CD automático** (futuro): cada PR cria preview Vercel; merge em main publica em prod
4. **Monitoramento** (futuro): Vercel Analytics + Supabase logs + Sentry/Logflare
5. **Rotacionar legacy JWT keys** — Supabase Cloud projeto criado hoje ainda usa keys legacy `eyJhbG...` para anon/service*role. Idealmente migrar para `sb_publishable*_`/`sb*secret*_` (formato novo Supabase 2026). Quando migrar, atualizar VITE_SUPABASE_ANON_KEY no Vercel.
6. **Validar BYOK Copilot end-to-end** com chave OpenAI/Anthropic real (M14)
7. **Rodar `pnpm test:e2e:full` apontando pra staging** (mudar `E2E_BASE_URL=https://aethereos.vercel.app`) — atualmente E2E usa apenas localhost
