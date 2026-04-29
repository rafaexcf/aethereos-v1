import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import {
  LocalDatabaseDriver,
  loadDbFromStorage,
  saveDbToStorage,
  storageBackend,
} from "@aethereos/drivers-local";
import type { AppDrivers } from "./drivers";

const DB_FILENAME = "aethereos.sqlite";

export interface BootResult {
  db: LocalDatabaseDriver;
  drivers: AppDrivers;
  isFirstRun: boolean;
  backend: "opfs" | "indexeddb";
}

async function applySchema(
  rawDb: {
    run(sql: string, params?: (string | number | null | Uint8Array)[]): unknown;
  },
  companyId: string,
  userId: string,
): Promise<void> {
  rawDb.run(`
    CREATE TABLE IF NOT EXISTS ae_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      ts    INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  rawDb.run(
    `INSERT OR IGNORE INTO ae_meta (key, value)
     VALUES ('schema_version', '1'), ('company_id', ?), ('user_id', ?)`,
    [companyId, userId],
  );
}

export async function boot(drivers: AppDrivers): Promise<BootResult> {
  await Promise.all([
    drivers.eventBus.ping(),
    drivers.storage.ping(),
    drivers.cache.ping(),
    drivers.flags.ping(),
  ]);

  // Load sql.js dynamically — separate lazy chunk, keeps initial bundle < 500 KB
  const { default: initSqlJs } = await import("sql.js");
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });

  const existingData = await loadDbFromStorage(DB_FILENAME);
  const isFirstRun = existingData === null;

  const rawDb = existingData
    ? new SQL.Database(existingData)
    : new SQL.Database();

  const companyId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  if (isFirstRun) {
    await applySchema(rawDb, companyId, userId);
    await saveDbToStorage(DB_FILENAME, rawDb.export());
  }

  // Read tenant ids from meta table
  const metaRows = rawDb.exec(
    `SELECT key, value FROM ae_meta WHERE key IN ('company_id', 'user_id')`,
  );
  const meta: Record<string, string> = {};
  if (metaRows.length > 0 && metaRows[0]) {
    for (const row of metaRows[0].values) {
      const k = row[0];
      const v = row[1];
      if (typeof k === "string" && typeof v === "string") {
        meta[k] = v;
      }
    }
  }

  const storedCompanyId = meta["company_id"] ?? companyId;
  const storedUserId = meta["user_id"] ?? userId;

  const db = new LocalDatabaseDriver(rawDb);
  const tenantResult = await db.withTenant({
    company_id: storedCompanyId,
    actor: { type: "human", user_id: storedUserId },
  });
  if (!tenantResult.ok) {
    throw new Error(
      `Failed to set tenant context: ${tenantResult.error.message}`,
    );
  }

  // Persist on interval and page unload
  const autoSave = () => {
    void saveDbToStorage(DB_FILENAME, rawDb.export());
  };
  const interval = setInterval(autoSave, 30_000);
  window.addEventListener("beforeunload", () => {
    clearInterval(interval);
    autoSave();
  });

  return {
    db,
    drivers,
    isFirstRun,
    backend: storageBackend(),
  };
}
