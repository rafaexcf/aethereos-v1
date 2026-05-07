import { Client, Connection } from "@temporalio/client";

let cached: { client: Client; connection: Connection } | null = null;

export interface TemporalClientOptions {
  address?: string;
  namespace?: string;
}

export async function getTemporalClient(
  opts: TemporalClientOptions = {},
): Promise<Client> {
  if (cached) return cached.client;
  const address =
    opts.address ?? process.env["TEMPORAL_ADDRESS"] ?? "localhost:7233";
  const namespace =
    opts.namespace ?? process.env["TEMPORAL_NAMESPACE"] ?? "default";
  const connection = await Connection.connect({ address });
  const client = new Client({ connection, namespace });
  cached = { client, connection };
  return client;
}

export async function closeTemporalClient(): Promise<void> {
  if (!cached) return;
  await cached.connection.close();
  cached = null;
}
