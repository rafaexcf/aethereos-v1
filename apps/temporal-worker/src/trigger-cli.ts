import { getTemporalClient, closeTemporalClient } from "./client.js";

const TASK_QUEUE = process.env["TEMPORAL_TASK_QUEUE"] ?? "aethereos-main";

interface TriggerArgs {
  workflow: string;
  workflowId: string;
  input: Record<string, unknown>;
}

function parseArgs(argv: string[]): TriggerArgs {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const workflow = positional[0];
  const workflowId = positional[1];
  if (workflow === undefined || workflowId === undefined) {
    process.stderr.write(
      "Usage: pnpm --filter @aethereos/temporal-worker trigger <workflow> <workflowId> --input='{\"...\"}'\n",
    );
    process.exit(2);
  }
  const inputArg = argv.find((a) => a.startsWith("--input="));
  let input: Record<string, unknown> = {};
  if (inputArg !== undefined) {
    const json = inputArg.slice("--input=".length);
    input = JSON.parse(json) as Record<string, unknown>;
  }
  return { workflow, workflowId, input };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const client = await getTemporalClient();

  const handle = await client.workflow.start(args.workflow, {
    args: [args.input],
    taskQueue: TASK_QUEUE,
    workflowId: args.workflowId,
  });

  process.stdout.write(
    JSON.stringify({
      status: "started",
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    }) + "\n",
  );

  await closeTemporalClient();
}

main().catch((err: unknown) => {
  process.stderr.write(
    JSON.stringify({
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    }) + "\n",
  );
  process.exit(1);
});
