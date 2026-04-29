import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UnleashFeatureFlagDriver } from "../src/unleash-driver.js";
import type { FlagContext } from "@aethereos/drivers";

const BASE_CONFIG = {
  url: "http://localhost:4242",
  clientToken: "default:development.unleash-client-dev-token",
};

const CTX: FlagContext = {
  tenantContext: {
    company_id: "00000000-0000-0000-0000-000000000001",
    actor: { type: "human", user_id: "00000000-0000-0000-0000-000000000002" },
  },
};

function makeFeatureResponse(
  features: Array<{
    name: string;
    enabled: boolean;
    strategy?: string;
    variants?: Array<{ name: string; enabled: boolean }>;
  }>,
) {
  return {
    features: features.map((f) => ({
      name: f.name,
      enabled: f.enabled,
      strategies: [
        { name: f.strategy ?? "default", parameters: {}, constraints: [] },
      ],
      variants: f.variants ?? [],
    })),
  };
}

describe("UnleashFeatureFlagDriver", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("isEnabled()", () => {
    it("returns true for enabled feature with default strategy", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            makeFeatureResponse([
              { name: "feature.copilot.enabled", enabled: true },
            ]),
          ),
          { status: 200 },
        ),
      );

      const driver = new UnleashFeatureFlagDriver(BASE_CONFIG);
      const result = await driver.isEnabled("feature.copilot.enabled", CTX);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBe(true);
    });

    it("returns false for disabled feature", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            makeFeatureResponse([
              { name: "feature.copilot.enabled", enabled: false },
            ]),
          ),
          { status: 200 },
        ),
      );

      const driver = new UnleashFeatureFlagDriver(BASE_CONFIG);
      const result = await driver.isEnabled("feature.copilot.enabled", CTX);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBe(false);
    });

    it("returns false for unknown feature (not in cache)", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(makeFeatureResponse([])), { status: 200 }),
      );

      const driver = new UnleashFeatureFlagDriver(BASE_CONFIG);
      const result = await driver.isEnabled("unknown.flag", CTX);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBe(false);
    });

    it("returns conservative default (false) in degraded mode", async () => {
      fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const driver = new UnleashFeatureFlagDriver(BASE_CONFIG);
      const result = await driver.isEnabled("feature.copilot.enabled", CTX);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBe(false);
      expect(driver.isDegraded).toBe(true);
    });

    it("sends Authorization header with client token", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            makeFeatureResponse([
              { name: "feature.embed_mode", enabled: true },
            ]),
          ),
          { status: 200 },
        ),
      );

      const driver = new UnleashFeatureFlagDriver(BASE_CONFIG);
      await driver.isEnabled("feature.embed_mode", CTX);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/api/client/features");
      const headers = init.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe(
        "default:development.unleash-client-dev-token",
      );
    });

    it("uses cache on second call without re-fetching", async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify(
            makeFeatureResponse([
              { name: "feature.copilot.enabled", enabled: true },
            ]),
          ),
          { status: 200 },
        ),
      );

      const driver = new UnleashFeatureFlagDriver({
        ...BASE_CONFIG,
        refreshIntervalMs: 60_000,
      });
      await driver.isEnabled("feature.copilot.enabled", CTX);
      await driver.isEnabled("feature.copilot.enabled", CTX);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("getVariant()", () => {
    it("returns variant name when feature enabled with variants", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            makeFeatureResponse([
              {
                name: "feature.experimental.dashboards",
                enabled: true,
                variants: [
                  { name: "v2-layout", enabled: true },
                  { name: "v1-layout", enabled: false },
                ],
              },
            ]),
          ),
          { status: 200 },
        ),
      );

      const driver = new UnleashFeatureFlagDriver(BASE_CONFIG);
      const result = await driver.getVariant(
        "feature.experimental.dashboards",
        CTX,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBe("v2-layout");
    });

    it("returns 'enabled' when feature has no variants", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            makeFeatureResponse([
              { name: "feature.embed_mode", enabled: true },
            ]),
          ),
          { status: 200 },
        ),
      );

      const driver = new UnleashFeatureFlagDriver(BASE_CONFIG);
      const result = await driver.getVariant("feature.embed_mode", CTX);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBe("enabled");
    });

    it("returns 'disabled' when feature is off", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            makeFeatureResponse([
              { name: "feature.copilot.enabled", enabled: false },
            ]),
          ),
          { status: 200 },
        ),
      );

      const driver = new UnleashFeatureFlagDriver(BASE_CONFIG);
      const result = await driver.getVariant("feature.copilot.enabled", CTX);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBe("disabled");
    });
  });

  describe("ping()", () => {
    it("returns ok when Unleash health endpoint returns 200", async () => {
      fetchMock.mockResolvedValueOnce(new Response("OK", { status: 200 }));

      const driver = new UnleashFeatureFlagDriver(BASE_CONFIG);
      const result = await driver.ping();

      expect(result.ok).toBe(true);
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe("http://localhost:4242/health");
    });

    it("returns NetworkError when Unleash is down", async () => {
      fetchMock.mockRejectedValueOnce(new Error("connection refused"));

      const driver = new UnleashFeatureFlagDriver(BASE_CONFIG);
      const result = await driver.ping();

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.name).toBe("NetworkError");
    });
  });
});
