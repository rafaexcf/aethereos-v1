import { describe, it, expect, beforeEach } from "vitest";
import {
  LocalAuthDriver,
  generateLocalIdentity,
} from "../src/auth/local-auth-driver.js";
import { isOk, isErr } from "@aethereos/drivers";

async function makeDriver(): Promise<LocalAuthDriver> {
  const identity = await generateLocalIdentity({
    userId: "user-test",
    companyId: "company-test",
  });
  return new LocalAuthDriver({ identity });
}

describe("LocalAuthDriver", () => {
  let driver: LocalAuthDriver;

  beforeEach(async () => {
    driver = await makeDriver();
  });

  it("ping returns ok", async () => {
    expect(isOk(await driver.ping())).toBe(true);
  });

  it("getSession returns null when no session issued", async () => {
    const r = await driver.getSession();
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBeNull();
  });

  it("issueSessionToken creates a valid session", async () => {
    const tokenResult = await driver.issueSessionToken();
    expect(isOk(tokenResult)).toBe(true);

    const sessionResult = await driver.getSession();
    expect(isOk(sessionResult)).toBe(true);
    if (isOk(sessionResult)) expect(sessionResult.value).not.toBeNull();
  });

  it("verifyToken validates a freshly issued token", async () => {
    const tokenResult = await driver.issueSessionToken();
    if (!isOk(tokenResult)) throw new Error("expected ok");
    const token = tokenResult.value;

    const r = await driver.verifyToken(token);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.company_id).toBe("company-test");
      expect(r.value.actor.type).toBe("human");
    }
  });

  it("verifyToken rejects a tampered token", async () => {
    const tokenResult = await driver.issueSessionToken();
    if (!isOk(tokenResult)) throw new Error("expected ok");
    const [h, _p, sig] = tokenResult.value.split(".");
    const tamperedToken = `${h}.${btoa(JSON.stringify({ sub: "attacker" }))}.${sig}`;

    const r = await driver.verifyToken(tamperedToken);
    expect(isErr(r)).toBe(true);
  });

  it("revoke invalidates the token", async () => {
    const tokenResult = await driver.issueSessionToken();
    if (!isOk(tokenResult)) throw new Error("expected ok");
    const token = tokenResult.value;

    await driver.revoke(token);
    const r = await driver.verifyToken(token);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.message).toContain("revoked");
  });

  it("revoke clears the session", async () => {
    const tokenResult = await driver.issueSessionToken();
    if (!isOk(tokenResult)) throw new Error("expected ok");
    await driver.revoke(tokenResult.value);

    const s = await driver.getSession();
    if (isOk(s)) expect(s.value).toBeNull();
  });

  it("issueCapabilityToken returns a token for agent", async () => {
    const r = await driver.issueCapabilityToken({
      agent_id: "agent-001",
      supervising_user_id: "user-test",
      requested_capabilities: ["read:notes", "write:notes"],
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.agent_id).toBe("agent-001");
      expect(r.value.capabilities).toContain("read:notes");
    }
  });

  it("capability token verifies as agent actor", async () => {
    const capResult = await driver.issueCapabilityToken({
      agent_id: "agent-002",
      supervising_user_id: "user-test",
      requested_capabilities: ["read:orders"],
    });
    if (!isOk(capResult)) throw new Error("expected ok");

    const r = await driver.verifyToken(capResult.value.signature);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.actor.type).toBe("agent");
    }
  });
});
