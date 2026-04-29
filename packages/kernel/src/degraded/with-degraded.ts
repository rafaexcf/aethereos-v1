import type {
  LLMDriver,
  ObservabilityDriver,
  TenantContext,
} from "@aethereos/drivers";
import { DegradedLLMDriver } from "./degraded-llm-driver.js";
import { DegradedObservabilityDriver } from "./degraded-observability-driver.js";

export type DegradedCallback = (error: unknown) => void;

/**
 * Wraps an LLMDriver so that any thrown error falls back to DegradedLLMDriver.
 * The primary is tried first on every call; degraded is only activated on failure.
 * This implements P14 (Modo Degenerado) for LLM features.
 */
export function withDegradedLLM(
  primary: LLMDriver,
  onDegrade?: DegradedCallback,
): LLMDriver {
  const fallback = new DegradedLLMDriver();
  let degraded = false;

  async function tryPrimary<T>(
    fn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
  ): Promise<T> {
    try {
      const result = await fn();
      degraded = false;
      return result;
    } catch (e) {
      if (!degraded) {
        degraded = true;
        onDegrade?.(e);
      }
      return fallbackFn();
    }
  }

  return {
    withTenant(context: TenantContext) {
      try {
        primary.withTenant(context);
      } catch {
        // non-throwing
      }
      fallback.withTenant(context);
    },

    complete: (messages, options) =>
      tryPrimary(
        () => primary.complete(messages, options),
        () => fallback.complete(messages, options),
      ),

    embed: (content, model) =>
      tryPrimary(
        () => primary.embed(content, model),
        () => fallback.embed(content, model),
      ),

    ping: () =>
      tryPrimary(
        () => primary.ping(),
        () => fallback.ping(),
      ),
  };
}

/**
 * Wraps an ObservabilityDriver so that any thrown error falls back to DegradedObservabilityDriver.
 * P14 for observability: never let tracing/metrics break the hot path.
 */
export function withDegradedObservability(
  primary: ObservabilityDriver,
  onDegrade?: DegradedCallback,
): ObservabilityDriver {
  const fallback = new DegradedObservabilityDriver();
  let degraded = false;

  function trySync<T>(fn: () => T, fallbackFn: () => T): T {
    try {
      const result = fn();
      degraded = false;
      return result;
    } catch (e) {
      if (!degraded) {
        degraded = true;
        onDegrade?.(e);
      }
      return fallbackFn();
    }
  }

  return {
    withTenant(context) {
      try {
        primary.withTenant(context);
      } catch {
        /* non-throwing */
      }
    },

    startSpan: (name, options) =>
      trySync(
        () => primary.startSpan(name, options),
        () => fallback.startSpan(name, options),
      ),

    incrementCounter: (name, value, options) =>
      trySync(
        () => primary.incrementCounter(name, value, options),
        () => fallback.incrementCounter(name, value, options),
      ),

    recordHistogram: (name, value, options) =>
      trySync(
        () => primary.recordHistogram(name, value, options),
        () => fallback.recordHistogram(name, value, options),
      ),

    log: (level, message, attributes) =>
      trySync(
        () => primary.log(level, message, attributes),
        () => fallback.log(level, message, attributes),
      ),

    ping: () => primary.ping().catch(() => fallback.ping()),
  };
}
