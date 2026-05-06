#!/usr/bin/env node
/**
 * Super Sprint B / MX208 — Setup do stream SCP_EVENTS e 4 consumer groups.
 *
 * Idempotente: roda quantas vezes quiser; se stream/consumer já existir,
 * mantém. Útil em dev (após docker compose up nats) e CI.
 *
 * Uso:
 *   node tools/nats-setup.mjs                 # default nats://localhost:4222
 *   NATS_URL=nats://outro:4222 node tools/nats-setup.mjs
 *
 * Stream:   SCP_EVENTS
 * Subjects: scp.>
 * Retention: WorkQueuePolicy (cada consumer group tem fila própria)
 * Max age:  7 dias
 * Max bytes: 1GB
 * Storage:  file
 *
 * Consumer groups (durables):
 *   audit-consumer
 *   embedding-consumer
 *   notification-consumer
 *   enrichment-consumer
 *
 * Cada consumer: ack_explicit, max_deliver=5, ack_wait=30s.
 */

import { connect } from "nats";

const NATS_URL = process.env.NATS_URL ?? "nats://localhost:4222";
const STREAM = "SCP_EVENTS";
const SEVEN_DAYS_NS = 7 * 24 * 60 * 60 * 1_000_000_000n; // BigInt para nanos
const ONE_GB = 1_073_741_824;

const CONSUMER_GROUPS = [
  "audit-consumer",
  "embedding-consumer",
  "notification-consumer",
  "enrichment-consumer",
];

async function main() {
  console.log(`[nats-setup] connecting to ${NATS_URL}`);
  const nc = await connect({ servers: NATS_URL });
  const jsm = await nc.jetstreamManager();

  // 1. Stream
  let streamExists = false;
  try {
    await jsm.streams.info(STREAM);
    streamExists = true;
  } catch {
    streamExists = false;
  }

  if (!streamExists) {
    await jsm.streams.add({
      name: STREAM,
      subjects: ["scp.>"],
      retention: "workqueue",
      storage: "file",
      max_age: Number(SEVEN_DAYS_NS),
      max_bytes: ONE_GB,
      duplicate_window: 60_000_000_000, // 60s
    });
    console.log(`[nats-setup] stream ${STREAM} created`);
  } else {
    console.log(`[nats-setup] stream ${STREAM} already exists`);
  }

  // 2. Consumer groups (durables)
  for (const name of CONSUMER_GROUPS) {
    try {
      await jsm.consumers.info(STREAM, name);
      console.log(`[nats-setup] consumer ${name} already exists`);
      continue;
    } catch {
      // não existe — cria
    }
    await jsm.consumers.add(STREAM, {
      durable_name: name,
      ack_policy: "explicit",
      ack_wait: 30_000_000_000, // 30s em ns
      max_deliver: 5,
      filter_subject: "scp.>",
    });
    console.log(`[nats-setup] consumer ${name} created`);
  }

  await nc.drain();
  await nc.close();
  console.log("[nats-setup] done");
}

main().catch((err) => {
  console.error("[nats-setup] failed:", err);
  process.exit(1);
});
