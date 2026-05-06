import { describe, it, expect, beforeEach } from "vitest";
import { PolicyEngine } from "../src/policy/PolicyEngine.js";
import type {
  ActionIntentRow,
  PolicyDataSource,
  PolicyResult,
  PolicyRow,
} from "../src/policy/types.js";

const COMPANY = "11111111-2222-3333-4444-555555555555";
const ACTOR = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

interface InsertedEvaluation {
  policyId: string | null;
  intentId: string;
  result: PolicyResult;
  reason: string;
  matchedRules: object[];
}

class FakeDataSource implements PolicyDataSource {
  constructor(
    public policies: PolicyRow[],
    public intents: Record<string, ActionIntentRow> = {},
  ) {}

  inserts: InsertedEvaluation[] = [];

  async listActivePolicies(_companyId: string): Promise<PolicyRow[]> {
    return this.policies.filter((p) => p.status === "active");
  }

  async getActionIntent(intentId: string): Promise<ActionIntentRow | null> {
    return this.intents[intentId] ?? null;
  }

  async insertEvaluation(args: {
    policyId: string | null;
    intentId: string;
    result: PolicyResult;
    reason: string;
    matchedRules: object[];
  }): Promise<string | null> {
    this.inserts.push({
      policyId: args.policyId,
      intentId: args.intentId,
      result: args.result,
      reason: args.reason,
      matchedRules: args.matchedRules,
    });
    return `eval-${this.inserts.length}`;
  }
}

function makePolicy(
  id: string,
  name: string,
  json: PolicyRow["policy_json"],
  appliesTo?: PolicyRow["applies_to"],
): PolicyRow {
  return {
    id,
    company_id: COMPANY,
    name,
    policy_json: json,
    status: "active",
    version: 1,
    ...(appliesTo !== undefined ? { applies_to: appliesTo } : {}),
  };
}

const RISK_A_INTENT: ActionIntentRow = {
  id: "kernel.contact.create",
  category: "kernel",
  description: "",
  risk_class: "A",
};

const RISK_C_INTENT: ActionIntentRow = {
  id: "kernel.user.remove",
  category: "kernel",
  description: "",
  risk_class: "C",
};

describe("PolicyEngine", () => {
  let ds: FakeDataSource;
  let engine: PolicyEngine;

  beforeEach(() => {
    ds = new FakeDataSource([], {
      "kernel.contact.create": RISK_A_INTENT,
      "kernel.user.remove": RISK_C_INTENT,
    });
    engine = new PolicyEngine(ds);
  });

  it("deny rule blocks action with reason", async () => {
    ds.policies = [
      makePolicy("p1", "Bloqueia remoção de user", {
        rules: [
          {
            type: "deny",
            intents: ["kernel.user.remove"],
            reason: "Remoção de usuário requer aprovação manual.",
          },
        ],
      }),
    ];
    const out = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.user.remove",
      actorId: ACTOR,
      actorType: "agent",
      parameters: {},
    });
    expect(out.result).toBe("deny");
    expect(out.matchedPolicies).toHaveLength(1);
    expect(out.reason).toContain("Remoção");
  });

  it("allow rule permits action", async () => {
    ds.policies = [
      makePolicy("p1", "Permite criar contato", {
        rules: [{ type: "allow", intents: ["kernel.contact.create"] }],
      }),
    ];
    const out = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: { name: "Foo" },
    });
    expect(out.result).toBe("allow");
  });

  it("require_approval_if escalates with numeric threshold", async () => {
    ds.policies = [
      makePolicy("p1", "Aprovação acima de 20k", {
        rules: [
          {
            type: "require_approval_if",
            intents: ["kernel.contact.create"],
            when: { amount: { above: 20000 } },
          },
        ],
      }),
    ];
    const out = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: { amount: 25000 },
    });
    expect(out.result).toBe("require_approval");
  });

  it("deny prevails over allow within same policy", async () => {
    ds.policies = [
      makePolicy("p1", "Mixed", {
        rules: [
          { type: "allow", intents: ["kernel.contact.create"] },
          {
            type: "deny",
            intents: ["kernel.contact.create"],
            reason: "Override deny",
          },
        ],
      }),
    ];
    const out = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: {},
    });
    expect(out.result).toBe("deny");
  });

  it("user without policy → allow (default)", async () => {
    const out = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "user",
      parameters: {},
    });
    expect(out.result).toBe("allow");
    expect(out.matchedPolicies).toHaveLength(0);
  });

  it("agent without policy → require_approval (default)", async () => {
    const out = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: {},
    });
    expect(out.result).toBe("require_approval");
  });

  it("amount max condition matches when value within bound", async () => {
    ds.policies = [
      makePolicy("p1", "Allow under 50k", {
        rules: [
          {
            type: "allow",
            intents: ["kernel.contact.create"],
            when: { amount: { max: 50000 } },
          },
        ],
      }),
    ];
    const allow = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: { amount: 30000 },
    });
    expect(allow.result).toBe("allow");

    // Above bound: rule does not match → fallback default for agent
    const escalated = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: { amount: 60000 },
    });
    expect(escalated.result).toBe("require_approval");
  });

  it("hour_of_day window restricts allow", async () => {
    ds.policies = [
      makePolicy("p1", "Business hours only", {
        rules: [
          {
            type: "allow",
            intents: ["kernel.contact.create"],
            when: { hour_of_day: { min: "09:00", max: "18:00" } },
          },
        ],
      }),
    ];
    const inHours = await engine.evaluate(
      {
        companyId: COMPANY,
        intentId: "kernel.contact.create",
        actorId: ACTOR,
        actorType: "agent",
        parameters: {},
      },
      { nowHourOfDay: "10:30" },
    );
    expect(inHours.result).toBe("allow");

    const outOfHours = await engine.evaluate(
      {
        companyId: COMPANY,
        intentId: "kernel.contact.create",
        actorId: ACTOR,
        actorType: "agent",
        parameters: {},
      },
      { nowHourOfDay: "22:00" },
    );
    expect(outOfHours.result).toBe("require_approval");
  });

  it("evaluation is recorded in policy_evaluations", async () => {
    ds.policies = [
      makePolicy("p1", "Allow create", {
        rules: [{ type: "allow", intents: ["kernel.contact.create"] }],
      }),
    ];
    await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: { name: "X" },
    });
    expect(ds.inserts).toHaveLength(1);
    expect(ds.inserts[0]?.intentId).toBe("kernel.contact.create");
    expect(ds.inserts[0]?.result).toBe("allow");
    expect(ds.inserts[0]?.policyId).toBe("p1");
  });

  it("dryRun does NOT insert evaluation (simulation mode)", async () => {
    ds.policies = [
      makePolicy("p1", "Allow", {
        rules: [{ type: "allow", intents: ["kernel.contact.create"] }],
      }),
    ];
    await engine.evaluate(
      {
        companyId: COMPANY,
        intentId: "kernel.contact.create",
        actorId: ACTOR,
        actorType: "agent",
        parameters: {},
      },
      { dryRun: true },
    );
    expect(ds.inserts).toHaveLength(0);
  });

  it("risk_class condition matches intent class", async () => {
    ds.policies = [
      makePolicy("p1", "Block risk C", {
        rules: [
          {
            type: "deny",
            when: { risk_class: { in: ["C"] } },
          },
        ],
      }),
    ];
    const blocked = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.user.remove",
      actorId: ACTOR,
      actorType: "agent",
      parameters: {},
    });
    expect(blocked.result).toBe("deny");

    const allowed = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: {},
    });
    // No deny match → default for agent = require_approval
    expect(allowed.result).toBe("require_approval");
  });

  it("applies_to filter respects actor_type", async () => {
    ds.policies = [
      makePolicy(
        "p1",
        "Agents only",
        {
          rules: [
            {
              type: "deny",
              intents: ["kernel.contact.create"],
              reason: "Agent forbidden",
            },
          ],
        },
        { actor_type: "agent" },
      ),
    ];
    // User: filter does not apply → default allow.
    const userResult = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "user",
      parameters: {},
    });
    expect(userResult.result).toBe("allow");

    // Agent: filter applies → deny.
    const agentResult = await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: {},
    });
    expect(agentResult.result).toBe("deny");
  });

  it("cache is reused within TTL", async () => {
    ds.policies = [
      makePolicy("p1", "Allow", {
        rules: [{ type: "allow", intents: ["kernel.contact.create"] }],
      }),
    ];
    let listCalls = 0;
    const origList = ds.listActivePolicies.bind(ds);
    ds.listActivePolicies = async (cid: string) => {
      listCalls++;
      return origList(cid);
    };

    await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: {},
    });
    await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: {},
    });
    expect(listCalls).toBe(1);

    engine.invalidateCache(COMPANY);
    await engine.evaluate({
      companyId: COMPANY,
      intentId: "kernel.contact.create",
      actorId: ACTOR,
      actorType: "agent",
      parameters: {},
    });
    expect(listCalls).toBe(2);
  });
});
