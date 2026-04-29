import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BroadcastChannelEventBusDriver } from "../src/event-bus/broadcast-channel-driver.js";
import { isOk } from "@aethereos/drivers";
import type { EventEnvelope } from "@aethereos/drivers";

function makeEnvelope(type: string): EventEnvelope {
  return {
    id: crypto.randomUUID(),
    type,
    version: "1",
    tenant_id: "00000000-0000-0000-0000-000000000001",
    actor: { type: "human", user_id: "00000000-0000-0000-0000-000000000002" },
    correlation_id: crypto.randomUUID(),
    payload: { test: true },
    occurred_at: new Date().toISOString(),
    schema_version: "1",
  };
}

describe("BroadcastChannelEventBusDriver", () => {
  let bus: BroadcastChannelEventBusDriver;

  beforeEach(() => {
    bus = new BroadcastChannelEventBusDriver();
  });

  afterEach(() => {
    bus.close();
  });

  it("ping returns ok", async () => {
    expect(isOk(await bus.ping())).toBe(true);
  });

  it("publish returns ok with envelope id", async () => {
    const env = makeEnvelope("test.event.happened");
    const r = await bus.publish(env);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(env.id);
  });

  it("subscriber receives published event", async () => {
    const received: EventEnvelope[] = [];
    await bus.subscribe("test.event.fired", async (env) => {
      received.push(env);
    });
    await bus.publish(makeEnvelope("test.event.fired"));
    expect(received).toHaveLength(1);
  });

  it("subscriber does not receive events of other types", async () => {
    const received: EventEnvelope[] = [];
    await bus.subscribe("user.account.created", async (env) => {
      received.push(env);
    });
    await bus.publish(makeEnvelope("user.session.started"));
    expect(received).toHaveLength(0);
  });

  it("unsubscribe stops receiving events", async () => {
    const received: EventEnvelope[] = [];
    const subResult = await bus.subscribe("ev.type.x", async (env) => {
      received.push(env);
    });
    if (isOk(subResult)) await subResult.value.unsubscribe();
    await bus.publish(makeEnvelope("ev.type.x"));
    expect(received).toHaveLength(0);
  });

  it("multiple subscribers for same type all receive the event", async () => {
    const r1: EventEnvelope[] = [];
    const r2: EventEnvelope[] = [];
    await bus.subscribe("shared.event.ok", async (env) => {
      r1.push(env);
    });
    await bus.subscribe("shared.event.ok", async (env) => {
      r2.push(env);
    });
    await bus.publish(makeEnvelope("shared.event.ok"));
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
  });
});
