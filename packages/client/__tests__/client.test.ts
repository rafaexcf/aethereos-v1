import { describe, it, expect, vi } from "vitest";
import { createAethereosClient } from "../src/index.js";
import type { Transport } from "../src/index.js";

class StubTransport implements Transport {
  calls: Array<{ method: string; params: Record<string, unknown> }> = [];
  responses = new Map<string, unknown>();
  async request<T>(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    this.calls.push({ method, params: params ?? {} });
    return (this.responses.get(method) ?? null) as T;
  }
  subscribe(): () => void {
    return () => {};
  }
}

describe("createAethereosClient", () => {
  it("returns object com 10 modulos tipados", () => {
    const aeth = createAethereosClient({ transport: new StubTransport() });
    expect(aeth.auth).toBeDefined();
    expect(aeth.drive).toBeDefined();
    expect(aeth.people).toBeDefined();
    expect(aeth.chat).toBeDefined();
    expect(aeth.notifications).toBeDefined();
    expect(aeth.scp).toBeDefined();
    expect(aeth.ai).toBeDefined();
    expect(aeth.settings).toBeDefined();
    expect(aeth.windows).toBeDefined();
    expect(aeth.theme).toBeDefined();
  });

  it("auth.getSession enruta para 'auth.getSession'", async () => {
    const t = new StubTransport();
    t.responses.set("auth.getSession", {
      userId: "u1",
      email: "u@x",
      companyId: "c1",
    });
    const aeth = createAethereosClient({ transport: t });
    const s = await aeth.auth.getSession();
    expect(s.userId).toBe("u1");
    expect(t.calls).toHaveLength(1);
    expect(t.calls[0]?.method).toBe("auth.getSession");
  });

  it("drive.list passa path como param", async () => {
    const t = new StubTransport();
    t.responses.set("drive.list", []);
    const aeth = createAethereosClient({ transport: t });
    await aeth.drive.list("/docs");
    expect(t.calls[0]).toEqual({
      method: "drive.list",
      params: { path: "/docs" },
    });
  });

  it("notifications.send passa title+body+opts spread", async () => {
    const t = new StubTransport();
    const aeth = createAethereosClient({ transport: t });
    await aeth.notifications.send("hi", "world", { type: "success" });
    expect(t.calls[0]).toEqual({
      method: "notifications.send",
      params: { title: "hi", body: "world", type: "success" },
    });
  });

  it("DirectTransport: usa router quando opts.direct fornecido", async () => {
    const router = vi.fn().mockResolvedValue({ ok: true });
    const aeth = createAethereosClient({ direct: { router } });
    await aeth.settings.get("key");
    expect(router).toHaveBeenCalledWith("settings.get", { key: "key" });
  });
});
