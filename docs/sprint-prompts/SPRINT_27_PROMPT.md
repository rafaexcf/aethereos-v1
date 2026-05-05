# SPRINT 27 — Production Readiness: Todos os Bloqueadores + Polish

> **Objetivo:** Resolver os 10 bloqueadores para producao identificados na auditoria: convite de colaboradores, CRUD de equipe, Gestor MVP, email transacional, rate limiting, CORS, error boundaries, fix seed, validacao e polish geral.
> **Escopo:** Este e o sprint mais importante do projeto. Ao final, o Aethereos V1 estara pronto para usuarios reais.
> **Estimativa:** 6-10 horas. Custo: $40-70.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar Sprint 25 e 26 documentados
3. git log --oneline -10 — confirmar HEAD
4. KNOWN_LIMITATIONS.md — KLs abertas
5. apps/shell-commercial/src/apps/gestor/ — estado atual do Menu Gestor
6. supabase/seed.sql — estado (pode estar corrompido por pg_dump)
7. supabase/functions/ — 11 Edge Functions existentes

### Estado atual

- Staging online em aethereos.vercel.app
- 353 commits, 70+ tabelas, 188 apps no catalogo
- 33 E2E green, 225+ unit tests
- Bloqueadores identificados: convite, CRUD equipe, Gestor MVP, email, rate limit, CORS, error boundaries, seed.sql, validacao, polish

---

## MILESTONES

### MX142 — Fix seed.sql + Error Boundaries globais

O que fazer:

1. **Fix seed.sql:**
   - O seed.sql atual esta corrompido (pg_dump misturado com INSERTs manuais, IDs duplicados)
   - Reescrever seed.sql limpo usando apenas INSERTs idemponentes (ON CONFLICT DO NOTHING)
   - Deve criar: 3 companies (meridian, atalaia, solaris), 9 users com senha Aethereos@2026!, people, company_modules padrao, app_registry seed
   - Testar: supabase db reset && supabase db push && psql seed.sql
   - Se seed.sql nao e usado (seed e via tooling/seed/): garantir que pnpm --filter @aethereos/seed start funciona limpo

2. **Error Boundaries:**
   - Criar componente AppErrorBoundary (React Error Boundary) que:
     a) Captura erros de qualquer app que crashe
     b) Mostra tela amigavel: "Algo deu errado neste app" + botao "Recarregar" + botao "Fechar"
     c) NAO derruba o shell — outros apps e o desktop continuam funcionando
     d) Loga o erro (console.error + opcional: SCP event platform.app.error)
   - Wrappear TODOS os apps no AppFrame com AppErrorBoundary
   - Wrappear IframeAppFrame tambem (caso iframe cause erro no host)

3. **CORS restrito para producao:**
   - Verificar configuracao atual de CORS nas Edge Functions
   - Em producao, CORS deve aceitar apenas: https://aethereos.vercel.app, https://app.aethereos.io (futuro dominio)
   - Em dev, manter http://localhost:\* permitido
   - Usar env var ALLOWED_ORIGINS para configurar
   - Atualizar CORS headers em scp-publish e demais Edge Functions

Criterio de aceite: seed funciona limpo, error boundary captura crash sem derrubar shell, CORS restrito no codigo (env-based).

Commit: fix(infra): clean seed + error boundaries + cors hardening (MX142)

---

### MX143 — Email transacional (Supabase Auth + Resend)

O que fazer:

1. Avaliar opcoes de email:
   a) Supabase Auth builtin email (limitado: rate limit baixo, templates basicas, nao customizavel)
   b) Resend (recomendado: API simples, free tier 100 emails/dia, templates customizaveis)
   c) Se Resend exigir setup complexo: usar Supabase Auth email como MVP

2. Configurar provedor de email:
   - Se Resend: criar conta, configurar dominio, obter API key
   - Se Supabase builtin: configurar SMTP ou usar Supabase builtin (ja funciona para auth)
   - NAO gastar mais de 1h em setup de email. Se travar, usar Supabase builtin e documentar como KL.

3. Customizar templates de email (se possivel):
   - Convite: "Voce foi convidado para {company_name} no Aethereos. Clique para aceitar."
   - Reset senha: "Redefina sua senha do Aethereos."
   - Confirmacao: "Bem-vindo ao Aethereos! Sua conta foi criada."

4. Edge Function auxiliar (se necessario):
   - supabase/functions/send-email/index.ts
   - Recebe: { to, template, data }
   - Envia via Resend API ou Supabase SMTP
   - Autenticacao: service_role (chamado internamente, nao exposto ao browser)

Criterio de aceite: Emails de convite e reset de senha funcionam. Templates em portugues.

Commit: feat(infra): email transacional — convite + reset senha (MX143)

---

### MX144 — Convite de colaboradores

O que fazer:

1. Criar Edge Function supabase/functions/invite-member/index.ts:
   - Recebe: { email, role, full_name? }
   - Valida: JWT do chamador deve ser owner ou admin da company
   - Verifica: email nao ja e membro da company
   - Cria: user via Supabase Auth admin.createUser() ou auth.admin.inviteUserByEmail()
   - Insere: tenant_memberships com status='invited'
   - Insere: kernel.people com dados basicos
   - Envia: email de convite com link para aceitar
   - Emite: SCP platform.user.invited
   - Retorna: { success, membership_id }

2. Fluxo de aceitacao:
   - Colaborador recebe email com link para /accept-invite?token=...
   - Criar rota /accept-invite no shell que:
     a) Valida token
     b) Se user ja existe (multi-empresa): vincula a nova company
     c) Se user novo: cria senha, onboarding basico
     d) Atualiza tenant_memberships status='active'
     e) Redireciona para /desktop

3. UI de convite no Menu Gestor:
   - Botao "Convidar colaborador" no topo da lista de equipe
   - Modal/drawer com: email, nome (opcional), role (dropdown: admin/manager/member/viewer)
   - Validacao: email valido, role != owner (so pode ter 1 owner)
   - Feedback: "Convite enviado para {email}" ou erro

4. Se Supabase Auth invite nao funcionar perfeitamente:
   - Alternativa: criar user com senha temporaria + enviar por email
   - Colaborador faz login com senha temporaria → forcado a trocar na primeira vez

Criterio de aceite: Owner convida colaborador por email → colaborador recebe email → clica → cria conta → entra na empresa → aparece na lista de equipe.

Commit: feat(auth): invite member flow — edge function + accept route + UI (MX144)

---

### MX145 — CRUD de colaboradores

O que fazer:

1. No Menu Gestor, secao Equipe/Colaboradores:
   - **Listar**: tabela com nome, email, role, status (active/invited/suspended), ultimo acesso
   - **Editar role**: dropdown para mudar role (owner so pode ser transferido, nao atribuido)
   - **Suspender**: UPDATE tenant_memberships SET status='suspended' → login bloqueado
   - **Reativar**: UPDATE status='active'
   - **Remover**: soft-delete (status='removed', preserva dados para audit) → login bloqueado
   - **Resetar senha**: trigger Supabase Auth password reset → envia email
   - **Reenviar convite**: se status='invited', reenviar email

2. Regras de negocio:
   - Owner nao pode ser removido (apenas transferido via acao especial)
   - Admin nao pode alterar outro admin ou owner
   - Manager pode ver equipe do proprio departamento (futuro, por agora ve todos)
   - Member e viewer nao acessam o Gestor (redirecionar para desktop)

3. Protecao de acesso ao Gestor:
   - Verificar role no boot do app Gestor
   - Se role < admin: mostrar mensagem "Acesso restrito a administradores"
   - Nao mostrar Gestor no Dock para member/viewer

4. Status de colaborador afeta login:
   - active: login normal
   - invited: pode aceitar convite
   - suspended: login bloqueado com mensagem "Sua conta foi suspensa. Contate o administrador."
   - removed: login bloqueado com mensagem generica

Criterio de aceite: Admin pode listar, editar, suspender, reativar, remover colaboradores. Status afeta login.

Commit: feat(gestor): team management — list, edit role, suspend, remove members (MX145)

---

### MX146 — Menu Gestor MVP consolidado

O que fazer:

1. **Dashboard** (tela inicial do Gestor):
   - Total de colaboradores: ativos / convidados / suspensos
   - Apps instalados: total
   - Config IA: provedor configurado ou "Nao configurado"
   - Ultimas 5 acoes administrativas (audit_log filtrado)
   - Atalhos: Convidar, Instalar app, Configurar IA

2. **Secao Apps Instalados:**
   - Lista de apps instalados para a company (company_modules JOIN app_registry)
   - Para cada app: nome, icone, data de instalacao
   - Acoes: desinstalar (com confirmacao), abrir na Magic Store
   - Link rapido: "Ir para Magic Store" para instalar novos

3. **Secao Configuracao de IA (empresa):**
   - Reutilizar a UI BYOK do app Configuracoes, mas salvar em company_settings (nao user_preferences)
   - Logica: se company tem config IA → todos os colaboradores usam (exceto quem tem BYOK individual)
   - Nova key em kernel.settings: scope='company', key='llm_config_company'
   - Boot do shell: prioridade = BYOK individual > Config empresa > LiteLLM > Degraded

4. **Secao Dados da Empresa:**
   - Editar: nome, CNPJ (readonly), endereco, telefone, setor, porte
   - Upload de logo (Supabase Storage → company-logos bucket)
   - Fuso horario padrao

5. **Secao Auditoria:**
   - Reutilizar componente de audit_log do app Auditoria
   - Filtros: por ator, por acao, por data
   - Exportar como CSV (download)

6. **Protecao de acesso:**
   - Gestor so acessivel por owner/admin
   - No app_registry: requiresAdmin = true (ou verificar no boot do app)
   - Member/viewer: app nao aparece no Dock/Mesa

Criterio de aceite: Gestor tem 5 secoes funcionais: Dashboard, Equipe, Apps, IA, Dados da Empresa, Auditoria.

Commit: feat(gestor): mvp — dashboard + team + apps + ai config + company data + audit (MX146)

---

### MX147 — Rate limiting + seguranca de producao

O que fazer:

1. **Rate limiting em Edge Functions:**
   - Implementar rate limit simples baseado em IP + user_id
   - Usar kernel.rate_limits ou in-memory counter (Deno KV se disponivel)
   - Limites sugeridos:
     - scp-publish: 100 req/min por user
     - invite-member: 10 req/hora por company
     - create-company: 5 req/hora por IP
     - cnpj-lookup: 20 req/min por IP
     - embed-text: 30 req/min por user
   - Resposta quando excedido: 429 Too Many Requests com header Retry-After
   - Se implementacao complexa: usar alternativa simples (ex: counter em tabela kernel.rate_limits com TTL)
   - NAO gastar mais de 1.5h. Se travar, implementar apenas para scp-publish e invite-member e documentar resto como KL.

2. **Headers de seguranca no Vercel:**
   - Criar ou atualizar vercel.json com headers:
     - X-Content-Type-Options: nosniff
     - X-Frame-Options: DENY (para o shell; apps iframe tem politica propria)
     - Referrer-Policy: strict-origin-when-cross-origin
     - Permissions-Policy: camera=(), microphone=(), geolocation=()
   - Esses headers protegem o shell de ser embedado por terceiros

3. **Supabase Auth config para producao:**
   - Verificar: email confirmation habilitado?
   - Verificar: password min length >= 8?
   - Verificar: JWT expiration configurado (default 3600s ok)
   - Documentar configs no README

Criterio de aceite: Rate limiting funciona em pelo menos 2 Edge Functions. Headers de seguranca configurados no Vercel.

Commit: feat(security): rate limiting + production headers + auth config (MX147)

---

### MX148 — Polish geral: loading states, empty states, mensagens

O que fazer:

1. **Loading states:**
   - Verificar que TODOS os apps mostram skeleton/spinner enquanto carregam dados
   - Apps que fazem fetch no mount: mostrar loading, nao tela vazia
   - AppRegistryStore: mostrar loading enquanto carrega catalogo do banco

2. **Empty states:**
   - Drive sem arquivos: mensagem "Nenhum arquivo. Arraste ou clique para enviar."
   - Pessoas sem contatos: "Nenhum contato. Adicione o primeiro."
   - Chat sem canais: "Nenhum canal. Crie o primeiro."
   - Gestor sem equipe: "Voce e o unico membro. Convide sua equipe."
   - Magic Store sem apps instalados: "Nenhum app instalado. Explore a loja."

3. **Mensagens de erro amigaveis (portugues):**
   - Erro de rede: "Sem conexao. Verifique sua internet."
   - Erro 401: "Sessao expirada. Faca login novamente."
   - Erro 403: "Voce nao tem permissao para esta acao."
   - Erro 429: "Muitas tentativas. Aguarde alguns minutos."
   - Erro 500: "Erro interno. Tente novamente em alguns instantes."
   - Erro de iframe: "Este app nao pode ser carregado aqui. Abrir em nova aba?"

4. **Splash screen / boot:**
   - Verificar que splash screen nao trava se Supabase estiver lento
   - Timeout de 10s: se boot nao completar, mostrar mensagem de erro + botao retry

5. **Favicon e meta tags:**
   - Verificar que index.html tem favicon, title, og:tags corretos
   - Title: "Aethereos — OS Empresarial"
   - Meta description: "Sistema operacional empresarial no navegador"

6. **Console.log cleanup:**
   - Remover console.log de dev que vazaram para producao
   - Em scp-worker: manter logs estruturados (nao console.log generico)

Criterio de aceite: Nenhum app mostra tela vazia sem feedback. Erros em portugues. Favicon correto.

Commit: feat(ux): loading states + empty states + error messages + polish (MX148)

---

### MX149 — Testes finais + deploy staging + documentacao

O que fazer:

1. **Rodar suite completa local:**
   pnpm typecheck && pnpm lint && pnpm test
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. **Novos testes E2E (se possivel):**
   - Teste: Gestor abre para admin (verifica data-testid do dashboard)
   - Teste: Gestor nao abre para member (verifica redirect ou mensagem)
   - Teste: convidar colaborador (se mock de email possivel)

3. **Deploy staging atualizado:**
   npx vercel --prod
   supabase db push (se novas migrations)
   supabase functions deploy --no-verify-jwt

4. **Seed no cloud atualizado:**
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @aethereos/seed start

5. **Validacao manual no staging (checklist):**
   - [ ] Login com ana.lima@meridian.test funciona
   - [ ] Desktop renderiza (Mesa, Dock, TopBar)
   - [ ] Drive abre e lista arquivos
   - [ ] Pessoas abre e lista contatos
   - [ ] Magic Store abre com 188+ apps
   - [ ] Instalar app externo funciona
   - [ ] App iframe abre na tab
   - [ ] Configuracoes > IA mostra BYOK
   - [ ] Gestor abre e mostra dashboard
   - [ ] Gestor > Equipe lista colaboradores
   - [ ] Multi-tenant: atalaia nao ve dados de meridian
   - [ ] Logout funciona
   - [ ] Splash screen nao trava
   - [ ] Tema claro/escuro funciona
   - [ ] Error boundary funciona (forcar crash em dev)

6. **Atualizar documentacao:**
   - SPRINT_LOG.md com Sprint 27
   - README.md com status de producao
   - KNOWN_LIMITATIONS.md atualizado
   - QUICK_START.md com instrucoes de invite flow

Criterio de aceite: 33+ E2E green, staging atualizado, validacao manual completa, docs atualizados.

Commit: docs: sprint 27 — production readiness complete (MX149)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem feat/fix/docs(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. Nova dep exige justificativa em commit.
R5. Bloqueios mantidos: sem next em shells, sem inngest, sem @clerk/\*, sem prisma.
R6. Antes de cada commit: pnpm typecheck && pnpm lint.
R7. Nao execute fora de ~/Projetos/aethereos.
R8. Ao perceber contexto cheio: pare, escreva pickup point.
R9. NAO quebrar os 33+ E2E existentes.
R10. Invite flow usa credenciais do ADMIN (RLS se aplica). Service_role so em Edge Functions.
R11. Rate limiting NAO deve bloquear testes E2E. Limites generosos o suficiente para dev.
R12. Mensagens de erro SEMPRE em portugues para o usuario final.
R13. O Gestor so e acessivel por owner e admin. Verificar role no boot.
R14. Owner nao pode ser removido. Apenas transferido (acao especial com confirmacao dupla).
R15. Se email transacional travar em setup complexo (DNS, DKIM, SPF): usar Supabase Auth builtin e documentar como KL. NAO gastar mais de 1h.
R16. Se rate limiting travar: implementar apenas para scp-publish e invite-member (os mais criticos) e documentar resto como KL. NAO gastar mais de 1.5h.

---

## TERMINO DO SPRINT

Quando MX149 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint && pnpm test
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full
   pnpm audit --audit-level=high

2. Reporte:
   - TypeCheck: X/X
   - Lint: X/X
   - Unit tests: X passed
   - E2E: X passed, Y failed, Z skipped
   - Audit: X vulnerabilities
   - Staging deploy: URL + status
   - Validacao manual: X/15 items passed

3. Pare aqui. Nao inicie Sprint 28.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 27 (Production Readiness) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX142-MX149 nao concluida
5. Continue a partir dela

Lembrar:

- Sprint critico: resolve TODOS os bloqueadores para producao
- MX142: seed fix + error boundaries + CORS
- MX143: email transacional (Resend ou Supabase builtin)
- MX144: invite member flow (Edge Function + accept route + UI)
- MX145: CRUD equipe (list, edit role, suspend, remove)
- MX146: Gestor MVP (dashboard + equipe + apps + IA + dados + audit)
- MX147: rate limiting + headers de seguranca
- MX148: polish (loading, empty states, erros portugues)
- MX149: testes + deploy + validacao manual
- Se travar em email/rate limit: simplificar e documentar como KL
- 33+ E2E nao podem quebrar
- Owner nao pode ser removido
- Gestor so acessivel por owner/admin

Roadmap em SPRINT_27_PROMPT.md na raiz.
