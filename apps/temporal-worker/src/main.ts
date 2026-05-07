import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities/index.js";

const TEMPORAL_ADDRESS = process.env["TEMPORAL_ADDRESS"] ?? "localhost:7233";
const TEMPORAL_NAMESPACE = process.env["TEMPORAL_NAMESPACE"] ?? "default";
const TASK_QUEUE = process.env["TEMPORAL_TASK_QUEUE"] ?? "aethereos-main";

function jlog(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    component: "temporal-worker",
    event,
    ...fields,
  });
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

async function run(): Promise<void> {
  jlog("info", "boot", {
    address: TEMPORAL_ADDRESS,
    namespace: TEMPORAL_NAMESPACE,
    taskQueue: TASK_QUEUE,
  });

  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
  });

  const worker = await Worker.create({
    connection,
    namespace: TEMPORAL_NAMESPACE,
    taskQueue: TASK_QUEUE,
    workflowsPath: new URL("./workflows/index.js", import.meta.url).pathname,
    activities,
  });

  jlog("info", "started", { taskQueue: TASK_QUEUE });

  const shutdown = async (signal: string): Promise<void> => {
    jlog("info", "shutdown_signal", { signal });
    worker.shutdown();
    await connection.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await worker.run();
}

run().catch((err: unknown) => {
  jlog("error", "fatal", {
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
