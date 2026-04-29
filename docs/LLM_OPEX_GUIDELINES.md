# Aethereos — LLM OPEX Guidelines v1.0

**Documento operacional companheiro da Fundamentação v4.3**

*Orçamento técnico de LLM: embeddings, reindexação, cache semântico, custo por insight útil, guardrails contra explosão de OPEX, economia por tier.*

---

## Escopo

Este documento operacionaliza o princípio **P15 (Orçamento LLM obrigatório)** da Fundamentação v4.3. Cada feature com IA declara orçamento técnico antes de merge; este documento define como esse orçamento é calculado, monitorado, guardrailed, e quando crossar para alternativas mais econômicas.

Audiência: engenheiros de IA, SRE, product managers, finance.

Subordinado à Fundamentação v4.3. Em caso de conflito, a Fundamentação prevalece.

## 1. Modelo de custo — componentes

Custo de IA tem múltiplas dimensões. Cada uma tem economia própria.

### Componentes de custo

| Componente | Unidade de cobrança | Drivers principais |
|---|---|---|
| Completions (Claude API) | Tokens input + tokens output | Comprimento de prompt, tamanho de resposta, frequência |
| Embeddings | Tokens processados | Volume de documentos, reindexação, queries novas |
| Cache de embeddings (storage) | Storage (pgvector, disco) | Total de embeddings armazenados |
| Vector search (compute) | Query time, indexação | Volume e dimensionalidade dos vetores |
| Observabilidade de IA | Traces, logs | Volume de requests IA |

### Unit costs de referência (Claude API, F1)

Baseado em preços públicos da Anthropic em abril 2026 (valores usados para planejamento; ajustar conforme tabela vigente):

- Claude Sonnet 4.6: ~$3 por milhão de tokens input, ~$15 por milhão output
- Claude Opus 4.7: mais caro (ordem de grandeza superior); usado apenas para features Classe A críticas
- Claude Haiku 4.5: ~$0.80 por milhão input, ~$4 output; para operações de alto volume e baixa complexidade
- Embeddings (Voyage, OpenAI, ou outro): ~$0.10-0.30 por milhão tokens

Preços **mudam**; este documento não é fonte de verdade de preços. Sistema consulta tabela viva em `llm_pricing_snapshots` atualizada automaticamente a partir de endpoints de pricing dos providers.

## 2. Registro de feature LLM

### Princípio P15 operacionalizado

Antes de merge, toda feature com IA tem entrada em `llm_features_registry`:

```sql
CREATE TABLE llm_features_registry (
  feature_id VARCHAR(100) PRIMARY KEY,
  feature_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Classificação
  risk_class CHAR(1) NOT NULL CHECK (risk_class IN ('A', 'B', 'C')),  -- ver 11.16 da Fundamentação
  
  -- Modelo e configuração
  primary_model VARCHAR(100) NOT NULL,       -- 'claude-sonnet-4-6', etc.
  fallback_model VARCHAR(100),                -- modelo degradado se primário falhar
  max_tokens_input INTEGER NOT NULL,
  max_tokens_output INTEGER NOT NULL,
  
  -- Orçamento
  estimated_tokens_per_invocation INTEGER NOT NULL,
  estimated_cost_per_invocation_usd NUMERIC(10, 6) NOT NULL,
  estimated_invocations_per_day_per_tenant INTEGER,
  
  -- Operação
  timeout_seconds INTEGER NOT NULL,
  quota_per_tenant_per_day INTEGER,            -- null = unlimited (Enterprise)
  
  -- Governance
  kill_switch_enabled BOOLEAN NOT NULL DEFAULT true,
  degradation_strategy VARCHAR(100) NOT NULL,  -- 'rule_based_fallback', 'graceful_error', 'queue_for_later'
  
  -- Métricas de qualidade (target)
  quality_target_precision NUMERIC(4, 3),     -- ex: 0.95
  quality_measurement_method TEXT,
  
  -- Dados
  data_access_scope TEXT NOT NULL,             -- minimização aplicada
  pii_redaction_required BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  owner VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  adr_reference VARCHAR(50)                    -- ADR que autoriza a feature
);
```

PR que introduz feature LLM sem entrada correspondente falha em CI.

### Exemplo: feature "Aether AI Copilot — query RAG"

```yaml
feature_id: copilot_rag_query
feature_name: "Aether AI Copilot — RAG query"
description: "Responde perguntas do usuário com base em documentos e eventos do tenant"
risk_class: C
primary_model: claude-sonnet-4-6
fallback_model: claude-haiku-4-5
max_tokens_input: 32000
max_tokens_output: 2000
estimated_tokens_per_invocation: 8000
estimated_cost_per_invocation_usd: 0.036  # 8k input @ $3/M + 1k output @ $15/M
estimated_invocations_per_day_per_tenant: 50
timeout_seconds: 30
quota_per_tenant_per_day: 100  # Pro tier; Enterprise sem limite
kill_switch_enabled: true
degradation_strategy: graceful_error
quality_target_precision: 0.90
quality_measurement_method: "Human-labeled sample of 200 queries/month, precision = % of useful responses"
data_access_scope: "documents tagged as 'copilot_accessible' only; events from last 90 days"
pii_redaction_required: true
owner: ai-team
adr_reference: ADR-007  # pending
```

## 3. Orçamento por tier de cliente

### Quotas técnicas por plano

| Recurso | Free | Pro | Enterprise |
|---|---|---|---|
| Invocações Copilot/dia | 5 | 100 | Ilimitado (billing alert) |
| Tokens LLM/mês | 100k | 10M | Negociável |
| Embeddings gerados/mês | 1k | 100k | Negociável |
| Context window máximo por query | 8k | 32k | Modelo vigente (200k) |
| Quota de agentes (quando habilitados) | 0 | 10 ações/dia | Contratual |

### Custo alvo por tenant (para manter unit economics viáveis)

- **Free tier**: < $1/mês de custo LLM por tenant (hard cap; excede → throttling severo)
- **Pro tier**: < $30/mês de custo LLM incluído no preço (overage cobrado se ultrapassar significativamente)
- **Enterprise**: baseado em contrato; billing transparente com breakdown por feature

Valores ajustáveis conforme unit economics reais observados.

## 4. Cache semântico

### Princípio

Queries similares que gerariam respostas similares devem reutilizar resposta cacheada em vez de re-invocar LLM. Economiza custo e latência.

### Estratégia

Cache de dois níveis:

**Nível 1 — Exact match cache:**
- Hash determinístico de (tenant_id, query, context_ids)
- TTL: 1 hora default (queries idênticas raramente precisam de resposta diferente em janela curta)
- Hit rate esperado: baixo (5-10%); queries exatas repetidas são raras

**Nível 2 — Semantic cache:**
- Embedding da query é comparado a embeddings de queries cacheadas do mesmo tenant
- Threshold de similaridade: cosine ≥ 0.92 (ajustável)
- Se hit: resposta cacheada é retornada com marker "cached"
- Se miss: query vai para LLM, resposta é cacheada
- TTL: 24h default

### Invalidação

Cache é invalidado quando:
- Dados-fonte mudam (evento emitido que afeta contexto)
- Tenant opta-out de cache (possível em Enterprise; default é cache ativo)
- TTL vence

### Marker de cache visível ao usuário

UI indica "resposta gerada em X / recuperada do cache de Y tempo atrás". Transparência evita confusão quando contexto mudou mas cache ainda é válido.

### Métricas obrigatórias

- `llm_cache_hits_total{feature, level}` (counter)
- `llm_cache_miss_total{feature}` (counter)
- `llm_cost_avoided_usd_total` (counter, calculado a partir de hits)
- Hit rate p/ feature (gauge)

Target: cache hit rate global > 30% após 3 meses de operação.

## 5. Orçamento de embeddings

### Estratégia

Embeddings são custo fixo recorrente. Sem disciplina, podem explodir.

### Regras

**[INV]** Embedding é gerado **sob demanda**, não preventivamente para todo conteúdo.

- Documento enviado pelo tenant → embedding gerado somente quando:
  - Copilot é invocado e precisa pesquisar esse documento
  - Job de indexação de documentos "copilot_accessible" é executado (batch, offline)

**[INV]** Embedding **não é re-gerado** exceto quando:
- Modelo de embedding muda (upgrade intencional)
- Conteúdo original muda (detectado por hash mismatch)

**[INV]** Embeddings de eventos SCP são **opcionais** e gerados apenas para event_types explicitamente marcados como `embed_for_rag: true` no schema.

### Reindexação

Upgrade de modelo requer reindexação. Processo:
1. ADR justifica mudança de modelo
2. Novo modelo disponibilizado em paralelo
3. Embeddings gerados para novo modelo incrementalmente (não bloqueia operação)
4. Queries podem usar modelo antigo ou novo durante transição (A/B test de qualidade)
5. Após 30 dias com novo modelo estável, embeddings antigos são deletados

### Estratégia de retenção

Ver DATA_LIFECYCLE.md seção 5. Resumo: embedding segue retenção do dado original.

## 6. Custo por "insight útil"

### Métrica pragmática

Custo por invocação é baseline; custo por **insight útil** (resposta que efetivamente ajudou o usuário) é a métrica que importa.

### Como medir "útil"

- **Feedback explícito** — UI permite thumbs-up/down em respostas do Copilot. Response rate típico: 10-20%.
- **Feedback implícito** — usuário copiou resposta, usou insight proposto, seguiu sugestão → sinais positivos. Usuário refez query imediatamente → sinal negativo (resposta não foi útil).
- **Engajamento com ação sugerida** — quando Copilot sugere ação e usuário aceita, é útil; quando declina, nem tanto.

### Métrica derivada

```
cost_per_useful_insight = total_cost_period / count(useful_invocations)
useful_invocations = invocations com (thumbs-up OR action_accepted OR positive_implicit_signal)
```

Monitorado mensalmente por feature. Valor alvo definido por feature e tier.

### Ação em custo por insight elevado

Se `cost_per_useful_insight` excede baseline em 50% por 2 meses consecutivos:
1. Alerta ao owner da feature
2. Review: prompt melhorável? Modelo sub/superdimensionado? Feature deveria ser depreciada?
3. ADR documenta decisão

## 7. Guardrails contra explosão de OPEX

### Quotas hard

Quotas técnicas (seção 3) são **hard caps**:
- Excede → retorno imediato com erro `QUOTA_EXCEEDED`
- Usuário recebe mensagem clara + opção de upgrade
- Não há "apenas dessa vez" — hard cap é hard

### Budget alerts

Plataforma monitora gasto LLM em tempo real:

```sql
CREATE TABLE llm_cost_budgets (
  tenant_id UUID NOT NULL,
  period VARCHAR(20) NOT NULL,          -- 'daily', 'monthly'
  period_start TIMESTAMPTZ NOT NULL,
  budget_usd NUMERIC(10, 2) NOT NULL,
  spent_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
  
  alert_thresholds NUMERIC(4, 2)[] NOT NULL DEFAULT ARRAY[0.5, 0.8, 0.95, 1.0],
  alerts_fired BOOLEAN[] NOT NULL DEFAULT ARRAY[false, false, false, false],
  
  PRIMARY KEY (tenant_id, period, period_start)
);
```

Atingindo threshold:
- 50%: notificação informativa ao tenant owner
- 80%: alerta em UI
- 95%: avisos em cada invocação + sugestão de upgrade
- 100%: throttling ou bloqueio conforme tier

### Anomaly detection

Crescimento súbito de invocações:
- +50% vs média semanal: alerta
- +100%: investigação automática (possível abuso? bug?)
- +300%: throttling automático + alerta P1

Sinais possíveis: credencial vazada, bot abusing, bug no app criando loop.

### Kill switch

[INV] Toda feature LLM tem kill switch por:
- Tenant (bloqueio apenas para tenant específico)
- Feature (bloqueio global de feature específica)
- Modelo (bloqueio de modelo específico em todas features)

Kill switch acionado gera evento `platform.llm.kill_switch_activated` com razão. Todos os consumers devem degradar para fallback.

### Fallback graceful

Estratégias de degradação por feature:

- **`rule_based_fallback`** — motor de regras simples substitui LLM. Ex: classificação de email por keywords em vez de Sonnet.
- **`graceful_error`** — UI mostra mensagem clara "IA temporariamente indisponível; tente novamente mais tarde". Nunca erro técnico cru.
- **`queue_for_later`** — request é enfileirada; processada quando capacidade voltar (apenas para features não-interativas).

Fallback deve ser **testado** — toda feature LLM tem teste automatizado que força fallback e valida UX.

## 8. Cost attribution per tenant

### Cada invocação atribuída

```sql
CREATE TABLE llm_invocations (
  invocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  feature_id VARCHAR(100) NOT NULL,
  
  invoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  model_used VARCHAR(100) NOT NULL,
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  
  cost_usd NUMERIC(10, 6) NOT NULL,
  
  latency_ms INTEGER,
  outcome VARCHAR(50),                  -- 'success', 'timeout', 'error', 'cache_hit'
  
  quality_feedback VARCHAR(50),         -- 'thumbs_up', 'thumbs_down', 'implicit_positive', 'none'
  
  -- Para audit
  prompt_hash VARCHAR(64),              -- hash do prompt (não prompt em si, por PII)
  response_hash VARCHAR(64)
);

CREATE INDEX ix_llm_tenant_date ON llm_invocations(tenant_id, invoked_at);
```

Agregações por tenant/mês alimentam billing e cost analytics.

### Dashboards

- **Tenant cost dashboard** — visível ao owner, mostra gasto por feature, tendências, previsão
- **Platform LLM dashboard** — visível internamente, mostra top tenants por custo, features mais caras, margens por tier

## 9. Thresholds para trocar provider/modelo

Esta seção complementa SLO_TARGETS seção 6 (gatilhos de escalonamento).

### Gatilho para trocar de modelo primário

**Para modelo mais barato** (downgrade de Sonnet → Haiku para feature específica):
- Qualidade da feature em Haiku é comparável (teste A/B com precision ≥ -5% vs Sonnet)
- Custo de Sonnet para essa feature > $1000/mês sustentado
- Justifica migração que reduza custo em 70%+

**Para modelo mais caro** (upgrade Haiku → Sonnet):
- Qualidade da feature em Haiku insuficiente (precision < target)
- Complaints de usuários específicas sobre qualidade
- Feature crítica para Classe A exige nível mais alto

### Gatilho para Fase 2 — SLM local

Ver SLO_TARGETS.md seção 6. Resumo:
- Volume consolidado > 100M tokens/mês sustentado
- OU latência p95 Claude API > 10s consistente (raro, mas possível)
- OU cliente Enterprise exige soberania de dados em inferência

Migração para SLM fine-tuned local é projeto grande (6-12 meses); planejamento inicia 3 meses antes da projeção do gatilho.

### Gatilho para provider alternativo

Se Claude API se tornar indisponível ou preços subirem drasticamente:
- Fallback configurado para OpenAI / Mistral / outro
- Driver Model (Parte 4.7 da Fundamentação) permite troca sem mudança no código do kernel
- ADR documenta decisão e processo de migração

## 10. Monitoramento obrigatório

### Dashboards

- **LLM Usage Global** — tokens, invocações, custo, cache hit rate, top features por custo
- **LLM Usage por Tenant** — filtrável, breakdown por feature
- **Quality Dashboard** — precision por feature ao longo do tempo, feedback rates
- **Cost Anomaly Dashboard** — tenants com crescimento anormal, alertas ativos

### Alertas

- Budget 80% → PagerDuty para feature owner
- Anomaly 300% → PagerDuty P1
- Kill switch ativado → Slack + log
- Fallback ativado > 10% das invocações em janela de 15min → alerta
- Cache hit rate drop > 20% → alerta (possível problema de invalidação)

## 11. Unit economics alvo

### Free tier

Hard limit: $1/mês custo LLM. Kill switch severo. Suficiente para demonstrar valor; insuficiente para operação real.

### Pro tier

Preço sugerido: $50-99/mês por tenant. LLM cost target: $20-30/mês (margem bruta > 60%). Overage é opcional.

### Enterprise tier

Preço contratual. LLM cost é item de linha no contrato, com transparência e margem negociada. Target: 40-50% de margem bruta em LLM quando operado responsavelmente.

### Revisão trimestral

Unit economics são revisados trimestralmente com dados reais. Se margens estão abaixo do alvo:
- Apertar quotas Free
- Aumentar preço Pro
- Renegociar Enterprise
- Investigar features de alto custo

## 12. Revisão

Documento revisado:
- Mensalmente com dados de custo real
- Quando provider de LLM altera preços
- Quando novo modelo primário é introduzido
- Trimestralmente em revisão rotineira

Owner: AI Platform Lead + CFO / Engineering Lead (compartilhado).

## 13. Histórico

- v1.0 (2026) — versão inicial, operacionalizando P15 da Fundamentação v4.3 (Orçamento LLM obrigatório) e a Parte 23.5 (unit economics)
