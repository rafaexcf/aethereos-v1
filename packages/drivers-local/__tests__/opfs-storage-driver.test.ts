import { describe, it, expect, beforeEach } from "vitest";
import { OPFSStorageDriver } from "../src/storage/opfs-storage-driver.js";
import { isOk, isErr } from "@aethereos/drivers";
import type { TenantContext } from "@aethereos/drivers";

const tenantCtx: TenantContext = {
  company_id: "00000000-0000-0000-0000-000000000001",
  actor: { type: "human", user_id: "00000000-0000-0000-0000-000000000002" },
};

describe("OPFSStorageDriver (memory fallback)", () => {
  let driver: OPFSStorageDriver;

  beforeEach(() => {
    driver = new OPFSStorageDriver();
    driver.withTenant(tenantCtx);
  });

  it("ping returns ok", async () => {
    expect(isOk(await driver.ping())).toBe(true);
  });

  it("upload and download round-trips bytes", async () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const up = await driver.upload("docs", "test.bin", data);
    expect(isOk(up)).toBe(true);

    const dl = await driver.download("docs", "test.bin");
    expect(isOk(dl)).toBe(true);
    if (isOk(dl)) {
      const reader = dl.value.getReader();
      const { value } = await reader.read();
      expect(value).toEqual(data);
    }
  });

  it("download returns NotFoundError for missing file", async () => {
    const r = await driver.download("docs", "nonexistent.bin");
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.message).toContain("not found");
  });

  it("delete removes file", async () => {
    await driver.upload("docs", "to-delete.bin", new Uint8Array([9]));
    const del = await driver.delete("docs", "to-delete.bin");
    expect(isOk(del)).toBe(true);
    expect(isErr(await driver.download("docs", "to-delete.bin"))).toBe(true);
  });

  it("delete returns NotFoundError for missing file", async () => {
    const r = await driver.delete("docs", "ghost.bin");
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.message).toContain("not found");
  });

  it("publicUrl returns err", () => {
    expect(isErr(driver.publicUrl("docs", "file.bin"))).toBe(true);
  });

  it("signedUrl returns err", async () => {
    expect(isErr(await driver.signedUrl("docs", "file.bin", 60))).toBe(true);
  });

  it("upload returns StorageObject with correct fields", async () => {
    const r = await driver.upload(
      "assets",
      "img.png",
      new Uint8Array([0xff, 0xd8]),
      {
        contentType: "image/png",
        metadata: { author: "test" },
      },
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.bucket).toBe("assets");
      expect(r.value.path).toBe("img.png");
      expect(r.value.contentType).toBe("image/png");
      expect(r.value.size).toBe(2);
    }
  });

  it("upload fails without tenant context", async () => {
    const noCtxDriver = new OPFSStorageDriver();
    expect(isErr(await noCtxDriver.upload("b", "f", new Uint8Array([1])))).toBe(
      true,
    );
  });
});
