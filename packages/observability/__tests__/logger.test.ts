import { describe, it, expect, vi } from "vitest";
import { createLogger } from "../src/logger.js";

vi.mock("@opentelemetry/api", () => ({
  trace: {
    getActiveSpan: () => undefined,
  },
  context: {},
  isSpanContextValid: () => false,
}));

describe("createLogger()", () => {
  it("returns a pino logger with the given name", () => {
    const logger = createLogger("test-service");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(logger.bindings().name).toBe("test-service");
  });

  it("includes static context fields in every log", () => {
    const logger = createLogger("svc", { company_id: "tenant-123" });
    const bound = logger.child({ company_id: "tenant-123" });
    expect(bound.bindings()).toMatchObject({ company_id: "tenant-123" });
  });

  it("uses LOG_LEVEL env var for level", () => {
    const original = process.env["LOG_LEVEL"];
    process.env["LOG_LEVEL"] = "warn";
    const logger = createLogger("env-test");
    expect(logger.level).toBe("warn");
    if (original === undefined) {
      delete process.env["LOG_LEVEL"];
    } else {
      process.env["LOG_LEVEL"] = original;
    }
  });

  it("defaults to info level when LOG_LEVEL is not set", () => {
    const original = process.env["LOG_LEVEL"];
    delete process.env["LOG_LEVEL"];
    const logger = createLogger("default-level");
    expect(logger.level).toBe("info");
    if (original !== undefined) process.env["LOG_LEVEL"] = original;
  });
});
