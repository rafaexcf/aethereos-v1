import { SupabaseDatabaseDriver } from "@aethereos/drivers-supabase";

let _db: SupabaseDatabaseDriver | null = null;

export function getDb(): SupabaseDatabaseDriver {
  if (_db) return _db;

  const url = process.env["SUPABASE_DB_URL"];
  if (!url) throw new Error("SUPABASE_DB_URL env var is required");

  _db = new SupabaseDatabaseDriver({ connectionString: url });
  return _db;
}
