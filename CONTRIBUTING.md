# Contribuindo com o Aethereos

Obrigado pelo interesse em contribuir com o Aethereos. Este monorepo abriga
três camadas (ver `LICENSE` e `CLAUDE.md`):

- **Camada 0** (`apps/shell-base/`, `packages/kernel/*`, drivers locais) — BUSL-1.1
- **Camada 1** (`apps/shell-commercial/`, drivers cloud) — proprietária
- **Camada 2** (verticais e sites institucionais) — proprietária

Contribuições externas são aceitas **principalmente na Camada 0**. Mudanças
na Camada 1 ou 2 exigem acordo comercial ou que você seja colaborador
nominado.

---

## 1. Antes de começar

1. Leia `CLAUDE.md` (raiz). Ele é a constituição operacional do repo.
2. Leia `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` se for tocar em algo arquitetural.
3. Verifique se já existe ADR relevante em `docs/adr/`.
4. Garanta que sua mudança **não viola um `[INV]`** (invariante). Se violar,
   abra primeiro um ADR de revisão antes do PR.

---

## 2. Setup local

```bash
pnpm install
pnpm dev          # Vite dev em todos os shells
pnpm test         # unit tests
pnpm test:e2e     # Playwright (requer Supabase local)
```

Detalhes em `QUICK_START.md`.

---

## 3. Fluxo de Pull Request

1. **Fork e branch**: nomes no padrão `feat/<scope>-<desc>`, `fix/<scope>-<desc>`,
   `docs/<scope>`, `chore/<scope>`.
2. **Implemente** em commits pequenos e descritivos.
3. **Padrão de commit**: `feat(scope): descrição` / `fix(scope): descrição` /
   `docs(scope): descrição` / `chore(scope): descrição`. Para sprints internos
   adicionamos sufixo `(MXN)`.
4. **Antes do PR**:
   ```bash
   pnpm ci:full          # typecheck + lint + deps + test + build
   pnpm test:smoke       # se tocou em auth, env, migrations, drivers
   ```
5. **Abra o PR** descrevendo: o que muda, por que, qual `[INV]/[DEC]/[HIP]`
   afeta. Linke ADR se aplicável.
6. **CI obrigatório**: typecheck, lint, dependency-cruiser, audit (high/critical
   bloqueia), unit tests, isolation tests (cross-tenant RLS), build.
7. **Revisão humana**: mesmo que squad agêntico aprove, merge requer ≥1
   approval humano.
8. **Squash & merge** para histórico limpo.

---

## 4. Code review checklist

- [ ] Não introduz dependência sem justificativa no PR.
- [ ] Não importa entre camadas que `dependency-cruiser` bloqueia.
- [ ] Adiciona/atualiza testes na mesma PR (unit + isolation se toca dados).
- [ ] Se toca SCP: schema Zod registrado em `packages/scp-registry/`.
- [ ] Se toca migrations: nome timestamp `YYYYMMDDHHMMSS_descricao.sql`,
      idempotente quando possível.
- [ ] Sem `console.log` em código de produção.
- [ ] Sem chamada direta a SDK de LLM — passar pelo gateway LiteLLM.

---

## 5. Contributor License Agreement (CLA)

Por enquanto contribuições externas são aceitas sob a licença vigente do
arquivo modificado (BUSL-1.1 para Camada 0). Quando o projeto adotar CLA
formal (planejado), notificaremos via PR template e GitHub Action de
verificação.

---

## 6. Código de Conduta

Toda interação no repo, issues, PRs e canais oficiais é regida por
`CODE_OF_CONDUCT.md`. Reports: `conduct@aethereos.io`.

---

## 7. Reportando vulnerabilidades

**Não abra issue pública.** Siga `SECURITY.md` — email `security@aethereos.io`
com disclosure responsável de 90 dias.

---

## 8. Como pedir ajuda

- Issues do GitHub para bugs e feature requests da Camada 0.
- `docs/runbooks/` para operações conhecidas.
- Discussions (quando habilitado) para perguntas conceituais.

Versão: 1.0.0
