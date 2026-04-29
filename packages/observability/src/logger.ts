import pino from "pino";
import { trace, isSpanContextValid } from "@opentelemetry/api";

export interface LoggerContext {
  company_id?: string;
  [key: string]: unknown;
}

const LEVELS: Record<string, string> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

function getOtelFields(): Record<string, string> {
  const span = trace.getActiveSpan();
  if (span === undefined) return {};

  const ctx = span.spanContext();
  if (!isSpanContextValid(ctx)) return {};

  return {
    trace_id: ctx.traceId,
    span_id: ctx.spanId,
  };
}

export function createLogger(
  name: string,
  staticContext?: LoggerContext,
): pino.Logger {
  return pino({
    name,
    level: process.env["LOG_LEVEL"] ?? "info",
    mixin() {
      return {
        ...getOtelFields(),
        ...staticContext,
      };
    },
    formatters: {
      level(label, number) {
        return { level: LEVELS[number] ?? label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export type Logger = pino.Logger;
