import type { AppDrivers } from "./drivers";

export interface BootResult {
  drivers: AppDrivers;
  isFirstRun: boolean;
}

/**
 * Stub boot sequence for M12 scaffold.
 * Full implementation in M13 (SQLite WASM + OPFS persistence).
 */
export async function boot(drivers: AppDrivers): Promise<BootResult> {
  await drivers.eventBus.ping();
  await drivers.storage.ping();
  await drivers.cache.ping();
  await drivers.flags.ping();

  return { drivers, isFirstRun: true };
}
