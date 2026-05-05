#!/usr/bin/env node
/**
 * Sprint 31 / MX170 — CLI para SCP Replay.
 *
 * Uso:
 *   pnpm --filter @aethereos/scp-worker replay --event-id <uuid>
 *   pnpm --filter @aethereos/scp-worker replay --from 2026-05-01 --to 2026-05-05
 */

import postgres from "postgres";
import { jlog, type InlineConsumer } from "./consumer.js";
import { AuditConsumer } from "./consumers/audit-consumer.js";
import { NotificationConsumer } from "./consumers/notification-consumer.js";
import { EmbeddingConsumer } from "./consumers/embedding-consumer.js";
import { EnrichmentConsumer } from "./consumers/enrichment-consumer.js";
import { replayEvent, replayRange, type ReplayResult } from "./replay.js";

interface CliArgs {
  eventId?: string;
  from?: string;
  to?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--event-id" && value !== undefined) {
      args.eventId = value;
      i++;
    } else if (flag === "--from" && value !== undefined) {
      args.from = value;
      i++;
    } else if (flag === "--to" && value !== undefined) {
      args.to = value;
      i++;
    }
  }
  return args;
}

function printUsageAndExit(code: number): never {
  process.stderr.write(
    [
      "Uso:",
      "  scp-worker replay --event-id <uuid>",
      "  scp-worker replay --from <YYYY-MM-DD> --to <YYYY-MM-DD>",
      "",
    ].join("\n"),
  );
  process.exit(code);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const validById = typeof args.eventId === "string" && args.eventId !== "";
  const validByRange =
    typeof args.from === "string" &&
    args.from !== "" &&
    typeof args.to === "string" &&
    args.to !== "";

  if (!validById && !validByRange) {
    printUsageAndExit(2);
  }

  const dbUrl =
    process.env["DATABASE_URL"] ??
    "postgres://postgres:postgres@127.0.0.1:54322/postgres";

  const sql = postgres(dbUrl, { max: 3, prepare: false });

  const supabaseUrl = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:54321";
  const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"] ?? "";

  const consumers: InlineConsumer[] = [
    new AuditConsumer(),
    new NotificationConsumer(),
    new EnrichmentConsumer(),
    new EmbeddingConsumer({ supabaseUrl, supabaseAnonKey }),
  ];

  let result: ReplayResult;
  try {
    if (validById) {
      result = await replayEvent(sql, consumers, args.eventId as string);
    } else {
      result = await replayRange(
        sql,
        consumers,
        args.from as string,
        args.to as string,
      );
    }
    jlog("info", "replay finished", {
      total: result.total,
      reprocessed: result.reprocessed,
      errors: result.errors,
    });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    await sql.end({ timeout: 5 });
    process.exit(result.errors === 0 ? 0 : 1);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    jlog("error", "replay failed", { error: msg });
    await sql.end({ timeout: 5 });
    process.exit(1);
  }
}

void main();
