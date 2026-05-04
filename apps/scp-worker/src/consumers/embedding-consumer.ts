import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import { jlog, type InlineConsumer } from "../consumer.js";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const SUPPORTED_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
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
}

/**
 * Sprint 18 MX93 — EmbeddingConsumer (inline).
 *
 * Reuso da logica original de apps/scp-worker/src/embedding-consumer.ts
 * (que era NATS-based) adaptada ao InlineConsumer contract.
 *
 * Listen: platform.file.uploaded
 * Action: chunk text + embed via /functions/v1/embed-text + INSERT em
 *         kernel.embeddings (UPSERT em company_id+source_id+chunk_index).
 *
 * Degraded gracefully (R12 do spec MX93):
 *   - Sem SUPABASE_URL/anon_key: matches() retorna false → skip silencioso
 *   - mime_type nao suportado: skip silencioso
 *   - fetch text falhou: log + skip
 *   - embed-text 503 ou nao OK: log + skip (Modo Degenerado P14)
 */
export class EmbeddingConsumer implements InlineConsumer {
  readonly name = "EmbeddingConsumer";
  readonly #supabaseUrl: string;
  readonly #anonKey: string;
  readonly #serviceRoleKey: string;

  constructor(opts: EmbeddingConsumerOptions) {
    this.#supabaseUrl = opts.supabaseUrl;
    this.#anonKey = opts.supabaseAnonKey;
    this.#serviceRoleKey =
      opts.supabaseServiceRoleKey ??
      process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
      "";
  }

  matches(eventType: string): boolean {
    return eventType === "platform.file.uploaded";
  }

  async handle(envelope: EventEnvelope, sql: Sql): Promise<void> {
    if (this.#supabaseUrl === "" || this.#anonKey === "") {
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
    if (!SUPPORTED_TYPES.has(mt)) {
      return; // unsupported, silent skip
    }

    if (this.#serviceRoleKey === "") {
      // Sem service_role nao da pra ler Storage. Skip gracioso.
      jlog(
        "info",
        "embedding skip: service_role missing — cannot read Storage",
        {
          file_id,
        },
      );
      return;
    }

    const text = await fetchStorageText(
      this.#supabaseUrl,
      this.#serviceRoleKey,
      storage_path,
    );
    if (text === null || text.trim().length === 0) {
      jlog("warn", "embedding skip: empty/unreadable file", {
        file_id,
        storage_path,
      });
      return;
    }

    const chunks = chunkText(text.trim(), CHUNK_SIZE, CHUNK_OVERLAP);
    let embedded = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk === undefined || chunk.trim().length === 0) continue;

      const embedding = await fetchEmbedding(
        this.#supabaseUrl,
        this.#anonKey,
        chunk,
      );
      if (embedding === null) {
        // P14 Modo Degenerado: embed-text indisponivel. Skip restante
        // sem marcar evento como failed (consumer terminou graceful).
        jlog("info", "embedding degraded — file partially skipped", {
          file_id,
          chunk_index: i,
        });
        return;
      }

      try {
        await sql.unsafe(
          `INSERT INTO kernel.embeddings
             (company_id, source_type, source_id, chunk_index, chunk_text, embedding, metadata)
           VALUES ($1::uuid, 'file', $2::uuid, $3, $4,
                   $5::extensions.vector, $6::jsonb)
           ON CONFLICT (company_id, source_id, chunk_index) DO UPDATE SET
             chunk_text = EXCLUDED.chunk_text,
             embedding  = EXCLUDED.embedding`,
          [
            company_id,
            file_id,
            i,
            chunk,
            JSON.stringify(embedding),
            JSON.stringify({ file_name: payload.name ?? storage_path }),
          ],
        );
        embedded++;
      } catch (e) {
        jlog("warn", "embedding insert error", {
          file_id,
          chunk_index: i,
          error: e instanceof Error ? e.message : String(e),
        });
        // Continua tentando proximo chunk — nao aborta tudo
      }
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
}

// ─── Helpers (reuso direto de embedding-consumer.ts original) ────────────────

function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

async function fetchEmbedding(
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
