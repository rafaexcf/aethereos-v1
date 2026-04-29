// Database
export { LocalDatabaseDriver } from "./database/sqlite-wasm-driver.js";
export type {
  RawSqliteDB,
  LocalSqliteDB,
} from "./database/sqlite-wasm-driver.js";
export {
  loadDbFromStorage,
  saveDbToStorage,
  storageBackend,
} from "./database/opfs-vfs.js";

// Storage
export { OPFSStorageDriver } from "./storage/opfs-storage-driver.js";

// Auth
export {
  LocalAuthDriver,
  generateLocalIdentity,
  exportEncryptedPrivateKey,
  importEncryptedPrivateKey,
} from "./auth/local-auth-driver.js";
export type {
  LocalIdentity,
  LocalAuthDriverOptions,
} from "./auth/local-auth-driver.js";

// Secrets
export {
  WebCryptoSecretsDriver,
  deriveKeyFromPassphrase,
} from "./secrets/webcrypto-secrets-driver.js";

// Cache
export { MemoryCacheDriver } from "./cache/memory-cache-driver.js";

// Feature flags
export { StaticFlagsDriver } from "./feature-flags/static-flags-driver.js";
export type { StaticFlagMap } from "./feature-flags/static-flags-driver.js";

// Event bus
export { BroadcastChannelEventBusDriver } from "./event-bus/broadcast-channel-driver.js";
