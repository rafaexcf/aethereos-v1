import { describe, it, expect } from "vitest";
import { StaticFlagsDriver } from "../src/feature-flags/static-flags-driver.js";
import { isOk } from "@aethereos/drivers";
import type { TenantContext } from "@aethereos/drivers";

const ctx: TenantContext = {
  company_id: "00000000-0000-0000-0000-000000000001",
  actor: { type: "human", user_id: "00000000-0000-0000-0000-000000000002" },
};

const flagCtx = { tenantContext: ctx };

describe("StaticFlagsDriver", () => {
  it("ping returns ok", async () => {
    const d = new StaticFlagsDriver({});
    expect(isOk(await d.ping())).toBe(true);
  });

  it("undefined flag is false", async () => {
    const d = new StaticFlagsDriver({});
    const r = await d.isEnabled("missing-flag", flagCtx);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(false);
  });

  it("boolean true flag is enabled", async () => {
    const d = new StaticFlagsDriver({ my_feature: true });
    const r = await d.isEnabled("my_feature", flagCtx);
    if (isOk(r)) expect(r.value).toBe(true);
  });

  it("boolean false flag is disabled", async () => {
    const d = new StaticFlagsDriver({ my_feature: false });
    const r = await d.isEnabled("my_feature", flagCtx);
    if (isOk(r)) expect(r.value).toBe(false);
  });

  it("string 'true' is enabled", async () => {
    const d = new StaticFlagsDriver({ beta: "true" });
    const r = await d.isEnabled("beta", flagCtx);
    if (isOk(r)) expect(r.value).toBe(true);
  });

  it("getVariant returns disabled for undefined flag", async () => {
    const d = new StaticFlagsDriver({});
    const r = await d.getVariant("missing", flagCtx);
    if (isOk(r)) expect(r.value).toBe("disabled");
  });

  it("getVariant returns variant string", async () => {
    const d = new StaticFlagsDriver({ color_scheme: "dark" });
    const r = await d.getVariant("color_scheme", flagCtx);
    if (isOk(r)) expect(r.value).toBe("dark");
  });

  it("getVariant returns 'enabled' for boolean true", async () => {
    const d = new StaticFlagsDriver({ feature: true });
    const r = await d.getVariant("feature", flagCtx);
    if (isOk(r)) expect(r.value).toBe("enabled");
  });
});
