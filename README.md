# Aethereos

> OS B2B no navegador organizado em três camadas. Camada 0 open source local-first, Camada 1 proprietária multi-tenant com SCP e AI Copilot, Camada 2 distribuições verticais bundlando Camada 1 + SaaS pré-instalados.

## Início

```bash
# Pré-requisitos: Node 20.19+/22.12+, pnpm 9.x, Docker (para Supabase local + NATS)
pnpm install
pnpm dev
```

## Documentação

Comece pela ordem:

1. **[QUICK_START.md](./QUICK_START.md)** — setup local em 10 passos
2. **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)** — mapa de packages, apps, pipeline SCP, driver model, RLS
3. **[CLAUDE.md](./CLAUDE.md)** — âncora operacional para humanos e agentes
4. **[docs/AETHEREOS_FUNDAMENTACAO_v4_3.md](./docs/AETHEREOS_FUNDAMENTACAO_v4_3.md)** — constituição
5. **[docs/ECOSYSTEM_README.md](./docs/ECOSYSTEM_README.md)** — mapa do corpus documental
6. **[docs/adr/](./docs/adr/)** — registros de decisão arquitetural

Auditorias pré-staging (Sprint 20):

- **[SECURITY_AUDIT.md](./SECURITY_AUDIT.md)** — RLS 68/68, buckets, edge functions
- **[CODE_QUALITY_AUDIT.md](./CODE_QUALITY_AUDIT.md)** — TS strict, deps, drivers, testes
- **[KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)** — 7 KLs com status taxonomia

Compliance e governança (Sprint 31):

- **[LICENSE](./LICENSE)** — BUSL-1.1 (Camada 0) + proprietária (Camadas 1/2)
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — fluxo de PR, code-review checklist
- **[SECURITY.md](./SECURITY.md)** — disclosure responsável, security@aethereos.io
- **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)** — Contributor Covenant v2.1
- **[BRAND_POLICY.md](./BRAND_POLICY.md)** — uso do nome, logo e cores oficiais
- **[PRIVACY_POLICY.md](./PRIVACY_POLICY.md)** — LGPD art. 18, retenção, direitos do titular

Eval & instrumentação (Sprint 31):

- **[docs/copilot-eval-dataset.json](./docs/copilot-eval-dataset.json)** — seed de 50 queries (rag/proposal/direct/decline). Para validar Gate 4 da Fase 1, expandir para 500+ queries com uso real ao longo de 30 dias de dogfood.
- **[docs/runbooks/auto-deploy.md](./docs/runbooks/auto-deploy.md)** — Vercel auto-deploy + Supabase migration flow

Operação e monitoramento (Sprint 32):

- **[docs/runbooks/uptime-monitoring.md](./docs/runbooks/uptime-monitoring.md)** — UptimeRobot setup para health endpoint + frontend, status page, alertas por email.
- **[docs/runbooks/sprint-32-deploy.md](./docs/runbooks/sprint-32-deploy.md)** — log do deploy completo Sprint 32.
- **[docs/DOGFOOD_PLAN.md](./docs/DOGFOOD_PLAN.md)** — plano de uso interno por 30 dias (Gate 8).
- Health endpoint público: `https://oublhirkojyipwtmkzvw.supabase.co/functions/v1/health` (200 OK + JSON).

## Estrutura

```
aethereos/
├── apps/                          # 5 aplicações executáveis
│   ├── shell-base/                # Camada 0: shell open source local-first (Vite + React)
│   ├── shell-commercial/          # Camada 1: shell proprietário multi-tenant (Vite + React)
│   ├── comercio-digital/          # Camada 2: SaaS standalone (Next.js 15) — primeira vertical
│   ├── scp-worker/                # Server worker — outbox poller + 4 consumers inline
│   └── sites/                     # sites institucionais (Astro, placeholder F2)
├── packages/                      # 14 pacotes compartilhados (drivers, kernel, scp-registry, ui-shell, configs)
├── tooling/                       # 3 tooling: e2e (Playwright), seed, smoke
├── supabase/                      # 73 migrations + 11 Edge Functions
├── infra/local/                   # docker-compose.dev.yml (NATS, LiteLLM, OTel...)
└── docs/                          # ADRs, runbooks, Fundamentação
```

Mapa detalhado em [`ARCHITECTURE_OVERVIEW.md`](./ARCHITECTURE_OVERVIEW.md).

## Comandos

Veja [CLAUDE.md seção 10](./CLAUDE.md#10-comandos-do-dia-a-dia).

## Licenças

- Camada 0 (`apps/shell-base/`, `packages/kernel/*`, `packages/drivers/local-*`, etc.): **BUSL v1.1** com Change Date 4 anos para Apache 2.0.
- Camada 1, Services proprietários e distribuições verticais: **comercial proprietária**.

Ver `LICENSE` em cada workspace para detalhe.

## Camada 0 — começando

A Camada 0 (`apps/shell-base/`) é o ponto de entrada para quem quer rodar o Aethereos localmente sem nenhuma dependência de servidor.

```bash
pnpm install
pnpm --filter=@aethereos/shell-base dev
# Abre em http://localhost:5173
```

Não precisa de Docker, Supabase, NATS ou qualquer outro serviço externo. Tudo roda no navegador via OPFS + SQLite WASM.

Veja:

- [`apps/shell-base/README.md`](./apps/shell-base/README.md) — início rápido e instalação como PWA
- [`docs/architecture/CAMADA_0.md`](./docs/architecture/CAMADA_0.md) — arquitetura detalhada
- [`docs/runbooks/local-dev-shell-base.md`](./docs/runbooks/local-dev-shell-base.md) — debug OPFS, SQLite, troubleshooting

## Status

**Sprint 31 (2026-05-09)** — Camada 1 código-completa. 4/8 gates da Fase 1 PASS (1, 2, 3, 7), 3/8 parciais (4, 5, 6 — aguardam dogfood + pen test), 1/8 temporal (8 — 30 dias).

- **[GATES_STATUS.md](./GATES_STATUS.md)** — snapshot detalhado dos 8 gates
- **[docs/SECURITY_CHECKLIST.md](./docs/SECURITY_CHECKLIST.md)** — 13 vetores de ameaça + status MITIGADO
- **[SPRINT_LOG.md](./SPRINT_LOG.md)** — histórico completo
- **[docs/adr/](./docs/adr/)** — decisões arquiteturais

Próximo: dogfood interno de 30 dias + comercio.digital (Camada 2) em paralelo.
