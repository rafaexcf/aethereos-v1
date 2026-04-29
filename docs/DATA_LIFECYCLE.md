# Aethereos — Data Lifecycle v1.0

**Documento operacional companheiro da Fundamentação v4.3**

*Ciclo de vida de dados: retenção, legal hold, tombstones, backups, purga de embeddings, exportação do titular e do tenant, direitos LGPD operacionalizados.*

---

## Escopo

Este documento operacionaliza como dados nascem, vivem, são preservados, arquivados e eventualmente destruídos na plataforma Aethereos. Aborda compliance (LGPD), operação (backups, retenção), e direitos do titular.

Audiência: engenheiros, DPO, DevOps, suporte, compliance.

Subordinado à Fundamentação v4.3. Em caso de conflito, a Fundamentação prevalece.

## 1. Classificação de dados

Toda categoria de dado na plataforma se enquadra em uma das classificações abaixo. Classificação determina retenção, acesso, backup, arquivamento e direitos do titular aplicáveis.

### Categorias

| Categoria | Exemplos | Sensibilidade | PII? |
|---|---|---|---|
| **Dados de domínio do tenant** | Pedidos, faturas, produtos, clientes cadastrados pelo tenant | Alta | Parcial (dados de clientes finais) |
| **Eventos SCP brutos** | Event Store append-only | Alta | Parcial |
| **Context records / insights** | Derivados do Event Store | Alta | Parcial |
| **Embeddings / vetores** | pgvector para RAG | Alta (podem reconstruir PII) | Derivada |
| **Audit trail** | Logs de decisões de usuários/agentes | Alta | Sim (referencia atores) |
| **Credenciais** | Tokens OAuth, chaves API, senhas | Crítica | Sim |
| **Dados de usuário da plataforma** | Nome, email, role, MFA | Média-Alta | Sim |
| **Dados de billing** | Invoices, payment methods, histórico | Alta | Sim |
| **Telemetria técnica** | Métricas de performance, uso agregado | Baixa | Anonimizada |
| **Logs técnicos** | Stack traces, debug logs | Média | Parcial (podem conter PII acidental) |
| **Configurações de tenant** | Settings, policies, apps instalados | Baixa-Média | Não |

### Regra de identificação de PII

**[INV]** Todo dado que pode, isoladamente ou em combinação, identificar pessoa física é PII e recebe proteção reforçada. Dados de clientes finais do tenant (não só usuários da plataforma) contam como PII — Aethereos é processador; tenant é controlador; LGPD aplica integralmente.

## 2. Retenção

### Políticas por categoria

| Categoria | Retenção operacional (ativo em DB) | Arquivamento frio | Destruição |
|---|---|---|---|
| Dados de domínio do tenant | Durante vigência do contrato | 7 anos após cancelamento (retention legal default) | Após retenção legal, purga |
| Eventos SCP brutos | Partições ativas + 12 meses | 12-24 meses em tabela read-only; após isso, storage frio R2/Glacier até 7 anos | Purga após retenção legal |
| Context records | 12 meses | Recomputáveis a partir de SCP bruto — não arquivados | Descartados após 12 meses |
| Insights (efêmeros) | TTL 7 dias default; 90 dias se `persist_long_term` | Não arquivados | Deletados após TTL |
| Embeddings | Co-localizados com dado que representam; seguem retenção do dado original | Arquivados com o dado | Purgados com o dado original |
| Audit trail | 12 meses ativo | 7 anos em storage frio | Após 7 anos, purga (exceto legal hold) |
| Credenciais OAuth | Enquanto tenant conectado | 30 dias após desconexão (para troubleshooting) | Hard delete após 30 dias |
| Dados de usuário da plataforma | Enquanto usuário ativo | 180 dias após deleção da conta (grace period) | Hard delete após 180 dias |
| Dados de billing | 5 anos (legal requirement fiscal) | Após 5 anos em frio | Purga após retenção legal |
| Telemetria técnica | 90 dias em resolução cheia | 2 anos agregada | Descarte após 2 anos |
| Logs técnicos | 30 dias | 12 meses em frio para debug | Descarte após 12 meses |

### Ajustes contratuais

Tenant Enterprise pode **contratar** retenção diferente (mais longa ou mais curta conforme compliance de sua indústria). Ajuste é documentado em aditivo contratual e configurado em `tenant_retention_policies`.

Tenant nunca pode contratar retenção abaixo do mínimo legal (ex: dados fiscais de 5 anos no Brasil).

## 3. Legal hold

### Conceito

Legal hold suspende todas as políticas de purga para dados específicos em resposta a:
- Ordem judicial formal
- Notificação de investigação regulatória
- Litígio ativo ou iminente
- Requisição específica de autoridade competente

### Procedimento

1. DPO recebe notificação formal de necessidade de legal hold
2. DPO valida legitimidade (ordem judicial real, investigação formal)
3. DPO cria entrada em `legal_holds`:
   ```sql
   CREATE TABLE legal_holds (
     hold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID,            -- pode ser NULL se hold é de dados cross-tenant
     scope TEXT NOT NULL,       -- descrição dos dados sob hold
     legal_basis TEXT NOT NULL, -- justificativa legal
     issued_by TEXT NOT NULL,   -- quem ordenou (juiz, órgão)
     issued_at TIMESTAMPTZ NOT NULL,
     expires_at TIMESTAMPTZ,    -- se hold tem prazo; NULL se indefinido
     status TEXT NOT NULL DEFAULT 'active', -- active | released
     released_at TIMESTAMPTZ,
     released_reason TEXT,
     created_by UUID NOT NULL,  -- DPO que registrou
     last_reviewed_at TIMESTAMPTZ
   );
   ```
4. Jobs de purga consultam `legal_holds` antes de deletar qualquer dado; dado coberto por hold ativo é pulado
5. Hold é revisado quarterly para validar permanência
6. Release do hold exige justificativa formal (processo concluído, liberação do órgão)

### Regra invariante

[INV] Dados sob legal hold **nunca são deletados**, mesmo que:
- Tenant cancele contrato
- Titular solicite exclusão (LGPD)
- Período de retenção contratual expire
- Purga automática estaria agendada

Titular/tenant recebe explicação de que deleção foi suspensa por legal hold (sem violar confidencialidade do processo).

## 4. Tombstones vs hard delete

### Conceito

Algumas operações requerem marcar registro como "deletado" sem remover fisicamente (para preservar integridade referencial, audit trail, ou compliance). Tombstone é essa marcação.

### Padrão canônico

Tabelas com PII significativa têm coluna `deleted_at`:

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX ix_users_not_deleted ON users(id) WHERE deleted_at IS NULL;

-- Views sempre filtram tombstones
CREATE VIEW v1_users AS
  SELECT * FROM users WHERE deleted_at IS NULL;
```

Tombstone:
- Usuário desaparece da UI, das queries operacionais, dos relatórios
- Registro permanece fisicamente para audit/compliance
- PII no registro é **mascarada** após tombstone (ver próxima seção)

### Mascaramento de PII em tombstone

Após `deleted_at` ser setado, job subsequente (dentro de 24h) mascara campos PII:

```sql
UPDATE users
SET 
  name = 'DELETED_USER_' || id,
  email = 'deleted_' || id || '@deleted.aethereos.com',
  phone = NULL,
  address = NULL,
  profile_picture_url = NULL,
  -- preserva: id, tenant_id, created_at, deleted_at, role_historico (para audit)
  pii_masked_at = now()
WHERE deleted_at IS NOT NULL AND pii_masked_at IS NULL;
```

Audit trail preserva evento `platform.user.deleted` com ID mas sem dados masked.

### Quando hard delete é usado

- Credenciais (tokens, chaves) — zeroing imediato
- Caches (context records, insights, embeddings temporários) — TTL natural
- Backups expirados — purga total
- Dados após TODA retenção legal cumprida — purga completa

### Referência cruzada

Eventos SCP não suportam tombstone (são append-only, sagrado). Em vez disso, evento de compensação é emitido: `user.deleted` que subscribers processam para refletir no estado.

## 5. Purga de embeddings

### Problema específico

Embeddings (vetores pgvector) podem, em princípio, reconstruir parcialmente o texto original que os gerou. São PII derivada.

### Regra

[INV] **Quando dado original é deletado, embedding derivado é deletado no mesmo ciclo.**

### Implementação

Tabela `embeddings` tem FK para dado-fonte:

```sql
CREATE TABLE embeddings (
  embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_type TEXT NOT NULL,   -- 'document', 'event', 'message', etc.
  source_id UUID NOT NULL,
  source_hash TEXT NOT NULL,   -- hash do conteúdo original (para detectar reuso)
  embedding vector(1536),
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique para evitar duplicação
  UNIQUE (tenant_id, source_type, source_id, model_version)
);
```

Trigger ou job subsequente:

```sql
-- Ao deletar documento, deletar embeddings relacionados
CREATE OR REPLACE FUNCTION delete_document_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM embeddings 
  WHERE source_type = 'document' AND source_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_delete_document_embeddings
AFTER DELETE ON documents
FOR EACH ROW EXECUTE FUNCTION delete_document_embeddings();
```

### Reindexação

Quando modelo de embedding muda (upgrade para nova versão), embeddings antigos são re-gerados **a partir do dado ainda vivo**, não recomputados a partir de embedding antigo. Embeddings antigos são deletados após janela de transição.

### LGPD request → purga de embeddings

Solicitação de exclusão pelo titular inclui purga de embeddings derivados. Processo:
1. Identificar todos os dados-fonte que referenciam o titular
2. Deletar (tombstone ou hard) conforme política
3. Cascata deleta embeddings associados
4. Confirmação ao titular inclui embeddings purgados

## 6. Backups

### Política

- **Backup contínuo** (WAL streaming) com janela de recovery de últimas 35 dias
- **Snapshots diários** mantidos por 30 dias
- **Snapshots mensais** mantidos por 12 meses
- **Snapshots anuais** mantidos por 7 anos (compliance)

### Criptografia

Backups são criptografados em repouso (AES-256) com chave gerenciada por KMS. Chave de backup é **distinta** da chave de DB ativo (compromisso de uma não compromete a outra).

### Localização

- Backups primários: mesma região do DB
- Backups secundários: região diferente para resiliência
- Para Enterprise com compliance de soberania, backups permanecem em região declarada

### Teste de restore

[INV] Restore é testado **mensalmente** em ambiente staging a partir de backup real. Sem teste de restore, backup é fictício.

Procedimento:
1. Selecionar snapshot aleatório do último mês
2. Restaurar para instância efêmera de staging
3. Validar integridade (row counts, checksums de tabelas críticas)
4. Validar consistência (queries de referência retornam resultados válidos)
5. Registrar resultado em `restore_test_log`
6. Destruir instância após validação

Restore test falha → incident SEV-2 com postmortem.

### Backups e legal hold

Dados sob legal hold permanecem em backups mesmo após purga do DB ativo. Backups são fonte de re-hidratação se necessário durante hold.

### Backups e direito à exclusão (LGPD)

Quando titular solicita exclusão:
1. Exclusão no DB ativo é imediata
2. Backups são **mantidos** pela janela normal de retenção de backup (dados do titular permanecem em backup rotativo)
3. Comunicação ao titular explica que backups são purgados conforme rotação natural (máximo 35 dias para backup contínuo; 30 dias para snapshots diários)
4. Após janela de backup, dados estão completamente removidos

Isso é prática padrão aceita pela ANPD — exclusão imediata de backups rotativos é operacionalmente inviável e recuperação seletiva dentro de backup não é prática madura. Transparência ao titular é suficiente.

## 7. Exportação de dados

### Exportação do tenant (portabilidade)

Owner do tenant pode exportar integralmente dados do tenant a qualquer momento.

**Formato:**
- JSON estruturado para dados de domínio (pedidos, faturas, etc.)
- Eventos SCP em NDJSON (um evento por linha)
- Documentos do Drive em formato original + arquivo manifest
- Audit trail em CSV
- Metadados (users, roles, configurações) em JSON

**Entregue via:**
- Download direto (arquivo ZIP com chunks) para volumes até 5GB
- Link pré-assinado para S3/R2 bucket temporário (válido 7 dias) para volumes maiores

**SLA:**
- Pro tier: exportação disponível em até 48h
- Enterprise tier: exportação disponível em até 4h, ou real-time via S3 replication quando contratado

**Criptografia:**
- Export pode ser criptografado com chave pública do tenant (opcional, recomendado)

### Exportação de dados do titular (LGPD art. 18, II)

Titular pode solicitar exportação de seus dados pessoais processados pela plataforma.

Complicação: Aethereos é **processador** dos dados do tenant; titular típico é cliente final do tenant, não usuário direto da plataforma. Fluxo:

1. Titular faz solicitação a seu controlador (tenant)
2. Tenant aciona Aethereos via API ou portal de Data Subject Requests
3. Aethereos gera exportação dos dados do titular específico no tenant específico
4. Tenant entrega ao titular

Alternativa: Aethereos fornece portal público onde titular solicita diretamente, mas pedido é roteado ao tenant correspondente para autorização.

**Formato:** JSON estruturado com:
- Dados cadastrais do titular
- Histórico de interações (eventos, pedidos, mensagens)
- Documentos vinculados
- Dados derivados (scores, classificações) — quando aplicável

**SLA:** 15 dias conforme LGPD art. 19.

## 8. Direitos do titular (LGPD) — operacionalizados

Tabela `lgpd_requests` centraliza todas as solicitações:

```sql
CREATE TABLE lgpd_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  requester_type TEXT NOT NULL,         -- 'data_subject' | 'controller'
  requester_identification TEXT,         -- email, CPF, etc. (criptografado)
  
  request_type TEXT NOT NULL,            -- 'access', 'correction', 'deletion', 'portability', 'objection', 'info'
  request_details TEXT,
  
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  status TEXT NOT NULL DEFAULT 'received',
  -- 'received' | 'in_validation' | 'in_processing' | 'completed' | 'rejected'
  
  sla_deadline TIMESTAMPTZ NOT NULL,     -- 15 dias após recebimento
  
  resolution_notes TEXT,
  resolved_by UUID                        -- DPO que processou
);
```

### Tipos de solicitação e SLA

| Tipo | Descrição | SLA |
|---|---|---|
| Acesso | Titular solicita cópia dos dados (art. 18 II) | 15 dias |
| Correção | Titular solicita correção de dados incorretos (art. 18 III) | 15 dias |
| Exclusão | Titular solicita exclusão (art. 18 VI) | 15 dias |
| Portabilidade | Titular solicita exportação em formato interoperável (art. 18 V) | 15 dias |
| Oposição | Titular se opõe a tratamento específico | 15 dias |
| Anonimização | Solicita anonimização em vez de exclusão | 15 dias |
| Informação | Solicita info sobre uso dos dados | 15 dias |

### Alertas de SLA

Sistema emite alertas:
- 7 dias antes do SLA: aviso ao DPO
- 3 dias antes: escalação para Security Lead
- No vencimento: incident

### DPO como ponto focal

DPO é responsável por processar requests. Contato público: dpo@aethereos.com + formulário no site. Tenant pode configurar seu próprio DPO visível a titulares.

## 9. Consent management

### Princípio

Consentimento para tratamento adicional ao contratado (ex: opt-in para benchmarks cross-tenant anonimizados) é registrado explicitamente.

```sql
CREATE TABLE consent_records (
  consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,                          -- null se consentimento é de tenant inteiro
  
  consent_type TEXT NOT NULL,            -- 'benchmark_participation', 'ai_training_opt_in', etc.
  consent_given BOOLEAN NOT NULL,
  
  given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  given_ip INET,
  given_user_agent TEXT,
  
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  legal_basis TEXT NOT NULL,             -- 'consent', 'legitimate_interest', 'contract', etc.
  
  version_of_terms TEXT                  -- versão dos termos/política vigente
);
```

### Revogação de consentimento

Tenant/user pode revogar a qualquer momento. Revogação:
1. Cria registro `revoked_at` na linha existente
2. Dispara evento `platform.consent.revoked` em SCP
3. Subscribers relevantes param processamento dependente desse consent em ≤ 24h
4. Dados já processados sob consentimento válido não são invalidados retroativamente

## 10. Auditoria e observabilidade do ciclo de vida

### Eventos emitidos

Toda transição relevante gera evento em SCP:

- `platform.data.retention_policy_applied` — purga automática executada
- `platform.data.exported` — exportação realizada
- `platform.data.tombstoned` — tombstone aplicado
- `platform.data.hard_deleted` — hard delete executado
- `platform.data.anonymized` — dados anonimizados
- `platform.data.legal_hold_applied` — hold aplicado
- `platform.data.legal_hold_released` — hold liberado
- `platform.consent.given` / `platform.consent.revoked`
- `platform.lgpd.request_received` / `platform.lgpd.request_resolved`

### Dashboards

- **DPO Dashboard** — LGPD requests por status, SLA, DPO assignee
- **Data Retention Dashboard** — purgas executadas, próximas, legal holds ativos
- **Backup Dashboard** — último backup, último restore test, RPO atual

### Relatórios regulatórios

Report automatizado mensal para DPO:
- LGPD requests recebidos e resolvidos
- Legal holds ativos
- Incidentes de dados
- Exportações realizadas
- Consentimentos registrados/revogados

## 11. Runbooks referenciados

- `runbook_lgpd_request_access.md`
- `runbook_lgpd_request_deletion.md`
- `runbook_lgpd_request_portability.md`
- `runbook_legal_hold_apply.md`
- `runbook_legal_hold_release.md`
- `runbook_backup_restore_test.md`
- `runbook_data_breach_notification.md`

Produzidos conforme fluxos emergem em produção.

## 12. Revisão

Documento revisado:
- Quando LGPD ou regulação equivalente for alterada
- A cada mudança de provider de backup/storage
- Trimestralmente pelo DPO
- A cada incidente de dados

Owner: DPO da Aethereos Inc.

## 13. Histórico

- v1.0 (2026) — versão inicial, consolidando escopo declarado no preâmbulo da Fundamentação v4.3 e complementando a Parte XII (garantias LGPD)
