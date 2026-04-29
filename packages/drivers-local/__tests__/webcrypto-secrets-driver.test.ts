import { describe, it, expect, beforeEach } from "vitest";
import { WebCryptoSecretsDriver } from "../src/secrets/webcrypto-secrets-driver.js";
import { isOk, isErr } from "@aethereos/drivers";

async function makeDriver(): Promise<WebCryptoSecretsDriver> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return new WebCryptoSecretsDriver(key);
}

describe("WebCryptoSecretsDriver", () => {
  let driver: WebCryptoSecretsDriver;

  beforeEach(async () => {
    driver = await makeDriver();
  });

  it("ping returns ok", async () => {
    expect(isOk(await driver.ping())).toBe(true);
  });

  it("get returns NotFoundError for missing key", async () => {
    const r = await driver.get("missing");
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.message).toContain("not found");
  });

  it("set and get round-trips a secret", async () => {
    await driver.set("db_url", "postgres://localhost");
    const r = await driver.get("db_url");
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe("postgres://localhost");
  });

  it("getMany returns all requested secrets", async () => {
    await driver.set("key_a", "val_a");
    await driver.set("key_b", "val_b");
    const r = await driver.getMany(["key_a", "key_b"]);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value["key_a"]).toBe("val_a");
      expect(r.value["key_b"]).toBe("val_b");
    }
  });

  it("delete removes secret", async () => {
    await driver.set("to_delete", "bye");
    const del = await driver.delete("to_delete");
    expect(isOk(del)).toBe(true);
    expect(isErr(await driver.get("to_delete"))).toBe(true);
  });

  it("delete returns NotFoundError for missing key", async () => {
    const r = await driver.delete("ghost");
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.message).toContain("not found");
  });

  it("encrypted secret cannot be read with a different key", async () => {
    await driver.set("secret", "top-secret");
    const otherDriver = await makeDriver();
    const r = await otherDriver.get("secret");
    expect(isErr(r)).toBe(true);
  });
});
