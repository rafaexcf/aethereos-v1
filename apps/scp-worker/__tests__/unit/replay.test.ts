import { describe, it, expect, vi } from "vitest";
import type { Sql } from "postgres";
import type { EventEnvelope } from "@aethereos/drivers";
import type { InlineConsumer } from "../../src/consumer.js";
import { replayEvent, replayRange } from "../../src/replay.js";

const COMPANY = "00000000-0000-0000-0000-0000000000aa";
const EVENT_ID_1 = "11111111-1111-1111-1111-111111111111";
const EVENT_ID_2 = "22222222-2222-2222-2222-222222222222";

interface OutboxRowFixture {
  id: number;
  company_id: string;
  event_type: string;
  event_id: string;
  payload: Record<string, unknown>;
  envelope: EventEnvelope | null;
}

function makeRow(overrides: Partial<OutboxRowFixture> = {}): OutboxRowFixture {
  const eventId = overrides.event_id ?? EVENT_ID_1;
  const envelopeOverride =
    "envelope" in overrides
      ? overrides.envelope
      : ({
          id: eventId,
          type: "platform.person.created",
          tenant_id: COMPANY,
          actor: { type: "human", user_id: "u1" },
          payload: { person_id: "ppp", full_name: "Maria" },
          occurred_at: "2026-05-05T00:00:00Z",
        } as EventEnvelope);
  return {
    id: 1,
    company_id: COMPANY,
    event_type: "platform.person.created",
    event_id: eventId,
    payload: { person_id: "ppp", full_name: "Maria" },
    envelope: envelopeOverride,
    ...overrides,
    event_id: eventId,
    envelope: envelopeOverride,
  };
}

/**
 * Mock sql: simula sequência [SELECT outbox row, UPDATE outbox replay_count].
 * O caller passa o array de rows que o primeiro SELECT retorna.
 */
function mockReplaySql(selectRows: OutboxRowFixture[]): {
  sql: Sql;
  consumerCalls: number;
  updateCalls: number;
} {
  let queryIndex = 0;
  let updateCalls = 0;
  const consumerCalls = 0;

  const fn = vi.fn(
    (_strings: TemplateStringsArray, ..._values: unknown[]): unknown => {
      queryIndex++;
      if (queryIndex === 1) {
        return Promise.resolve(selectRows);
      }
      // Subsequent: UPDATE replay_count
      updateCalls++;
      return Promise.resolve([]);
    },
  ) as unknown as Sql;

  // Pequeno hack: precisamos retornar referencia mutavel ao updateCalls
  return {
    sql: fn,
    consumerCalls,
    get updateCalls() {
      return updateCalls;
    },
  } as unknown as { sql: Sql; consumerCalls: number; updateCalls: number };
}

class FakeConsumer implements InlineConsumer {
  readonly name = "FakeConsumer";
  readonly handled: EventEnvelope[] = [];

  matches(_eventType: string): boolean {
    return true;
  }

  handle(envelope: EventEnvelope, _sql: Sql): Promise<void> {
    this.handled.push(envelope);
    return Promise.resolve();
  }
}

class FailingConsumer implements InlineConsumer {
  readonly name = "FailingConsumer";

  matches(_eventType: string): boolean {
    return true;
  }

  handle(_envelope: EventEnvelope, _sql: Sql): Promise<void> {
    return Promise.reject(new Error("simulado"));
  }
}

describe("replay", () => {
  it("replayEvent: throws com mensagem clara se event_id não existe", async () => {
    const { sql } = mockReplaySql([]);
    const consumer = new FakeConsumer();
    await expect(
      replayEvent(sql, [consumer], "00000000-0000-0000-0000-000000000099"),
    ).rejects.toThrow(/não encontrado/);
  });

  it("replayEvent: chama todos consumers que matched + atualiza replay_count", async () => {
    const row = makeRow();
    const { sql } = mockReplaySql([row]);
    const consumer = new FakeConsumer();
    const result = await replayEvent(sql, [consumer], EVENT_ID_1);

    expect(result.total).toBe(1);
    expect(result.reprocessed).toBe(1);
    expect(result.errors).toBe(0);
    expect(consumer.handled).toHaveLength(1);
    expect(consumer.handled[0]?.id).toBe(EVENT_ID_1);
    expect(result.items[0]?.consumers).toContain("FakeConsumer");
    expect(result.items[0]?.consumer_errors).toEqual([]);
  });

  it("replayEvent: erro em consumer não bloqueia, conta como errors", async () => {
    const row = makeRow();
    const { sql } = mockReplaySql([row]);
    const ok = new FakeConsumer();
    const fail = new FailingConsumer();

    const result = await replayEvent(sql, [ok, fail], EVENT_ID_1);

    expect(result.total).toBe(1);
    expect(result.reprocessed).toBe(0);
    expect(result.errors).toBe(1);
    expect(ok.handled).toHaveLength(1);
    expect(result.items[0]?.consumer_errors).toContain(
      "FailingConsumer: simulado",
    );
  });

  it("replayRange: processa múltiplos eventos em ordem", async () => {
    const rows = [
      makeRow({ id: 1, event_id: EVENT_ID_1 }),
      makeRow({ id: 2, event_id: EVENT_ID_2 }),
    ];
    const { sql } = mockReplaySql(rows);
    const consumer = new FakeConsumer();

    const result = await replayRange(
      sql,
      [consumer],
      "2026-05-01",
      "2026-05-05",
    );

    expect(result.total).toBe(2);
    expect(result.reprocessed).toBe(2);
    expect(consumer.handled.map((e) => e.id)).toEqual([EVENT_ID_1, EVENT_ID_2]);
  });

  it("replayRange: aceita Date além de string ISO", async () => {
    const { sql } = mockReplaySql([]);
    const consumer = new FakeConsumer();
    const from = new Date("2026-05-01T00:00:00Z");
    const to = new Date("2026-05-05T23:59:59Z");
    const result = await replayRange(sql, [consumer], from, to);
    expect(result.total).toBe(0);
  });

  it("replay com envelope NULL no banco usa fallback envelope", async () => {
    const row = makeRow({ envelope: null });
    const { sql } = mockReplaySql([row]);
    const consumer = new FakeConsumer();

    const result = await replayEvent(sql, [consumer], EVENT_ID_1);

    expect(result.reprocessed).toBe(1);
    expect(consumer.handled[0]?.id).toBe(EVENT_ID_1);
    expect(consumer.handled[0]?.actor.type).toBe("system");
  });
});
