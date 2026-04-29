import type { FeatureFlagDriver, FlagContext } from "@aethereos/drivers";
import type { Result } from "@aethereos/drivers";
import { ok } from "@aethereos/drivers";
import type { NetworkError } from "@aethereos/drivers";

type FeatureFlagDriverError = NetworkError;

export type StaticFlagMap = Record<string, boolean | string>;

/**
 * StaticFlagsDriver — reads feature flags from a static JSON object embedded in the bundle.
 * Camada 0 has no Unleash connection; flags are baked at build time.
 */
export class StaticFlagsDriver implements FeatureFlagDriver {
  constructor(private readonly flags: StaticFlagMap) {}

  async isEnabled(
    flagName: string,
    _context: FlagContext,
  ): Promise<Result<boolean, FeatureFlagDriverError>> {
    const value = this.flags[flagName];
    if (value === undefined) return ok(false);
    if (typeof value === "boolean") return ok(value);
    return ok(value === "true" || value === "enabled");
  }

  async getVariant(
    flagName: string,
    _context: FlagContext,
  ): Promise<Result<string, FeatureFlagDriverError>> {
    const value = this.flags[flagName];
    if (value === undefined || value === false) return ok("disabled");
    if (value === true) return ok("enabled");
    return ok(value);
  }

  async ping(): Promise<Result<void, FeatureFlagDriverError>> {
    return ok(undefined);
  }
}
