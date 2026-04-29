export { SupabaseDatabaseDriver } from "./database/index.js";
export type {
  SupabaseDatabaseConfig,
  DrizzleDb,
} from "./database/supabase-database-driver.js";

export { SupabaseAuthDriver } from "./auth/index.js";
export type { SupabaseAuthConfig } from "./auth/index.js";

export { SupabaseBrowserAuthDriver } from "./auth/index.js";
export type { SupabaseBrowserAuthConfig } from "./auth/index.js";

export { SupabaseStorageDriver } from "./storage/index.js";
export type { SupabaseStorageConfig } from "./storage/index.js";

export { SupabasePgvectorDriver } from "./vector/index.js";
export type { SupabasePgvectorConfig } from "./vector/index.js";

export * from "./schema/index.js";
