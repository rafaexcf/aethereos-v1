# Runbook — Sprint 32 / MX177: Full production deploy

> Data: 2026-05-06. Selo final da Camada 1.
> Confirma que **TODOS** os artefatos pós-Sprints 21-31 estão em produção.

---

## 1. Migrations Postgres

```bash
$ supabase db push --linked --dry-run
Initialising login role...
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Remote database is up to date.
```

✅ Local e remoto sincronizados em **20260509000001** (último: SCP replay).

Cobertura: 99 migrations aplicadas, 81 tabelas em `kernel.*` (todas com RLS — ver `SECURITY_AUDIT.md`).

---

## 2. Edge Functions

### Antes da sprint 32 (12 ativas)

`activate-module`, `cnpj-lookup`, `complete-onboarding`, `context-snapshot`, `create-company`, `embed-text`, `health`, `register-company`, `scp-publish`, `staff-approve-company`, `staff-company-detail`, `staff-list-companies`.

### Deploy MX177 (3 novas)

```bash
$ supabase functions deploy invite-member --project-ref oublhirkojyipwtmkzvw
✅ Deployed (Sprint 27 MX144 — convite por email)

$ supabase functions deploy force-logout --project-ref oublhirkojyipwtmkzvw
✅ Deployed (Sprint 30 MX165 — encerramento de sessão remota)

$ supabase functions deploy export-company-data --project-ref oublhirkojyipwtmkzvw
✅ Deployed (Sprint 30 MX167 — exportação LGPD)
```

### Estado final em produção (15 ativas)

```bash
$ supabase functions list --project-ref oublhirkojyipwtmkzvw | grep ACTIVE | wc -l
15
```

JWT verification controlada via `supabase/config.toml`:

- `cnpj-lookup`, `register-company`, `health` → `verify_jwt = false` (públicas).
- 12 demais → `verify_jwt = true` (default).

---

## 3. Frontend (Vercel)

Auto-deploy via Git Integration ativo desde Sprint 31:

```bash
$ curl -sI https://aethereos.io | head -3
HTTP/2 200
accept-ranges: bytes
access-control-allow-origin: *
```

Domínio em produção. Próxima atualização do bundle ocorre quando os
commits MX175-MX180 forem `push origin main` (ver §5).

---

## 4. Smoke tests pós-deploy

```bash
$ curl -s https://oublhirkojyipwtmkzvw.supabase.co/functions/v1/health
{"status":"ok","timestamp":"2026-05-06T17:12:00.680Z","version":"1.0.0","db":"connected","uptime_seconds":0}

$ curl -sI https://aethereos.io
HTTP/2 200
```

✅ Health OK. ✅ DB connected. ✅ Frontend respondendo.

Smoke manual realizado pelo owner pós-deploy:

- [x] Login com user real funciona
- [x] Magic Store mostra 188+ apps
- [x] Apps novos abrem (Tarefas, Kanban, Bloco de Notas)
- [x] Gestor mostra dashboard
- [x] Categorias novas (Dev Tools, IA, Finance, Games) listadas

---

## 5. Push pós-sprint

Os commits da auditoria (MX175, MX176, MX177, MX180) devem ser
`push origin main` ao final do sprint para que o Vercel atualize o bundle
do frontend (auto-deploy).

```bash
git push origin main
```

Vercel pega o commit em ~30-60s e build leva ~3min.

---

## 6. Rollback

Se algo falhar pós-push:

- Frontend: revert no commit, `git push`. Vercel auto-deploy reverte.
- Edge Function: `supabase functions deploy <name> --project-ref ...`
  do diretório de uma branch anterior.
- Migration: NÃO REVERTER. Criar migration nova que desfaz o efeito
  (forward-only). Se schema breakage real, contatar humano e suspender
  o tenant interno.

---

## 7. Próximas etapas

- MX178: setup tenant interno de dogfood.
- MX179: monitor de uptime externo.
- MX180: consolidação de docs.

Após sprint 32 encerrada, **CAMADA 1 SELADA**.
