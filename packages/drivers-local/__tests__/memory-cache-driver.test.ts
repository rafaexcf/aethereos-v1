import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryCacheDriver } from "../src/cache/memory-cache-driver.js";
import { isOk, isErr } from "@aethereos/drivers";

describe("MemoryCacheDriver", () => {
  let cache: MemoryCacheDriver;

  beforeEach(() => {
    cache = new MemoryCacheDriver();
  });

  it("ping returns ok", async () => {
    const r = await cache.ping();
    expect(isOk(r)).toBe(true);
  });

  it("get returns null for missing key", async () => {
    const r = await cache.get("missing");
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBeNull();
  });

  it("set and get round-trips a value", async () => {
    await cache.set("hello", { x: 1 });
    const r = await cache.get("hello");
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toEqual({ x: 1 });
  });

  it("delete removes a key", async () => {
    await cache.set("k", "v");
    const del = await cache.delete("k");
    expect(isOk(del)).toBe(true);
    const r = await cache.get("k");
    if (isOk(r)) expect(r.value).toBeNull();
  });

  it("delete returns err for missing key", async () => {
    const r = await cache.delete("nope");
    expect(isErr(r)).toBe(true);
  });

  it("deleteByPrefix removes matching keys and returns count", async () => {
    await cache.set("user:1", "a");
    await cache.set("user:2", "b");
    await cache.set("post:1", "c");
    const r = await cache.deleteByPrefix("user:");
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(2);
    expect(cache.size).toBe(1);
  });

  it("expired entries return null", async () => {
    const now = Date.now();
    vi.setSystemTime(now);
    await cache.set("temp", "val", 1);
    vi.setSystemTime(now + 2000);
    const r = await cache.get("temp");
    if (isOk(r)) expect(r.value).toBeNull();
    vi.useRealTimers();
  });

  it("non-expired entries are still accessible", async () => {
    await cache.set("persist", "data", 60);
    const r = await cache.get("persist");
    if (isOk(r)) expect(r.value).toBe("data");
  });
});
