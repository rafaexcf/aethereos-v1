import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCurrentCorrelationId } from "../src/correlation.js";

const VALID_TRACE_ID = "a".repeat(32);
const INVALID_TRACE_ID = "0".repeat(32);

function makeSpan(traceId: string, valid: boolean) {
  return {
    spanContext: () => ({
      traceId,
      spanId: "b".repeat(16),
      traceFlags: valid ? 1 : 0,
      isRemote: false,
    }),
  };
}

vi.mock("@opentelemetry/api", () => ({
  trace: {
    getActiveSpan: vi.fn(),
  },
  isSpanContextValid: (ctx: { traceFlags: number }) => ctx.traceFlags === 1,
}));

import { trace } from "@opentelemetry/api";

describe("getCurrentCorrelationId()", () => {
  beforeEach(() => {
    vi.mocked(trace.getActiveSpan).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the active trace_id when a valid span exists", () => {
    vi.mocked(trace.getActiveSpan).mockReturnValue(
      makeSpan(VALID_TRACE_ID, true) as unknown as ReturnType<
        typeof trace.getActiveSpan
      >,
    );

    const id = getCurrentCorrelationId();
    expect(id).toBe(VALID_TRACE_ID);
  });

  it("falls back to a new UUID when no active span", () => {
    vi.mocked(trace.getActiveSpan).mockReturnValue(undefined);

    const id = getCurrentCorrelationId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("falls back to UUID when span context is invalid (all-zeros traceId)", () => {
    vi.mocked(trace.getActiveSpan).mockReturnValue(
      makeSpan(INVALID_TRACE_ID, false) as unknown as ReturnType<
        typeof trace.getActiveSpan
      >,
    );

    const id = getCurrentCorrelationId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("returns different UUIDs on successive calls without active span", () => {
    vi.mocked(trace.getActiveSpan).mockReturnValue(undefined);

    const id1 = getCurrentCorrelationId();
    const id2 = getCurrentCorrelationId();
    expect(id1).not.toBe(id2);
  });
});
