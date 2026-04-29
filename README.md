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

1. **[CLAUDE.md](./CLAUDE.md)** — âncora operacional. Lido por humanos e agentes.
2. **[docs/AETHEREOS_FUNDAMENTACAO_v4_3.md](./docs/AETHEREOS_FUNDAMENTACAO_v4_3.md)** — constituição.
3. **[docs/ECOSYSTEM_README.md](./docs/ECOSYSTEM_README.md)** — mapa do corpus documental.
4. **[docs/adr/](./docs/adr/)** — registros de decisão arquitetural.

## Estrutura

```
aethereos/
├── apps/                          # aplicações executáveis
│   ├── shell-base/                # Camada 0: shell open source local-first (Vite + React)
│   ├── shell-commercial/          # Camada 1: shell proprietário multi-tenant (Vite + React)
│   ├── comercio-digital/          # SaaS standalone (Next.js 15)
│   ├── logitix/                   # SaaS standalone (Next.js 15)
│   ├── kwix/                      # SaaS standalone (Next.js 15)
│   ├── autergon/                  # SaaS standalone (Next.js 15)
│   └── sites/                     # sites institucionais (Astro)
│       ├── aethereos-org/
│       ├── aethereos-io/
│       └── b2baios-com-br/
├── packages/                      # pacotes compartilhados
│   ├── kernel/                    # núcleo: SCP, VFS, RLS helpers, permission engine
│   ├── drivers/                   # interfaces de Driver + implementações Cloud/Local
│   ├── ui-shell/                  # componentes do shell (dock, janelas, abas, mesa)
│   ├── scp-registry/              # schemas Zod de eventos
│   ├── ai/                        # cliente LiteLLM, RAG, instrumentação Langfuse
│   ├── config-ts/                 # tsconfig.json compartilhados
│   ├── config-eslint/             # configurações ESLint compartilhadas
│   └── design-system/             # primitives visuais
├── tooling/                       # codemods, scripts, ADR helpers
├── docs/                          # corpus documental (Fundamentação, ADRs, runbooks)
└── infra/                         # Pulumi TypeScript (IaC)
```

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

Em bootstrap ativo. Sprint 2 (Camada 0) concluído. Ver `SPRINT_LOG.md` e `docs/adr/` para histórico de decisões.
