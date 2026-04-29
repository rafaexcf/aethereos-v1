# Aethereos — Ecosystem README

*Mapa de navegação do corpus documental do Aethereos.*

---

## Propósito

Este documento é o ponto de entrada para qualquer pessoa que chega ao projeto Aethereos. Lista todos os documentos do corpus, seu status, escopo, autoridade relativa, ordem de leitura por papel. Não contém decisões arquiteturais próprias — é puramente navegação.

Quando novos documentos são adicionados ao corpus, este README é atualizado. Se há divergência entre este README e a realidade, a realidade vence e o README precisa ser corrigido.

## Hierarquia de autoridade

Em caso de conflito entre documentos do corpus:

1. **Fundamentação v4.3** — autoridade máxima. Documento constitucional. Descreve "o quê" e "por quê".
2. **Documentos operacionais companheiros** — subordinados à Fundamentação. Descrevem "como fazer" em domínios específicos.
3. **ADRs publicados** — decisões concretas tomadas em contexto real. Subordinados à Fundamentação; podem refinar companheiros.
4. **Runbooks e manuais locais** — procedimentos operacionais específicos. Subordinados a tudo acima.

O **SCP Whitepaper v4.0** é documento de visão e posicionamento. Não é parte da hierarquia de autoridade arquitetural — permanece válido como direção de longo prazo, mas não como compromisso de entrega.

## Documentos do corpus — status atual

### Documento constitucional

| Documento | Status | Tamanho | Autoridade |
|---|---|---|---|
| `AETHEREOS_FUNDAMENTACAO_v4_3.md` | **Ativo** | ~360 KB | Máxima |

Substitui: v1.0, v2.0, v3.0, v3.1, v3.2, v4.0, v4.1, v4.2 (todas arquivadas como histórico).

### Documentos operacionais companheiros — entregues

| Documento | Status | Tamanho | Escopo |
|---|---|---|---|
| `ADR_BACKLOG.md` | Ativo | ~10 KB | Lista rastreável de 8 ADRs estruturantes pendentes |
| `THREAT_MODEL.md` | Ativo | ~24 KB | Modelo de ameaças: atores, trust boundaries, 13 vetores de ataque, controles |
| `NO_GO_YEAR1.md` | Ativo | ~13 KB | Contrato assinável listando 10 itens fora do escopo do primeiro ano |
| `SCP_OPERATIONS.md` | Ativo | ~26 KB | DLQ, poison events, replay, backfill, estados formais do pipeline |
| `KEY_MANAGEMENT.md` | Ativo | ~22 KB | Chaves Ed25519, OAuth, capability tokens, webhooks, estados formais de connector |
| `SLO_TARGETS.md` | Ativo | ~16 KB | SLOs quantitativos, NFRs, gatilhos de escalonamento arquitetural |

### Documentos operacionais companheiros — em produção nesta versão

| Documento | Status | Escopo |
|---|---|---|
| `SECURITY_GUIDELINES.md` | Ativo | CSP policies, sandbox iframe, postMessage, webhook validation, staff access, break-glass |
| `DATA_LIFECYCLE.md` | Ativo | Retenção, legal hold, tombstones, backups, purga de embeddings, exportação LGPD |
| `LLM_OPEX_GUIDELINES.md` | Ativo | Orçamento de embeddings, cache semântico, custo por insight útil, guardrails |
| `VERSIONING_CONTRACT.md` | Ativo | Compatibilidade entre versões de kernel, SDK cliente, manifesto .aeth, apps |

### Documentos auxiliares

| Documento | Status | Escopo |
|---|---|---|
| `TRADEMARK_POLICY.md` | Ativo | Política de uso da marca Aethereos |
| `CLA.md` | Ativo | Contributor License Agreement |

### Documentos pendentes de produção

Nenhum pendente para fundação inicial. Documentos adicionais podem ser criados conforme operação real demandar (runbooks específicos, ADRs publicados, manuais de distribuição).

## Ordem de leitura por papel

### Novo engenheiro chegando ao projeto

1. `ECOSYSTEM_README.md` (este arquivo) — navegação inicial
2. `AETHEREOS_FUNDAMENTACAO_v4_3.md` — preâmbulo, Partes I-III, Parte VIII (SCP), Parte X (multi-tenant)
3. `NO_GO_YEAR1.md` — o que não existe ainda e por quê
4. `ADR_BACKLOG.md` — decisões estruturantes pendentes
5. Documentos específicos conforme área de atuação (abaixo)

### Arquiteto / Tech Lead

1. Fundamentação completa (todas as 23 partes)
2. `ADR_BACKLOG.md`
3. `VERSIONING_CONTRACT.md` — matrix de compatibilidade
4. `SLO_TARGETS.md` — gatilhos de escalonamento arquitetural
5. `THREAT_MODEL.md` — trust boundaries e ativos críticos

### Engenheiro de backend / SCP

1. Fundamentação Partes VIII (SCP), X (multi-tenant), XII (garantias)
2. `SCP_OPERATIONS.md`
3. `SLO_TARGETS.md`
4. `VERSIONING_CONTRACT.md` — seções sobre schemas SCP
5. `DATA_LIFECYCLE.md` — retenção de eventos

### Engenheiro de frontend / apps

1. Fundamentação Partes IV (Core/Kernel), V (Magic Store), VII (tipos de apps)
2. `SECURITY_GUIDELINES.md` — CSP, sandbox, postMessage
3. `VERSIONING_CONTRACT.md` — compatibilidade SDK cliente e manifestos
4. `KEY_MANAGEMENT.md` — seção de capability tokens

### Engenheiro de AI / ML

1. Fundamentação Parte XI (AI-native completa)
2. `LLM_OPEX_GUIDELINES.md`
3. `THREAT_MODEL.md` — vetores 4.1 (prompt injection), 4.2 (exfiltração RAG), 4.12 (abuso de agentes)
4. `DATA_LIFECYCLE.md` — seção de embeddings
5. `SLO_TARGETS.md` — seção Copilot

### Security Engineer

1. `THREAT_MODEL.md`
2. `SECURITY_GUIDELINES.md`
3. `KEY_MANAGEMENT.md`
4. Fundamentação Parte XII (garantias invioláveis)
5. `ADR_BACKLOG.md` — ADR-005, ADR-006, ADR-007

### SRE / Operações

1. `SLO_TARGETS.md`
2. `SCP_OPERATIONS.md`
3. `KEY_MANAGEMENT.md`
4. `DATA_LIFECYCLE.md`
5. Runbooks específicos (referenciados em SCP_OPERATIONS e KEY_MANAGEMENT)

### Product / Business / Liderança

1. Fundamentação Partes I (identidade), XVI (monetização), XVII (roadmap), XVIII (posicionamento)
2. `NO_GO_YEAR1.md` — contrato de escopo
3. `LLM_OPEX_GUIDELINES.md` — economia de IA
4. `SLO_TARGETS.md` — comparação entre tiers

### DPO / Compliance

1. Fundamentação Partes XII (garantias LGPD)
2. `DATA_LIFECYCLE.md`
3. `THREAT_MODEL.md`
4. `SECURITY_GUIDELINES.md` — seção de staff access, break-glass

## Convenções comuns

### Tricotomia [INV] / [DEC] / [HIP]

Usada em todo o corpus (principalmente Fundamentação):

- **[INV]** = Invariante arquitetural. Não muda sem ruptura da tese do projeto.
- **[DEC]** = Decisão atual. Pode mudar com ADR + nova evidência.
- **[HIP]** = Hipótese. Aposta a validar em uso real.

Precedência: INV > DEC > HIP.

### Revisões

Cada documento tem seção "Revisão" no final declarando:
- Frequência de revisão rotineira
- Gatilhos para revisão extraordinária
- Owner responsável

### Versionamento dos documentos

Documentos companheiros começam em v1.0 e evoluem com versionamento semântico. Breaking changes em documentos são raros; quando ocorrem, são anunciados no histórico do documento.

## Como contribuir / propor mudanças

Até org formal existir:

1. Mudanças em documentos companheiros: PR com review do owner do documento
2. Mudanças em Fundamentação: PR + ADR justificando + consenso arquitetural documentado
3. Novos documentos companheiros: proposta inicial + aprovação antes de produção
4. Correções (typos, links quebrados, inconsistências): PR simples

Todas as mudanças são rastreáveis via git.

## Histórico

- v1.0 (2026) — versão inicial do README consolidada após entrega do pacote completo de documentos operacionais companheiros

## Revisão

Documento revisado:
- Quando novo documento é adicionado ao corpus
- Quando status de documento existente muda (entregue, arquivado, superseded)
- Semestralmente em revisão rotineira

Owner: qualquer mantenedor do corpus; atualização é parte de qualquer PR que adicione/mova documento.
