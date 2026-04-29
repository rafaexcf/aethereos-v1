import { describe, it, expect, vi } from "vitest";
import {
  DegradedLLMDriver,
  DegradedObservabilityDriver,
  withDegradedLLM,
  withDegradedObservability,
} from "../src/degraded/index.js";
import type { LLMDriver, ObservabilityDriver } from "@aethereos/drivers";
import { ok, err, NetworkError } from "@aethereos/drivers";

describe("DegradedLLMDriver", () => {
  it("returns empty completion with model=degraded", async () => {
    const driver = new DegradedLLMDriver();
    const result = await driver.complete([{ role: "user", content: "hello" }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.model).toBe("degraded");
    expect(result.value.content).toBe("");
  });

  it("returns empty embedding with model=degraded", async () => {
    const driver = new DegradedLLMDriver();
    const result = await driver.embed("text");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.model).toBe("degraded");
    expect(result.value.embedding).toHaveLength(0);
  });

  it("ping returns ok", async () => {
    const driver = new DegradedLLMDriver();
    const result = await driver.ping();
    expect(result.ok).toBe(true);
  });
});

describe("DegradedObservabilityDriver", () => {
  it("startSpan returns noop span that does not throw", () => {
    const driver = new DegradedObservabilityDriver();
    const span = driver.startSpan("test");
    expect(() => {
      span.setAttribute("k", "v");
      span.setStatus("ok");
      span.end();
    }).not.toThrow();
  });

  it("metrics methods do not throw", () => {
    const driver = new DegradedObservabilityDriver();
    expect(() => {
      driver.incrementCounter("requests");
      driver.recordHistogram("latency", 100);
      driver.log("info", "hello");
    }).not.toThrow();
  });
});

describe("withDegradedLLM()", () => {
  it("uses primary when healthy", async () => {
    const healthy: LLMDriver = {
      withTenant: vi.fn(),
      complete: vi
        .fn()
        .mockResolvedValue(
          ok({
            content: "hi",
            model: "gpt",
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        ),
      embed: vi
        .fn()
        .mockResolvedValue(
          ok({ embedding: [0.1], model: "gpt", usage: { total_tokens: 1 } }),
        ),
      ping: vi.fn().mockResolvedValue(ok(undefined)),
    };

    const wrapped = withDegradedLLM(healthy);
    const result = await wrapped.complete([{ role: "user", content: "hi" }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.model).toBe("gpt");
  });

  it("falls back to degraded when primary throws", async () => {
    const broken: LLMDriver = {
      withTenant: vi.fn(),
      complete: vi.fn().mockRejectedValue(new Error("connection refused")),
      embed: vi.fn().mockRejectedValue(new Error("connection refused")),
      ping: vi.fn().mockResolvedValue(err(new NetworkError("down"))),
    };

    const onDegrade = vi.fn();
    const wrapped = withDegradedLLM(broken, onDegrade);
    const result = await wrapped.complete([{ role: "user", content: "hi" }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.model).toBe("degraded");
    expect(onDegrade).toHaveBeenCalledTimes(1);
  });

  it("calls onDegrade only once on first failure", async () => {
    const broken: LLMDriver = {
      withTenant: vi.fn(),
      complete: vi.fn().mockRejectedValue(new Error("down")),
      embed: vi.fn().mockRejectedValue(new Error("down")),
      ping: vi.fn().mockResolvedValue(ok(undefined)),
    };

    const onDegrade = vi.fn();
    const wrapped = withDegradedLLM(broken, onDegrade);

    await wrapped.complete([{ role: "user", content: "a" }]);
    await wrapped.complete([{ role: "user", content: "b" }]);

    expect(onDegrade).toHaveBeenCalledTimes(1);
  });
});

describe("withDegradedObservability()", () => {
  it("uses primary when healthy", () => {
    const mockSpan = {
      spanId: "real-span",
      setAttribute: vi.fn(),
      setStatus: vi.fn(),
      end: vi.fn(),
    };
    const healthy: ObservabilityDriver = {
      withTenant: vi.fn(),
      startSpan: vi.fn().mockReturnValue(mockSpan),
      incrementCounter: vi.fn(),
      recordHistogram: vi.fn(),
      log: vi.fn(),
      ping: vi.fn().mockResolvedValue(ok(undefined)),
    };

    const wrapped = withDegradedObservability(healthy);
    const span = wrapped.startSpan("op");
    expect(span.spanId).toBe("real-span");
  });

  it("falls back to noop when primary startSpan throws", () => {
    const broken: ObservabilityDriver = {
      withTenant: vi.fn(),
      startSpan: vi.fn().mockImplementation(() => {
        throw new Error("otel down");
      }),
      incrementCounter: vi.fn(),
      recordHistogram: vi.fn(),
      log: vi.fn(),
      ping: vi.fn().mockResolvedValue(ok(undefined)),
    };

    const wrapped = withDegradedObservability(broken);
    const span = wrapped.startSpan("op");
    expect(span.spanId).toBe("degraded");
    expect(() => span.end()).not.toThrow();
  });
});
