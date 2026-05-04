import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import { EmbeddingConsumer } from "../../src/consumers/embedding-consumer.js";
import { mockSql } from "./_mock-sql.js";

const COMPANY = "00000000-0000-0000-0000-0000000000aa";
const USER = "00000000-0000-0000-0000-0000000000bb";
const FILE = "00000000-0000-0000-0000-0000000000ff";

function env(payload: Record<string, unknown>): EventEnvelope {
  return {
    id: "ev-emb",
    type: "platform.file.uploaded",
    tenant_id: COMPANY,
    actor: { type: "human", user_id: USER },
    payload,
    occurred_at: new Date().toISOString(),
  } as EventEnvelope;
}

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON = "anon-key";
const SERVICE = "service-key";

describe("EmbeddingConsumer", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("matches() apenas platform.file.uploaded", () => {
    const c = new EmbeddingConsumer({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON,
    });
    expect(c.matches("platform.file.uploaded")).toBe(true);
    // Sprint 19 MX99: tambem embeda context_records derivados pelo EnrichmentConsumer
    expect(c.matches("platform.person.created")).toBe(true);
    expect(c.matches("platform.chat.channel_created")).toBe(true);
    expect(c.matches("agent.copilot.action_executed")).toBe(true);
    expect(c.matches("platform.folder.created")).toBe(false);
  });

  it("skip silencioso quando supabaseUrl/anonKey ausentes", async () => {
    const c = new EmbeddingConsumer({ supabaseUrl: "", supabaseAnonKey: "" });
    const { sql, calls } = mockSql([]);
    await c.handle(
      env({ file_id: FILE, company_id: COMPANY, storage_path: "x/y.txt" }),
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(0);
  });

  it("skip quando mime_type nao suportado (image/png)", async () => {
    const c = new EmbeddingConsumer({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON,
      supabaseServiceRoleKey: SERVICE,
    });
    const { sql, calls } = mockSql([]);
    globalThis.fetch = vi.fn(); // nao deve ser chamado
    await c.handle(
      env({
        file_id: FILE,
        company_id: COMPANY,
        storage_path: "x/img.png",
        mime_type: "image/png",
      }),
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("skip quando service_role ausente (sem Storage read)", async () => {
    const c = new EmbeddingConsumer({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON,
      supabaseServiceRoleKey: "",
    });
    // forca tambem env vazio para que constructor nao puxe SUPABASE_SERVICE_ROLE_KEY
    const oldEnv = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
    const c2 = new EmbeddingConsumer({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON,
    });
    if (oldEnv !== undefined) process.env["SUPABASE_SERVICE_ROLE_KEY"] = oldEnv;

    const { sql, calls } = mockSql([]);
    globalThis.fetch = vi.fn();
    await c2.handle(
      env({
        file_id: FILE,
        company_id: COMPANY,
        storage_path: "x/y.txt",
        mime_type: "text/plain",
      }),
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(0);
    void c;
  });

  it("payload incompleto (file_id/company_id/storage_path) => skip", async () => {
    const c = new EmbeddingConsumer({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON,
      supabaseServiceRoleKey: SERVICE,
    });
    const { sql, calls } = mockSql([]);
    globalThis.fetch = vi.fn();
    await c.handle(env({ file_id: FILE }), sql as unknown as Sql); // missing company_id+path
    expect(calls).toHaveLength(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("happy path: chunkifica + embeda + UPSERT em kernel.embeddings", async () => {
    const c = new EmbeddingConsumer({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON,
      supabaseServiceRoleKey: SERVICE,
    });
    const TEXT = "lorem ipsum ".repeat(200); // ~2400 chars => 4 chunks (size 800, overlap 100)
    const fetchMock = vi
      .fn()
      // 1. Storage GET (text)
      .mockResolvedValueOnce(
        new Response(TEXT, { status: 200, headers: { "x-test": "storage" } }),
      )
      // 2..N. embed-text por chunk (multiplos)
      .mockResolvedValue(
        new Response(JSON.stringify({ embedding: [0.1, 0.2, 0.3] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    globalThis.fetch = fetchMock;

    const { sql, calls } = mockSql([[], [], [], [], []]); // 4+ unsafe calls
    await c.handle(
      env({
        file_id: FILE,
        company_id: COMPANY,
        storage_path: "comp/f.txt",
        mime_type: "text/plain",
        name: "f.txt",
      }),
      sql as unknown as Sql,
    );

    // 1 fetch p/ Storage + N fetches p/ embed-text
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/storage/v1/object/");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/functions/v1/embed-text");

    // INSERT/UPSERT chamados (sql.unsafe)
    const unsafeCalls = calls.filter((c) => c.kind === "unsafe");
    expect(unsafeCalls.length).toBeGreaterThanOrEqual(1);
    expect(unsafeCalls[0]?.text).toContain("INSERT INTO kernel.embeddings");
    expect(unsafeCalls[0]?.text).toContain("ON CONFLICT");
  });

  it("embed-text 503 => Modo Degenerado P14 (skip restante, sem throw)", async () => {
    const c = new EmbeddingConsumer({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON,
      supabaseServiceRoleKey: SERVICE,
    });
    const TEXT = "x".repeat(1500); // 2 chunks
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(TEXT, { status: 200 }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    const { sql, calls } = mockSql([]);

    await expect(
      c.handle(
        env({
          file_id: FILE,
          company_id: COMPANY,
          storage_path: "p",
          mime_type: "text/plain",
        }),
        sql as unknown as Sql,
      ),
    ).resolves.toBeUndefined();
    // Nenhum INSERT pois o primeiro chunk ja deu 503
    const unsafeCalls = calls.filter((c) => c.kind === "unsafe");
    expect(unsafeCalls).toHaveLength(0);
  });

  it("Storage 404 => skip silencioso (file unreadable)", async () => {
    const c = new EmbeddingConsumer({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: ANON,
      supabaseServiceRoleKey: SERVICE,
    });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("not found", { status: 404 }));
    const { sql, calls } = mockSql([]);

    await c.handle(
      env({
        file_id: FILE,
        company_id: COMPANY,
        storage_path: "missing/x.txt",
        mime_type: "text/plain",
      }),
      sql as unknown as Sql,
    );
    expect(calls).toHaveLength(0);
  });
});
