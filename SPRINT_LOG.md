# Sprint Log — Aethereos Bootstrap Fase 1

Início do sprint: 2026-04-29T00:00:00Z
Modelo: Claude Code (claude-sonnet-4-6, sessão N=1)

## Calibração inicial

**Ordem de construção:** Camada 0 (shell-base, local-first, BUSL v1.1) → Camada 1 (shell-commercial, proprietária, multi-tenant) → comercio.digital → logitix → kwix → autergon.

**Por que Next.js está bloqueado nos shells:** Shells são PWA/OS no navegador — apps totalmente autenticados sem necessidade de SSR. Vite 8+ + TanStack Router atendem o modelo híbrido URL+estado da Fundamentação 4.4. Next.js apenas para SaaS standalone com SEO. ADR-0014 item #1.

**Freio agêntico do primeiro ano:** Autonomia 0-1 (sugerir, humano executa). Ações irreversíveis sempre exigem aprovação humana explícita. As 8 operações invariantes nunca executam autonomamente em circunstância alguma.

**8 operações invariantes que agentes NUNCA executam (Fundamentação 12.4):**

1. Demissão de colaborador
2. Alteração estrutural de cadastro de fornecedores/clientes (bloqueio, remoção)
3. Alteração de plano de contas
4. Transferência financeira acima de limite configurado
5. Alteração de políticas de governança
6. Concessão ou revogação de acesso privilegiado
7. Exclusão de dados
8. Alteração de informações fiscais (regime tributário, cadastros SEFAZ)

---

## Histórico de milestones

## Milestone M1 — Guardrails mecânicos

- Iniciada: 2026-04-29T00:10:00Z
- Concluída: 2026-04-29T00:45:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm install` → ok
  - `pnpm deps:check` → ok (8 módulos, 0 violações)
  - `pnpm exec eslint .` → ok
  - `pnpm typecheck` → ok
  - `echo "test bad message" | pnpm exec commitlint` → falha (correto)
  - `echo "chore: test" | pnpm exec commitlint` → ok
- Arquivos criados/modificados:
  - `.dependency-cruiser.cjs` (regras: next/clerk/inngest/prisma bloqueados, supabase fora de drivers, cross-app, kernel/drivers sem apps)
  - `packages/config-eslint/{package.json,base.js,react.js,node.js}` (ESLint v10 flat config)
  - `eslint.config.mjs` (config raiz)
  - `commitlint.config.cjs`
  - `.husky/pre-commit` (lint-staged) + `.husky/commit-msg` (commitlint)
  - `.github/workflows/ci.yml` (jobs: typecheck, lint, deps-check, audit, test, build)
  - `turbo.json` (globalDependencies: `.eslintrc.cjs` → `eslint.config.mjs`)
  - `package.json` (+ @aethereos/config-eslint workspace:\*, ESLint deps)
- Decisões tomadas:
  - ESLint v10 (instalado automaticamente, eslint-plugin-react tem peer dep warning ignorável)
  - `tsPreCompilationDeps: false` em dep-cruiser pois não há arquivos .ts ainda
  - Sem `dependencyTypes: ["workspace"]` (valor inválido em dep-cruiser v16); cross-app usa `["npm","npm-dev","npm-peer","npm-optional","aliased-workspace"]`
  - ESM (eslint.config.mjs) no lugar de `.eslintrc.cjs` para compatibilidade com @eslint/js ESM-only
- Próximas dependências desbloqueadas: M2 (config-ts)

## Milestone M2 — Pacote de configuração TypeScript compartilhada

- Iniciada: 2026-04-29T00:45:00Z
- Concluída: 2026-04-29T00:55:00Z
- Status: SUCCESS
- Comandos validadores:
  - `pnpm typecheck` → ok (2 packages in scope, sem tasks = ok)
- Arquivos criados: `packages/config-ts/{package.json,base.json,library.json,react-library.json,vite-app.json,next-app.json}`
- Decisões tomadas:
  - Path aliases no base.json para todos os pacotes canônicos planejados
  - vite-app.json usa `allowImportingTsExtensions: true` (necessário com Vite)
- Próximas dependências desbloqueadas: M3 (drivers interfaces)

---

## Decisões menores tomadas durante o sprint

<!-- Justificativas que não viram ADR mas precisam ser rastreáveis -->

---

## Bloqueios encontrados

<!-- Preenchido se houver bloqueios -->
