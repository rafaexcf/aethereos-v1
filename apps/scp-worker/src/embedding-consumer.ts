import type { Sql } from "postgres";
import type { NatsEventBusDriver } from "@aethereos/drivers-nats";

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

    if (res.status === 503) {
      return null; // degraded — skip silently
    }

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

export async function setupEmbeddingConsumer(
  bus: NatsEventBusDriver,
  sql: Sql,
): Promise<void> {
  const supabaseUrl = process.env["SUPABASE_URL"] ?? "";
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  const anonKey = process.env["SUPABASE_ANON_KEY"] ?? "";

  if (supabaseUrl === "" || serviceRoleKey === "" || anonKey === "") {
    process.stdout.write(
      JSON.stringify({
        level: "warn",
        msg: "embedding-consumer: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY missing — consumer disabled",
      }) + "\n",
    );
    return;
  }

  const result = await bus.subscribe(
    "platform.file.uploaded",
    async (envelope) => {
      const payload = envelope.payload as FileUploadedPayload;
      const { file_id, company_id, storage_path, mime_type } = payload;

      if (!file_id || !company_id || !storage_path) {
        process.stdout.write(
          JSON.stringify({
            level: "warn",
            msg: "embedding-consumer: missing required fields",
            event_id: envelope.id,
          }) + "\n",
        );
        return;
      }

      const mimeType = mime_type ?? "text/plain";
      if (!SUPPORTED_TYPES.has(mimeType)) {
        return; // silently skip unsupported types
      }

      const text = await fetchStorageText(
        supabaseUrl,
        serviceRoleKey,
        storage_path,
      );
      if (text === null || text.trim().length === 0) {
        process.stdout.write(
          JSON.stringify({
            level: "warn",
            msg: "embedding-consumer: could not fetch file content",
            file_id,
            storage_path,
          }) + "\n",
        );
        return;
      }

      const chunks = chunkText(text.trim(), CHUNK_SIZE, CHUNK_OVERLAP);
      let embedded = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk || chunk.trim().length === 0) continue;

        const embedding = await fetchEmbedding(supabaseUrl, anonKey, chunk);
        if (embedding === null) {
          process.stdout.write(
            JSON.stringify({
              level: "info",
              msg: "embedding-consumer: embedder degraded — file skipped",
              file_id,
              chunk_index: i,
            }) + "\n",
          );
          return; // degraded: skip remaining chunks for this file
        }

        const metadataJson = JSON.stringify({
          file_name: payload.name ?? storage_path,
        });
        await sql.unsafe(
          `
          insert into kernel.embeddings
            (company_id, source_type, source_id, chunk_index, chunk_text, embedding, metadata)
          values (
            $1::uuid, 'file', $2::uuid, $3, $4,
            $5::extensions.vector,
            $6::jsonb
          )
          on conflict (company_id, source_id, chunk_index) do update set
            chunk_text = excluded.chunk_text,
            embedding  = excluded.embedding
          `,
          [
            company_id,
            file_id,
            i,
            chunk,
            JSON.stringify(embedding),
            metadataJson,
          ],
        );
        embedded++;
      }

      process.stdout.write(
        JSON.stringify({
          level: "info",
          msg: "embedding-consumer: file embedded",
          file_id,
          company_id,
          chunks_total: chunks.length,
          chunks_embedded: embedded,
        }) + "\n",
      );
    },
    { durable: true },
  );

  if (!result.ok) {
    process.stdout.write(
      JSON.stringify({
        level: "warn",
        msg: "embedding-consumer: subscribe failed — consumer disabled",
        error: result.error.message,
      }) + "\n",
    );
    return;
  }

  process.stdout.write(
    JSON.stringify({
      level: "info",
      msg: "embedding-consumer: subscribed to platform.file.uploaded",
    }) + "\n",
  );
}
