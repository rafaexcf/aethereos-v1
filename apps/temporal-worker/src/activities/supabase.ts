import postgres from "postgres";
import type { Sql } from "postgres";

let cached: Sql | null = null;

function getSql(): Sql {
  if (cached) return cached;
  const url = process.env["DATABASE_URL"] ?? process.env["SUPABASE_DB_URL"];
  if (!url)
    throw new Error(
      "DATABASE_URL or SUPABASE_DB_URL must be set for temporal-worker activities",
    );
  cached = postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return cached;
}

export interface QueryParams {
  table: string;
  filter: Record<string, unknown>;
  limit?: number;
}

function splitTable(table: string): { schema: string; name: string } {
  const [a, b] = table.split(".");
  if (b !== undefined) return { schema: a as string, name: b };
  return { schema: "public", name: a as string };
}

function isPlainSqlIdentifier(s: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s);
}

function assertIdentifier(value: string, kind: string): void {
  if (!isPlainSqlIdentifier(value)) {
    throw new Error(`Invalid SQL identifier for ${kind}: ${value}`);
  }
}

export async function querySupabase(
  params: QueryParams,
): Promise<Array<Record<string, unknown>>> {
  const sql = getSql();
  const { schema, name } = splitTable(params.table);
  assertIdentifier(schema, "schema");
  assertIdentifier(name, "table");

  const keys = Object.keys(params.filter);
  for (const k of keys) assertIdentifier(k, "column");

  const limit = params.limit ?? 100;

  if (keys.length === 0) {
    return await sql<Array<Record<string, unknown>>>`
      SELECT * FROM ${sql(schema)}.${sql(name)} LIMIT ${limit}
    `;
  }

  const conditions = keys.map(
    (k) => sql`${sql(k)} = ${params.filter[k] as never}`,
  );
  const where = conditions.reduce((acc, c, i) =>
    i === 0 ? c : sql`${acc} AND ${c}`,
  );

  return await sql<Array<Record<string, unknown>>>`
    SELECT * FROM ${sql(schema)}.${sql(name)} WHERE ${where} LIMIT ${limit}
  `;
}

export interface UpdateParams {
  table: string;
  id: string;
  data: Record<string, unknown>;
  idColumn?: string;
}

export async function updateSupabase(params: UpdateParams): Promise<void> {
  const sql = getSql();
  const { schema, name } = splitTable(params.table);
  assertIdentifier(schema, "schema");
  assertIdentifier(name, "table");
  const idColumn = params.idColumn ?? "id";
  assertIdentifier(idColumn, "id column");
  for (const k of Object.keys(params.data)) assertIdentifier(k, "column");

  await sql`
    UPDATE ${sql(schema)}.${sql(name)}
    SET ${sql(params.data)}
    WHERE ${sql(idColumn)} = ${params.id}
  `;
}

export interface InsertParams {
  table: string;
  data: Record<string, unknown>;
  returning?: string[];
}

export async function insertSupabase(
  params: InsertParams,
): Promise<Array<Record<string, unknown>>> {
  const sql = getSql();
  const { schema, name } = splitTable(params.table);
  assertIdentifier(schema, "schema");
  assertIdentifier(name, "table");
  for (const k of Object.keys(params.data)) assertIdentifier(k, "column");

  if (params.returning && params.returning.length > 0) {
    for (const c of params.returning) assertIdentifier(c, "returning column");
    return await sql<Array<Record<string, unknown>>>`
      INSERT INTO ${sql(schema)}.${sql(name)} ${sql(params.data)}
      RETURNING ${sql(params.returning)}
    `;
  }
  await sql`
    INSERT INTO ${sql(schema)}.${sql(name)} ${sql(params.data)}
  `;
  return [];
}
