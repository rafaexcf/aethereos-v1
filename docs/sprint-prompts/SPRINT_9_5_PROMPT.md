# SPRINT CIRÚRGICO 9.5 — Consertar bugs descobertos no smoke test do Sprint 9

> **Tipo:** Sprint cirúrgico, não de features. Foco exclusivo em **consertar 6 bugs descobertos durante smoke test executado por humano** que bloqueiam uso real do produto.
> **Não cria features novas.** **Não escreve ADRs.** Apenas conserta o que está quebrado E adiciona validação que impede regressão.
> **Estimativa:** 3-5 horas. Custo: $25-40 em tokens.

---

## CONTEXTO

Sprint 9 entregou-se com EXIT 0 de CI e ADR-0021 declarando "Camada 1 pronta para testes manuais". Em sessão de smoke test executada pelo humano em 2026-04-30, **6 bugs bloqueiam uso real**, sendo o último crítico (impede qualquer login).

**Os 6 bugs descobertos:**

1. **`.env.local` da raiz com placeholders literais** — `SUPABASE_ANON_KEY=replace-with-supabase-local-anon-key` em vez de chave real do Supabase local. Bootstrap nunca substituiu.

2. **`apps/scp-worker/package.json` script `dev` não carrega `.env.local`** — script é `node --watch dist/main.js` sem `--env-file=.env.local`. Worker reclama "DATABASE_URL env var is required". Workaround usado durante smoke test: passar variáveis inline no comando.

3. **`.env.local` da raiz sem variáveis `VITE_*`** — shell-commercial precisa de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, ausentes do template.

4. **Vite procura `.env.local` no diretório do app, não na raiz** — `apps/shell-commercial/.env.local` nunca foi criado pelo bootstrap. Vite não enxerga env da raiz por design.

5. **Mistura `localhost` vs `127.0.0.1`** — `supabase/config.toml` define `site_url = "http://127.0.0.1:5174"` mas templates de env usam `http://localhost:54321`. Como CORS trata os dois como origens diferentes, fetch é bloqueado.

6. **CRÍTICO — `custom_access_token_hook` sem GRANT no schema `kernel`** — função existe (Sprint 3 / M20) mas role `supabase_auth_admin` não tem `USAGE` no schema `kernel`. Toda chamada de login retorna HTTP 500 com `permission denied for schema kernel (SQLSTATE 42501)`. **Nenhum login é possível.**

**O que esses bugs revelam:**

CI verde ≠ produto funciona. Sprint 9 declarou MX21 "Smoke test manual scriptado" como pronto, mas o agente nunca executou o smoke test que ele mesmo escreveu. Se tivesse executado, esses 6 bugs apareceriam imediatamente.

Sprint 9.5 não consegue só consertar — precisa **mudar o critério de aceite** para evitar que esse padrão se repita em sprints futuros.

---

## CONTEXTO INICIAL OBRIGATÓRIO

Você é Claude Code retomando trabalho. Sprint 9 foi declarado concluído mas humano descobriu 6 bugs bloqueadores ao tentar usar o produto. Este sprint conserta os bugs e adiciona validação real.

1. **Leia integralmente:**
   - `CLAUDE.md`
   - `SPRINT_LOG.md` (todas as seções)
   - `docs/testing/MANUAL_SMOKE_TEST.md`
   - `docs/testing/QUICK_START.md`
   - `docs/testing/KNOWN_LIMITATIONS.md`
   - `docs/adr/0021-criterios-prontidao-camada-1-testes.md`
   - `.env.local.example`
   - `supabase/config.toml`
   - `apps/scp-worker/package.json`
   - `apps/shell-commercial/vite.config.ts`
   - `apps/shell-commercial/src/lib/drivers.ts`
   - Migration que cria `custom_access_token_hook` (procurar em `supabase/migrations/` por `custom_access_token_hook` ou `custom_access`)
   - Outras migrations relacionadas a JWT hooks (`staff_jwt_claim`, etc.)

2. **Confirme em voz alta** (escreva no chat antes de qualquer ação) cinco pontos:
   - Listas dos 6 bugs com causa raiz e fix proposto para cada
   - Diferença entre `localhost` e `127.0.0.1` para CORS — por que a Web Platform trata como origens diferentes
   - Por que `pnpm ci:full` passou apesar dos 6 bugs (CI testa typecheck/lint/build/test unitários, não fluxo end-to-end com browser)
   - O que é `GRANT USAGE ON SCHEMA` no Postgres e por que GoTrue precisa disso para invocar custom hook
   - Como mudar critério de aceite de sprint para incluir validação E2E real (não declarável só com EXIT 0 de CI)

3. **Verifique estado:**

```bash
git log --oneline -10
git status
pnpm typecheck > /tmp/precheck.log 2>&1; echo "TYPECHECK EXIT: $?"
docker ps --format "table {{.Names}}\t{{.Status}}"
supabase status 2>&1 | head -10
```

Se TYPECHECK != 0 ou Supabase não estiver rodando, **pare** e descreva.

---

## REGRAS INVIOLÁVEIS

(Iguais aos sprints anteriores)

**R1.** Commit por milestone com mensagem estruturada.
**R2.** Milestone só começa após anterior ter critério de aceite e commit.
**R3.** Após 3 tentativas, BLOQUEADA, registrar, pular.
**R4.** Nova dep exige justificativa.
**R5.** Bloqueios continuam: sem `next` em shells, sem `inngest`, sem `@clerk/*`, sem `prisma`, sem `framer-motion`.
**R6.** Antes de cada commit: `pnpm typecheck && pnpm lint`. Antes do encerramento: `pnpm ci:full` EXIT 0.
**R7.** Atualize `SPRINT_LOG.md` ao fim de cada milestone.
**R8.** Não execute fora de `~/Projetos/aethereos`. Não instale globais.
**R9.** Ao perceber contexto cheio: pare, escreva pickup point.

**R10. ESPECÍFICO 9.5 — Sem features novas:**

- Você NÃO está criando UI nova
- Você NÃO está adicionando novos apps
- Você NÃO está reescrevendo arquitetura
- Sua missão é **consertar exatamente os 6 bugs listados** + **adicionar validação que impede regressão**
- Se descobrir bug pré-existente fora do escopo destes 6, anote no log mas **não conserte**

**R11. ESPECÍFICO 9.5 — Smoke test executado de verdade:**

- O encerramento deste sprint exige você (agente) executar a sequência completa: subir Supabase + seed + scp-worker + shell-commercial + tentar login com user pré-seeded
- Se login falhar, sprint não fecha, marca BLOQUEADO
- Se login passar, fazer pelo menos uma operação CRUD (criar pasta no Drive ou criar pessoa) e verificar persistência no DB

**R12. ESPECÍFICO 9.5 — Honestidade radical:**

- Se algum bug for mais difícil que aparenta e exigir refactor amplo, marcar BLOQUEADO e descrever
- Se durante o trabalho descobrir que o `custom_access_token_hook` precisa redesign (não só GRANT), reportar ao humano antes de tentar fix amplo
- O propósito deste sprint é fazer login funcionar para humano. Tudo que não contribuir diretamente para isso é fora de escopo.

**R13. ESPECÍFICO 9.5 — Bootstrap script revisado:**

- O bootstrap original (criado no início do projeto) deixou placeholders e env files no lugar errado. **Não tentar consertar o bootstrap script** (já não é executável neste contexto) — apenas garantir que o estado _atual_ do repo, após este sprint, esteja correto e que `docs/testing/QUICK_START.md` instrua humano a executar comandos certos para popular env files corretamente.

---

## ARQUIVO DE LOG

Adicione ao `SPRINT_LOG.md`:

```markdown
---

# Sprint 9.5 — Cirúrgico: consertar 6 bugs descobertos no smoke test

Início: <timestamp ISO>
Modelo: Claude Code (Sprint 9.5 N=1)

## Origem

Smoke test executado por humano em 2026-04-30 falhou em 6 bugs bloqueadores.
Bug #6 (GRANT faltando em kernel.custom_access_token_hook) impede qualquer login.

## 5 pontos de calibração respondidos

[5 pontos]

## Histórico de milestones (Sprint 9.5)

[preenchido conforme avança]
```

Commit antes de prosseguir.

---

## ROADMAP DE MILESTONES

### MX26 — Fix bug #6: GRANT no schema kernel para custom_access_token_hook

**Objetivo:** desbloquear login. Crítico, primeiro a fazer.

**Tarefas:**

1. Localizar migration que cria `kernel.custom_access_token_hook`:

```bash
grep -r "custom_access_token_hook" supabase/migrations/ 2>&1 | head
```

2. Criar nova migration `supabase/migrations/<timestamp>_fix_auth_hook_grants.sql`:
   ```sql
   -- Permite que supabase_auth_admin chame funções no schema kernel
   GRANT USAGE ON SCHEMA kernel TO supabase_auth_admin;
   GRANT EXECUTE ON FUNCTION kernel.custom_access_token_hook TO supabase_auth_admin;
   -- Repetir para outras funções de hook se houver:
   -- GRANT EXECUTE ON FUNCTION kernel.set_tenant_context_from_jwt TO supabase_auth_admin;
   ```
3. **Executar `supabase db reset`** para aplicar migration localmente.
4. Validar com query SQL direto:
   ```sql
   SET ROLE supabase_auth_admin;
   SELECT kernel.custom_access_token_hook('{"user_id":"test","claims":{}}'::jsonb);
   RESET ROLE;
   ```
   Não deve retornar `permission denied`.

**Critério de aceite:**

```bash
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d'"' -f2)" -c "
  SET ROLE supabase_auth_admin;
  SELECT 'OK' WHERE has_schema_privilege('supabase_auth_admin', 'kernel', 'USAGE');
"
# Retorna 'OK'
```

Commit: `fix(auth): GRANT supabase_auth_admin USAGE no schema kernel (MX26 — bug #6)`

---

### MX27 — Fix bugs #1, #3: Atualizar `.env.local.example` e remover placeholders

**Objetivo:** template de env reflete realidade — keys de Supabase local + variáveis VITE\_\*.

**Tarefas:**

1. Atualizar `.env.local.example`:
   - Trocar `SUPABASE_URL=http://localhost:54321` por `SUPABASE_URL=http://127.0.0.1:54321`
   - Trocar todos `localhost` para `127.0.0.1` em URLs de serviço local
   - **Comentar bem** que valores de ANON_KEY e SERVICE_KEY devem vir de `supabase status -o env`
   - Adicionar bloco `VITE_*` com mesmas keys, mas prefixadas:
     ```
     # Vite shells leem variáveis VITE_*
     VITE_SUPABASE_URL=http://127.0.0.1:54321
     VITE_SUPABASE_ANON_KEY=
     ```
2. Criar script `tooling/setup-env.sh`:
   - Roda `supabase status -o env`
   - Extrai ANON_KEY e SERVICE_ROLE_KEY
   - Substitui no `.env.local` raiz
   - **Cria** `apps/shell-commercial/.env.local` com VITE\_\* corretas
   - Idempotente (rodar 2 vezes não duplica)
3. Adicionar script `pnpm setup:env` no `package.json` raiz que invoca o tooling acima
4. Atualizar `docs/testing/QUICK_START.md`:
   - Passo 1: `pnpm dev:db` (sobe Supabase)
   - Passo 2: `pnpm setup:env` (popula env files)
   - Passo 3: `pnpm seed:dev`
   - Passo 4: subir worker e shell

**Critério de aceite:**

```bash
# Limpar env files
rm -f .env.local apps/shell-commercial/.env.local
cp .env.local.example .env.local

# Rodar setup
pnpm setup:env

# Verificar populado
grep "ANON_KEY=eyJ" .env.local
grep "VITE_SUPABASE_ANON_KEY=eyJ" apps/shell-commercial/.env.local
```

Commit: `fix(env): setup-env.sh popula env files corretamente (MX27 — bugs #1 #3)`

---

### MX28 — Fix bug #4: Criar `apps/shell-commercial/.env.local` no setup

**Objetivo:** Vite enxerga env corretamente.

Já parcialmente coberto pelo MX27. Garantir explicitamente:

**Tarefas:**

1. Confirmar que `tooling/setup-env.sh` cria `apps/shell-commercial/.env.local` se não existir
2. Usar `127.0.0.1:54321` (não `localhost`)
3. Adicionar `apps/shell-commercial/.env.local` ao `.gitignore` global (verificar se já está coberto pelo padrão `**/.env.local`)
4. Adicionar nota em `apps/shell-commercial/README.md`:
   - Vite só lê `.env.local` do diretório do app
   - Se faltar, app trava com `supabaseUrl is required`
   - Sempre rodar `pnpm setup:env` da raiz após `pnpm dev:db`

**Critério de aceite:**

```bash
test -f apps/shell-commercial/.env.local
grep "VITE_SUPABASE" apps/shell-commercial/.env.local
```

Commit: `fix(shell-commercial): garantir .env.local no diretorio do app (MX28 — bug #4)`

---

### MX29 — Fix bug #2: scp-worker carrega `.env.local`

**Objetivo:** worker funciona sem precisar passar env inline.

**Tarefas:**

1. Atualizar `apps/scp-worker/package.json`:
   ```json
   "dev": "node --env-file=../../.env.local --watch --experimental-specifier-resolution=node dist/main.js",
   "start": "node --env-file=../../.env.local dist/main.js"
   ```
   (path relativo ao diretório do worker — duas pastas acima)
2. Verificar Node 22 suporta `--env-file` nativamente (sim, suporta desde Node 20.6+)
3. Adicionar fallback: se `--env-file` falhar, log warning mas continua (caso humano queira passar env de outra forma)
4. Documentar em `apps/scp-worker/README.md` (criar se não existe):
   - Worker depende de `DATABASE_URL`, `NATS_URL`, `SUPABASE_*` no env
   - Em dev, lê de `.env.local` da raiz via flag `--env-file`
   - Em prod, env é injetado pela plataforma (Vercel, Fly.io, etc.)

**Critério de aceite:**

```bash
# Sem env inline
pnpm --filter=@aethereos/scp-worker dev &
sleep 3
# Esperado: log "scp-worker started" sem "DATABASE_URL env var is required"
pkill -f "scp-worker"
```

Commit: `fix(scp-worker): dev script carrega .env.local via --env-file (MX29 — bug #2)`

---

### MX30 — Fix bug #5: Padronizar `127.0.0.1` em todo lugar

**Objetivo:** sem mais CORS por mistura de host.

**Tarefas:**

1. Procurar `localhost` em arquivos de configuração:

```bash
grep -r "localhost" --include="*.toml" --include="*.json" --include="*.yml" --include="*.yaml" --include="*.example" .
```

2. Substituir `localhost` por `127.0.0.1` em:
   - `.env.local.example` (já feito em MX27, validar)
   - `supabase/config.toml` (se houver)
   - `infra/local/docker-compose.dev.yml` (URLs de healthcheck, links entre serviços)
   - Scripts de setup
3. **Manter `localhost` em**:
   - URLs documentadas (humanos copiam `localhost:5174` em browser, é mais fácil)
   - `docs/testing/QUICK_START.md` pode ter ambas as formas mas explicar que browser deve usar `127.0.0.1` por causa de CORS
4. Atualizar `apps/shell-commercial/vite.config.ts` para imprimir tanto `localhost` quanto `127.0.0.1` no banner inicial (Vite imprime `localhost` por default)
5. **Decisão arquitetural:** documentar em `docs/runbooks/local-dev-cors.md` por que padronizar em `127.0.0.1`. Em produção, isso não é problema porque domínio único é usado.

**Critério de aceite:**

```bash
# Smoke: subir tudo, acessar via 127.0.0.1, login funciona (validado em MX31)
grep -r "VITE_SUPABASE_URL" --include="*.example" --include="*.local" --exclude-dir=node_modules . | grep "localhost"
# Não deve retornar nada
```

Commit: `fix(infra): padronizar 127.0.0.1 para evitar CORS local (MX30 — bug #5)`

---

### MX31 — Smoke test executado pelo agente

**Objetivo:** o que MX21 declarou pronto, mas o agente nunca fez. Sprint 9.5 só fecha se humano consegue fazer login no fim.

**Tarefas:**

**A. Executar sequência completa de boot:**

1. `supabase status` — validar que Supabase está up. Se não, `pnpm dev:db`.
2. `pnpm setup:env` — popular env files
3. `pnpm seed:dev` — popular banco
4. `pnpm --filter=@aethereos/scp-worker dev` (background) — worker rodando
5. `pnpm --filter=@aethereos/shell-commercial dev` (background) — shell rodando

**B. Validar via curl + SQL (não browser, mas equivalente):**

1. **Test login:** POST para `/auth/v1/token?grant_type=password` com credenciais de seed:

   ```bash
   curl -i -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" \
     -H "Content-Type: application/json" \
     -H "apikey: $(supabase status -o env | grep '^ANON_KEY=' | cut -d'"' -f2)" \
     -d '{"email":"ana.lima@meridian.test","password":"Aethereos@2026!"}'
   ```

   - Esperado: HTTP 200, response com `access_token` válido (3 partes JWT)
   - **Se retornar 500 com mensagem de hook errored, MX26 falhou — voltar para investigar**

2. **Test JWT contém claims customizados:**
   - Decodificar `access_token` retornado
   - Validar que `companies[]` array está presente
   - Validar que `active_company_id` está populado
   - Se faltar, hook está rodando mas gerando estrutura errada — investigar

3. **Test query com JWT:**
   - Usar `access_token` para fazer GET em `/rest/v1/kernel/files?select=*` (ajustar nome de tabela conforme schema)
   - Esperado: HTTP 200, retorna apenas arquivos da company ativa
   - Confirma RLS funciona

4. **Test script `pnpm test:smoke`:**
   - Criar `tooling/smoke/index.ts` que executa os 3 testes acima programaticamente
   - Adicionar script `pnpm test:smoke` no root
   - Roda contra Supabase local
   - EXIT 0 só se todos os 3 testes passam

**C. Documentar:**

- Criar `docs/testing/SMOKE_TEST_AUTOMATED.md`
- Explica como rodar `pnpm test:smoke`
- O que ele valida vs o que `MANUAL_SMOKE_TEST.md` cobre adicionalmente

**Critério de aceite:**

```bash
pnpm test:smoke > /tmp/smoke.log 2>&1
echo "EXIT: $?"
# DEVE ser 0
# Os 3 testes (login, JWT claims, query com RLS) passam
```

Commit: `test(smoke): smoke test automatizado executado pelo agente (MX31)`

---

### MX32 — Critério de aceite atualizado + ADR-0022 + encerramento

**Objetivo:** mudar regra para evitar que sprints futuros declarem-se prontos sem validação real.

**Tarefas:**

1. Criar `docs/adr/0022-criterios-aceite-sprints-validacao-e2e.md`:
   - Status: Aceito
   - Subordinado a: ADR-0001, ADR-0021
   - Contexto: Sprint 9 declarou "Camada 1 pronta" mas humano descobriu 6 bugs bloqueadores ao tentar usar
   - Decisão: todo sprint que declarar feature como entregue deve incluir `pnpm test:smoke` no critério de aceite final, além de `pnpm ci:full`
   - Decisão: prompts de sprint a partir de agora exigem agente executar smoke test E2E antes de declarar encerramento
   - Decisão: para mudanças em UI ou auth flow, agente também roda Playwright (quando credenciais de teste existem)
   - Consequências: sprints podem demorar ~10% mais, mas eliminamos classe inteira de "EXIT 0 mas não funciona"
2. Atualizar `CLAUDE.md`:
   - Seção 5 (regras de PR): adicionar "Toda mudança em auth, env config, ou drivers exige smoke test E2E passando"
3. Atualizar `SPRINT_LOG.md` com encerramento Sprint 9.5
4. Criar `docs/SPRINT_9_5_REPORT_2026-04-30.md`:
   - Os 6 bugs encontrados, causa raiz, fix aplicado
   - Resultado do smoke test executado
   - Aprendizado: CI verde ≠ produto funciona
   - Próximo: humano executa smoke test manual completo, valida que UI funciona end-to-end
5. **CI completo + smoke test:**

```bash
pnpm ci:full > /tmp/sprint95_final.log 2>&1
echo "ci:full EXIT: $?"
pnpm test:smoke > /tmp/sprint95_smoke.log 2>&1
echo "test:smoke EXIT: $?"
# AMBOS devem ser 0
```

Commit final: `chore: encerramento sprint 9.5 — bugs do smoke test consertados`

Mensagem no chat: "SPRINT 9.5 ENCERRADO. EXIT 0 confirmado em ci:full E test:smoke. Login funcional via curl + JWT contém claims. Aguardando revisão humana — humano deve executar smoke test manual completo no browser."

---

## TÉRMINO DO SPRINT

Não inicie Sprint 10 sozinho. Pare aqui.

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint 9.5 (Cirúrgico — bugs do smoke test) no Aethereos.

Antes de qualquer ação:
1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md (seção "Sprint 9.5")
3. Rode: git log --oneline -15 && git status && supabase status 2>&1 | head -10
4. Identifique a próxima milestone MX26-MX32 não concluída
5. Continue a partir dela

Lembrar: este sprint não cria features. Apenas conserta 6 bugs específicos + adiciona smoke test E2E.
Sprint só fecha se 'pnpm test:smoke' EXIT 0 (login funcional via curl).

Se SPRINT_LOG.md indicar "Sprint 9.5 encerrado", aguarde humano. Não inicie Sprint 10.

Roadmap em SPRINT_9_5_PROMPT.md na raiz.
```

Salve este arquivo como `SPRINT_9_5_PROMPT.md` na raiz do projeto antes de começar.
