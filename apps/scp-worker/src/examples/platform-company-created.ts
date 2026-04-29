/**
 * E2E example: platform.company.created
 *
 * Full pipeline validation:
 *   1. Register schema in scp-registry
 *   2. SupabaseDatabaseDriver.withTenant() → sets RLS context
 *   3. KernelPublisher.publish() → validates payload schema, builds envelope,
 *      writes to scp_outbox atomically within same DB transaction
 *   4. scp-worker polls outbox → NatsEventBusDriver.publish() → NATS AE_SCP stream
 *   5. Consumer receives event from NATS → can write to kernel.audit_log
 *
 * Run with Docker + Supabase running:
 *   pnpm dev:infra && pnpm db:start && pnpm db:reset
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres \
 *   NATS_URL=nats://localhost:4222 \
 *   node --loader ts-node/esm src/examples/platform-company-created.ts
 */

import { SupabaseDatabaseDriver } from "@aethereos/drivers-supabase";
import { NatsEventBusDriver } from "@aethereos/drivers-nats";
import { KernelPublisher } from "@aethereos/kernel";
import type { TenantContext } from "@aethereos/drivers";

const DEV_COMPANY_ID = "00000000-0000-0000-0000-000000000001";
const DEV_USER_ID = "00000000-0000-0000-0000-000000000002";

async function runE2E(): Promise<void> {
  const dbUrl = process.env["DATABASE_URL"];
  const natsUrl = process.env["NATS_URL"] ?? "nats://localhost:4222";

  if (dbUrl === undefined || dbUrl === "") {
    process.stderr.write(
      "DATABASE_URL required. Run: pnpm db:start && pnpm dev:infra first.\n",
    );
    process.exit(1);
  }

  // Step 1: platform.* schemas are pre-registered by scp-registry (BUILT_IN_SCHEMAS).
  // Apps must NOT call register() for reserved kernel domains.

  // Step 2: Init drivers
  const db = new SupabaseDatabaseDriver({ connectionString: dbUrl });
  const bus = new NatsEventBusDriver({ servers: natsUrl });

  const connectResult = await bus.connect();
  if (!connectResult.ok) {
    throw new Error(`NATS connect failed: ${connectResult.error.message}`);
  }

  // Step 3: Build tenant context
  const ctx: TenantContext = {
    company_id: DEV_COMPANY_ID,
    actor: {
      type: "human",
      user_id: DEV_USER_ID,
    },
    correlation_id: crypto.randomUUID(),
  };

  // Step 4: Create KernelPublisher
  const publisher = new KernelPublisher(db, bus);

  // Step 5: Subscribe BEFORE publishing to capture the event
  const subResult = await bus.subscribe(
    "platform.company.created",
    async (envelope) => {
      process.stdout.write(
        JSON.stringify({
          level: "info",
          msg: "E2E: received platform.company.created from NATS",
          event_id: envelope.id,
          tenant_id: envelope.tenant_id,
          payload: envelope.payload,
        }) + "\n",
      );
    },
    { durable: false },
  );

  if (!subResult.ok) {
    throw new Error(`subscribe failed: ${subResult.error.message}`);
  }

  // Step 6: Publish platform.company.created event
  // KernelPublisher: validates payload → builds envelope → inserts to scp_outbox (atomic)
  const publishResult = await publisher.publish(
    ctx,
    "platform.company.created",
    {
      company_id: DEV_COMPANY_ID,
      plan: "starter",
      name: "Empresa Demo LTDA",
      country: "BR",
      distribution: "aethereos",
    },
  );

  if (!publishResult.ok) {
    throw new Error(`publish failed: ${publishResult.error.message}`);
  }

  process.stdout.write(
    JSON.stringify({
      level: "info",
      msg: "platform.company.created written to scp_outbox",
      event_id: publishResult.value.event_id,
      correlation_id: publishResult.value.correlation_id,
    }) + "\n",
  );

  // Step 7: scp-worker (running separately) reads outbox → publishes to NATS
  process.stdout.write(
    JSON.stringify({
      level: "info",
      msg: "Waiting 5s for scp-worker to process outbox (ensure scp-worker is running)...",
    }) + "\n",
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 5000));

  await subResult.value.unsubscribe();
  await bus.close();
  await db[Symbol.asyncDispose]();

  process.stdout.write(
    JSON.stringify({
      level: "info",
      msg: "E2E completed. Check kernel.audit_log for the event record.",
    }) + "\n",
  );
}

runE2E().catch((e: unknown) => {
  process.stderr.write(
    JSON.stringify({ level: "fatal", msg: String(e) }) + "\n",
  );
  process.exit(1);
});
