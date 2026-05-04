import { describe, it, expect, beforeEach, vi } from "vitest";
import { BridgeTransport, BRIDGE_PROTOCOL, SdkError } from "../src/index.js";

/**
 * Sprint 22 MX118 — testes do BridgeTransport.
 *
 * Strategy: criar duas "fake windows" que se comunicam via postMessage
 * sintetico. Iframe = source. Host = target. Cada postMessage no target
 * eh capturado e podemos responder de volta despachando MessageEvent
 * no source.
 */

interface MessageHandler {
  (event: MessageEvent): void;
}

interface FakeWindow {
  addEventListener(type: "message", h: MessageHandler): void;
  removeEventListener(type: "message", h: MessageHandler): void;
  postMessage(data: unknown, _origin: string): void;
  /** Test helper: dispara um message event nos handlers registrados. */
  __dispatch(data: unknown): void;
  /** Test helper: ultimas mensagens recebidas via postMessage. */
  readonly __outbox: unknown[];
}

function makeWindow(): FakeWindow {
  const handlers = new Set<MessageHandler>();
  const outbox: unknown[] = [];
  return {
    addEventListener: (_t, h) => {
      handlers.add(h);
    },
    removeEventListener: (_t, h) => {
      handlers.delete(h);
    },
    postMessage: (data) => {
      outbox.push(data);
    },
    __dispatch: (data) => {
      const ev = { data } as MessageEvent;
      for (const h of [...handlers]) h(ev);
    },
    get __outbox() {
      return outbox;
    },
  };
}

const COMPANY = "00000000-0000-0000-0000-0000000000aa";
const USER = "00000000-0000-0000-0000-0000000000bb";

describe("BridgeTransport", () => {
  let host: FakeWindow;
  let iframe: FakeWindow;
  let bridge: BridgeTransport;

  beforeEach(() => {
    host = makeWindow();
    iframe = makeWindow();
    bridge = new BridgeTransport({
      target: host as unknown as Window,
      source: iframe as unknown as Window,
      timeoutMs: 500,
    });
  });

  it("handshake: posta HANDSHAKE no host e resolve com contexto do ACK", async () => {
    const promise = bridge.handshake();
    expect(host.__outbox[0]).toMatchObject({
      type: BRIDGE_PROTOCOL.TYPE_HANDSHAKE,
      version: BRIDGE_PROTOCOL.SDK_VERSION,
    });
    iframe.__dispatch({
      type: BRIDGE_PROTOCOL.TYPE_HANDSHAKE_ACK,
      appId: "demo",
      companyId: COMPANY,
      userId: USER,
      theme: "dark",
    });
    const ctx = await promise;
    expect(ctx).toEqual({
      appId: "demo",
      companyId: COMPANY,
      userId: USER,
      theme: "dark",
    });
    expect(bridge.context()).toEqual(ctx);
  });

  it("handshake idempotente: chamadas adicionais retornam mesma promise", async () => {
    const p1 = bridge.handshake();
    const p2 = bridge.handshake();
    expect(p1).toBe(p2);
    iframe.__dispatch({
      type: BRIDGE_PROTOCOL.TYPE_HANDSHAKE_ACK,
      appId: "x",
      companyId: COMPANY,
      userId: USER,
      theme: "light",
    });
    await p1;
  });

  it("request: envia REQUEST com requestId UUID e resolve com data do RESPONSE", async () => {
    const promise = bridge.request<{ ok: boolean }>("auth.getSession", {
      foo: "bar",
    });
    const sent = host.__outbox[0] as {
      type: string;
      requestId: string;
      method: string;
      params: Record<string, unknown>;
    };
    expect(sent.type).toBe(BRIDGE_PROTOCOL.TYPE_REQUEST);
    expect(sent.method).toBe("auth.getSession");
    expect(sent.params).toEqual({ foo: "bar" });
    expect(sent.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    iframe.__dispatch({
      type: BRIDGE_PROTOCOL.TYPE_RESPONSE,
      requestId: sent.requestId,
      success: true,
      data: { ok: true },
    });
    const out = await promise;
    expect(out).toEqual({ ok: true });
  });

  it("request: ignora RESPONSE com requestId diferente", async () => {
    const p1 = bridge.request<string>("a.b");
    const p2 = bridge.request<string>("c.d");
    const m1 = host.__outbox[0] as { requestId: string };
    const m2 = host.__outbox[1] as { requestId: string };
    expect(m1.requestId).not.toBe(m2.requestId);
    iframe.__dispatch({
      type: BRIDGE_PROTOCOL.TYPE_RESPONSE,
      requestId: m2.requestId,
      success: true,
      data: "second",
    });
    await expect(p2).resolves.toBe("second");
    iframe.__dispatch({
      type: BRIDGE_PROTOCOL.TYPE_RESPONSE,
      requestId: m1.requestId,
      success: true,
      data: "first",
    });
    await expect(p1).resolves.toBe("first");
  });

  it("request: RESPONSE com success=false rejeita com SdkError tipado", async () => {
    const promise = bridge.request("drive.read", { fileId: "x" });
    const sent = host.__outbox[0] as { requestId: string };
    iframe.__dispatch({
      type: BRIDGE_PROTOCOL.TYPE_RESPONSE,
      requestId: sent.requestId,
      success: false,
      error: { code: "NOT_FOUND", message: "file missing" },
    });
    await expect(promise).rejects.toBeInstanceOf(SdkError);
    await promise.catch((e) => {
      expect((e as SdkError).code).toBe("NOT_FOUND");
      expect((e as SdkError).message).toBe("file missing");
    });
  });

  it("request: timeout rejeita com SdkError BRIDGE_TIMEOUT", async () => {
    vi.useFakeTimers();
    const local = new BridgeTransport({
      target: host as unknown as Window,
      source: iframe as unknown as Window,
      timeoutMs: 100,
    });
    const promise = local.request("never.responds");
    vi.advanceTimersByTime(150);
    await expect(promise).rejects.toBeInstanceOf(SdkError);
    await promise.catch((e) => {
      expect((e as SdkError).code).toBe("BRIDGE_TIMEOUT");
    });
    vi.useRealTimers();
  });

  it("subscribe: handler chamado quando event chega; unsubscribe para os calls", () => {
    const handler = vi.fn();
    const unsub = bridge.subscribe("theme.changed", handler);
    iframe.__dispatch({
      type: BRIDGE_PROTOCOL.TYPE_EVENT,
      event: "theme.changed",
      data: { theme: "light" },
    });
    iframe.__dispatch({
      type: BRIDGE_PROTOCOL.TYPE_EVENT,
      event: "other.event",
      data: { x: 1 },
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ theme: "light" });
    unsub();
    iframe.__dispatch({
      type: BRIDGE_PROTOCOL.TYPE_EVENT,
      event: "theme.changed",
      data: { theme: "dark" },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
