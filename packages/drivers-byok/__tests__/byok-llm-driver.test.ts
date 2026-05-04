import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BYOKLLMDriver, type BYOKConfig } from "../src/byok-llm-driver.js";

const mkConfig = (overrides: Partial<BYOKConfig> = {}): BYOKConfig => ({
  format: "openai",
  baseUrl: "https://api.example.com/v1",
  apiKey: "sk-test-123",
  model: "test-model",
  ...overrides,
});

const mockFetchOk = (body: unknown, status = 200) => {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
};

describe("BYOKLLMDriver — format: openai", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("complete: POST /chat/completions com Authorization Bearer", async () => {
    const fetchMock = mockFetchOk({
      model: "test-model",
      choices: [
        {
          message: { role: "assistant", content: "hi" },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
    });
    globalThis.fetch = fetchMock;

    const driver = new BYOKLLMDriver(mkConfig());
    const res = await driver.complete([{ role: "user", content: "hello" }]);

    expect(res.ok).toBe(true);
    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe("https://api.example.com/v1/chat/completions");
    const init = call[1] as RequestInit;
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-test-123");
    expect(headers["Content-Type"]).toBe("application/json");
    if (res.ok) {
      expect(res.value.content).toBe("hi");
      expect(res.value.usage.total_tokens).toBe(6);
    }
  });

  it("complete: erro 429 retorna RateLimitError", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "60" },
      }),
    );
    const driver = new BYOKLLMDriver(mkConfig());
    const res = await driver.complete([{ role: "user", content: "hi" }]);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.constructor.name).toBe("RateLimitError");
    }
  });

  it("complete: erro 401 retorna NetworkError com body", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const driver = new BYOKLLMDriver(mkConfig());
    const res = await driver.complete([{ role: "user", content: "hi" }]);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.constructor.name).toBe("NetworkError");
      expect(res.error.message).toContain("401");
    }
  });

  it("embed: POST /embeddings com input + model", async () => {
    const fetchMock = mockFetchOk({
      model: "text-embedding-3-small",
      data: [{ embedding: [0.1, 0.2, 0.3] }],
      usage: { total_tokens: 3 },
    });
    globalThis.fetch = fetchMock;
    const driver = new BYOKLLMDriver(
      mkConfig({ model: "text-embedding-3-small" }),
    );
    const res = await driver.embed("hello");
    expect(res.ok).toBe(true);
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.input).toBe("hello");
    if (res.ok) {
      expect(res.value.embedding).toEqual([0.1, 0.2, 0.3]);
    }
  });

  it("ping: GET /models", async () => {
    const fetchMock = mockFetchOk({ data: [] });
    globalThis.fetch = fetchMock;
    const driver = new BYOKLLMDriver(mkConfig());
    const res = await driver.ping();
    expect(res.ok).toBe(true);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://api.example.com/v1/models",
    );
  });
});

describe("BYOKLLMDriver — format: anthropic", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("complete: POST /v1/messages com x-api-key + system separado", async () => {
    const fetchMock = mockFetchOk({
      model: "claude-3-5-sonnet",
      content: [{ type: "text", text: "olá" }],
      usage: { input_tokens: 4, output_tokens: 2 },
    });
    globalThis.fetch = fetchMock;
    const driver = new BYOKLLMDriver(
      mkConfig({
        format: "anthropic",
        baseUrl: "https://api.anthropic.com",
        model: "claude-3-5-sonnet",
        apiKey: "sk-ant-xyz",
      }),
    );
    const res = await driver.complete([
      { role: "system", content: "you are helpful" },
      { role: "user", content: "oi" },
    ]);
    expect(res.ok).toBe(true);
    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe("https://api.anthropic.com/v1/messages");
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-xyz");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(init.body as string);
    expect(body.system).toBe("you are helpful");
    expect(body.messages).toEqual([{ role: "user", content: "oi" }]);
    if (res.ok) {
      expect(res.value.content).toBe("olá");
      expect(res.value.usage.total_tokens).toBe(6);
    }
  });
});

describe("BYOKLLMDriver — format: google", () => {
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("complete: POST :generateContent com apiKey query + role rename", async () => {
    const fetchMock = mockFetchOk({
      candidates: [
        {
          content: { parts: [{ text: "hi from gemini" }] },
          finishReason: "STOP",
        },
      ],
      usageMetadata: {
        promptTokenCount: 3,
        candidatesTokenCount: 4,
        totalTokenCount: 7,
      },
      modelVersion: "gemini-2.0-flash",
    });
    globalThis.fetch = fetchMock;
    const driver = new BYOKLLMDriver(
      mkConfig({
        format: "google",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        model: "gemini-2.0-flash",
        apiKey: "AIza-test",
      }),
    );
    const res = await driver.complete([
      { role: "system", content: "be brief" },
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
      { role: "user", content: "again" },
    ]);
    expect(res.ok).toBe(true);
    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toContain(
      "/models/gemini-2.0-flash:generateContent?key=AIza-test",
    );
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.systemInstruction).toEqual({
      parts: [{ text: "be brief" }],
    });
    // assistant -> "model", user stays "user"
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "hi" }] },
      { role: "model", parts: [{ text: "hello" }] },
      { role: "user", parts: [{ text: "again" }] },
    ]);
    if (res.ok) {
      expect(res.value.content).toBe("hi from gemini");
      expect(res.value.usage.total_tokens).toBe(7);
    }
  });

  it("embed: retorna ValidationError (Google nao suporta via este driver)", async () => {
    const driver = new BYOKLLMDriver(
      mkConfig({
        format: "google",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      }),
    );
    const res = await driver.embed("oi");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.constructor.name).toBe("ValidationError");
    }
  });
});

describe("BYOKLLMDriver — construtor", () => {
  it("throws ValidationError se baseUrl vazia", () => {
    expect(() => new BYOKLLMDriver(mkConfig({ baseUrl: "" }))).toThrow(
      /baseUrl/,
    );
  });
});
