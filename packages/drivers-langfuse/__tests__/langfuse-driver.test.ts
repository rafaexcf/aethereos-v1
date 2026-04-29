import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LangfuseObservabilityDriver } from "../src/langfuse-driver.js";
import type { TenantContext } from "@aethereos/drivers";

const BASE_CONFIG = {
  baseUrl: "http://localhost:3001",
  publicKey: "pk-lf-test",
  secretKey: "sk-lf-test",
  flushAt: 100,
  flushIntervalMs: 60_000,
};

const TENANT: TenantContext = {
  company_id: "00000000-0000-0000-0000-000000000001",
  actor: { type: "human", user_id: "00000000-0000-0000-0000-000000000002" },
};

describe("LangfuseObservabilityDriver", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 207 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("startSpan()", () => {
    it("returns span with spanId and end() method", () => {
      const driver = new LangfuseObservabilityDriver(BASE_CONFIG);
      const span = driver.startSpan("test-operation");
      expect(span.spanId).toBeTruthy();
      expect(typeof span.end).toBe("function");
    });

    it("span.setAttribute stores values", () => {
      const driver = new LangfuseObservabilityDriver(BASE_CONFIG);
      const span = driver.startSpan("test-span");
      span.setAttribute("key", "value");
      span.setAttribute("count", 42);
      span.setStatus("ok");
      span.end();
    });

    it("span.setStatus error records error level", () => {
      const driver = new LangfuseObservabilityDriver(BASE_CONFIG);
      const span = driver.startSpan("failing-op");
      span.setStatus("error", "Something went wrong");
      span.end();
    });

    it("double end() is safe (idempotent)", () => {
      const driver = new LangfuseObservabilityDriver(BASE_CONFIG);
      const span = driver.startSpan("idempotent");
      span.end();
      expect(() => {
        span.end();
      }).not.toThrow();
    });
  });

  describe("log()", () => {
    it("enqueues log event without throwing", () => {
      const driver = new LangfuseObservabilityDriver(BASE_CONFIG);
      driver.withTenant(TENANT);
      expect(() => {
        driver.log("info", "test message", { foo: "bar" });
        driver.log("warn", "warning msg");
        driver.log("error", "error msg", { err: "details" });
        driver.log("debug", "debug msg");
      }).not.toThrow();
    });
  });

  describe("incrementCounter() / recordHistogram()", () => {
    it("enqueues score events without throwing", () => {
      const driver = new LangfuseObservabilityDriver(BASE_CONFIG);
      expect(() => {
        driver.incrementCounter("requests.total", 1);
        driver.incrementCounter("requests.error");
        driver.recordHistogram("latency_ms", 123.4, {
          labels: { model: "claude" },
        });
      }).not.toThrow();
    });
  });

  describe("traceLLM()", () => {
    it("enqueues trace and generation events", async () => {
      const driver = new LangfuseObservabilityDriver({
        ...BASE_CONFIG,
        flushAt: 2,
      });
      driver.withTenant(TENANT);

      await driver.traceLLM({
        name: "chat.test",
        model: "claude-3-5-sonnet",
        input: [{ role: "user", content: "Hello" }],
        output: "Hello back",
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        cost_usd: 0.0005,
        correlationId: "corr-123",
      });

      await driver.flush();
      expect(fetchMock).toHaveBeenCalled();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/api/public/ingestion");
      const body = JSON.parse(init.body as string) as {
        batch: Array<{ type: string }>;
      };
      expect(body.batch.some((e) => e.type === "trace-create")).toBe(true);
      expect(body.batch.some((e) => e.type === "generation-create")).toBe(true);
    });
  });

  describe("flush()", () => {
    it("sends batch via POST to /api/public/ingestion", async () => {
      const driver = new LangfuseObservabilityDriver({
        ...BASE_CONFIG,
        flushAt: 100,
      });
      driver.log("info", "flush test");
      await driver.flush();
      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:3001/api/public/ingestion");
      const headers = init.headers as Record<string, string>;
      expect(headers["Authorization"]).toMatch(/^Basic /);
    });

    it("does nothing when buffer is empty", async () => {
      const driver = new LangfuseObservabilityDriver(BASE_CONFIG);
      await driver.flush();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("uses Basic auth with publicKey:secretKey", async () => {
      const driver = new LangfuseObservabilityDriver(BASE_CONFIG);
      driver.log("info", "auth test");
      await driver.flush();
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      const decoded = Buffer.from(
        (headers["Authorization"] ?? "").replace("Basic ", ""),
        "base64",
      ).toString();
      expect(decoded).toBe("pk-lf-test:sk-lf-test");
    });
  });

  describe("ping()", () => {
    it("returns ok when health endpoint returns 200", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
      );
      const driver = new LangfuseObservabilityDriver(BASE_CONFIG);
      const result = await driver.ping();
      expect(result.ok).toBe(true);
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe("http://localhost:3001/api/public/health");
    });

    it("returns NetworkError when health endpoint is down", async () => {
      fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      const driver = new LangfuseObservabilityDriver(BASE_CONFIG);
      const result = await driver.ping();
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.name).toBe("NetworkError");
    });
  });
});
