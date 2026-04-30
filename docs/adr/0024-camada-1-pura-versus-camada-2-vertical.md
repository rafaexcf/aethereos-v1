# ADR-0024 — Camada 1 pura versus Camada 2 vertical

**Data:** 2026-04-30  
**Status:** Aceito  
**Decidido por:** humano (rafaexcf) em sessão 2026-04-30  
**Rigidez:** [DEC]

---

## Contexto

O Sprint 10 portou o paradigma OS de V2 para V1 (`shell-commercial`). Nessa portagem, o registry de apps herdou 12+ apps incluindo verticais B2B (Comércio Digital, LOGITIX, ERP, CRM Vendas, Notes, Calendar, Projects) como placeholders com target "Sprint 12".

V2 não fazia distinção entre Camada 1 (OS genérico) e Camada 2 (apps verticais standalone). A arquitetura do V1 cravada no CLAUDE.md e nos ADRs 0014-0017 define essa separação:

- **Camada 1** (`shell-commercial`): OS B2B genérico, multi-tenant, universal
- **Camada 2**: apps Next.js 15 standalone em subdomínios próprios (comercio.aethereos.io, logitix.aethereos.io, etc.)

Essa separação nunca foi aplicada ao registry de apps do OS. O Sprint 12 corrigi isso.

---

## Decisão

**Camada 1 (`shell-commercial`) NÃO contém apps verticais B2B.**

Apps verticais vivem como projetos Next.js standalone em Camada 2:

- `apps/comercio-digital/` → `comercio.aethereos.io`
- `apps/logitix/` → `logitix.aethereos.io`
- `apps/erp/` → `erp.aethereos.io`

**Apps que pertencem à Camada 1 (universais para qualquer empresa):**

| App                             | ID          | Dock                |
| ------------------------------- | ----------- | ------------------- |
| Mesa                            | mesa        | não                 |
| Drive                           | drive       | sim                 |
| Pessoas (contatos/clientes)     | pessoas     | sim                 |
| Mensagens                       | chat        | sim                 |
| Configurações                   | settings    | sim                 |
| AE AI Copilot                   | ae-ai       | sim                 |
| RH (employees internos)         | rh          | sim                 |
| Magic Store (launcher Camada 2) | magic-store | sim                 |
| Governança                      | governanca  | não (requiresAdmin) |
| Auditoria                       | auditoria   | não (requiresAdmin) |

**Magic Store é launcher, não hospedeira:**

- Magic Store lista apps Camada 2 e módulos opcionais Camada 1
- Cards de Camada 2 abrem `window.open(externalUrl)` com URL configurada por env
- Cards de módulos opcionais fazem upsert em `kernel.company_modules`
- Catálogo é JSON estático em `src/data/magic-store-catalog.ts`

**Apps removidos do registry Camada 1:**

- `comercio` — Camada 2 standalone
- `logitix` — Camada 2 standalone
- `erp` — Camada 2 standalone
- `crm` / `crm-vendas` — Camada 2 (parte do ERP ou Comércio)

---

## Distinção `pessoas` vs `rh`

São apps com propósitos distintos, coexistindo na Camada 1:

- **`pessoas`**: clientes, fornecedores e contatos externos da empresa (CRM-lite, pessoas físicas/jurídicas que a empresa interage)
- **`rh`**: funcionários/colaboradores internos da empresa (tabela `kernel.employees`)

Não fundir. Não renomear um pelo outro.

---

## Consequências

1. Registry simplificado de ~13 para ~10 apps.
2. ADR-0017 (comercio.digital primeiro SaaS standalone) permanece válido — ele define Camada 2, este ADR define o que fica em Camada 1.
3. CI deve bloquear qualquer app vertical adicionado diretamente em `shell-commercial` sem passar por Magic Store.
4. V2 (`~/Projetos/aethereos-v2`) é referência APENAS visual — não replica lógica vertical de V2 em Camada 1.
5. Onboarding genérico (MX57) não pergunta domínio vertical (NCM, produtos, fornecedores). Isso fica para a Magic Store/Camada 2.

---

## Custo

- Sprint 10 portou código V2 misturando verticais. Custo de limpeza: ~2h (MX56 deste sprint).
- Implicação de longo prazo: toda vertical deve ser projetada como Next.js standalone desde o início, não como app dentro do OS.

---

## Referências

- ADR-0014: Stack vs análise externa
- ADR-0016: Camada 1 arquitetura cloud-first
- ADR-0017: comercio.digital primeiro SaaS standalone
- CLAUDE.md §1 (identidade), §5 (bloqueios em PR)
