/**
 * OPFS VFS helpers — persistence layer for sql.js in the browser.
 *
 * sql.js works entirely in memory; these helpers serialize/deserialize the
 * database Uint8Array to/from OPFS so data survives page reloads.
 * Falls back to IndexedDB when OPFS is unavailable.
 *
 * Usage (in boot.ts):
 *   const sql = await loadSqlJs();
 *   const data = await loadDbFromOPFS("workspace.sqlite");
 *   const db = data ? new sql.Database(data) : new sql.Database();
 *   await saveDbToOPFS("workspace.sqlite", new LocalDatabaseDriver(db));
 *
 * sql.js is NOT imported here — caller loads it dynamically to keep initial
 * bundle below 500KB. This module is a pure OPFS/IndexedDB helper.
 */

const OPFS_AVAILABLE =
  typeof navigator !== "undefined" &&
  "storage" in navigator &&
  typeof (navigator.storage as { getDirectory?: unknown }).getDirectory ===
    "function";

const IDB_DB_NAME = "ae-sqlite-fallback";
const IDB_STORE = "databases";

// ── OPFS helpers ──────────────────────────────────────────────────────────────

async function opfsLoad(filename: string): Promise<Uint8Array | null> {
  const root = await navigator.storage.getDirectory();
  try {
    const fh = await root.getFileHandle(filename);
    const file = await fh.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

async function opfsSave(filename: string, data: Uint8Array): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const fh = await root.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable();
  // Convert to ArrayBuffer to satisfy FileSystemWriteChunkType constraint
  const buf = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  await writable.write(buf);
  await writable.close();
}

// ── IndexedDB fallback helpers ────────────────────────────────────────────────

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbLoad(filename: string): Promise<Uint8Array | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(filename);
    req.onsuccess = () => {
      const value: unknown = req.result;
      resolve(value instanceof Uint8Array ? value : null);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbSave(filename: string, data: Uint8Array): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(data, filename);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Loads a database from OPFS (primary) or IndexedDB (fallback).
 * Returns null if no persisted database exists yet (first run).
 */
export async function loadDbFromStorage(
  filename: string,
): Promise<Uint8Array | null> {
  if (OPFS_AVAILABLE) {
    return opfsLoad(filename);
  }
  return idbLoad(filename);
}

/**
 * Persists a database snapshot to OPFS (primary) or IndexedDB (fallback).
 * Call after every write transaction to ensure data is durable.
 */
export async function saveDbToStorage(
  filename: string,
  data: Uint8Array,
): Promise<void> {
  if (OPFS_AVAILABLE) {
    return opfsSave(filename, data);
  }
  return idbSave(filename, data);
}

/**
 * Reports which storage backend is active.
 */
export function storageBackend(): "opfs" | "indexeddb" {
  return OPFS_AVAILABLE ? "opfs" : "indexeddb";
}
