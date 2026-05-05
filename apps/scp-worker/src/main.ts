import postgres from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import { jlog, type InlineConsumer } from "./consumer.js";
import { AuditConsumer } from "./consumers/audit-consumer.js";
import { NotificationConsumer } from "./consumers/notification-consumer.js";
import { EmbeddingConsumer } from "./consumers/embedding-consumer.js";
import { EnrichmentConsumer } from "./consumers/enrichment-consumer.js";

const POLL_INTERVAL_MS = Number(process.env["SCP_POLL_INTERVAL_MS"] ?? "2000");
const BATCH_SIZE = Number(process.env["SCP_BATCH_SIZE"] ?? "50");
const MAX_ATTEMPTS = Number(process.env["SCP_MAX_ATTEMPTS"] ?? "3");
const METRICS_FLUSH_EVERY = Number(
  process.env["SCP_METRICS_FLUSH_EVERY"] ?? "100",
);

interface OutboxRow {
  id: number;
  company_id: string;
  event_type: string;
  event_id: string;
  payload: Record<string, unknown>;
  envelope: EventEnvelope;
  attempts: number;
}

// Sprint 31 / MX171: SLO instrumentation. Buffer in-memory de latencias
// individuais. A cada METRICS_FLUSH_EVERY eventos, calcula p50/p95/p99 e
// emite log estruturado consultavel via Vercel logs / Loki.
const latencyBuffer: number[] = [];

function recordLatency(processingMs: number): void {
  latencyBuffer.push(processingMs);
  if (latencyBuffer.length >= METRICS_FLUSH_EVERY) {
    flushMetrics();
  }
}

function flushMetrics(): void {
  if (latencyBuffer.length === 0) return;
  const sorted = [...latencyBuffer].sort((a, b) => a - b);
  const len = sorted.length;
  const pick = (q: number): number => {
    const idx = Math.min(len - 1, Math.floor(q * len));
    return sorted[idx] ?? 0;
  };
  jlog("info", "scp metrics flush", {
    metric_name: "scp_event_processing_ms",
    samples: len,
    p50: pick(0.5),
    p95: pick(0.95),
    p99: pick(0.99),
    min: sorted[0] ?? 0,
    max: sorted[len - 1] ?? 0,
  });
  latencyBuffer.length = 0;
}

async function main(): Promise<void> {
  const dbUrl =
    process.env["DATABASE_URL"] ??
    "postgres://postgres:postgres@127.0.0.1:54322/postgres";

  const sql = postgres(dbUrl, { max: 3, prepare: false });

  const supabaseUrl = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:54321";
  const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"] ?? "";

  // Sprint 18: modo inline (R13 — NATS opcional, e fallback aceito).
  // Cada consumer matches(eventType) + handle(envelope,sql).
  const consumers: InlineConsumer[] = [
    new AuditConsumer(),
    new NotificationConsumer(),
    new EnrichmentConsumer(),
    new EmbeddingConsumer({ supabaseUrl, supabaseAnonKey }),
  ];

  jlog("info", "scp-worker started", {
    mode: "inline",
    db: dbUrl.replace(/:[^:@]+@/, ":***@"),
    poll_interval_ms: POLL_INTERVAL_MS,
    batch_size: BATCH_SIZE,
    max_attempts: MAX_ATTEMPTS,
    consumers: consumers.map((c) => c.name),
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    jlog("info", "scp-worker shutting down", { signal });
    flushMetrics();
    try {
      await sql.end({ timeout: 5 });
    } catch (e) {
      jlog("warn", "sql.end error", { error: String(e) });
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  while (!shuttingDown) {
    try {
      await processBatch(sql, consumers);
    } catch (e) {
      jlog("error", "outbox poll error", { error: String(e) });
    }
    if (shuttingDown) break;
    await sleep(POLL_INTERVAL_MS);
  }
}

async function processBatch(
  sql: postgres.Sql,
  consumers: InlineConsumer[],
): Promise<void> {
  // FOR UPDATE SKIP LOCKED — multiplas instancias do worker podem rodar
  // concorrentemente sem reprocessar mesma row (R11).
  const rows = await sql<OutboxRow[]>`
    SELECT id, company_id, event_type, event_id, payload, envelope, attempts
    FROM kernel.scp_outbox
    WHERE status = 'pending'
      AND attempts < ${MAX_ATTEMPTS}
    ORDER BY created_at ASC
    LIMIT ${BATCH_SIZE}
    FOR UPDATE SKIP LOCKED
  `;

  if (rows.length === 0) return;

  for (const row of rows) {
    await processEvent(sql, row, consumers);
  }
}

async function processEvent(
  sql: postgres.Sql,
  row: OutboxRow,
  consumers: InlineConsumer[],
): Promise<void> {
  // Match consumers + executa cada um. R12: consumer NUNCA bloqueia o
  // pipeline — cada handle e wrappado em try/catch individual.
  const matched = consumers.filter((c) => c.matches(row.event_type));
  const errors: string[] = [];
  const startedAt = performance.now();

  for (const consumer of matched) {
    try {
      await consumer.handle(row.envelope ?? buildFallbackEnvelope(row), sql);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${consumer.name}: ${msg}`);
      jlog("warn", "consumer error", {
        consumer: consumer.name,
        event_id: row.event_id,
        event_type: row.event_type,
        error: msg,
      });
    }
  }

  const processingMs = Math.round(performance.now() - startedAt);
  recordLatency(processingMs);

  if (errors.length === 0) {
    await sql`
      UPDATE kernel.scp_outbox
      SET status = 'published',
          published_at = NOW(),
          attempts = attempts + 1
      WHERE id = ${row.id}
    `;
    jlog("info", "event published", {
      event_id: row.event_id,
      event_type: row.event_type,
      consumers: matched.map((c) => c.name),
      processing_time_ms: processingMs,
    });
  } else {
    const newAttempts = row.attempts + 1;
    const nextStatus = newAttempts >= MAX_ATTEMPTS ? "failed" : "pending";
    await sql`
      UPDATE kernel.scp_outbox
      SET attempts = ${newAttempts},
          last_error = ${errors.join(" | ")},
          status = ${nextStatus}
      WHERE id = ${row.id}
    `;
    if (nextStatus === "failed") {
      jlog("error", "event failed (max attempts)", {
        event_id: row.event_id,
        event_type: row.event_type,
        attempts: newAttempts,
        errors,
        processing_time_ms: processingMs,
      });
    } else {
      jlog("warn", "event retry", {
        event_id: row.event_id,
        event_type: row.event_type,
        attempts: newAttempts,
        processing_time_ms: processingMs,
      });
    }
  }
}

function buildFallbackEnvelope(row: OutboxRow): EventEnvelope {
  // Defensivo: se envelope esta NULL no banco, monta um minimal a partir
  // dos campos disponiveis. Acontece em dados antigos pre-Sprint 9 +
  // testes que inserem direto sem passar pela Edge Function.
  return {
    id: row.event_id,
    type: row.event_type,
    tenant_id: row.company_id,
    actor: { type: "system", service_name: "scp-publish", version: "1.0" },
    payload: row.payload ?? {},
    occurred_at: new Date().toISOString(),
  } as EventEnvelope;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((e: unknown) => {
  jlog("fatal", "scp-worker crashed", { error: String(e) });
  process.exit(1);
});
