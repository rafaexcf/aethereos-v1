import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LiteLLMDriver } from "../src/litellm-driver.js";
import type { TenantContext } from "@aethereos/drivers";

const BASE_CONFIG = {
  baseUrl: "http://localhost:4000",
  masterKey: "sk-test-key",
};

const TENANT: TenantContext = {
  company_id: "00000000-0000-0000-0000-000000000001",
  actor: {
    type: "human",
    user_id: "00000000-0000-0000-0000-000000000002",
  },
};

function makeChatResponse(model = "claude-3-5-sonnet-20241022") {
  return {
    id: "chatcmpl-test",
    model,
    choices: [
      {
        message: { role: "assistant", content: "Hello from LiteLLM!" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  };
}

function makeEmbeddingResponse() {
  return {
    model: "text-embedding-3-small",
    data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
    usage: { total_tokens: 5, prompt_tokens: 5 },
  };
}

describe("LiteLLMDriver", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("complete()", () => {
    it("returns typed completion result on success", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(makeChatResponse()), { status: 200 }),
      );

      const driver = new LiteLLMDriver(BASE_CONFIG);
      driver.withTenant(TENANT);
      const result = await driver.complete([
        { role: "user", content: "Hello" },
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.content).toBe("Hello from LiteLLM!");
      expect(result.value.model).toContain("claude");
      expect(result.value.usage.total_tokens).toBe(30);
      expect(result.value.cost_usd).toBeGreaterThan(0);
    });

    it("sends Authorization header and tenant metadata", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(makeChatResponse()), { status: 200 }),
      );

      const driver = new LiteLLMDriver(BASE_CONFIG);
      driver.withTenant(TENANT);
      await driver.complete([{ role: "user", content: "Hi" }]);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:4000/chat/completions");
      const headers = init.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer sk-test-key");

      const body = JSON.parse(init.body as string) as {
        metadata: { company_id: string };
      };
      expect(body.metadata.company_id).toBe(
        "00000000-0000-0000-0000-000000000001",
      );
    });

    it("returns RateLimitError on 429", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response("rate limit exceeded", {
          status: 429,
          headers: { "retry-after": "60" },
        }),
      );

      const driver = new LiteLLMDriver(BASE_CONFIG);
      const result = await driver.complete([{ role: "user", content: "Hi" }]);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.name).toBe("RateLimitError");
    });

    it("returns NetworkError on non-OK response", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response("Internal Server Error", { status: 500 }),
      );

      const driver = new LiteLLMDriver(BASE_CONFIG);
      const result = await driver.complete([{ role: "user", content: "Hi" }]);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.name).toBe("NetworkError");
      expect(result.error.message).toContain("500");
    });

    it("returns TimeoutError when fetch is aborted", async () => {
      fetchMock.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            const abortErr = new Error("The operation was aborted");
            abortErr.name = "AbortError";
            setTimeout(() => {
              reject(abortErr);
            }, 10);
          }),
      );

      const driver = new LiteLLMDriver({ ...BASE_CONFIG, timeoutMs: 5 });
      const result = await driver.complete([{ role: "user", content: "Hi" }]);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.name).toBe("TimeoutError");
    });
  });

  describe("embed()", () => {
    it("returns embedding vector on success", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(makeEmbeddingResponse()), { status: 200 }),
      );

      const driver = new LiteLLMDriver(BASE_CONFIG);
      const result = await driver.embed("hello world");

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(result.value.model).toBe("text-embedding-3-small");
      expect(result.value.usage.total_tokens).toBe(5);
    });

    it("calls /embeddings endpoint", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(makeEmbeddingResponse()), { status: 200 }),
      );

      const driver = new LiteLLMDriver(BASE_CONFIG);
      await driver.embed("test");

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe("http://localhost:4000/embeddings");
    });
  });

  describe("getCost()", () => {
    it("calculates claude-3-5-sonnet cost correctly", () => {
      const driver = new LiteLLMDriver(BASE_CONFIG);
      const cost = driver.getCost({
        model: "claude-3-5-sonnet-20241022",
        prompt_tokens: 1_000_000,
        completion_tokens: 1_000_000,
      });
      expect(cost).toBeCloseTo(18.0, 5);
    });

    it("calculates gpt-4o-mini cost correctly", () => {
      const driver = new LiteLLMDriver(BASE_CONFIG);
      const cost = driver.getCost({
        model: "gpt-4o-mini",
        prompt_tokens: 1_000_000,
        completion_tokens: 1_000_000,
      });
      expect(cost).toBeCloseTo(0.75, 5);
    });

    it("calculates small usage cost (100 prompt + 50 completion tokens, claude)", () => {
      const driver = new LiteLLMDriver(BASE_CONFIG);
      const cost = driver.getCost({
        model: "claude-3-5-sonnet",
        prompt_tokens: 100,
        completion_tokens: 50,
      });
      const expected = (100 / 1_000_000) * 3.0 + (50 / 1_000_000) * 15.0;
      expect(cost).toBeCloseTo(expected, 10);
    });
  });

  describe("ping()", () => {
    it("returns ok when health endpoint returns 200", async () => {
      fetchMock.mockResolvedValueOnce(new Response("OK", { status: 200 }));

      const driver = new LiteLLMDriver(BASE_CONFIG);
      const result = await driver.ping();

      expect(result.ok).toBe(true);
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe("http://localhost:4000/health/liveliness");
    });

    it("returns NetworkError when health endpoint is down", async () => {
      fetchMock.mockRejectedValueOnce(new Error("connection refused"));

      const driver = new LiteLLMDriver(BASE_CONFIG);
      const result = await driver.ping();

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.name).toBe("NetworkError");
    });
  });
});
