import { describe, it, expect, beforeEach, vi } from "vitest";
import { BRIDGE_PROTOCOL } from "@aethereos/client";
import {
  AppBridgeHandler,
  type BridgeContextSnapshot,
} from "./app-bridge-handler";
import type { CloudDrivers } from "./drivers";

/**
 * Sprint 22 MX122 — testes do AppBridgeHandler (host-side router).
 *
 * Stratega: simular DOM minimo (window.addEventListener, postMessage) +
 * driver mock que retorna fixtures. Cada teste dispara um MessageEvent
 * sintetico no listener registrado e captura o postMessage de resposta.
 */

const COMPANY = "00000000-0000-0000-0000-0000000000aa";
const USER = "00000000-0000-0000-0000-0000000000bb";

interface PostedMessage {
  data: unknown;
}

function setupGlobalWindow(): {
  postedToParent: PostedMessage[];
  fireMessage: (data: unknown, source?: Window | null) => void;
  cleanup: () => void;
} {
  const listeners = new Set<(e: MessageEvent) => void>();
  const original = {
    addEventListener: globalThis.window?.addEventListener,
    removeEventListener: globalThis.window?.removeEventListener,
  };
  // Cria minimal window
  const fakeWindow = {
    addEventListener: vi.fn(
      (type: string, handler: (e: MessageEvent) => void) => {
        if (type === "message") listeners.add(handler);
      },
    ),
    removeEventListener: vi.fn(
      (type: string, handler: (e: MessageEvent) => void) => {
        if (type === "message") listeners.delete(handler);
      },
    ),
    postMessage: vi.fn(),
  };
  (globalThis as unknown as { window: typeof fakeWindow }).window = fakeWindow;

  return {
    postedToParent: [],
    fireMessage: (data, source) => {
      const event = { data, source: source ?? null } as unknown as MessageEvent;
      for (const h of [...listeners]) h(event);
    },
    cleanup: () => {
      if (original.addEventListener !== undefined) {
        (globalThis as unknown as { window: unknown }).window = undefined;
      }
    },
  };
}

function makeIframeWindow(): { posted: PostedMessage[]; win: Window } {
  const posted: PostedMessage[] = [];
  const win = {
    postMessage: (data: unknown) => {
      posted.push({ data });
    },
  } as unknown as Window;
  return { posted, win };
}

function makeMockDrivers(): {
  drivers: CloudDrivers;
  fromCalls: Array<{ table: string; chain: string[] }>;
  inserts: Array<{ table: string; row: unknown }>;
  authResult: { ok: true; value: { user_id: string; email: string } };
} {
  const fromCalls: Array<{ table: string; chain: string[] }> = [];
  const inserts: Array<{ table: string; row: unknown }> = [];
  const authResult = {
    ok: true as const,
    value: { user_id: USER, email: "u@x.com" },
  };

  function mkBuilder(table: string, defaultData: unknown[] = []) {
    const chain: string[] = [];
    const resolveQuery = () => {
      fromCalls.push({ table, chain: [...chain] });
      return { data: defaultData, error: null };
    };
    const builder: Record<string, unknown> = {
      select: vi.fn(() => {
        chain.push("select");
        return builder;
      }),
      eq: vi.fn(() => {
        chain.push("eq");
        return builder;
      }),
      order: vi.fn(() => {
        chain.push("order");
        return builder;
      }),
      limit: vi.fn(() => {
        chain.push("limit");
        return Promise.resolve(resolveQuery());
      }),
      maybeSingle: vi.fn(() => {
        fromCalls.push({ table, chain: [...chain, "maybeSingle"] });
        return Promise.resolve({
          data: { value: "preferred-theme-stub" },
          error: null,
        });
      }),
      insert: vi.fn((row) => {
        inserts.push({ table, row });
        return Promise.resolve({ error: null });
      }),
      upsert: vi.fn((row) => {
        inserts.push({ table, row });
        return Promise.resolve({ error: null });
      }),
      // Sprint 23 MX126: builder thenable — Supabase pattern. Necessario
      // para queries que terminam em .eq() sem .limit() (ex: grants lookup).
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve(resolveQuery()).then(resolve, reject),
    };
    return builder;
  }

  const drivers = {
    auth: {
      getSession: vi.fn(() => Promise.resolve(authResult)),
    },
    data: {
      from: vi.fn((table: string) => {
        const seedByTable: Record<string, unknown[]> = {
          files: [
            {
              id: "f1",
              name: "doc.pdf",
              parent_id: null,
              is_folder: false,
              mime_type: "application/pdf",
              size_bytes: 1024,
              storage_path: "comp/f.pdf",
              created_at: "2026-05-04T00:00:00Z",
            },
          ],
          people: [
            {
              id: "p1",
              full_name: "Maria",
              email: "m@x.com",
              phone: null,
              created_at: "2026-05-04T00:00:00Z",
            },
          ],
          notifications: [],
          // Sprint 23 MX126: grants p/ os scopes que os testes exercem.
          // PERMISSION_DENIED tests sobrescrevem este seed via prop.
          app_permission_grants: [
            { scope: "auth.read" },
            { scope: "drive.read" },
            { scope: "people.read" },
            { scope: "notifications.send" },
            { scope: "theme.read" },
          ],
        };
        return mkBuilder(table, seedByTable[table] ?? []);
      }),
    },
  } as unknown as CloudDrivers;

  return { drivers, fromCalls, inserts, authResult };
}

describe("AppBridgeHandler", () => {
  let env: ReturnType<typeof setupGlobalWindow>;
  let iframe: ReturnType<typeof makeIframeWindow>;
  let mock: ReturnType<typeof makeMockDrivers>;
  let handler: AppBridgeHandler;
  const ctx: BridgeContextSnapshot = {
    appId: "demo-iframe",
    userId: USER,
    companyId: COMPANY,
    getTheme: () => "dark",
  };

  beforeEach(() => {
    env = setupGlobalWindow();
    iframe = makeIframeWindow();
    mock = makeMockDrivers();
    handler = new AppBridgeHandler(mock.drivers, ctx, iframe.win);
    handler.start();
  });

  it("HANDSHAKE: responde com HANDSHAKE_ACK contendo ctx", async () => {
    env.fireMessage(
      { type: BRIDGE_PROTOCOL.TYPE_HANDSHAKE, version: "1.0.0" },
      iframe.win,
    );
    await Promise.resolve();
    expect(iframe.posted[0]?.data).toMatchObject({
      type: BRIDGE_PROTOCOL.TYPE_HANDSHAKE_ACK,
      appId: "demo-iframe",
      companyId: COMPANY,
      userId: USER,
      theme: "dark",
    });
  });

  it("auth.getSession: retorna { userId, email, companyId }", async () => {
    env.fireMessage(
      {
        type: BRIDGE_PROTOCOL.TYPE_REQUEST,
        requestId: "req-1",
        method: "auth.getSession",
        params: {},
      },
      iframe.win,
    );
    await new Promise((r) => setTimeout(r, 0));
    const resp = iframe.posted[0]?.data as {
      type: string;
      requestId: string;
      success: boolean;
      data?: { userId: string; email: string; companyId: string };
    };
    expect(resp.type).toBe(BRIDGE_PROTOCOL.TYPE_RESPONSE);
    expect(resp.requestId).toBe("req-1");
    expect(resp.success).toBe(true);
    expect(resp.data).toEqual({
      userId: USER,
      email: "u@x.com",
      companyId: COMPANY,
    });
  });

  it("drive.list: chama select em files filtrando company_id", async () => {
    env.fireMessage(
      {
        type: BRIDGE_PROTOCOL.TYPE_REQUEST,
        requestId: "req-2",
        method: "drive.list",
        params: {},
      },
      iframe.win,
    );
    await new Promise((r) => setTimeout(r, 0));
    const resp = iframe.posted[0]?.data as {
      success: boolean;
      data: Array<{ id: string; name: string }>;
    };
    expect(resp.success).toBe(true);
    expect(resp.data).toHaveLength(1);
    expect(resp.data[0]?.name).toBe("doc.pdf");
    expect(mock.fromCalls.find((c) => c.table === "files")).toBeDefined();
  });

  it("notifications.send: faz INSERT em notifications com source_app=appId", async () => {
    env.fireMessage(
      {
        type: BRIDGE_PROTOCOL.TYPE_REQUEST,
        requestId: "req-3",
        method: "notifications.send",
        params: { title: "hi", body: "world", type: "success" },
      },
      iframe.win,
    );
    await new Promise((r) => setTimeout(r, 0));
    const resp = iframe.posted[0]?.data as { success: boolean };
    expect(resp.success).toBe(true);
    const insert = mock.inserts.find((i) => i.table === "notifications");
    expect(insert?.row).toMatchObject({
      title: "hi",
      body: "world",
      type: "success",
      source_app: "demo-iframe",
      user_id: USER,
      company_id: COMPANY,
    });
  });

  it("theme.getTheme: retorna ctx.getTheme()", async () => {
    env.fireMessage(
      {
        type: BRIDGE_PROTOCOL.TYPE_REQUEST,
        requestId: "req-4",
        method: "theme.getTheme",
        params: {},
      },
      iframe.win,
    );
    await new Promise((r) => setTimeout(r, 0));
    const resp = iframe.posted[0]?.data as {
      success: boolean;
      data: string;
    };
    expect(resp.success).toBe(true);
    expect(resp.data).toBe("dark");
  });

  it("metodo desconhecido: retorna RESPONSE com error EXECUTION_ERROR", async () => {
    env.fireMessage(
      {
        type: BRIDGE_PROTOCOL.TYPE_REQUEST,
        requestId: "req-5",
        method: "bogus.method",
        params: {},
      },
      iframe.win,
    );
    await new Promise((r) => setTimeout(r, 0));
    const resp = iframe.posted[0]?.data as {
      success: boolean;
      error?: { code: string; message: string };
    };
    expect(resp.success).toBe(false);
    expect(resp.error?.code).toBe("EXECUTION_ERROR");
    expect(resp.error?.message).toMatch(/Unknown module: bogus/);
  });

  it("filtra eventos de outros iframes (event.source !== iframeWindow)", async () => {
    const other = makeIframeWindow();
    env.fireMessage(
      {
        type: BRIDGE_PROTOCOL.TYPE_REQUEST,
        requestId: "req-other",
        method: "auth.getSession",
        params: {},
      },
      other.win,
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(iframe.posted).toHaveLength(0);
    expect(other.posted).toHaveLength(0);
  });

  it("pushEvent: posta AETHEREOS_SDK_EVENT no iframe", () => {
    handler.pushEvent("theme.changed", { theme: "light" });
    expect(iframe.posted[0]?.data).toEqual({
      type: BRIDGE_PROTOCOL.TYPE_EVENT,
      event: "theme.changed",
      data: { theme: "light" },
    });
  });

  it("Sprint 23 MX126: request sem grant retorna PERMISSION_DENIED", async () => {
    // Pre-popula cache com grants restritos (sem people.write).
    await handler.loadGrants();
    env.fireMessage(
      {
        type: BRIDGE_PROTOCOL.TYPE_REQUEST,
        requestId: "req-perm",
        method: "people.create",
        params: { data: { fullName: "X" } },
      },
      iframe.win,
    );
    await new Promise((r) => setTimeout(r, 0));
    const resp = iframe.posted[0]?.data as {
      success: boolean;
      error?: { code: string; message: string };
    };
    expect(resp.success).toBe(false);
    expect(resp.error?.code).toBe("PERMISSION_DENIED");
    expect(resp.error?.message).toMatch(/people\.write/);
  });

  it("Sprint 23 MX126: HANDSHAKE pre-carrega grants no cache", async () => {
    expect(handler.cachedGrants()).toBeNull();
    env.fireMessage(
      { type: BRIDGE_PROTOCOL.TYPE_HANDSHAKE, version: "1.0.0" },
      iframe.win,
    );
    await new Promise((r) => setTimeout(r, 5));
    const cache = handler.cachedGrants();
    expect(cache).not.toBeNull();
    expect(cache?.has("auth.read")).toBe(true);
    expect(cache?.has("drive.read")).toBe(true);
  });

  it("stop: para de responder a mensagens", async () => {
    handler.stop();
    env.fireMessage(
      { type: BRIDGE_PROTOCOL.TYPE_HANDSHAKE, version: "1.0.0" },
      iframe.win,
    );
    await Promise.resolve();
    expect(iframe.posted).toHaveLength(0);
  });
});
