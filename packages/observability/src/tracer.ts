import { trace, metrics, type Tracer, type Meter } from "@opentelemetry/api";

export function getTracer(name: string, version?: string): Tracer {
  return trace.getTracer(name, version);
}

export function getMeter(name: string, version?: string): Meter {
  return metrics.getMeter(name, version);
}
