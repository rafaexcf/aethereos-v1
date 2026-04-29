import postgres from "postgres";
import { NatsEventBusDriver } from "@aethereos/drivers-nats";
import type { EventEnvelope } from "@aethereos/drivers";

const POLL_INTERVAL_MS = 500;
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

interface OutboxRow {
  id: number;
  company_id: string;
  event_type: string;
  event_id: string;
  envelope: EventEnvelope;
  attempts: number;
}

async function main(): Promise<void> {
  const dbUrl = process.env["DATABASE_URL"];
  const natsUrl = process.env["NATS_URL"] ?? "nats://localhost:4222";

  if (dbUrl === undefined || dbUrl === "") {
    throw new Error("DATABASE_URL env var is required");
  }

  const sql = postgres(dbUrl, { max: 3, prepare: false });
  const bus = new NatsEventBusDriver({ servers: natsUrl });

  const connectResult = await bus.connect();
  if (!connectResult.ok) {
    throw new Error(`NATS connection failed: ${connectResult.error.message}`);
  }

  // Structured startup log (pino-like shape for OTel compatibility)
  process.stdout.write(
    JSON.stringify({
      level: "info",
      msg: "scp-worker started",
      nats: natsUrl,
      poll_interval_ms: POLL_INTERVAL_MS,
    }) + "\n",
  );

  const processOutbox = async (): Promise<void> => {
    const rows = await sql<OutboxRow[]>`
      select id, company_id, event_type, event_id, envelope, attempts
      from kernel.scp_outbox
      where status = 'pending'
        and attempts < ${MAX_ATTEMPTS}
      order by created_at asc
      limit ${BATCH_SIZE}
      for update skip locked
    `;

    for (const row of rows) {
      const publishResult = await bus.publish(row.envelope);
      if (publishResult.ok) {
        await sql`
          update kernel.scp_outbox
          set status = 'published',
              published_at = now(),
              attempts = attempts + 1
          where id = ${row.id}
        `;
      } else {
        await sql`
          update kernel.scp_outbox
          set attempts = attempts + 1,
              last_error = ${publishResult.error.message},
              status = case when attempts + 1 >= ${MAX_ATTEMPTS} then 'failed' else 'pending' end
          where id = ${row.id}
        `;
        process.stdout.write(
          JSON.stringify({
            level: "warn",
            msg: "outbox publish failed",
            event_id: row.event_id,
            event_type: row.event_type,
            error: publishResult.error.message,
            attempt: row.attempts + 1,
          }) + "\n",
        );
      }
    }
  };

  const shutdown = async (): Promise<void> => {
    process.stdout.write(
      JSON.stringify({ level: "info", msg: "scp-worker shutting down" }) + "\n",
    );
    await bus.close();
    await sql.end();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());

  while (true) {
    try {
      await processOutbox();
    } catch (e) {
      process.stdout.write(
        JSON.stringify({
          level: "error",
          msg: "outbox poll error",
          error: String(e),
        }) + "\n",
      );
    }
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((e: unknown) => {
  process.stderr.write(
    JSON.stringify({ level: "fatal", msg: String(e) }) + "\n",
  );
  process.exit(1);
});
