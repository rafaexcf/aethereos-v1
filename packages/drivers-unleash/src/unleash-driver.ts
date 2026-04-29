import type {
  FeatureFlagDriver,
  FlagContext,
  Result,
} from "@aethereos/drivers";
import { ok, err, NetworkError } from "@aethereos/drivers";

export interface UnleashConfig {
  url: string;
  clientToken: string;
  appName?: string;
  refreshIntervalMs?: number;
}

interface UnleashVariant {
  name: string;
  enabled: boolean;
  payload?: { type: string; value: string };
}

interface UnleashFeature {
  name: string;
  enabled: boolean;
  strategies: Array<{
    name: string;
    parameters: Record<string, string>;
    constraints?: Array<{
      contextName: string;
      operator: string;
      values: string[];
    }>;
  }>;
  variants: UnleashVariant[];
}

interface UnleashFeaturesResponse {
  features: UnleashFeature[];
}

type FeatureFlagDriverError = NetworkError;

export class UnleashFeatureFlagDriver implements FeatureFlagDriver {
  readonly #config: UnleashConfig;
  readonly #appName: string;
  readonly #refreshIntervalMs: number;

  #cache: Map<string, UnleashFeature> = new Map();
  #lastFetch: number = 0;
  #refreshTimer: ReturnType<typeof setInterval> | null = null;
  #degraded = false;

  constructor(config: UnleashConfig) {
    this.#config = config;
    this.#appName = config.appName ?? "aethereos";
    this.#refreshIntervalMs = config.refreshIntervalMs ?? 60_000;
  }

  async isEnabled(
    flagName: string,
    context: FlagContext,
  ): Promise<Result<boolean, FeatureFlagDriverError>> {
    const refreshResult = await this.#ensureFresh();
    if (!refreshResult.ok && this.#cache.size === 0) {
      // Degraded mode: feature offline, return conservative default (false)
      return ok(false);
    }

    const feature = this.#cache.get(flagName);
    if (!feature || !feature.enabled) return ok(false);

    return ok(this.#evaluateStrategies(feature, context));
  }

  async getVariant(
    flagName: string,
    context: FlagContext,
  ): Promise<Result<string, FeatureFlagDriverError>> {
    const enabledResult = await this.isEnabled(flagName, context);
    if (!enabledResult.ok) return ok("disabled");
    if (!enabledResult.value) return ok("disabled");

    const feature = this.#cache.get(flagName);
    if (!feature || feature.variants.length === 0) return ok("enabled");

    const activeVariant = feature.variants.find((v) => v.enabled);
    return ok(activeVariant?.name ?? "disabled");
  }

  async ping(): Promise<Result<void, FeatureFlagDriverError>> {
    try {
      const response = await fetch(`${this.#config.url}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        return err(
          new NetworkError(`Unleash health check failed: ${response.status}`),
        );
      }
      return ok(undefined);
    } catch (e) {
      return err(new NetworkError(e instanceof Error ? e.message : String(e)));
    }
  }

  startPolling(): void {
    if (this.#refreshTimer !== null) return;
    this.#refreshTimer = setInterval(() => {
      void this.#fetchFeatures();
    }, this.#refreshIntervalMs);
  }

  stopPolling(): void {
    if (this.#refreshTimer !== null) {
      clearInterval(this.#refreshTimer);
      this.#refreshTimer = null;
    }
  }

  async #ensureFresh(): Promise<Result<void, FeatureFlagDriverError>> {
    const now = Date.now();
    if (
      now - this.#lastFetch < this.#refreshIntervalMs &&
      this.#cache.size > 0
    ) {
      return ok(undefined);
    }
    return this.#fetchFeatures();
  }

  async #fetchFeatures(): Promise<Result<void, FeatureFlagDriverError>> {
    try {
      const response = await fetch(`${this.#config.url}/api/client/features`, {
        headers: {
          Authorization: this.#config.clientToken,
          "UNLEASH-APPNAME": this.#appName,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        this.#degraded = true;
        return err(
          new NetworkError(`Unleash fetch failed: ${response.status}`),
        );
      }

      const data = (await response.json()) as UnleashFeaturesResponse;
      this.#cache = new Map(data.features.map((f) => [f.name, f]));
      this.#lastFetch = Date.now();
      this.#degraded = false;
      return ok(undefined);
    } catch (e) {
      this.#degraded = true;
      return err(new NetworkError(e instanceof Error ? e.message : String(e)));
    }
  }

  #evaluateStrategies(feature: UnleashFeature, context: FlagContext): boolean {
    if (feature.strategies.length === 0) return feature.enabled;

    for (const strategy of feature.strategies) {
      if (this.#matchesStrategy(strategy, context)) return true;
    }
    return false;
  }

  #matchesStrategy(
    strategy: UnleashFeature["strategies"][number],
    context: FlagContext,
  ): boolean {
    if (strategy.name === "default") return true;

    if (strategy.name === "userWithId") {
      const actor = context.tenantContext.actor;
      const userId =
        actor.type === "human"
          ? actor.user_id
          : actor.type === "agent"
            ? actor.supervising_user_id
            : undefined;
      if (userId === undefined) return false;
      const ids = (strategy.parameters["userIds"] ?? "")
        .split(",")
        .map((s) => s.trim());
      return ids.includes(userId);
    }

    if (strategy.name === "remoteAddress") {
      const remoteAddr = context.properties?.["remoteAddress"] as
        | string
        | undefined;
      if (!remoteAddr) return false;
      const addresses = (strategy.parameters["IPs"] ?? "")
        .split(",")
        .map((s) => s.trim());
      return addresses.includes(remoteAddr);
    }

    if (strategy.name === "flexibleRollout") {
      const rollout = Number(strategy.parameters["rollout"] ?? "0");
      const actor = context.tenantContext.actor;
      const userId =
        actor.type === "human"
          ? actor.user_id
          : actor.type === "agent"
            ? actor.supervising_user_id
            : context.tenantContext.company_id;
      const hash = this.#hashString(userId) % 100;
      return hash < rollout;
    }

    return true;
  }

  #hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash);
  }

  get isDegraded(): boolean {
    return this.#degraded;
  }
}
