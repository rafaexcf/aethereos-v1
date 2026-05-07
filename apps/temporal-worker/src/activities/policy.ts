import { querySupabase, insertSupabase } from "./supabase.js";

export interface PolicyEvaluationInput {
  companyId: string;
  intentId: string;
  actorType: "user" | "agent" | "system";
  actorId?: string;
  parameters?: Record<string, unknown>;
}

export type PolicyDecision = "allow" | "deny" | "require_approval";

/**
 * Lightweight policy evaluation for choreography steps.
 *
 * Heuristic (mirrors PolicyEngine semantics): system actors always pass;
 * agent actors require approval by default unless an active policy explicitly
 * allows the intent. The full PolicyEngine ships in @aethereos/kernel and is
 * authoritative for proposals; for choreographies we keep a defensive default.
 */
export async function evaluatePolicy(
  input: PolicyEvaluationInput,
): Promise<PolicyDecision> {
  if (input.actorType === "system" || input.actorType === "user")
    return "allow";

  const policies = await querySupabase({
    table: "kernel.policies",
    filter: { company_id: input.companyId, status: "active" },
  });

  for (const p of policies) {
    const intent = (p as Record<string, unknown>)["intent_id"];
    const decision = (p as Record<string, unknown>)["default_decision"];
    if (intent === input.intentId && decision === "allow") return "allow";
    if (intent === input.intentId && decision === "deny") return "deny";
  }
  return "require_approval";
}

export interface WaitForApprovalParams {
  stepId: string;
  choreographyId: string;
  companyId: string;
  intentId: string;
  parameters?: Record<string, unknown>;
}

/**
 * Persists an approval proposal for a choreography step. The workflow that
 * calls this should pair it with a Temporal signal/timer to await human
 * decision; here we only create the record. Returns the proposal id.
 */
export async function waitForApproval(
  params: WaitForApprovalParams,
): Promise<{ proposalId: string }> {
  const rows = await insertSupabase({
    table: "kernel.choreography_step_approvals",
    data: {
      choreography_id: params.choreographyId,
      step_id: params.stepId,
      company_id: params.companyId,
      intent_id: params.intentId,
      parameters: params.parameters ?? {},
      status: "pending",
    },
    returning: ["id"],
  });
  const id = (rows[0]?.["id"] as string | undefined) ?? "";
  return { proposalId: id };
}
