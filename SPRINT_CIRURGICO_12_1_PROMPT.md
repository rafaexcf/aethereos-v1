# SPRINT CIRÚRGICO 12.1 — Remediação completa pós-validação manual

> **Tipo:** Sprint cirúrgico de diagnóstico + remediação. Sprint 12 declarou EXIT 0 mas validação manual visual revelou múltiplos bugs em cascata. Apps não renderizam, queries 400, permissões kernel quebradas.
>
> **NÃO ABRA NOVOS FEATURES NESTE SPRINT.** Apenas conserto.
>
> **Estimativa:** 6-10 horas de investigação + fix. Custo: $50-90.

---

## CONTEXTO HONESTO

Sprint 12 (Camada 1 pura) foi declarado fechado pelo agente anterior:

- ci:full ✅
- test:smoke ✅
- test:e2e:full ❌ (7 testes failed: 3 magic-store + 4 rh — agente omitiu este resultado)

Validação visual no browser (humano operando) revelou bugs muito mais graves que os testes E2E sozinhos sugeriam:

### Sintomas observados pelo humano

1. **Login funciona normalmente** — dashboard pós-login carrega e Mesa aparece com ícones
2. **Drive, Pessoas, Mensagens, Configurações, RH, Magic Store: ao clicar não renderiza nada** — tela vazia
3. **Apenas Copilot (AE AI) funciona** — porque Copilot NÃO importa `@aethereos/ui-shell`
4. **Cadastro CNPJ funciona** (rota `/register` separada do shell)
5. **Console do browser revela:**
   - `Multiple GoTrueClient instances detected` (warning, dívida conhecida — NÃO é causa raiz)
   - `:54321/rest/v1/employees?select=*&deleted_at=eq.null... 400 Bad Request`
   - `:54321/rest/v1/employees?select=department&deleted_at=eq.null&department=not.is.null 400 Bad Request`

### Diagnóstico parcial já feito (validar e expandir)

**Bug 1 — `@aethereos/ui-shell` quebrado em runtime**

- `packages/ui-shell/src/index.ts` exportava com extensão `.js` (`from "./components/app-shell/index.js"`)
- Vite + ESM moderno deveria resolver `.js → .ts/.tsx` mas não resolve neste setup
- **HIPÓTESE: regressão histórica que sempre quebrou mas algum cache anterior mascarava. Reset de WSL revelou.**
- **JÁ TENTAMOS FIX** (sed em massa removendo `.js` dos imports relativos) — operação concluiu mas humano ainda não conseguiu validar visualmente todos os apps recuperados
- Verificar se fix está completo ou se há mais arquivos no monorepo com mesmo padrão

**Bug 2 — Vite não estava resolvendo aliases dos pacotes**

- `apps/shell-commercial/vite.config.ts` não tinha `resolve.alias`
- Adicionamos manualmente para `@aethereos/ui-shell`, `@aethereos/scp-registry`, `@aethereos/db-types`
- **HIPÓTESE: pode haver outros pacotes importados pelo shell que também precisam alias**
- Exemplos a investigar: `@aethereos/drivers`, `@aethereos/drivers-supabase`, `@aethereos/drivers-local`, `@aethereos/observability`, `@aethereos/feature-flags`

**Bug 3 — Schema `kernel` com permissão negada para anon**

- Teste manual: `curl /rest/v1/employees -H "Accept-Profile: kernel"` retorna `permission denied for schema kernel` (code 42501)
- Postgrest com `Accept-Profile: kernel` falha porque anon não tem GRANT USAGE no schema
- **MAS:** Drive, Pessoas, Chat funcionavam antes do reset. Como? Provavelmente usam role `authenticated` após login. Verificar.
- Pode ter regressão nas migrations de grants (existem `20260430000016_kernel_service_role_grants.sql` e `20260430000019_kernel_authenticated_grants.sql`)

**Bug 4 — App RH faz query sem prefixo schema**

- `apps/shell-commercial/src/apps/rh/hooks/useEmployees.ts` provavelmente faz `.from("employees")` em vez de `.schema("kernel").from("employees")`
- Postgrest cai em `public.employees` que não existe → 400
- Pode haver mesmo bug em Magic Store

**Bug 5 — Vite "Port 5174 is in use"**

- Múltiplas instâncias Vite em portas 5174 e 5175 simultaneamente
- Indica processos órfãos ao reiniciar
- Não é bug do código mas atrapalha debugging — `pkill -9 -f vite` resolve

**Bug 6 — Campo `deleted_at` filtrado mas não existe em employees**

- Console mostra query: `employees?...&deleted_at=eq.null`
- Verificamos: coluna `deleted_at` EXISTE em `kernel.employees` (timestamp with time zone)
- Logo este filtro deveria funcionar. O 400 vem do bug 3+4 (schema errado, não da coluna)
- Confirmar que fix dos bugs 3+4 elimina este erro

**Bug 7 — `Multiple GoTrueClient instances`**

- Warning amarelo recorrente no console
- Indica criação de múltiplas instâncias `createClient()` em vez de singleton
- Não é causa raiz dos apps vazios, mas é dívida técnica
- **Anotar mas NÃO corrigir neste sprint** — registra em KNOWN_LIMITATIONS

### Padrão observado nos sprints anteriores (importante)

Em Sprints 6, 9, 9.6, 10, 11, 12 — agente Claude Code declarou EXIT 0 e validação independente sempre encontrou falhas reais. Esta sessão precisa ser diferente: validação visual humana é gate obrigatório antes de declarar fechado.

---

## ESTADO REAL ATUAL (referência)

**Repo:** `~/Projetos/aethereos` (P maiúsculo)
**Branch:** main, 5 commits à frente de origin (Sprint 12 não pushed)
**Working tree:** modificado em:

- `apps/shell-commercial/src/stores/mesaStore.ts` (cirurgia: removeu icon-comercio, adicionou icon-rh)
- `apps/shell-commercial/vite.config.ts` (adicionou resolve.alias)
- `packages/ui-shell/src/**/*.{ts,tsx}` (sed em massa removeu .js)
- Possível: outros arquivos modificados durante debug

**Containers:**

- Supabase rodando 33 migrations aplicadas (incluindo `20260430000033_company_logos_bucket.sql` adicionada pelo Sprint 12)
- scp-worker rodando (mas com erro `DATABASE_URL env var is required` no startup — investigar se afeta runtime)
- Vite porta 5174 (instância única após `pkill`)

**Seed:**

- 3 companies aprovadas + 1 staff admin global
- 9 employees seeded
- Usuários: ana.lima@meridian.test, rafael.costa@atalaia.test, patricia.rodrigues@solaris.test, staff@aethereos.test
- Senha: `Aethereos@2026!`

**Sprint 12 commits (não rollback):**

- 9a37300 — feat(camada-1): adr-0024 + limpeza registry, apps verticais removidos (MX56)
- 76b2c84 — feat(onboarding): wizard generico 3 steps + edge function complete-onboarding (MX57)
- 02b87e9 — feat(rh): app RH navegável com CRUD employees enxuto (MX58)
- 45b6061 — feat(magic-store): catalogo + launcher camada 2 + edge function activate-module (MX59)
- 1dbadc8 — chore(sprint-12): e2e playwright onboarding + rh + magic-store — encerramento sprint 12 (MX60)

---

## OBJETIVO DESTE SPRINT CIRÚRGICO

Restaurar **funcionamento visual completo de todos os 8 apps** (Drive, Pessoas, Mensagens, Configurações, RH, Magic Store, Governança, Auditoria) + validar gate triplo verde.

**NÃO entregar features novas. NÃO mexer em escopo.**

---

## REGRAS INVIOLÁVEIS

**R1.** Commit por bug consertado: `fix(<scope>): <descrição> (CIRÚRGICO 12.1 BUG-N)`
**R2.** Antes de declarar fim, gate triplo verde COM SAÍDA REAL DO TERMINAL — não declarar.
**R3.** Validação visual humana ainda obrigatória após sua sessão (você não tem browser, eu humano vou abrir).
**R4.** Documentar no `SPRINT_LOG.md` cada bug encontrado e fix aplicado, mesmo se trivial.
**R5.** Se descobrir bug grande não previsto aqui, parar, documentar, perguntar ao humano antes de prosseguir.
**R6.** Não criar features novas. Não adicionar testes novos sem necessidade. Não refatorar partes não tocadas.
**R7.** Não fazer rollback do Sprint 12 inteiro. Conservar `9a37300..1dbadc8` e seus 5 milestones.
**R8.** Usar pnpm sempre. Não usar npm/yarn.
**R9.** Não tocar em V2 (`~/Projetos/aethereos-v2`).

---

## ROADMAP DE INVESTIGAÇÃO + REMEDIAÇÃO

### FASE 1 — Diagnóstico exaustivo (1-2h)

Antes de qualquer fix, **mapear todos os problemas**. Crie um arquivo `DIAGNOSE_12_1.md` na raiz documentando achados em cada subtarefa abaixo.

**1.1 — Mapear imports `.js` quebrados em todos os pacotes do monorepo**

```bash
grep -rn 'from "[^"]*\.js"' packages/ | grep -v node_modules
```

Para cada arquivo encontrado, registrar caminho. Não é só `ui-shell` — pode ter em `drivers`, `scp-registry`, `kernel`, `observability`, `feature-flags`. Aplicar mesmo sed em todos:

```bash
find packages/ -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | xargs sed -i 's|from "\(\.\./*[^"]*\)\.js"|from "\1"|g'
find packages/ -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v dist | xargs sed -i 's|from "\(\./[^"]*\)\.js"|from "\1"|g'
```

**1.2 — Mapear todos os pacotes importados pelo shell-commercial**

```bash
grep -rh "from \"@aethereos/" apps/shell-commercial/src/ | sed 's|.*from "\(@aethereos/[^"]*\)".*|\1|' | sort -u
```

Comparar com `vite.config.ts → resolve.alias`. Para cada pacote que falta, adicionar entry. Padrão:

```typescript
"@aethereos/<pkg>": new URL(
  "../../packages/<pkg>/src/index.ts",
  import.meta.url,
).pathname,
```

Exceção: pacotes que existem só em runtime do servidor (drivers-litellm, drivers-langfuse, drivers-nats, drivers-unleash, observability) provavelmente NÃO são importados pelo browser. Verificar antes de adicionar alias desnecessário.

**1.3 — Verificar grants do schema kernel para roles authenticated e anon**

```bash
docker exec supabase_db_aethereos psql -U postgres -c "
  SELECT
    n.nspname as schema_name,
    array_agg(DISTINCT r.rolname) as roles_with_usage
  FROM pg_namespace n
  LEFT JOIN information_schema.usage_privileges p ON p.object_schema = n.nspname AND p.privilege_type = 'USAGE'
  LEFT JOIN pg_roles r ON r.rolname = p.grantee
  WHERE n.nspname IN ('kernel', 'comercio', 'public')
  GROUP BY n.nspname;
"

docker exec supabase_db_aethereos psql -U postgres -c "
  SELECT grantee, table_schema, table_name, privilege_type
  FROM information_schema.table_privileges
  WHERE table_schema = 'kernel' AND table_name = 'employees'
  ORDER BY grantee, privilege_type;
"
```

Se `authenticated` faltar GRANT em employees, criar migration nova `20260430000034_grant_authenticated_employees.sql` com:

```sql
GRANT USAGE ON SCHEMA kernel TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kernel.employees TO authenticated;
GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA kernel TO authenticated;
```

Verificar se outras tabelas de Sprint 11/12 (`profiles`, `companies` (após ALTER), `tenant_memberships` (após ALTER), `company_modules`, `company_addresses`, `company_contacts`) têm grants similares.

**1.4 — Verificar como cliente Supabase é criado e qual schema padrão**

```bash
grep -rn "createClient\|createBrowserClient" apps/shell-commercial/src/lib/ packages/drivers-supabase/src/
```

Identificar:

- Onde `createClient(url, key)` é chamado
- Se é passado opção `db: { schema: 'kernel' }` ou similar
- Se cada query usa `.schema("kernel").from("table")` ou só `.from("table")`

Padronizar: **todos os apps que usam tabelas em `kernel.*` devem usar `.schema("kernel").from(...)`**. Caso o frontend queira por padrão tudo em kernel, configurar no client constructor.

**1.5 — Mapear queries no app RH e Magic Store**

```bash
cat apps/shell-commercial/src/apps/rh/hooks/useEmployees.ts
cat apps/shell-commercial/src/apps/rh/hooks/useEmployee.ts
cat apps/shell-commercial/src/apps/rh/hooks/useEmployeeMutations.ts
cat apps/shell-commercial/src/apps/magic-store/MagicStoreApp.tsx
grep -rn "\.from(" apps/shell-commercial/src/apps/rh/
grep -rn "\.from(" apps/shell-commercial/src/apps/magic-store/
```

Documentar cada `.from()` encontrado e se está no schema certo.

**1.6 — Comparar com apps que funcionavam antes (Drive, Pessoas, Chat)**

```bash
grep -rn "\.from(" apps/shell-commercial/src/apps/drive/
grep -rn "\.from(" apps/shell-commercial/src/apps/pessoas/
grep -rn "\.from(" apps/shell-commercial/src/apps/chat/
```

Como esses apps fazem queries? Padrão deveria ser igual em todos. Se Drive fala `kernel.files` corretamente e RH fala `employees` quebrado, é regressão isolada do RH.

**1.7 — Validar onboarding e cnpj-lookup ainda funcionam**

```bash
ANON_KEY=$(supabase status -o env 2>/dev/null | grep '^ANON_KEY=' | cut -d'"' -f2)
curl -s "http://127.0.0.1:54321/functions/v1/cnpj-lookup?cnpj=04290578000180" -H "apikey: $ANON_KEY" | head -100
```

Esperado: 200 com dados da DLUM REPRESENTACOES LTDA.

Se 401: voltar a verificar `[functions.cnpj-lookup] verify_jwt = false` em `supabase/config.toml`.

---

### FASE 2 — Aplicar fixes priorizados (2-4h)

**Ordem de execução:**

1. **FIX-1: Imports `.js` em todos pacotes** (FASE 1.1) → commit `fix(packages): remove .js extension from internal imports (CIRÚRGICO 12.1 BUG-1)`

2. **FIX-2: Aliases Vite faltantes** (FASE 1.2) → commit `fix(vite): add missing package aliases for browser resolution (CIRÚRGICO 12.1 BUG-2)`

3. **FIX-3: Grants kernel para authenticated** (FASE 1.3) — APENAS SE diagnóstico mostrar grants faltando → migration nova → commit `fix(rls): grant authenticated on kernel.employees + new sprint 12 tables (CIRÚRGICO 12.1 BUG-3)`

4. **FIX-4: Schema kernel nas queries do RH** (FASE 1.4 + 1.5) → commit `fix(rh): use .schema("kernel") in employee queries (CIRÚRGICO 12.1 BUG-4)`

5. **FIX-5: Schema kernel nas queries do Magic Store, se aplicável** → commit `fix(magic-store): use .schema("kernel") in module queries (CIRÚRGICO 12.1 BUG-5)`

Após cada fix, **restartar Vite** e fazer smoke test rápido (curl no rest, verificar não há regressão obvia).

---

### FASE 3 — Reseed e validação (1-2h)

**3.1 — Reseed limpo** (banco pode ter ficado em estado inconsistente após múltiplos restarts):

```bash
cd ~/Projetos/aethereos
supabase stop --no-backup && supabase start
pnpm seed:dev
```

Aguardar todas as 33+ migrations + seed completo. Validar contagens (companies 4, profiles 10, employees 9).

**3.2 — Restart limpo de Vite e scp-worker:**

```bash
pkill -9 -f "vite" 2>/dev/null
pkill -9 -f "scp-worker" 2>/dev/null
sleep 3

# Verificar libs Playwright instaladas (necessárias para test:e2e)
sudo apt install -y libnss3 libnspr4 libasound2t64 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libpango-1.0-0 libxkbcommon0 libxshmfence1 \
  2>/dev/null || echo "libs já instaladas"

nohup pnpm --filter=@aethereos/scp-worker dev > /tmp/worker.log 2>&1 &
sleep 3
nohup pnpm --filter=@aethereos/shell-commercial dev > /tmp/shell.log 2>&1 &
sleep 12

ps aux | grep -E "vite|scp-worker" | grep -v grep | head -5
curl -s -o /dev/null -w "Shell HTTP: %{http_code}\n" http://127.0.0.1:5174/
```

Espero Shell HTTP **200**, ambos processos vivos.

**3.3 — Smoke test via curl autenticado**

Login programático e teste de query autenticada:

```bash
# Login obtem JWT
ANON_KEY=$(supabase status -o env 2>/dev/null | grep '^ANON_KEY=' | cut -d'"' -f2)
JWT=$(curl -s "http://127.0.0.1:54321/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"ana.lima@meridian.test","password":"Aethereos@2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "JWT obtido: ${JWT:0:20}..."

# Query employees com JWT (esperado: 200 com lista)
curl -s "http://127.0.0.1:54321/rest/v1/employees?select=full_name,position,department&limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT" \
  -H "Accept-Profile: kernel"

# Query files (drive, comparação) - esperado: 200 com lista
curl -s "http://127.0.0.1:54321/rest/v1/files?select=*&limit=5" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $JWT" \
  -H "Accept-Profile: kernel"
```

Se queries retornarem JSON com dados, fix funcionou. Se 400/403, há mais bugs.

---

### FASE 4 — Gates triplos verdes (1h)

**Pré-requisitos:**

- Vite rodando 5174 + Shell HTTP 200
- Supabase containers up + 33+ migrations + seed
- Working tree commitado (sem mods stagiados ou unstaged)

**Gate 1:**

```bash
pnpm ci:full > /tmp/s12_1_ci.log 2>&1
echo "ci:full EXIT: $?"
tail -10 /tmp/s12_1_ci.log
```

**Gate 2:**

```bash
pnpm test:smoke > /tmp/s12_1_smoke.log 2>&1
echo "test:smoke EXIT: $?"
tail -10 /tmp/s12_1_smoke.log
```

**Gate 3 (com env carregado):**

```bash
set -a; source tooling/e2e/.env.local; set +a
pnpm test:e2e:full > /tmp/s12_1_e2e.log 2>&1
echo "test:e2e:full EXIT: $?"
tail -50 /tmp/s12_1_e2e.log
```

**TODOS OS 3 GATES PRECISAM EXIT 0.** Se algum falhar, voltar para FASE 1 sobre o que ficou pendente.

Se `test:e2e:full` falhar nos novos testes Sprint 12 (rh.spec, magic-store.spec, onboarding.spec), pode ser problema de **seletor errado nos testes**, não de feature quebrada — agente Sprint 12 escreveu testes que possivelmente nunca rodaram. Investigar caso a caso. Pode ser necessário ajustar:

- Seletores `data-testid` (verificar se componentes expõem)
- Regex em `getByText` ou `getByRole`
- Esperar elementos com timeouts maiores

---

### FASE 5 — Commit final + atualizar SPRINT_LOG (30min)

Atualizar `SPRINT_LOG.md` com seção:

```markdown
---

# Sprint Cirúrgico 12.1 — Remediação pós-validação manual

Início: <timestamp>
Modelo: Claude Code

## Origem

Validação visual humana após Sprint 12 fechado revelou que apenas Copilot
renderizava. Outros 7 apps com tela vazia (Drive, Pessoas, Chat, Settings,
RH, Magic Store, Governança, Auditoria). Console mostrava queries 400 e
warnings GoTrueClient.

## Bugs encontrados e fixes aplicados

[Lista detalhada de cada bug-N e commit correspondente]

## Validação final

[Outputs reais dos 3 gates - colar bruto]

## Dívidas técnicas registradas em KNOWN_LIMITATIONS

- Multiple GoTrueClient instances detected (warning, não-crítico)
- [outras descobertas]
```

Commit final:

```bash
git add SPRINT_LOG.md DIAGNOSE_12_1.md KNOWN_LIMITATIONS.md
git commit -m "chore: encerramento sprint cirurgico 12.1 — apps recuperados, gates triplos verdes"
```

---

## TÉRMINO

**NÃO** push para origin sem confirmação humana. Aguardar humano validar visualmente que apps renderizam.

Após sessão, devolver controle ao humano com mensagem clara:

```
Sprint cirúrgico 12.1 completo localmente.

Bugs consertados: <N>
Commits criados: <hashes>
Gates triplos: ci:full ✅ + test:smoke ✅ + test:e2e:full ✅

Ainda pendente:
- Validação visual no browser (humano abre Drive/Pessoas/RH/Magic Store)
- Push pra origin

Não pushei para origin. Aguardando aprovação humana.
```

---

## PROMPT DE RETOMADA

```
Estou retomando Sprint Cirúrgico 12.1 (remediação pós-Sprint 12) no Aethereos.

Antes de qualquer ação:
1. git log --oneline -10
2. git status
3. cat DIAGNOSE_12_1.md (se existir, retomar de onde parou)
4. Identificar próxima FASE não concluída
5. Continuar

Lembrar:
- NÃO criar features novas
- NÃO fazer rollback do Sprint 12
- Validação visual humana é gate obrigatório no fim
- Gates triplos com saída real do terminal antes de declarar fechado
```

Salve este arquivo como `SPRINT_CIRURGICO_12_1_PROMPT.md` na raiz do projeto antes de começar.
