import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import { jlog, type InlineConsumer } from "../consumer.js";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
// Sprint 34 MX195 — limite de chars para evitar processar PDFs gigantes.
// 500k chars ≈ 100-200 páginas de texto denso ≈ ~625 chunks de 800 chars.
const MAX_PDF_CHARS = 500_000;
// Texto puro: extraído via fetchStorageText (await res.text()).
const PLAIN_TEXT_TYPES = new Set(["text/plain", "text/markdown"]);
// PDF: extraído via unpdf (Sprint 34 MX195 — resolve KL-8).
const PDF_MIME = "application/pdf";

/**
 * Eventos que disparam embedding:
 *   - platform.file.uploaded     => embed conteudo do arquivo (chunked)
 *   - platform.person.created    => embed context_record summary do enrichment
 *   - platform.chat.channel_created => idem
 *   - agent.copilot.action_executed => idem
 *
 * NotificationConsumer + EnrichmentConsumer ja rodaram antes (ordem em main.ts),
 * entao o context_record correspondente ja existe quando chegamos aqui.
 */
const ENRICHED_EVENTS = new Set([
  "platform.person.created",
  "platform.chat.channel_created",
  "agent.copilot.action_executed",
]);

interface FileUploadedPayload {
  file_id?: string;
  company_id?: string;
  storage_path?: string;
  mime_type?: string;
  name?: string;
}

export interface EmbeddingConsumerOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  /** LiteLLM gateway base URL (ex: http://localhost:4000). Vazio => skip. */
  litellmUrl?: string;
  /** Chave do gateway LiteLLM. */
  litellmKey?: string;
  /** Modelo de embedding default. */
  embedModel?: string;
}

/**
 * Sprint 19 MX99 — EmbeddingConsumer (refactor).
 *
 * Mudancas vs Sprint 18:
 *   - Tenta LiteLLM direto (LITELLM_URL) antes da Edge Function — mais rapido,
 *     evita ida-volta extra
 *   - Cai pra Edge Function /functions/v1/embed-text se LiteLLM indisponivel
 *   - Cai pra BYOK do owner da company se Edge Function 503
 *   - Se nada funciona: skip silencioso (NUNCA polui embeddings com zeros)
 *   - Adiciona embedding de context_records derivados pelo EnrichmentConsumer
 *     para enriquecer o RAG do Copilot
 *
 * R11: skip gracioso, NUNCA bloquear pipeline.
 */
export class EmbeddingConsumer implements InlineConsumer {
  readonly name = "EmbeddingConsumer";
  readonly #supabaseUrl: string;
  readonly #anonKey: string;
  readonly #serviceRoleKey: string;
  readonly #litellmUrl: string;
  readonly #litellmKey: string;
  readonly #embedModel: string;

  constructor(opts: EmbeddingConsumerOptions) {
    this.#supabaseUrl = opts.supabaseUrl;
    this.#anonKey = opts.supabaseAnonKey;
    this.#serviceRoleKey =
      opts.supabaseServiceRoleKey ??
      process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
      "";
    this.#litellmUrl = opts.litellmUrl ?? process.env["LITELLM_URL"] ?? "";
    this.#litellmKey =
      opts.litellmKey ?? process.env["LITELLM_MASTER_KEY"] ?? "";
    this.#embedModel = opts.embedModel ?? "text-embedding-3-small";
  }

  matches(eventType: string): boolean {
    return (
      eventType === "platform.file.uploaded" || ENRICHED_EVENTS.has(eventType)
    );
  }

  async handle(envelope: EventEnvelope, sql: Sql): Promise<void> {
    if (envelope.type === "platform.file.uploaded") {
      await this.#embedFile(envelope, sql);
      return;
    }
    if (ENRICHED_EVENTS.has(envelope.type)) {
      await this.#embedEnrichedRecord(envelope, sql);
      return;
    }
  }

  // ─── File path ────────────────────────────────────────────────────────────

  async #embedFile(envelope: EventEnvelope, sql: Sql): Promise<void> {
    if (this.#supabaseUrl === "") {
      jlog("info", "embedding skip: supabase env missing", {
        event_id: envelope.id,
      });
      return;
    }

    const payload = (envelope.payload ?? {}) as FileUploadedPayload;
    const { file_id, company_id, storage_path, mime_type } = payload;

    if (
      file_id === undefined ||
      company_id === undefined ||
      storage_path === undefined
    ) {
      jlog("warn", "embedding skip: missing required fields", {
        event_id: envelope.id,
      });
      return;
    }

    const mt = mime_type ?? "text/plain";
    const isPlainText = PLAIN_TEXT_TYPES.has(mt);
    const isPdf = mt === PDF_MIME;
    if (!isPlainText && !isPdf) {
      return;
    }

    if (this.#serviceRoleKey === "") {
      jlog("info", "embedding skip: service_role missing", { file_id });
      return;
    }

    let rawText: string | null;
    if (isPdf) {
      rawText = await fetchStoragePdfText(
        this.#supabaseUrl,
        this.#serviceRoleKey,
        storage_path,
        MAX_PDF_CHARS,
      );
      if (rawText === null) {
        jlog(
          "warn",
          "embedding skip: pdf parse failed (binary/encrypted/scan?)",
          {
            file_id,
            storage_path,
          },
        );
        return;
      }
    } else {
      rawText = await fetchStorageText(
        this.#supabaseUrl,
        this.#serviceRoleKey,
        storage_path,
      );
    }

    if (rawText === null || rawText.trim().length === 0) {
      jlog("warn", "embedding skip: empty/unreadable file", {
        file_id,
        storage_path,
        mime_type: mt,
      });
      return;
    }

    const chunks = chunkText(rawText.trim(), CHUNK_SIZE, CHUNK_OVERLAP);
    let embedded = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk === undefined || chunk.trim().length === 0) continue;

      const embedding = await this.#embed(chunk);
      if (embedding === null) {
        jlog("info", "embedding degraded — file partially skipped", {
          file_id,
          chunk_index: i,
        });
        return;
      }

      await this.#upsertEmbedding(sql, {
        companyId: company_id,
        sourceType: "file",
        sourceId: file_id,
        chunkIndex: i,
        chunkText: chunk,
        embedding,
        metadata: { file_name: payload.name ?? storage_path },
      });
      embedded++;
    }

    if (embedded > 0) {
      jlog("info", "file embedded", {
        file_id,
        company_id,
        chunks_total: chunks.length,
        chunks_embedded: embedded,
      });
    }
  }

  // ─── Context record path ──────────────────────────────────────────────────

  async #embedEnrichedRecord(envelope: EventEnvelope, sql: Sql): Promise<void> {
    const companyId = envelope.tenant_id;
    const { entityType, entityId } = entityRefFromEnvelope(envelope);
    if (entityType === null || entityId === null) return;

    // Busca o record gerado pelo EnrichmentConsumer (que rodou antes nesta dispatch)
    const [row] = await sql<
      { id: string; data: Record<string, unknown>; record_type: string }[]
    >`
      SELECT id, data, record_type
      FROM kernel.context_records
      WHERE company_id = ${companyId}
        AND entity_type = ${entityType}
        AND entity_id = ${entityId}
        AND record_type = 'summary'
      LIMIT 1
    `;
    if (row === undefined) return; // EnrichmentConsumer nao gerou ou skipou

    const text = serializeRecordToText(entityType, row.data);
    if (text.trim().length === 0) return;

    const embedding = await this.#embed(text);
    if (embedding === null) {
      jlog("info", "embedding degraded — context_record skipped", {
        record_id: row.id,
        entity_type: entityType,
      });
      return;
    }

    await this.#upsertEmbedding(sql, {
      companyId,
      sourceType: "context_record",
      sourceId: row.id,
      chunkIndex: 0,
      chunkText: text,
      embedding,
      metadata: { entity_type: entityType, entity_id: entityId },
    });
    jlog("info", "context_record embedded", {
      record_id: row.id,
      entity_type: entityType,
    });
  }

  // ─── Embedding provider chain ─────────────────────────────────────────────

  async #embed(text: string): Promise<number[] | null> {
    if (this.#litellmUrl !== "") {
      const v = await fetchEmbeddingLiteLLM(
        this.#litellmUrl,
        this.#litellmKey,
        this.#embedModel,
        text,
      );
      if (v !== null) return v;
    }
    if (this.#supabaseUrl !== "" && this.#anonKey !== "") {
      const v = await fetchEmbeddingEdgeFn(
        this.#supabaseUrl,
        this.#anonKey,
        text,
      );
      if (v !== null) return v;
    }
    return null;
  }

  async #upsertEmbedding(
    sql: Sql,
    args: {
      companyId: string;
      sourceType: string;
      sourceId: string;
      chunkIndex: number;
      chunkText: string;
      embedding: number[];
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      await sql.unsafe(
        `INSERT INTO kernel.embeddings
           (company_id, source_type, source_id, chunk_index, chunk_text, embedding, metadata)
         VALUES ($1::uuid, $2, $3::uuid, $4, $5,
                 $6::extensions.vector, $7::jsonb)
         ON CONFLICT (company_id, source_id, chunk_index) DO UPDATE SET
           chunk_text = EXCLUDED.chunk_text,
           embedding  = EXCLUDED.embedding,
           metadata   = EXCLUDED.metadata`,
        [
          args.companyId,
          args.sourceType,
          args.sourceId,
          args.chunkIndex,
          args.chunkText,
          JSON.stringify(args.embedding),
          JSON.stringify(args.metadata),
        ],
      );
    } catch (e) {
      jlog("warn", "embedding insert error", {
        source_id: args.sourceId,
        chunk_index: args.chunkIndex,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

interface EntityRef {
  entityType: string | null;
  entityId: string | null;
}

function entityRefFromEnvelope(envelope: EventEnvelope): EntityRef {
  const p = (envelope.payload ?? {}) as Record<string, unknown>;
  switch (envelope.type) {
    case "platform.person.created":
      return {
        entityType: "person",
        entityId: typeof p["person_id"] === "string" ? p["person_id"] : null,
      };
    case "platform.chat.channel_created":
      return {
        entityType: "channel",
        entityId: typeof p["channel_id"] === "string" ? p["channel_id"] : null,
      };
    case "agent.copilot.action_executed":
      return {
        entityType: "agent",
        entityId:
          typeof p["executed_by"] === "string" ? p["executed_by"] : null,
      };
    default:
      return { entityType: null, entityId: null };
  }
}

/**
 * Serializa um context_record.data em texto natural pra embedar.
 * Ex: { full_name: "João", email: "j@x.com" } => "Pessoa: João — email: j@x.com"
 */
function serializeRecordToText(
  entityType: string,
  data: Record<string, unknown>,
): string {
  const label =
    entityType === "person"
      ? "Pessoa"
      : entityType === "channel"
        ? "Canal"
        : entityType === "agent"
          ? "Agente"
          : entityType === "file"
            ? "Arquivo"
            : entityType;

  const parts: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined || v === "") continue;
    const value = typeof v === "object" ? JSON.stringify(v) : String(v);
    parts.push(`${k}: ${value}`);
  }
  return `${label} — ${parts.join(", ")}`;
}

async function fetchEmbeddingLiteLLM(
  base: string,
  key: string,
  model: string,
  text: string,
): Promise<number[] | null> {
  try {
    const res = await fetch(`${base}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ input: text, model }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    return body.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

async function fetchEmbeddingEdgeFn(
  edgeFnBase: string,
  supabaseAnonKey: string,
  text: string,
): Promise<number[] | null> {
  try {
    const res = await fetch(`${edgeFnBase}/functions/v1/embed-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 503) return null;
    if (!res.ok) return null;
    const body = (await res.json()) as { embedding?: number[] };
    return body.embedding ?? null;
  } catch {
    return null;
  }
}

async function fetchStorageText(
  supabaseUrl: string,
  serviceRoleKey: string,
  storagePath: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${storagePath}`, {
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Sprint 34 MX195 — PDF text extraction via unpdf (resolve KL-8).
 *
 * unpdf é Node-native, sem bindings, ESM-friendly. Funciona em scp-worker
 * (Node.js puro) sem complicação de bundler.
 *
 * Limita a maxChars para evitar embedar PDFs gigantes (500k ≈ 100 págs).
 * Retorna null se: download falha, parse falha, PDF protegido, PDF
 * escaneado (text vazio — OCR é F2+).
 */
async function fetchStoragePdfText(
  supabaseUrl: string,
  serviceRoleKey: string,
  storagePath: string,
  maxChars: number,
): Promise<string | null> {
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${storagePath}`, {
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0) return null;

    // Import dinâmico para não pagar custo se nenhum PDF chegar (raro, mas
    // mantém scp-worker enxuto). unpdf não tem default export — usa named.
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });

    // result.text pode ser string OU string[]. Normaliza.
    const text = Array.isArray(result.text)
      ? result.text.join("\n")
      : result.text;
    if (typeof text !== "string" || text.trim().length === 0) {
      // PDF escaneado (sem texto extraível) ou protegido.
      return null;
    }
    return text.length > maxChars ? text.slice(0, maxChars) : text;
  } catch {
    return null;
  }
}
