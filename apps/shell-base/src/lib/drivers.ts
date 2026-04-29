import {
  OPFSStorageDriver,
  MemoryCacheDriver,
  StaticFlagsDriver,
  BroadcastChannelEventBusDriver,
} from "@aethereos/drivers-local";
import type { StaticFlagMap } from "@aethereos/drivers-local";

export function createStorage() {
  return new OPFSStorageDriver();
}

export function createCache() {
  return new MemoryCacheDriver();
}

export function createFlags(overrides: StaticFlagMap = {}) {
  return new StaticFlagsDriver(overrides);
}

export function createEventBus() {
  return new BroadcastChannelEventBusDriver();
}

export type AppDrivers = ReturnType<typeof buildDrivers>;

export function buildDrivers(flagOverrides?: StaticFlagMap) {
  return {
    storage: createStorage(),
    cache: createCache(),
    flags: createFlags(flagOverrides),
    eventBus: createEventBus(),
  };
}
