import postgres from "postgres";
import type { EventEnvelope, Subscription } from "@aethereos/drivers";
import { NatsEventBusDriver } from "@aethereos/drivers-nats";
import { jlog, type InlineConsumer } from "./consumer.js";
import { AuditConsumer } from "./consumers/audit-consumer.js";
import { NotificationConsumer } from "./consumers/notification-consumer.js";
import { EmbeddingConsumer } from "./consumers/embedding-consumer.js";
import { EnrichmentConsumer } from "./consumers/enrichment-consumer.js";
import { startNatsConsumers } from "./nats-consumers.js";

const POLL_INTERVAL_MS = Number(process.env["SCP_POLL_INTERVAL_MS"] ?? "2000");
const BATCH_SIZE = Number(process.env["SCP_BATCH_SIZE"] ?? "50");
const MAX_ATTEMPTS = Number(process.env["SCP_MAX_ATTEMPTS"] ?? "3");
const METRICS_FLUSH_EVERY = Number(
  process.env["SCP_METRICS_FLUSH_EVERY"] ?? "100",
);

// Super Sprint B / MX210 — NATS opcional. Se NATS_URL não definido, modo
// inline (behavior legado). Se definido e conectado, publica eventos no
// NATS para consumers distribuídos. R7: sistema funciona sem NATS.
const NATS_URL = process.env["NATS_URL"] ?? "";
const NATS_RECONNECT_INTERVAL_MS = 5000;

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

interface WorkerContext {
  sql: postgres.Sql;
  consumers: InlineConsumer[];
  nats: NatsEventBusDriver | null;
  natsConnected: boolean;
  natsSubscriptions: Subscription[];
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

  // Super Sprint B / MX210 — Connect NATS se NATS_URL definido.
  const ctx: WorkerContext = {
    sql,
    consumers,
    nats: null,
    natsConnected: false,
    natsSubscriptions: [],
  };
  if (NATS_URL !== "") {
    await tryConnectNats(ctx);
    if (ctx.natsConnected && ctx.nats !== null) {
      // Super Sprint B / MX211 — Subscribe os 4 consumer groups.
      ctx.natsSubscriptions = await startNatsConsumers(
        ctx.nats,
        sql,
        consumers,
      );
    }
  }

  jlog("info", "scp-worker started", {
    mode: ctx.natsConnected ? "nats" : "inline",
    nats_url: NATS_URL !== "" ? NATS_URL : "(unset)",
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
    for (const sub of ctx.natsSubscriptions) {
      try {
        await sub.unsubscribe();
      } catch {
        // ignore
      }
    }
    if (ctx.nats !== null) {
      try {
        await ctx.nats.close();
      } catch {
        // ignore
      }
    }
    try {
      await sql.end({ timeout: 5 });
    } catch (e) {
      jlog("warn", "sql.end error", { error: String(e) });
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // Reconnect loop em background (R12).
  if (NATS_URL !== "") {
    void natsReconnectLoop(ctx, () => shuttingDown);
  }

  while (!shuttingDown) {
    try {
      await processBatch(ctx);
    } catch (e) {
      jlog("error", "outbox poll error", { error: String(e) });
    }
    if (shuttingDown) break;
    await sleep(POLL_INTERVAL_MS);
  }
}

async function tryConnectNats(ctx: WorkerContext): Promise<void> {
  const driver = new NatsEventBusDriver({ servers: NATS_URL });
  const result = await driver.connect();
  if (result.ok) {
    ctx.nats = driver;
    ctx.natsConnected = true;
    jlog("info", "nats connected — distributed mode", { url: NATS_URL });
  } else {
    ctx.nats = null;
    ctx.natsConnected = false;
    jlog("warn", "nats unavailable — inline fallback mode", {
      url: NATS_URL,
      error: String(result.error.message),
    });
  }
}

async function natsReconnectLoop(
  ctx: WorkerContext,
  isShuttingDown: () => boolean,
): Promise<void> {
  while (!isShuttingDown()) {
    await sleep(NATS_RECONNECT_INTERVAL_MS);
    if (ctx.natsConnected) continue;
    // Tentativa de reconexão.
    await tryConnectNats(ctx);
    if (ctx.natsConnected && ctx.nats !== null) {
      jlog("info", "nats reconnected — switching back to distributed mode");
      // Re-subscribe consumer groups após reconexão.
      ctx.natsSubscriptions = await startNatsConsumers(
        ctx.nats,
        ctx.sql,
        ctx.consumers,
      );
    }
  }
}

async function processBatch(ctx: WorkerContext): Promise<void> {
  // FOR UPDATE SKIP LOCKED — multiplas instancias do worker podem rodar
  // concorrentemente sem reprocessar mesma row (R11).
  const rows = await ctx.sql<OutboxRow[]>`
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
    await processEvent(ctx, row);
  }
}

async function processEvent(ctx: WorkerContext, row: OutboxRow): Promise<void> {
  const { sql, consumers } = ctx;
  const envelope = row.envelope ?? buildFallbackEnvelope(row);
  const errors: string[] = [];
  const startedAt = performance.now();
  let mode: "nats" | "inline" = "inline";
  let consumersUsed: string[] = [];

  // Super Sprint B / MX210 — Se NATS conectado, publica para o stream
  // (consumers distribuídos do MX211 vão processar). Senão, fluxo inline
  // legado (Sprint 18).
  if (ctx.natsConnected && ctx.nats !== null) {
    const pubResult = await ctx.nats.publish(envelope);
    if (pubResult.ok) {
      mode = "nats";
      consumersUsed = ["nats:dispatched"];
    } else {
      const errMsg = String(pubResult.error.message);
      errors.push(`nats.publish: ${errMsg}`);
      jlog("warn", "nats publish failed — falling back to inline", {
        event_id: row.event_id,
        error: errMsg,
      });
      // Marca como desconectado; reconnectLoop tentará restaurar.
      ctx.natsConnected = false;
      // E processa inline neste evento para não perder.
    }
  }

  if (mode === "inline") {
    // R12: consumer NUNCA bloqueia o pipeline — cada handle wrappado.
    const matched = consumers.filter((c) => c.matches(row.event_type));
    consumersUsed = matched.map((c) => c.name);
    for (const consumer of matched) {
      try {
        await consumer.handle(envelope, sql);
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
  }

  const processingMs = Math.round(performance.now() - startedAt);
  recordLatency(processingMs);

  // Filtra erros transientes do NATS — se inline já recuperou, não conta.
  const blockingErrors = mode === "nats" ? errors : errors;
  if (blockingErrors.length === 0) {
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
      mode,
      consumers: consumersUsed,
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
