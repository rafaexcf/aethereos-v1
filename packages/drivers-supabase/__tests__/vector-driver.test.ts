import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseBrowserVectorDriver } from "../src/vector/supabase-browser-vector-driver.js";
import { SupabasePgvectorDriver } from "../src/vector/supabase-pgvector-driver.js";

// SupabaseBrowserVectorDriver — contract tests (mocked supabase-js)
vi.mock("@supabase/supabase-js", () => {
  const mockRpc = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({ limit: vi.fn(() => ({ error: null })) })),
  }));
  const mockSchema = vi.fn(() => ({ from: mockFrom }));

  return {
    createClient: vi.fn(() => ({
      rpc: mockRpc,
      schema: mockSchema,
    })),
    __mockRpc: mockRpc,
    __mockFrom: mockFrom,
  };
});

describe("SupabaseBrowserVectorDriver", () => {
  let driver: SupabaseBrowserVectorDriver;

  beforeEach(() => {
    driver = new SupabaseBrowserVectorDriver({
      supabaseUrl: "http://localhost:54321",
      supabaseAnonKey: "test-anon-key",
    });
    driver.withTenant({
      company_id: "company-uuid-001",
      actor: { type: "human", user_id: "user-001" },
    });
  });

  it("search returns ok when rpc succeeds", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const mockClient = (createClient as ReturnType<typeof vi.fn>).mock
      .results[0]?.value as {
      rpc: ReturnType<typeof vi.fn>;
    };

    mockClient.rpc.mockResolvedValue({
      data: [
        {
          id: "embed-001",
          source_type: "file",
          source_id: "file-001",
          chunk_index: 0,
          chunk_text: "Test chunk",
          metadata: {},
          score: 0.95,
        },
      ],
      error: null,
    });

    const result = await driver.search("embeddings", new Array(1536).fill(0.1));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.score).toBe(0.95);
    }
  });

  it("search returns error when rpc fails", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const mockClient = (createClient as ReturnType<typeof vi.fn>).mock
      .results[0]?.value as {
      rpc: ReturnType<typeof vi.fn>;
    };

    mockClient.rpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const result = await driver.search("embeddings", new Array(1536).fill(0.1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("permission denied");
    }
  });

  it("search requires withTenant", async () => {
    const driverWithoutTenant = new SupabaseBrowserVectorDriver({
      supabaseUrl: "http://localhost:54321",
      supabaseAnonKey: "test",
    });
    const result = await driverWithoutTenant.search("embeddings", []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("withTenant");
    }
  });

  it("upsert returns error (browser-only, not supported)", async () => {
    const result = await driver.upsert("embeddings", {
      id: "test",
      embedding: [],
      metadata: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("not supported");
    }
  });

  it("delete returns error (browser-only, not supported)", async () => {
    const result = await driver.delete("embeddings", "test-id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("not supported");
    }
  });
});

// SupabasePgvectorDriver — #tableName logic
describe("SupabasePgvectorDriver tableName", () => {
  it("instantiates with connection string config", () => {
    const driver = new SupabasePgvectorDriver({
      connectionString: "postgres://localhost/test",
    });
    expect(driver).toBeInstanceOf(SupabasePgvectorDriver);
  });
});
