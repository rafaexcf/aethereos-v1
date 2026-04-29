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

## Status

🚧 Em bootstrap. Ver `docs/adr/` para decisões e roadmap.
