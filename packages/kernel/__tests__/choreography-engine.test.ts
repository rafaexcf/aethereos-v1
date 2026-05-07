import { describe, it, expect } from "vitest";
import { ChoreographyEngine } from "../src/choreography/ChoreographyEngine.js";
import type {
  ChoreographyDataSource,
  ChoreographyRow,
  ChoreographyTriggerEvent,
} from "../src/choreography/types.js";

const COMPANY = "11111111-2222-3333-4444-555555555555";
const EVENT_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

class FakeDataSource implements ChoreographyDataSource {
  constructor(public rows: ChoreographyRow[]) {}
  starts: Array<{ choreographyId: string }> = [];
  stepsCompleted: Array<{ executionId: string; stepId: string }> = [];
  finished: Array<{ executionId: string; status: string; error?: string }> = [];
  incremented: string[] = [];

  async findActiveByTrigger(
    eventType: string,
    companyId: string,
  ): Promise<ChoreographyRow[]> {
    return this.rows.filter(
      (r) =>
        r.trigger_event_type === eventType &&
        r.company_id === companyId &&
        r.status === "active",
    );
  }
  async startExecution(input: {
    choreographyId: string;
  }): Promise<{ executionId: string }> {
    this.starts.push({ choreographyId: input.choreographyId });
    return { executionId: `exec-${this.starts.length}` };
  }
  async recordStepCompleted(
    executionId: string,
    stepId: string,
  ): Promise<void> {
    this.stepsCompleted.push({ executionId, stepId });
  }
  async finishExecution(input: {
    executionId: string;
    status: "completed" | "failed" | "cancelled";
    error?: string;
  }): Promise<void> {
    const entry: { executionId: string; status: string; error?: string } = {
      executionId: input.executionId,
      status: input.status,
    };
    if (input.error !== undefined) entry.error = input.error;
    this.finished.push(entry);
  }
  async incrementExecutionCount(choreographyId: string): Promise<void> {
    this.incremented.push(choreographyId);
  }
}

function makeRow(overrides: Partial<ChoreographyRow> = {}): ChoreographyRow {
  return {
    id: "chor-1",
    company_id: COMPANY,
    name: "test",
    description: "",
    status: "active",
    trigger_event_type: "kernel.contact.created",
    trigger_condition: null,
    steps: [],
    error_handling: { on_failure: "notify_human" },
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<ChoreographyTriggerEvent> = {},
): ChoreographyTriggerEvent {
  return {
    eventId: EVENT_ID,
    eventType: "kernel.contact.created",
    companyId: COMPANY,
    payload: { full_name: "Alice" },
    actorId: "actor-1",
    actorType: "user",
    ...overrides,
  };
}

describe("ChoreographyEngine — match", () => {
  it("returns match when active choreography matches event_type", async () => {
    const ds = new FakeDataSource([makeRow()]);
    const engine = new ChoreographyEngine(ds, { cacheTtlMs: 0 });
    const matches = await engine.match(makeEvent());
    expect(matches).toHaveLength(1);
    expect(matches[0]?.choreography.id).toBe("chor-1");
  });

  it("ignores draft / paused / archived", async () => {
    const ds = new FakeDataSource([
      makeRow({ id: "draft", status: "draft" }),
      makeRow({ id: "paused", status: "paused" }),
      makeRow({ id: "archived", status: "archived" }),
    ]);
    const engine = new ChoreographyEngine(ds, { cacheTtlMs: 0 });
    const matches = await engine.match(makeEvent());
    expect(matches).toHaveLength(0);
  });

  it("filters by trigger_event_type", async () => {
    const ds = new FakeDataSource([
      makeRow({ id: "task", trigger_event_type: "kernel.task.overdue" }),
    ]);
    const engine = new ChoreographyEngine(ds, { cacheTtlMs: 0 });
    const matches = await engine.match(
      makeEvent({ eventType: "kernel.contact.created" }),
    );
    expect(matches).toHaveLength(0);
  });

  it("filters by company_id", async () => {
    const ds = new FakeDataSource([makeRow({ company_id: "other-company" })]);
    const engine = new ChoreographyEngine(ds, { cacheTtlMs: 0 });
    const matches = await engine.match(makeEvent());
    expect(matches).toHaveLength(0);
  });

  it("evaluates trigger_condition (equals)", async () => {
    const ds = new FakeDataSource([
      makeRow({
        id: "match",
        trigger_condition: { priority: { equals: "urgent" } },
      }),
    ]);
    const engine = new ChoreographyEngine(ds, { cacheTtlMs: 0 });
    const matches1 = await engine.match(
      makeEvent({ payload: { priority: "urgent" } }),
    );
    expect(matches1).toHaveLength(1);
    const matches2 = await engine.match(
      makeEvent({ payload: { priority: "low" } }),
    );
    expect(matches2).toHaveLength(0);
  });

  it("caches lookups within TTL", async () => {
    const ds = new FakeDataSource([makeRow()]);
    let calls = 0;
    ds.findActiveByTrigger = async () => {
      calls += 1;
      return [makeRow()];
    };
    const engine = new ChoreographyEngine(ds, { cacheTtlMs: 60_000 });
    await engine.match(makeEvent());
    await engine.match(makeEvent());
    expect(calls).toBe(1);
  });
});

describe("ChoreographyEngine — start / finish", () => {
  it("creates execution and increments counter", async () => {
    const ds = new FakeDataSource([makeRow()]);
    const engine = new ChoreographyEngine(ds);
    const matches = await engine.match(makeEvent());
    const executionId = await engine.start(matches[0]!);
    expect(executionId).toBe("exec-1");
    expect(ds.starts).toHaveLength(1);
    expect(ds.incremented).toEqual(["chor-1"]);
  });

  it("records step completion and finish", async () => {
    const ds = new FakeDataSource([makeRow()]);
    const engine = new ChoreographyEngine(ds);
    const matches = await engine.match(makeEvent());
    const executionId = await engine.start(matches[0]!);
    await engine.recordStepCompleted(executionId, "step-1");
    await engine.finish(executionId, "completed");
    expect(ds.stepsCompleted).toEqual([
      { executionId: "exec-1", stepId: "step-1" },
    ]);
    expect(ds.finished).toEqual([
      { executionId: "exec-1", status: "completed" },
    ]);
  });

  it("propagates error reason on failure", async () => {
    const ds = new FakeDataSource([]);
    const engine = new ChoreographyEngine(ds);
    await engine.finish("exec-x", "failed", "boom");
    expect(ds.finished).toEqual([
      { executionId: "exec-x", status: "failed", error: "boom" },
    ]);
  });
});

describe("ChoreographyEngine — resolveTemplates", () => {
  it("substitutes trigger.payload paths", () => {
    const ds = new FakeDataSource([]);
    const engine = new ChoreographyEngine(ds);
    const out = engine.resolveTemplates(
      "Novo: {{trigger.payload.full_name}}",
      makeEvent({ payload: { full_name: "Alice" } }),
    );
    expect(out).toBe("Novo: Alice");
  });

  it("resolves trigger.actor_id and event_type", () => {
    const ds = new FakeDataSource([]);
    const engine = new ChoreographyEngine(ds);
    const out = engine.resolveTemplates(
      "actor:{{trigger.actor_id}} type:{{trigger.event_type}}",
      makeEvent({ actorId: "u-1", eventType: "kernel.x.y" }),
    );
    expect(out).toBe("actor:u-1 type:kernel.x.y");
  });

  it("walks nested objects and arrays", () => {
    const ds = new FakeDataSource([]);
    const engine = new ChoreographyEngine(ds);
    const out = engine.resolveTemplates(
      {
        title: "Olá {{trigger.payload.name}}",
        tags: ["{{trigger.payload.tag}}"],
      },
      makeEvent({ payload: { name: "Bob", tag: "vip" } }),
    );
    expect(out).toEqual({ title: "Olá Bob", tags: ["vip"] });
  });

  it("renders empty string for unknown path", () => {
    const ds = new FakeDataSource([]);
    const engine = new ChoreographyEngine(ds);
    const out = engine.resolveTemplates(
      "[{{trigger.payload.unknown}}]",
      makeEvent({ payload: {} }),
    );
    expect(out).toBe("[]");
  });
});

describe("ChoreographyEngine — stepConditionMatches", () => {
  it("returns true when no condition defined", () => {
    const ds = new FakeDataSource([]);
    const engine = new ChoreographyEngine(ds);
    expect(engine.stepConditionMatches({ id: "s1" }, makeEvent())).toBe(true);
  });

  it("evaluates condition against payload", () => {
    const ds = new FakeDataSource([]);
    const engine = new ChoreographyEngine(ds);
    expect(
      engine.stepConditionMatches(
        { id: "s1", condition: { size_bytes: { above: 1000 } } },
        makeEvent({ payload: { size_bytes: 5000 } }),
      ),
    ).toBe(true);
    expect(
      engine.stepConditionMatches(
        { id: "s1", condition: { size_bytes: { above: 1000 } } },
        makeEvent({ payload: { size_bytes: 100 } }),
      ),
    ).toBe(false);
  });
});
