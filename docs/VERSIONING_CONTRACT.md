# Aethereos — Versioning Contract v1.0

**Documento operacional companheiro da Fundamentação v4.3**

*Compatibilidade entre versões de kernel, SDK cliente, manifesto .aeth, apps publicados, schemas SCP.*

---

## Escopo

Este documento define contratos de compatibilidade entre os múltiplos artefatos versionados do Aethereos. Garante que, quando qualquer componente é atualizado, os outros continuam funcionando conforme regras explícitas.

Audiência: engenheiros de kernel, SDK, apps (first-party e third-party), developers externos.

Subordinado à Fundamentação v4.3. Em caso de conflito, a Fundamentação prevalece.

## 1. Artefatos versionados

Os seguintes artefatos têm versionamento independente mas se relacionam por contratos:

| Artefato | Versionamento | Responsável | Exemplo de versão |
|---|---|---|---|
| **Kernel do Aethereos** | SemVer | Aethereos Inc | `2.1.3` |
| **Client SDK** (`@aethereos/client`) | SemVer | Aethereos Inc | `1.4.2` |
| **Developer SDK** (`@aethereos/dev`) | SemVer | Aethereos Inc | `1.2.0` |
| **Manifesto .aeth** (schema) | SemVer | Aethereos Inc | `1.0.0` (schema do manifest) |
| **App .aeth** (publicado) | SemVer | Developer | `0.5.0` (versão do app) |
| **Schemas SCP** | SemVer por event_type | Owner do schema | `event_type: orders.created, version: 2.1` |
| **Protocol version** (IPC) | SemVer | Aethereos Inc | `1.0` |
| **Aether AI Copilot** | Versionado internamente | Aethereos Inc | `v2.3` |

## 2. SemVer rigoroso

### Definição

Todo componente acima segue SemVer semântico estrito:

- **MAJOR** — breaking change (quebra compatibilidade com versão anterior)
- **MINOR** — feature nova, compatible (adições, não remoções ou mudanças)
- **PATCH** — bug fix, fully compatible

### Enforcement

Release automation valida compliance SemVer:
- Removeu campo público → MAJOR bump obrigatório
- Adicionou campo obrigatório a input → MAJOR bump obrigatório
- Adicionou campo opcional → MINOR bump obrigatório
- Correção interna sem mudança de interface → PATCH

Breaking change sem MAJOR bump falha em CI.

### Pre-release e build metadata

Pre-release tags permitidas durante desenvolvimento:
- `1.0.0-alpha.1` — versão instável, uso interno apenas
- `1.0.0-beta.1` — versão em teste público, feedback esperado
- `1.0.0-rc.1` — release candidate, final antes de release

Build metadata opcional: `1.0.0+20260419.abc123`.

## 3. Matrix de compatibilidade

### Kernel ↔ Client SDK

| Kernel | SDK compatible versions |
|---|---|
| 1.x | 1.x (qualquer minor) |
| 2.x | 1.x (modo compatibilidade) ou 2.x |
| 3.x | 2.x (modo compatibilidade) ou 3.x |

**Regra:** kernel suporta SDK da major version atual + major version anterior (N e N-1). SDK antigo (N-2 ou anterior) recebe erro claro de incompatibilidade.

### Client SDK ↔ Manifesto .aeth

| SDK | Manifest version compatible |
|---|---|
| 1.x | 1.x |
| 2.x | 1.x (legacy) e 2.x |

Apps com manifesto MAJOR versions à frente do SDK falham na instalação com erro claro.

### Kernel ↔ Schemas SCP

| Kernel | Schema versions suportadas |
|---|---|
| 2.x | Todos os schemas publicados; majors antigos com depreciação formal |

Schemas seguem política própria de depreciação (6 meses mínimo; ver seção 5).

### App .aeth ↔ Kernel

App declara no manifesto qual versão do kernel exige:

```json
{
  "manifest_version": "1.0.0",
  "app_id": "acme-crm",
  "version": "2.5.1",
  "kernel_requirements": {
    "min_version": "2.0.0",
    "max_version": "3.0.0",  // excludente; não compatível com 3.x+
    "tested_with": ["2.1.0", "2.2.0", "2.3.0"]
  },
  "sdk_requirements": {
    "client_sdk": "^1.3.0"   // SemVer range
  }
}
```

Kernel valida compatibilidade na instalação; app incompatível é rejeitado.

## 4. Política de breaking change

### Princípios

1. **Breaking change é caro** — afeta todos os consumidores. Evitar quando possível.
2. **Breaking change sem alternativa compatível não é aceitável.** MAJOR bump não é licença para quebrar tudo; migration path deve existir.
3. **Aviso antecipado.** Breaking changes anunciados em ADR público + changelog + deprecation warnings em runtime pelo menos 6 meses antes.

### Checklist para MAJOR bump

Antes de um MAJOR release:

- [ ] ADR publicado justificando mudança
- [ ] Migration guide escrito
- [ ] Migration tooling disponível (script automatizado quando aplicável)
- [ ] Período de depreciação ≥ 6 meses respeitado (ver seção 5)
- [ ] Comunicação aos developers (para SDK, manifest) feita com 60 dias de antecedência
- [ ] Versão anterior continua suportada por período declarado (tipicamente 12 meses)
- [ ] CHANGELOG completo listando breaking changes

### Proibições

- [INV] MAJOR bump não pode remover funcionalidade sem substituto ou migration path
- [INV] MAJOR bump não pode ser usado para "correção de erros de design" que retroativamente quebram contratos existentes sem due process de depreciação

## 5. Depreciação

### Processo padrão

1. **Anúncio de depreciação** (mês 0)
   - Mudança é marcada como `@deprecated` no código
   - Warning emitido em runtime quando funcionalidade é usada
   - Documentação atualizada com aviso e migration path
   - CHANGELOG registra

2. **Período de convivência** (mês 0 a 6+)
   - Funcionalidade antiga e nova coexistem
   - Consumers migram conforme conveniência
   - Suporte técnico ajuda em migrações

3. **Removal** (após mínimo 6 meses)
   - Remoção requer MAJOR bump
   - CHANGELOG registra como breaking change
   - Último warning substancial antes de release

### Duração mínima por artefato

| Artefato | Depreciação mínima |
|---|---|
| API pública do kernel | 12 meses |
| Client SDK (API pública) | 12 meses |
| Schema SCP (event_type) | 6 meses |
| Manifesto .aeth (campos) | 12 meses |
| CLI flags | 6 meses |
| Endpoints REST | 12 meses |

Períodos podem ser estendidos em casos de forte uso; nunca reduzidos sem consenso.

### Deprecation warnings em runtime

```typescript
// SDK emite warnings estruturados
sdk.deprecated('oldMethod', {
  alternative: 'newMethod',
  removalVersion: '3.0.0',
  migrationGuide: 'https://docs.aethereos.com/migrations/old-to-new'
});
```

Warnings aparecem em:
- Console do navegador (SDK client)
- Logs do kernel (uso de endpoint deprecated)
- Developer portal (para apps usando features deprecated)

## 6. Migration paths

### Princípio

Toda mudança breaking tem **migration path documentado**. Developers/usuários sabem exatamente o que fazer.

### Formato de migration guide

Cada MAJOR tem documento `migrations/v{N}-to-v{N+1}.md` com:

1. **Resumo** — o que mudou em alto nível
2. **Breaking changes detalhadas** — cada mudança com exemplo antes/depois
3. **Migration automática** — se existe script/tooling
4. **Migration manual** — passos para casos não cobertos por automação
5. **Troubleshooting** — problemas comuns
6. **FAQ**

### Exemplo — hipotético kernel 2.x → 3.x

```markdown
# Migration guide: Kernel 2.x → 3.x

## Breaking changes

### 1. `scp.emit()` retorna Promise<EventReceipt> em vez de Promise<string>

**Antes:**
```typescript
const eventId = await scp.emit(event);
```

**Depois:**
```typescript
const receipt = await scp.emit(event);
const eventId = receipt.event_id;
```

Automated migration available via `npx @aethereos/codemod v2-to-v3 ./src`.

### 2. ...
```

### Ferramentas

Onde possível, `codemods` (jscodeshift, ast-grep) automatizam migração. Executados em repo do developer:

```bash
npx @aethereos/codemod v2-to-v3 ./src --dry-run
# revisa mudanças propostas
npx @aethereos/codemod v2-to-v3 ./src
# aplica
```

## 7. Version negotiation

### Kernel ↔ Client SDK

SDK informa sua versão a cada request:

```typescript
// Header em toda requisição
X-Aethereos-SDK-Version: 1.4.2
X-Aethereos-SDK-Type: client
```

Kernel:
1. Verifica compatibilidade (matriz da seção 3)
2. Se compatível: processa normalmente
3. Se deprecated (SDK antigo mas ainda suportado): processa + adiciona warning header `X-Aethereos-Deprecation-Warning: SDK 1.4.2 será descontinuado em 2026-09-01`
4. Se incompatível: rejeita com erro claro `SDK_VERSION_INCOMPATIBLE`

### App ↔ Kernel

Instalação de app:
1. Kernel lê `kernel_requirements` do manifesto
2. Se kernel atual está fora do range: instalação bloqueada com erro
3. Se app requer kernel mais novo: sugestão de aguardar upgrade do kernel
4. Se app requer kernel mais antigo: sugestão ao developer atualizar app

### SDK ↔ Manifesto

SDK valida manifesto contra schema conhecido:
- Manifest MAJOR reconhecido: processa
- Manifest MAJOR desconhecido (futuro): rejeita com "manifest version X requires SDK version Y or higher"
- Manifest MAJOR depreciado: processa com warning

## 8. Versionamento de schemas SCP

### Recap da Fundamentação 8.10

Schemas SCP seguem política específica descrita no SCP Core Profile:
- Minor version adiciona campos opcionais (compatível)
- Major version faz breaking change (consumidores migram)
- Depreciação mínima de 6 meses antes de remover major antiga
- Event Store preserva eventos em versão original; migração retroativa não acontece

Este documento complementa com operacionalização.

### Schema Registry

```sql
CREATE TABLE scp_event_schemas (
  schema_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(200) NOT NULL,
  major_version INTEGER NOT NULL,
  minor_version INTEGER NOT NULL,
  schema_json JSONB NOT NULL,                  -- JSON Schema
  
  owner VARCHAR(100) NOT NULL,
  
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deprecated_at TIMESTAMPTZ,                   -- quando entrou em depreciação
  removed_at TIMESTAMPTZ,                      -- quando foi retirado
  
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  -- 'active' | 'deprecated' | 'removed'
  
  UNIQUE (event_type, major_version, minor_version)
);
```

### Publicação de schema nova versão

1. Developer (ou time interno) define nova versão do schema
2. ADR curto justifica mudança (especialmente para MAJOR)
3. Review por Schema Governance Committee (ou Engineering Lead no MVP)
4. Schema é publicado em `scp_event_schemas` com `status: active`
5. Producers começam a usar nova versão
6. Consumers ganham tempo para adaptar (consumem ambas durante transição)

### Depreciação de schema

1. ADR anuncia depreciação (mês 0)
2. `deprecated_at` é setado; `status: deprecated`
3. Producers recebem warnings; novos producers não podem começar com schema depreciado
4. Consumers são notificados
5. Após 6 meses mínimo: `removed_at` setado; `status: removed`
6. Producers que ainda emitem versão removed recebem erro

### Migração de consumers

Consumer deve suportar leitura de múltiplas versões durante transição:

```typescript
subscriber.on('orders.created', (event) => {
  switch (event.schema_version) {
    case '1.0':
    case '1.1':
      return handleLegacy(event);
    case '2.0':
      return handleCurrent(event);
    default:
      logger.warn('Unknown schema version', event.schema_version);
  }
});
```

## 9. Manifest version compatibility

### Manifest schema atual: 1.0

Campos obrigatórios:
- `manifest_version`
- `app_id`
- `version`
- `name`
- `description`
- `kernel_requirements`
- `sdk_requirements`
- `signature` (Ed25519)

Campos opcionais estáveis (adicionados em minor versions):
- `icon_url`
- `categories`
- `requested_capabilities`
- `author`
- `website`
- `license`

### Manifest schema 2.0 (hipotético futuro)

Exemplo de breaking change:
- `signature` renomeado para `ed25519_signature`
- `kernel_requirements` expandido com mais campos obrigatórios

Migração seria:
- SDK 2.x aceita ambos manifest 1.x e 2.x
- Developer atualiza app para manifest 2.0 quando SDK 3.x for lançado
- Após período, manifest 1.x deixa de ser aceito

## 10. Compatibility zones — apps em produção

### Zone A — "Fresh"

Apps publicados com kernel/SDK/manifest nas versões mais recentes. Sem warnings.

### Zone B — "Supported"

Apps com SDK/manifest N-1 ou dentro da janela de depreciação. Operação normal; warnings em logs.

### Zone C — "Deprecated"

Apps com SDK/manifest em depreciação ativa. Warnings em logs + notificação ao developer + prazo para atualizar.

### Zone D — "Incompatible"

Apps que usam versões já removidas. **Bloqueados de instalação**; apps já instalados param de funcionar com mensagem clara ao usuário.

### Ciclo de vida

```
Zone A ──(N-1 lançado)──▶ Zone B ──(depreciação iniciada)──▶ Zone C ──(removed)──▶ Zone D
```

Developer recebe notificações em cada transição.

## 11. Backward compatibility guarantees

### No mesmo major

[INV] Dentro de mesma MAJOR version, kernel/SDK/manifest **garantem backward compatibility**. App que funcionava em 2.0.0 funciona em 2.5.3 sem mudanças.

### Cross-major

Sem garantia automática. Migration path documentado (seção 6).

### Public API surface

API pública (exposta para apps third-party e developers externos) tem garantia mais forte que API interna:

- Public API: mudanças requerem MAJOR + depreciação + migration
- Internal API: mudanças livres dentro de MAJOR (sem garantia para código que depende indevidamente)

Documentação indica claramente o que é public vs internal.

## 12. Release process

### Cadência

- **PATCH** — conforme necessário (bugfixes)
- **MINOR** — sprints mensais tipicamente
- **MAJOR** — anual ou bi-anual; planejado com antecedência

### Release notes obrigatórios

Cada release tem:
- Tag git com versão
- CHANGELOG atualizado
- Release notes publicadas no portal
- Para MAJOR: blog post + comunicação proativa
- Artifacts publicados em registries (npm, GitHub Releases)

### Rollback

Rollback para versão anterior é possível em janela de 7 dias após release. Após isso, rollback exige planejamento específico (riscos de incompatibilidade cumulativa com patches intermediários).

## 13. Governance

### Schema Governance Committee

Para schemas SCP com alto impacto (muitos consumidores), mudanças passam por comitê leve:
- Owner do schema propõe
- Eng Lead revisa
- Apps afetados são consultados (via SDK telemetry ou contato direto)
- Decisão documentada em ADR

No MVP, "comitê" é Eng Lead + CTO; formaliza conforme org crescer.

### Version policy committee

Decisões sobre quando lançar MAJOR, quando remover versão depreciada, política geral:
- CTO
- Eng Lead
- Product Lead
- DevRel Lead (quando existir)

Reunião trimestral ou ad-hoc para decisões grandes.

## 14. Revisão

Documento revisado:
- Antes de cada MAJOR release (garantir processo foi seguido)
- Após depreciações mal-sucedidas (lições aprendidas)
- Anualmente em revisão rotineira

Owner: CTO + Eng Lead.

## 15. Histórico

- v1.0 (2026) — versão inicial, consolidando escopo declarado no preâmbulo da Fundamentação v4.3 e formalizando práticas dispersas
