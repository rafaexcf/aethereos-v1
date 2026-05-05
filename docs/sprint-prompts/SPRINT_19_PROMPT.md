# SPRINT 19 — Context Engine: Enrichment, Derived Records, Snapshots + RAG

> **Objetivo:** Eventos SCP sao enriquecidos em transito, geram derived context records, e podem ser consultados via snapshots. Copilot usa RAG real com embeddings do pgvector para responder perguntas sobre dados do tenant.
> **NAO inclui:** NATS (modo inline continua), Policy Engine, staging deploy, verticais.
> **Estimativa:** 4-6 horas. Custo: $25-45.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar Sprint 18 documentado
3. git log --oneline -10 — confirmar HEAD
4. apps/scp-worker/src/consumers/ — 3 consumers existentes (audit, embedding, notification) em modo inline
5. apps/scp-worker/src/main.ts — poller + inline consumer dispatch
6. packages/scp-registry/src/schemas/context.ts — context.snapshot.requested, context.snapshot.ready
7. kernel.embeddings — tabela com pgvector (id, company_id, source_type, source_id, chunk_index, chunk_text, embedding vector, metadata, created_at). 0 registros.
8. kernel.audit_log — append-only (id, company_id, actor_id, actor_type, action, resource_type, resource_id, payload, ip_address, created_at)
9. pgvector 0.8.0 instalado
10. Copilot (apps/copilot/index.tsx) — ja tem RAG cego (MX16) que roda mas sem embeddings reais
11. KL-8 — EmbeddingConsumer so le texto cru (sem PDF extractor)

### Estado atual

- Pipeline SCP funciona: browser -> scp-publish -> outbox -> poller -> consumers inline
- EmbeddingConsumer existe mas nao gera embeddings (0 registros) porque depende de LLM para embed
- Copilot tem codigo RAG que busca em kernel.embeddings mas encontra 0 resultados
- Context schemas SCP registrados mas nunca emitidos nem consumidos
- Nao existe tabela de derived context records
- Nao existe API de snapshot de contexto

### Arquitetura — 3 camadas SCP (Fundamentacao 8.10)

Camada 1 — Domain Event Bruto: ja existe (scp_outbox, consumers)
Camada 2 — Derived Context Record: NOVO neste sprint. Registro derivado calculado do evento bruto.
Camada 3 — Actionable Insight: consumido pelo Copilot via RAG. NOVO neste sprint.

Fluxo:

1. Evento bruto chega no poller (ex: platform.person.created)
2. EnrichmentConsumer adiciona contexto derivado (ex: conta total de pessoas, ultima atividade)
3. Derived record gravado em kernel.context_records
4. EmbeddingConsumer gera embedding do chunk de texto relevante -> kernel.embeddings
5. Copilot consulta embeddings via pgvector similarity search para responder perguntas

---

## MILESTONES

### MX97 — Migration: kernel.context_records

O que fazer:

1. Criar migration para nova tabela kernel.context_records:

   CREATE TABLE kernel.context_records (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   company_id UUID NOT NULL REFERENCES kernel.companies(id) ON DELETE CASCADE,
   entity_type TEXT NOT NULL,
   entity_id UUID NOT NULL,
   record_type TEXT NOT NULL,
   version INTEGER NOT NULL DEFAULT 1,
   data JSONB NOT NULL DEFAULT '{}'::jsonb,
   source_event_id UUID,
   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );

   Indices:
   - (company_id, entity_type, entity_id, record_type) — lookup principal
   - (company_id, created_at DESC) — listagem cronologica

   RLS: company-scoped via kernel.current_company_id()
   GRANT SELECT, INSERT, UPDATE TO authenticated

2. record_type exemplos: summary, activity_count, last_seen, relationship

3. A tabela e append-friendly mas permite UPDATE (versioning via campo version).

Criterio de aceite: Migration aplicada, tabela existe com RLS.

Commit: feat(db): kernel.context_records — derived context records table (MX97)

---

### MX98 — EnrichmentConsumer: gera derived records

O que fazer:

1. Criar apps/scp-worker/src/consumers/enrichment-consumer.ts:

   Escuta eventos chave e gera context_records derivados:

   platform.person.created:
   - UPSERT context_record: entity_type=person, entity_id=person_id, record_type=summary
   - data: { full_name, email, created_at, created_by }
   - Contar total de pessoas da company -> UPSERT record_type=company_stats, entity_type=company, entity_id=company_id, data: { total_people: N }

   platform.file.uploaded:
   - UPSERT context_record: entity_type=file, entity_id=file_id, record_type=summary
   - data: { name, mime_type, size_bytes, uploaded_by }
   - Contar total de arquivos -> UPSERT company_stats

   kernel.chat.channel_created:
   - UPSERT context_record: entity_type=channel, entity_id=channel_id, record_type=summary
   - data: { name, kind, created_by }

   agent.copilot.action_executed:
   - UPSERT context_record: entity_type=agent, entity_id=agent_id, record_type=activity_count
   - data: { total_actions: N, last_action_at }

2. Cada UPSERT usa ON CONFLICT (company_id, entity_type, entity_id, record_type) DO UPDATE.

3. Registrar no main.ts como consumer inline.

Criterio de aceite: Eventos processados geram context_records. Verificar com SELECT apos upload de arquivo.

Commit: feat(scp-worker): enrichment consumer — derive context records from events (MX98)

---

### MX99 — EmbeddingConsumer funcional com BYOK

O que fazer:

1. Refatorar embedding-consumer.ts para usar o LLM driver do usuario (BYOK) em vez de Edge Function:
   - Ler user_preferences key=llm_config do supervising_user ou owner da company
   - Construir BYOKLLMDriver com o config
   - Chamar driver.embed(chunkText) para gerar embedding
   - Se nao ha config BYOK: skip gracioso (log + continue)

2. ALTERNATIVA mais simples (recomendada): embedding-consumer chama endpoint generico:
   - POST para LiteLLM gateway http://localhost:4000/embeddings (se disponivel)
   - OU: chamar a API do provedor direto via fetch (text-embedding-3-small da OpenAI, etc.)
   - OU: se nenhum LLM disponivel, gerar pseudo-embedding (vetor de zeros) para nao bloquear pipeline e documentar como KL

3. Para cada evento platform.file.uploaded com mime_type text/plain ou text/markdown:
   - Fetch conteudo do arquivo via Supabase Storage REST
   - Chunk com tamanho 800 chars, overlap 100
   - Gerar embedding por chunk
   - INSERT em kernel.embeddings: source_type=file, source_id=file_id, chunk_index, chunk_text, embedding

4. Para context_records (do MX98):
   - Serializar data como texto natural: "Pessoa: João Silva, email: joao@test.com, criado em 2026-05-04"
   - Gerar embedding desse texto
   - INSERT em kernel.embeddings: source_type=context_record, source_id=record_id

5. Manter KL-8 para PDFs binarios — nao resolver neste sprint.

Criterio de aceite: Upload de arquivo .txt gera embeddings em kernel.embeddings. Context records tambem geram embeddings.

Commit: feat(scp-worker): embedding consumer — functional with LiteLLM/BYOK (MX99)

---

### MX100 — Context Snapshot API

O que fazer:

1. Criar Edge Function supabase/functions/context-snapshot/index.ts:

   POST /functions/v1/context-snapshot
   Body: { entity_type, entity_id }
   Auth: Bearer JWT (authenticated)

   Resposta: {
   entity_type,
   entity_id,
   records: [{ record_type, version, data, updated_at }],
   related_events: [{ event_type, created_at, payload_preview }], // ultimos 10 do audit_log
   embedding_count: N
   }

2. A funcao:
   - Busca context_records WHERE entity_type AND entity_id AND company_id
   - Busca ultimos 10 audit_log WHERE resource_id = entity_id AND company_id
   - Conta embeddings WHERE source_id = entity_id
   - Emite SCP: context.snapshot.ready

3. Registrar context-snapshot nos KNOWN_EVENT_TYPES do scp-publish.

Criterio de aceite: POST retorna snapshot completo de uma entidade. Emite SCP.

Commit: feat(edge-functions): context-snapshot — aggregate entity context (MX100)

---

### MX101 — Copilot RAG real com pgvector

O que fazer:

1. No Copilot (copilot/index.tsx), o RAG ja tem codigo (MX16 cego). Tornar funcional:

   Quando usuario faz pergunta:
   a) Gerar embedding da pergunta via LLM driver (driver.embed(question))
   b) Buscar top-5 chunks similares em kernel.embeddings via pgvector:
   SELECT chunk_text, source_type, source_id, 1 - (embedding <=> $1) as similarity
   FROM kernel.embeddings
   WHERE company_id = $2
   ORDER BY embedding <=> $1
   LIMIT 5
   c) Injetar chunks no system prompt como contexto adicional:
   "Contexto relevante da empresa:\n{chunk1}\n{chunk2}\n..."
   d) Enviar para LLM com contexto enriquecido

2. Se embed() falha (provedor nao suporta ou nao configurado): fallback para Copilot sem RAG (comportamento atual). Log no console.

3. Se kernel.embeddings esta vazio: Copilot funciona normalmente sem contexto extra.

4. Mostrar indicador visual sutil quando RAG foi usado: icone pequeno ou tooltip "Resposta baseada em dados da empresa".

Criterio de aceite: Copilot com BYOK configurado e embeddings no banco responde usando contexto real. Sem embeddings, funciona normalmente.

Commit: feat(copilot): RAG real with pgvector similarity search (MX101)

---

### MX102 — UI de Context no app Governanca

O que fazer:

1. Adicionar aba ou secao Context Engine no app Governanca.

2. A secao mostra:
   - Total de context_records por entity_type (summary table)
   - Total de embeddings
   - Lista dos ultimos 20 context_records com entity_type, entity_id preview, record_type, updated_at
   - Botao para pedir snapshot de uma entidade (chama Edge Function context-snapshot)

3. Ao clicar em um record: drawer com data JSON formatado.

4. Isso da visibilidade ao operador sobre o que o Context Engine esta derivando.

Criterio de aceite: Governanca mostra dados do Context Engine. Snapshot funciona.

Commit: feat(governanca): context engine panel — records + embeddings overview (MX102)

---

### MX103 — Testes + documentacao

O que fazer:

1. Testes unitarios:
   - EnrichmentConsumer: verifica UPSERT de context_records para cada event type
   - EmbeddingConsumer: verifica chunking + INSERT em embeddings (mock LLM)
   - Context snapshot: mock Supabase, verifica resposta

2. Rodar suite completa:
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

3. Resultado esperado: 33+ passed, 0 failed.

4. Atualizar SPRINT_LOG.md com Sprint 19.

5. Documentar no QUICK_START.md:
   - Como testar Context Engine: upload arquivo .txt no Drive, rodar scp-worker, verificar embeddings e context_records
   - Como testar RAG: configurar BYOK, fazer pergunta ao Copilot sobre conteudo do arquivo

Criterio de aceite: Testes passam, documentacao atualizada.

Commit: docs: sprint 19 — context engine (MX103)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem feat/fix/docs(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. Nova dep exige justificativa em commit.
R5. Bloqueios mantidos: sem next em shells, sem inngest, sem @clerk/\*, sem prisma.
R6. Antes de cada commit: pnpm typecheck && pnpm lint.
R7. Atualize SPRINT_LOG.md ao fim de cada milestone.
R8. Nao execute fora de ~/Projetos/aethereos. Nao escreva em ~/Projetos/aethereos-v2.
R9. Ao perceber contexto cheio: pare, escreva pickup point.
R10. NAO quebrar os 33 E2E existentes.
R11. Embeddings sem LLM disponivel: skip gracioso, NUNCA bloquear pipeline.
R12. pgvector similarity search usa operador <=> (cosine distance). Indice HNSW se > 10k registros (nao agora).
R13. Context records sao derivados, nao source of truth. Se dados mudarem, records sao recalculados.
R14. KL-8 (PDF binario) continua — nao resolver neste sprint.

---

## TERMINO DO SPRINT

Quando MX103 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte o resultado (X passed, Y failed, Z skipped).

3. Pare aqui. Nao inicie Sprint 20.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 19 (Context Engine) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX97-MX103 nao concluida
5. Continue a partir dela

Lembrar:

- 3 camadas SCP: bruto (outbox) -> derivado (context_records) -> insight (embeddings + RAG)
- EnrichmentConsumer gera context_records de eventos
- EmbeddingConsumer gera embeddings via LiteLLM/BYOK (skip se indisponivel)
- Context Snapshot Edge Function agrega dados de uma entidade
- Copilot RAG: embed pergunta -> pgvector similarity -> inject no prompt
- pgvector 0.8.0 instalado, operador <=>
- KL-8 (PDF) nao resolvido — texto puro e markdown apenas
- 33 E2E existentes nao podem quebrar

Roadmap em SPRINT_19_PROMPT.md na raiz.
