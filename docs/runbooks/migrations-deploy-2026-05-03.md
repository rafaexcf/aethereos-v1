# Runbook — Deploy das migrations da sprint 2026-05-03

> **Aviso operacional**: este runbook cobre **25 migrations** (`20260502000001` → `20260503000014`)
> adicionadas em uma única sprint. Aplicar em ambiente local primeiro, validar, depois remoto.
> NUNCA aplicar diretamente em produção sem rodar `pnpm test:isolation` e smoke manual.

---

## 0. Inventário das migrations

```
supabase/migrations/
├── 20260502000001_kernel_notes.sql              (productivity core)
├── 20260502000002_kernel_tasks.sql
├── 20260502000003_kernel_contacts.sql
├── 20260502000004_kernel_calculator.sql         (calculator history)
├── 20260502000005_kernel_clock.sql              (alarms + pomodoro + clock prefs)
├── 20260502000006_kernel_media_files.sql        (+ bucket kernel-media)
├── 20260502000007_kernel_voice_recordings.sql   (+ bucket kernel-voice)
├── 20260502000008_kernel_polls.sql              (polls + options + votes)
├── 20260502000009_kernel_browser.sql            (bookmarks + history)
├── 20260502000010_kernel_kanban.sql             (8 tabelas: boards/columns/cards/labels/...)
├── 20260502000011_kernel_notifications.sql      (Realtime publication)
├── 20260503000001_kernel_trash_items.sql        (generic trash, item_data jsonb)
├── 20260503000002_kernel_spreadsheets.sql
├── 20260503000003_kernel_documents.sql
├── 20260503000004_kernel_presentations.sql
├── 20260503000005_kernel_pdf_notes.sql
├── 20260503000006_kernel_calendar.sql           (calendar_defs + events)
├── 20260503000007_kernel_company_modules_catalog.sql  (afrouxa CHECK + add CRUD policies)
├── 20260503000008_kernel_automations.sql        (+ Realtime)
├── 20260503000009_kernel_files_bucket.sql       (Drive bucket — gap crítico de deploys anteriores)
├── 20260503000010_kernel_pdfs_bucket.sql        (PDF binary)
├── 20260503000011_kernel_pdf_notes_storage.sql  (ALTER TABLE add storage_path)
├── 20260503000012_kernel_user_preferences.sql   (cross-device sync, RLS user_id only)
├── 20260503000013_kernel_workspace_state.sql    (tabs+windows JSONB snapshot)
└── 20260503000014_kernel_meetings.sql           (+ bucket kernel-meetings)
```

**Total**: 25 migrations | 14 schema/RLS | 6 buckets de Storage | 1 ALTER TABLE | resto Realtime/triggers.

---

## 1. Local (Supabase CLI)

### 1.1 Pré-requisitos

- Supabase CLI ≥ 1.180 (`supabase --version`)
- Docker rodando (Supabase local stack)
- `.env` com `SUPABASE_DB_URL` apontando para local (default `postgresql://postgres:postgres@127.0.0.1:54322/postgres`)

### 1.2 Aplicar

```bash
# Da raiz do monorepo:
cd /home/rafaex/Projetos/aethereos

# Opção A — reset total (dev limpa, perde dados)
pnpm db:reset
# equivale a: supabase db reset
# isso roda TODAS as migrations + seed em ordem

# Opção B — push incremental (mantém dados existentes)
supabase db push
# aplica apenas migrations não rodadas (compara com tabela schema_migrations interna)
```

### 1.3 Validar buckets de Storage

Os buckets são criados dentro das migrations via `INSERT INTO storage.buckets`.
Verificar:

```bash
psql "$SUPABASE_DB_URL" -c "SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id LIKE 'kernel-%';"
```

Esperado (5 linhas):

```
       id        |       name      | public | file_size_limit
-----------------+-----------------+--------+-----------------
 kernel-media    | kernel-media    | f      |       524288000
 kernel-voice    | kernel-voice    | f      |       524288000
 kernel-files    | kernel-files    | f      |       524288000
 kernel-pdfs     | kernel-pdfs     | f      |       104857600
 kernel-meetings | kernel-meetings | f      |       524288000
```

### 1.4 Verificar policies RLS

```bash
psql "$SUPABASE_DB_URL" <<SQL
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'kernel'
  AND tablename IN (
    'user_preferences', 'workspace_state', 'meetings', 'automations',
    'trash_items', 'company_modules', 'pdf_notes'
  )
ORDER BY tablename, policyname;
SQL
```

Validações chave:

- `user_preferences` policy deve filtrar por `user_id = auth.uid()` APENAS (sem `company_id`).
- `workspace_state`, `meetings`, `automations` devem filtrar por `user_id + company_id`.
- `company_modules` deve ter SELECT/INSERT/UPDATE/DELETE policies (não só SELECT).

### 1.5 Smoke local

```bash
pnpm --filter shell-commercial dev
# abrir http://localhost:5174 (ou porta auto-atribuída)
# logar com user de teste
# fluxos críticos:
#   1. Mesa → Magic Store → instalar qualquer app → reload → continua installed
#   2. Bloco-de-notas → criar nota → reload → nota volta
#   3. Tarefas → criar tarefa → reload → tarefa volta
#   4. Camera → tirar foto → save → reload → foto volta na galeria
#   5. PDF → subir arquivo → fechar app → reabrir → arquivo volta com signed URL
#   6. Reuniões → criar reunião → entrar (Jitsi carrega) → sair → row em kernel.meetings
#   7. Avatar top-right → CommandCenter → Bloquear → digita senha → desbloqueia
#   8. Right-click no tab → Dividir com... → split aparece → drag divider funciona
```

### 1.6 Rodar gates de teste

```bash
pnpm ci:full          # typecheck + lint + deps:check + test + test:isolation + build
                      # já validado nesta sprint: EXIT 0
```

---

## 2. Remoto (Supabase Cloud)

> ⚠️ **NÃO rodar em produção sem antes**:
>
> 1. Validar local 100% conforme §1
> 2. Backup do banco remoto (`pg_dump` ou snapshot via dashboard)
> 3. Janela de manutenção comunicada (algumas migrations têm `ALTER TABLE` que pegam lock)
> 4. PR com 1+ approval humano

### 2.1 Conectar ao remoto

```bash
# Configurar projeto
supabase login
supabase link --project-ref <PROJECT_REF>

# Verificar diff (dry-run — mostra o que vai aplicar)
supabase db diff
```

### 2.2 Aplicar (incremental, NUNCA reset)

```bash
supabase db push
# aplica migrations que NÃO estão registradas em supabase_migrations.schema_migrations
```

### 2.3 Pós-deploy: rodar test:isolation contra remoto

```bash
# necessita E2E_SUPABASE_URL + E2E_SUPABASE_ANON_KEY + E2E_USER_*  vars
pnpm test:isolation
```

### 2.4 Smoke remoto

Repetir checklist §1.5 contra ambiente remoto. Bloqueador para release: TODOS os 8 fluxos OK.

---

## 3. Rollback (se algo der errado)

### 3.1 Rollback granular (migration específica)

Supabase **não tem rollback automático** — cada migration precisa do seu DDL reverso escrito à mão. Para esta sprint, **NENHUMA das 25 migrations tem `down.sql`**.

Estratégia de rollback se descobrir bug crítico em produção:

1. **Para tabelas novas (a maioria)**: `DROP TABLE kernel.<nome> CASCADE;` — simples, perde dados.
2. **Para `ALTER TABLE kernel.pdf_notes ADD COLUMN storage_path`**: `ALTER TABLE kernel.pdf_notes DROP COLUMN storage_path;` (idempotente).
3. **Para `kernel.company_modules` CHECK relax (migration `20260503000007`)**: re-aplicar o CHECK enum estrito antigo. Conferir o conteúdo da `module` em todas as rows existentes ANTES — se houver entries fora do enum, o ALTER vai falhar. Plano: `DELETE FROM kernel.company_modules WHERE module NOT IN (...)` antes de re-aplicar CHECK.
4. **Para buckets de Storage**: `DELETE FROM storage.buckets WHERE id = 'kernel-...';` — só funciona se o bucket está vazio. Para limpar: `DELETE FROM storage.objects WHERE bucket_id = 'kernel-...';` primeiro.

### 3.2 Restore de backup

Se o rollback granular for arriscado, restore do snapshot tirado em §2 antes do deploy. Tempo de downtime depende do tamanho do banco.

---

## 4. Observabilidade pós-deploy

Monitorar por 24h:

- **Logs do Postgres** (Supabase dashboard → Logs → Postgres): erros de RLS denied, FK violation, CHECK violation, etc.
- **Logs do PostgREST** (apps → Edge Logs): 403 silenciosos (bug de RLS), 500 (migration parcial).
- **Métricas de Storage**: novos uploads em `kernel-files/pdfs/meetings/media/voice` — se zero em 24h, possível regressão.
- **Realtime**: tabelas com publication (`notifications`, `automations`, `user_preferences`) devem aparecer em `pg_publication_tables`.

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

---

## 5. Issues conhecidos (riscos abertos)

1. **Race em deploys staged**: se aplicar `20260503000007_kernel_company_modules_catalog.sql` (afrouxa CHECK) **antes** do client estar atualizado, novos inserts ainda são rejeitados pelo CHECK antigo cached pelo PG. Solução: aplicar migration → recarregar PostgREST schema cache (`NOTIFY pgrst, 'reload schema'`).

2. **Workspace state hidratação**: row é criada na primeira mudança. Se usuário nunca mover tabs, nunca cria row. Não é bug, mas vale documentar.

3. **PDF storage_path retroativo**: PDFs criados ANTES de aplicar `20260503000011_kernel_pdf_notes_storage.sql` ficam com `storage_path = NULL`. App os trata como "binary perdido" (consistente com comportamento pré-sprint). Não há migração de dados retroativa — se quiser, escrever script que toma rows com `storage_path IS NULL` e marca como "arquivo precisa ser reanexado".

4. **Camera/voice trash storage purge**: objetos em `kernel-media`/`kernel-voice` ficam no bucket APÓS delete + após `expires_at` da `trash_items` row passar. Não há cron rodando para purgar. Bucket cresce indefinidamente até implementar Edge Function scheduled.

5. **Auditoria de envelope SCP**: app Auditoria lê `kernel.scp_outbox` mas NÃO valida assinatura Ed25519 (P11 do CLAUDE.md raiz). Validação visual só. Verificação criptográfica fica para sprint dedicada.

---

## 6. Checklist final antes de marcar deploy como done

- [ ] Local: `pnpm db:reset` ou `supabase db push` rodou sem erro
- [ ] Local: `pnpm ci:full` EXIT 0
- [ ] Local: 8 fluxos de smoke (§1.5) OK
- [ ] Buckets criados (5 buckets `kernel-*` listados via SQL §1.3)
- [ ] Policies RLS verificadas (§1.4)
- [ ] Realtime publication contém tabelas esperadas (§4)
- [ ] Backup do remoto tirado (se aplicando em prod)
- [ ] PR aprovado por 1+ revisor humano
- [ ] Janela de manutenção comunicada (se prod)
- [ ] Remoto: `supabase db push` rodou sem erro
- [ ] Remoto: `pnpm test:isolation` EXIT 0
- [ ] Remoto: 8 fluxos de smoke OK
- [ ] Logs do Postgres limpos por 24h pós-deploy
- [ ] Métricas de Storage mostrando uploads bem-sucedidos

---

**Autor**: sprint 2026-05-03 (auto-implementação Claude Code, ratificação humana pendente)
**Subordinado a**: `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` §12 (PRs exigem ADR + revisão humana), `docs/adr/0022-*` (smoke obrigatório em mudanças de auth/migrations)
