/**
 * Super Sprint A / MX200 — Browser-side wrapper do PolicyEngine.
 *
 * Adapta a interface PolicyDataSource para o DataDriver do shell.
 * O engine roda no browser; queries vão pelo Supabase via DataDriver
 * (RLS garante isolamento por company_id).
 *
 * Mapeia intent_type da proposal (create_person, create_file, etc.)
 * para o action_intent_id (kernel.contact.create, etc.) do catálogo.
 */

import {
  PolicyEngine,
  type ActionIntentRow,
  type PolicyDataSource,
  type PolicyEvaluationInput,
  type PolicyEvaluationResult,
  type PolicyResult,
  type PolicyRow,
} from "@aethereos/kernel";
import type { SupabaseBrowserDataDriver } from "@aethereos/drivers-supabase/browser";

/** Alias local — DataDriver no shell é SupabaseBrowserDataDriver. */
type DataDriver = SupabaseBrowserDataDriver;

/** Mapeia intent_type do Copilot legado → action_intent_id canônico. */
export const INTENT_TYPE_TO_ACTION_ID: Record<string, string> = {
  create_person: "kernel.contact.create",
  create_file: "kernel.file.upload",
  send_notification: "kernel.notification.send",
  update_settings: "kernel.settings.update",
  create_channel: "kernel.channel.create",
};

interface PolicyDbRow {
  id: string;
  company_id: string;
  name: string;
  policy_json: PolicyRow["policy_json"];
  status: PolicyRow["status"];
  applies_to?: PolicyRow["applies_to"];
  version: number;
}

interface ActionIntentDbRow {
  id: string;
  category: string;
  description: string;
  risk_class: ActionIntentRow["risk_class"];
}

interface InsertEvaluationArgs {
  companyId: string;
  policyId: string | null;
  intentId: string;
  actorId: string;
  actorType: "user" | "agent";
  parameters: Record<string, unknown>;
  result: PolicyResult;
  matchedRules: object[];
  reason: string;
  proposalId?: string;
}

class BrowserPolicyDataSource implements PolicyDataSource {
  constructor(private readonly data: DataDriver) {}

  async listActivePolicies(companyId: string): Promise<PolicyRow[]> {
    const { data, error } = (await this.data
      .from("policies")
      .select("id, company_id, name, policy_json, status, applies_to, version")
      .eq("company_id", companyId)
      .eq("status", "active")) as unknown as {
      data: PolicyDbRow[] | null;
      error: unknown;
    };
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id,
      company_id: r.company_id,
      name: r.name,
      policy_json: r.policy_json,
      status: r.status,
      version: r.version,
      ...(r.applies_to !== undefined ? { applies_to: r.applies_to } : {}),
    }));
  }

  async getActionIntent(intentId: string): Promise<ActionIntentRow | null> {
    const { data, error } = (await this.data
      .from("action_intents")
      .select("id, category, description, risk_class")
      .eq("id", intentId)
      .maybeSingle()) as unknown as {
      data: ActionIntentDbRow | null;
      error: unknown;
    };
    if (error || !data) return null;
    return {
      id: data.id,
      category: data.category,
      description: data.description,
      risk_class: data.risk_class,
    };
  }

  async insertEvaluation(args: InsertEvaluationArgs): Promise<string | null> {
    const row: Record<string, unknown> = {
      company_id: args.companyId,
      policy_id: args.policyId,
      intent_id: args.intentId,
      actor_id: args.actorId,
      actor_type: args.actorType,
      parameters: args.parameters,
      result: args.result,
      matched_rules: args.matchedRules,
      reason: args.reason,
    };
    if (args.proposalId !== undefined) row["proposal_id"] = args.proposalId;
    const { data, error } = (await this.data
      .from("policy_evaluations")
      .insert(row)
      .select("id")
      .maybeSingle()) as unknown as {
      data: { id: string } | null;
      error: unknown;
    };
    if (error || !data) return null;
    return data.id;
  }
}

let cachedEngine: { engine: PolicyEngine; data: DataDriver } | null = null;

/** Singleton lazy do PolicyEngine para a sessão atual do browser. */
export function getPolicyEngine(data: DataDriver): PolicyEngine {
  if (cachedEngine !== null && cachedEngine.data === data) {
    return cachedEngine.engine;
  }
  const engine = new PolicyEngine(new BrowserPolicyDataSource(data));
  cachedEngine = { engine, data };
  return engine;
}

/** Re-exports convenientes. */
export type { PolicyEvaluationInput, PolicyEvaluationResult };

/**
 * Helper: avalia uma proposal e retorna o resultado.
 * Mapeia intent_type → action_intent_id.
 * Se intent_type não está no mapa, usa kernel.ai.execute como fallback.
 */
export async function evaluateProposal(
  data: DataDriver,
  args: {
    companyId: string;
    intentType: string;
    actorId: string; // user_id (supervisor) — agente sempre tem supervisor humano
    payload: Record<string, unknown>;
    proposalId: string;
  },
): Promise<PolicyEvaluationResult> {
  const engine = getPolicyEngine(data);
  const intentId =
    INTENT_TYPE_TO_ACTION_ID[args.intentType] ?? "kernel.ai.execute";
  return engine.evaluate({
    companyId: args.companyId,
    intentId,
    actorId: args.actorId,
    actorType: "agent",
    parameters: args.payload,
    proposalId: args.proposalId,
  });
}

/**
 * Invalida cache de policies. Chamar após criar/ativar/desativar policy
 * no Policy Studio.
 */
export function invalidatePolicyCache(
  data: DataDriver,
  companyId: string,
): void {
  const engine = getPolicyEngine(data);
  engine.invalidateCache(companyId);
}
