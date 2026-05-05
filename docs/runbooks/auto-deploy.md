# Runbook — Auto-Deploy (Vercel + Supabase)

Sprint 31 / MX172 — Gate 5 (CI/CD).

Este runbook descreve como deploys de produção são acionados e o que
fazer quando algo dá errado.

---

## 1. Resumo

- **Vercel Git Integration** já está conectada ao repositório (`.vercel/project.json`).
- **Push em `main`** → deploy de **produção** automático em `aethereos.io`.
- **Push em `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*`** → deploy de **preview** com URL única por commit.
- **Pull requests** → preview deploy + comentário automático com URL e build summary.

Não rode `vercel --prod` manualmente em main — confia no auto-deploy.
A exceção é hotfix emergencial sem permissão de push.

---

## 2. Verificação rápida

```bash
# Git → Vercel
git remote -v                        # confirma origin
cat .vercel/project.json             # confirma projectId/orgId
curl -fsS https://aethereos.io/      # responde 200?
curl -fsS https://oublhirkojyipwtmkzvw.supabase.co/functions/v1/health  # 200 + status:'ok'?
```

Para inspecionar deployments via CLI:

```bash
vercel ls                            # lista últimos deployments
vercel inspect <deployment-url>      # detalhes do build
vercel logs <deployment-url>         # tail dos logs
```

---

## 3. Migrations no fluxo de deploy

**Migrations Supabase NÃO são aplicadas automaticamente pelo deploy Vercel.**
Seguir esta ordem em PRs que tocam `supabase/migrations/`:

1. **Antes do merge**: revisar SQL local (`supabase migration up` em dev).
2. **Após merge em main, ANTES do deploy Vercel terminar**: aplicar no cloud:
   ```bash
   supabase db push --linked
   ```
3. Vercel deploy continua normalmente — o frontend novo só estará no ar
   depois do build (≈2 min).
4. Se a migration introduz coluna NOT NULL ou constraint quebrável, fazer
   migration em dois passos (NULLABLE primeiro → backfill → constraint
   depois) e dois deploys distintos.

Edge Functions:

```bash
supabase functions deploy --no-verify-jwt
```

Idempotente. Pode rodar antes ou depois do `supabase db push`.

---

## 4. Variáveis de ambiente (Vercel)

Lista canônica em **Vercel → Project → Settings → Environment Variables**.
Não commitar `.env*` (gitignored). Para sincronizar local:

```bash
vercel env pull .env.local           # baixa env de Production
vercel env pull --environment=preview .env.preview.local
```

Variáveis críticas (qualquer um faltando = boot quebra):

| Nome                        | Onde usado                       |
| --------------------------- | -------------------------------- |
| `VITE_SUPABASE_URL`         | Shell + comercio.digital         |
| `VITE_SUPABASE_ANON_KEY`    | Shell + comercio.digital         |
| `VITE_SENTRY_DSN`           | Shell (opcional, MX171)          |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions (set no Supabase) |
| `ALLOWED_ORIGINS`           | Edge Functions CORS (Sprint 27)  |

---

## 5. Rollback

### Front (Vercel)

1. Vercel dashboard → **Deployments** → escolher deploy estável anterior.
2. Botão **"Promote to Production"** → confirma.
3. Tempo: <30s.

Ou via CLI:

```bash
vercel rollback <deployment-url> --yes
```

### Banco (Supabase)

Migrations destrutivas (DROP COLUMN, drop tabela) **não têm rollback
automático**. Reverter exige:

1. Migration nova restaurando a estrutura.
2. Restore do backup point-in-time (Supabase Pro+).

Por isso, evite migrations destrutivas em produção sem janela de
manutenção e backup explícito.

---

## 6. CI Gate

`.github/workflows/ci.yml` cobre antes do deploy:

- typecheck
- lint
- deps-check (dependency-cruiser)
- audit (high/critical bloqueia)
- unit tests
- build
- E2E (Playwright + Supabase local)

Vercel só aceita o deploy quando GitHub Actions reportarem verde
(configurado em **GitHub branch protection** + **Vercel "Wait for CI"**).

---

## 7. Quando algo quebra

### Build falha no Vercel

```bash
vercel logs <preview-url>            # ver stack trace
```

Geralmente: env var faltando, dep nova não no lockfile, mistype.

### App carrega mas API quebra

1. Health endpoint: `curl https://oublhirkojyipwtmkzvw.supabase.co/functions/v1/health`
2. Se `db: error` no payload → Supabase down ou connection limit.
3. Vercel Function logs: `vercel logs <prod-url> --follow`.
4. Sentry/console: filtrar por `[obs] error`.

### Chunk load error em prod (deploy novo)

Sprint 27 já tem auto-reload one-shot. Se persistir, hard reload com
`Ctrl+Shift+R` ou clear cache.

---

## 8. Próximos passos (fora deste sprint)

- [ ] Pulumi IaC para Supabase config (Vercel já gerencia front).
- [ ] Action que roda `supabase db push` automatizado com OIDC token.
- [ ] Slack notification em deploy fail.

Versão: 1.0.0
Última revisão: 2026-05-05 (Sprint 31)
