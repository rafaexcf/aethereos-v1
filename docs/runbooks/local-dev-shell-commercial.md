# Runbook — Desenvolvimento local: shell-commercial (Camada 1)

**Audiência:** Engenheiros trabalhando na Camada 1 (`apps/shell-commercial/`).

**Pré-requisitos:**

- Docker Desktop instalado e rodando (necessário para Supabase local)
- Supabase CLI ≥ 2.90 (`brew install supabase/tap/supabase`)
- pnpm ≥ 9
- Node.js ≥ 20.19

---

## 1. Subindo o banco local (Supabase)

```bash
# Sobe Postgres + PostgREST + Auth local e aplica migrations + seed
pnpm dev:db
```

O que acontece:

1. `supabase start` — inicia containers Docker: Postgres 17, PostgREST, GoTrue (Auth), Studio
2. `supabase db reset` — aplica todas as migrations em `supabase/migrations/` e o seed em `supabase/seed.sql`

Portas padrão:
| Serviço | URL |
| ---------- | ----------------------------- |
| API REST | http://localhost:54321 |
| Postgres | postgresql://localhost:54322 |
| Auth (GoTrue) | http://localhost:54321/auth |
| Studio | http://localhost:54323 |
| Inbucket (email local) | http://localhost:54324 |

Credenciais de acesso local (não são segredos em dev):

```
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<ver supabase status>
SUPABASE_SERVICE_ROLE_KEY=<ver supabase status>
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

Para ver as chaves:

```bash
supabase status
# ou
supabase status -o json | jq '.'
```

---

## 2. Verificando que RLS está funcionando (fail-closed)

Conecte ao banco e verifique que sem contexto de tenant a query retorna 0 rows:

```bash
psql "$(supabase status -o json | jq -r '.DB_URL')" \
  -c "SET ROLE authenticated; SELECT count(*) FROM kernel.companies;"
# Resultado esperado: count = 0 (RLS fail-closed ativo)
```

Com o seed aplicado, a empresa de dev tem ID `00000000-0000-0000-0000-000000000001`. Para testar com contexto:

```bash
psql "$(supabase status -o json | jq -r '.DB_URL')" << 'SQL'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('app.current_company_id', '00000000-0000-0000-0000-000000000001', true);
SELECT slug, name FROM kernel.companies;
ROLLBACK;
SQL
# Resultado esperado: 1 row com slug=aethereos-dev
```

---

## 3. Rodando testes de isolação cross-tenant

Os testes de RLS requerem banco local rodando. Configure a variável de ambiente:

```bash
export TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
pnpm test:isolation
```

Os testes:

- Criam 2 companies de teste temporárias
- Verificam isolação cross-tenant (empresa A não vê dados de empresa B)
- Verificam fail-closed sem contexto (0 rows)
- Testam switching de contexto na mesma sessão
- Limpam os dados ao finalizar

Skip automático: se `TEST_DATABASE_URL` não estiver definida, todos os testes são skipped (não falham). Útil em CI sem Docker.

---

## 4. Subindo o shell-commercial em dev

```bash
# Supabase já rodando (pnpm dev:db)
pnpm --filter=@aethereos/shell-commercial dev
# Abre em http://localhost:5174
```

Configure `.env.local` em `apps/shell-commercial/`:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<ver supabase status>
```

---

## 5. Subindo o scp-worker (publicação de eventos no NATS)

```bash
# NATS JetStream (docker-compose)
pnpm dev:infra

# Build do worker (necessário antes de rodar)
pnpm --filter=@aethereos/scp-worker build

# Worker em modo watch
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres \
NATS_URL=nats://localhost:4222 \
pnpm --filter=@aethereos/scp-worker dev
```

---

## 6. Parando a infra local

```bash
# Para e limpa containers Supabase
pnpm db:stop

# Para NATS
pnpm dev:infra:down
```

---

## 7. Resetando o banco (apaga dados, reaplica migrations + seed)

```bash
pnpm db:reset
```

Útil após mudar migrations. Dados de dev são perdidos — esperado.

---

## 8. Criando nova migration

```bash
pnpm db:migration nome-da-migration
# Cria supabase/migrations/<timestamp>_nome-da-migration.sql
# Edite o arquivo e rode pnpm db:reset para aplicar
```

---

## 9. Troubleshooting

### "Cannot find supabase" / CLI não instalado

```bash
brew install supabase/tap/supabase
```

### Docker não disponível (WSL2)

Habilite a integração WSL2 no Docker Desktop:

- Docker Desktop → Settings → Resources → WSL Integration → ative sua distro

### Port already in use (54321, 54322, 54323...)

```bash
supabase stop --no-backup
supabase start
```

### Migrations falharam ao aplicar

```bash
supabase db reset  # reaplica do zero
```

Se falhar, verifique o arquivo de migration com `supabase db diff` para detectar conflito de schema.

### RLS retornando dados inesperados

1. Verifique que `kernel.set_tenant_context()` foi chamada com UUID correto
2. Confirme que a company tem `status = 'active'` (`set_tenant_context` valida isso)
3. Use `EXPLAIN (ANALYZE, VERBOSE)` na query para ver qual policy está sendo aplicada

---

## 10. Checklist antes de abrir PR (Camada 1)

- [ ] `pnpm typecheck` — sem erros
- [ ] `pnpm lint` — sem erros
- [ ] `pnpm deps:check` — sem violações de arquitetura
- [ ] `TEST_DATABASE_URL=... pnpm test:isolation` — todos os testes passam
- [ ] Toda nova tabela tem `company_id NOT NULL` + RLS habilitada + policy
- [ ] Supabase client não importado fora de `packages/drivers-supabase/`
- [ ] Sem `console.log` (ESLint bloqueia)
- [ ] Bundle inicial < 500 KB gzip (verificar `pnpm build`)
