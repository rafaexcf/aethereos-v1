# SPRINT 24 — Staging Deploy: Vercel + Supabase Cloud

> **Objetivo:** Aethereos V1 acessivel online via URL Vercel. Migrations aplicadas no Supabase Cloud (Pro), Edge Functions deployed, seed executado, shell funcional no browser.
> **NAO inclui:** dominio customizado, CI/CD automatico, verticais, features novas.
> **Estimativa:** 2-4 horas. Custo: $15-30.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar Sprint 23 documentado
3. git log --oneline -5 — confirmar HEAD
4. .vercel/ — projeto Vercel linkado (scope: Metaquantics, project: aethereos)
5. supabase/.temp/project-ref — Supabase linkado (ref: oublhirkojyipwtmkzvw)

### Estado atual

- Vercel: linkado, build command: cd apps/shell-commercial && pnpm run build, output: apps/shell-commercial/dist
- Supabase Cloud: Pro, ref oublhirkojyipwtmkzvw, URL: https://oublhirkojyipwtmkzvw.supabase.co
- Local: 70 tabelas, 73+ migrations, 11 Edge Functions, 33 E2E green, 225+ unit tests
- Tudo roda local, nada roda em cloud ainda

---

## MILESTONES

### MX130 — Aplicar migrations no Supabase Cloud

O que fazer:

1. Verificar que o link esta correto:
   supabase db remote commit 2>&1 | head -5
   OU
   supabase migration list --linked 2>&1 | head -20

2. Aplicar todas as migrations:
   supabase db push

3. Se falhar: analisar erro, corrigir migration problemativa, re-push.

4. Verificar que pgvector esta instalado no cloud:
   supabase db remote commit nao instala extensoes automaticamente.
   Se necessario, rodar via SQL Editor no dashboard:
   CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

5. Verificar contagem de tabelas:
   Ir no Supabase Dashboard > SQL Editor > SELECT count(\*) FROM pg_tables WHERE schemaname='kernel';
   Esperado: 70

Criterio de aceite: 70 tabelas kernel no cloud. pgvector ativo. 0 migrations pendentes.

Commit: chore(infra): apply all migrations to supabase cloud (MX130)

---

### MX131 — Deploy Edge Functions

O que fazer:

1. Listar Edge Functions locais:
   ls supabase/functions/

   Esperado: activate-module, cnpj-lookup, complete-onboarding, context-snapshot, create-company, embed-text, register-company, scp-publish, staff-approve-company, staff-company-detail, staff-list-companies

2. Deployar todas:
   supabase functions deploy --no-verify-jwt

   OU uma por uma se houver problemas:
   for fn in activate-module cnpj-lookup complete-onboarding context-snapshot create-company embed-text register-company scp-publish staff-approve-company staff-company-detail staff-list-companies; do
   supabase functions deploy $fn --no-verify-jwt
   done

3. ATENCAO ao --no-verify-jwt: a verificacao de JWT e feita DENTRO de cada function (Authorization header). O flag e para nao ter dupla verificacao no gateway Supabase.

4. Verificar deploy:
   supabase functions list

5. Testar uma function basica:
   curl -s https://oublhirkojyipwtmkzvw.supabase.co/functions/v1/scp-publish \
    -H "Content-Type: application/json" \
    -d '{}' | head -20
   Esperado: erro 401 ou 400 (sem JWT), NAO 404

Criterio de aceite: Todas 11 Edge Functions deployed. Health check retorna resposta (nao 404).

Commit: chore(infra): deploy all edge functions to supabase cloud (MX131)

---

### MX132 — Configurar env vars no Vercel

O que fazer:

1. Obter credenciais do Supabase Cloud:
   - VITE_SUPABASE_URL: https://oublhirkojyipwtmkzvw.supabase.co
   - VITE_SUPABASE_ANON_KEY: obtido no dashboard Supabase > Settings > API > anon public key

2. Configurar no Vercel via CLI:
   npx vercel env add VITE_SUPABASE_URL production
   (colar: https://oublhirkojyipwtmkzvw.supabase.co)

   npx vercel env add VITE_SUPABASE_ANON_KEY production
   (colar: a anon key)

3. Se o shell usar outras env vars (VITE*\*), adicionar tambem:
   grep "VITE*" apps/shell-commercial/.env\* apps/shell-commercial/src/vite-env.d.ts 2>/dev/null

4. NAO colocar service_role key no Vercel (frontend nao pode ter service_role).

Criterio de aceite: Env vars configuradas no Vercel para production.

Commit: chore(infra): configure vercel env vars for supabase cloud (MX132)

---

### MX133 — Primeiro deploy Vercel

O que fazer:

1. Deploy:
   npx vercel --prod

2. Se build falhar:
   - Verificar logs: npx vercel logs <url>
   - Problemas comuns:
     a) pnpm install falha: garantir que packageManager esta no package.json raiz
     b) TypeScript errors: pnpm typecheck deve passar localmente primeiro
     c) Env vars faltando: verificar que VITE_SUPABASE_URL esta setado
     d) Output dir errado: verificar que apps/shell-commercial/dist existe apos build

3. Se build passar: URL de producao estara disponivel (ex: aethereos-xxx.vercel.app)

4. Abrir a URL no browser e verificar:
   - Splash screen aparece
   - Tela de login renderiza
   - (NAO vai logar ainda — seed nao foi feito)

Criterio de aceite: URL Vercel acessivel, splash + login renderizam.

Commit: chore(infra): first vercel production deploy (MX133)

---

### MX134 — Seed no Supabase Cloud

O que fazer:

1. O seed local cria usuarios via Supabase Auth Admin API. Para cloud, precisa usar service_role key:
   - Obter service_role key do dashboard Supabase > Settings > API > service_role secret

2. Rodar seed apontando para cloud:
   SUPABASE_URL=https://oublhirkojyipwtmkzvw.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
   pnpm --filter @aethereos/seed start

3. Se seed falhar: analisar erro. Problemas comuns:
   - Tabelas nao existem: migrations nao aplicadas (voltar para MX130)
   - RLS blocking: seed deve usar service_role (bypassa RLS)
   - UUID conflicts: seed usa UUIDs fixos — se ja existem, ON CONFLICT deve resolver

4. Verificar no dashboard:
   - kernel.companies: 3+ empresas (meridian, atalaia, solaris)
   - auth.users: 9 usuarios
   - kernel.company_modules: modulos instalados
   - kernel.app_registry: 52 apps

5. Testar login na URL Vercel:
   - Email: ana.lima@meridian.test
   - Senha: Aethereos@2026!
   - Deve chegar ao desktop com Dock, Mesa, apps

Criterio de aceite: Login funciona na URL Vercel. Desktop renderiza com apps. Dados de seed visiveis.

Commit: chore(infra): seed supabase cloud with test data (MX134)

---

### MX135 — Validacao funcional no staging

O que fazer:

1. Testar na URL Vercel (manual):
   a) Login com ana.lima@meridian.test -> desktop aparece
   b) Dock mostra apps instalados
   c) Abrir Drive -> lista vazia (ok, sem arquivos)
   d) Abrir Pessoas -> lista de pessoas seed
   e) Abrir Magic Store -> catalogo renderiza com 52 apps
   f) Instalar um app na Magic Store -> aparece no Dock
   g) Abrir Configuracoes > IA -> secao BYOK renderiza
   h) Abrir Governanca -> tabs de proposals e context engine

2. Testar multi-tenant:
   a) Logout
   b) Login com rafael.costa@atalaia.test -> desktop com dados diferentes
   c) Dados de Meridian NAO aparecem (RLS)

3. Documentar resultado em STAGING_VALIDATION.md:
   - URL de staging
   - Data do deploy
   - Testes executados + resultado (pass/fail)
   - Screenshots (opcional)
   - Issues encontradas

4. Se algum teste falhar: registrar como bug, corrigir se simples, ou documentar como KL.

Criterio de aceite: Login + desktop + Magic Store + multi-tenant funcionam no staging.

Commit: docs: sprint 24 — staging deploy validation (MX135)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem chore/docs(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. NUNCA commitar service_role key, API keys ou senhas no repositorio.
R5. Env vars sensiveis vao no Vercel dashboard ou .env.local (gitignored).
R6. Nao execute fora de ~/Projetos/aethereos.
R7. Ao perceber contexto cheio: pare, escreva pickup point.
R8. NAO quebrar os 33+ E2E existentes (rodar E2E local antes de deploy).
R9. Se supabase db push falhar em migration especifica: analisar se e idempotente, corrigir, re-push. NAO pular migrations.
R10. Edge Functions com --no-verify-jwt porque verificacao e interna (Authorization header no codigo).
R11. Seed usa service_role para bypassar RLS — NUNCA expor service_role no frontend.
R12. URL de staging sera tipo aethereos-xxx.vercel.app — dominio custom e futuro.

---

## TERMINO DO SPRINT

Quando MX135 estiver commitado:

1. Rode o gate final local:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte:
   - URL de staging: \_\_\_
   - Login funciona: sim/nao
   - Desktop renderiza: sim/nao
   - Magic Store funciona: sim/nao
   - Multi-tenant RLS: sim/nao
   - E2E local: X passed

3. Pare aqui. Nao inicie Sprint 25.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 24 (Staging Deploy) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Verifique: ls .vercel/ && supabase projects list
5. Identifique a proxima milestone MX130-MX135 nao concluida
6. Continue a partir dela

Lembrar:

- Vercel linkado (Metaquantics/aethereos), build: cd apps/shell-commercial && pnpm run build
- Supabase Cloud Pro: ref oublhirkojyipwtmkzvw, URL https://oublhirkojyipwtmkzvw.supabase.co
- Migrations: supabase db push
- Edge Functions: supabase functions deploy --no-verify-jwt
- Seed: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + pnpm --filter @aethereos/seed start
- NUNCA commitar keys no repo
- 33+ E2E locais nao podem quebrar

Roadmap em SPRINT_24_PROMPT.md na raiz.
