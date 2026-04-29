# Runbook — Claim `is_staff` no JWT

> Como adicionar o claim `is_staff: true` ao JWT de um usuário Aethereos para acesso ao painel staff.

## Como funciona

O claim `is_staff` é injetado pelo `kernel.custom_access_token_hook` ao emitir/refrescar tokens. O hook lê `auth.users.raw_app_meta_data->>'is_staff'`.

`app_metadata` só pode ser modificado por `service_role` ou admin — usuários autenticados NÃO conseguem alterar seu próprio `app_metadata`. Isso garante que o claim seja controlado apenas pela plataforma.

O `staffRoute` em `apps/shell-commercial/src/routes/staff.tsx` verifica `isStaff === true` (que vem do JWT claim) antes de renderizar. A Edge Function `staff-list-companies` também verifica o claim no JWT antes de qualquer query.

---

## Adicionar `is_staff` via SQL (método preferido)

```sql
-- Substituir <user_id> pelo UUID do usuário alvo
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"is_staff": true}'::jsonb
WHERE id = '<user_id>';
```

Após executar, o usuário precisará refrescar o token (novo login ou refresh manual) para que o claim apareça no JWT.

**Verificar que funcionou:**

```sql
SELECT id, email, raw_app_meta_data->>'is_staff' as is_staff
FROM auth.users
WHERE id = '<user_id>';
```

---

## Adicionar via Supabase Studio

1. Abrir **Authentication → Users** no Supabase Studio (http://localhost:54323 em dev local)
2. Encontrar o usuário alvo
3. Clicar em **Edit user**
4. Na seção **App Metadata**, adicionar: `{"is_staff": true}`
5. Salvar
6. Usuário faz logout + login para obter novo token

---

## Remover o claim (revogar acesso staff)

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'is_staff'
WHERE id = '<user_id>';
```

O usuário perderá acesso ao `/staff` no próximo refresh de token.

---

## Como o hook injeta o claim

O `kernel.custom_access_token_hook` (migration `20260430000010_staff_jwt_claim.sql`) faz:

```sql
SELECT (raw_app_meta_data ->> 'is_staff')::boolean
INTO   is_staff_flag
FROM   auth.users
WHERE  id = user_id_val;

claims := jsonb_set(claims, '{is_staff}', to_jsonb(COALESCE(is_staff_flag, false)));
```

Se `is_staff` não estiver em `app_metadata`, o hook injeta `is_staff: false`.

---

## Segurança

- Somente `service_role` ou acesso direto ao banco pode modificar `app_metadata`
- `is_staff` nunca é modificável pelo usuário autenticado (diferente de `user_metadata`)
- Todo acesso ao painel staff via `/staff` gera entrada em `kernel.staff_access_log` e notificação ao owner da company acessada
- O claim é platform-level (não tenant-scoped): o mesmo flag vale em qualquer context de company

---

## Verificar no banco (dev local)

```bash
# Com Supabase local rodando:
pnpm db:start

# Via psql:
psql -h localhost -p 54322 -U postgres -d postgres -c \
  "SELECT email, raw_app_meta_data->>'is_staff' as is_staff FROM auth.users ORDER BY created_at DESC LIMIT 10;"
```
