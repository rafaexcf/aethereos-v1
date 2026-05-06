/**
 * Super Sprint A — Policy Engine types.
 *
 * Conforme Fundamentação 11.4-11.14 (Governance-as-Code).
 */

export type PolicyResult = "allow" | "deny" | "require_approval";

export type ActorType = "user" | "agent";

export interface PolicyEvaluationInput {
  companyId: string;
  intentId: string;
  actorId: string;
  actorType: ActorType;
  parameters: Record<string, unknown>;
  proposalId?: string;
}

export interface MatchedPolicy {
  policyId: string;
  policyName: string;
  matchedRule: object;
}

export interface PolicyEvaluationResult {
  result: PolicyResult;
  matchedPolicies: MatchedPolicy[];
  reason: string;
  evaluationId: string | null;
}

/** Estrutura interna de uma policy_json após parse do YAML. */
export interface PolicyJson {
  applies_to?: AppliesTo;
  rules?: PolicyRule[];
}

export interface AppliesTo {
  /** "agent" | "user" | "*" — default "*". */
  actor_type?: string;
  agent_ids?: string[];
  intent_ids?: string[];
}

export type PolicyRule = AllowRule | DenyRule | RequireApprovalRule;

export interface RuleBase {
  /** Filtro de intents. Se omitido: aplica a todos os intents do applies_to. */
  intents?: string[];
  /** Condicionais sobre params/contexto. */
  when?: ConditionMap;
}

export interface AllowRule extends RuleBase {
  type: "allow";
}

export interface DenyRule extends RuleBase {
  type: "deny";
  reason?: string;
}

export interface RequireApprovalRule extends RuleBase {
  type: "require_approval_if";
  reason?: string;
}

/** Mapa de condições. Cada chave é um param; valor é operador → valor. */
export type ConditionMap = Record<string, ConditionOperator>;

export interface ConditionOperator {
  max?: number | string;
  min?: number | string;
  above?: number;
  below?: number;
  equals?: unknown;
  in?: unknown[];
  not_in?: unknown[];
  contains?: string;
}

/** Linha bruta de kernel.policies. */
export interface PolicyRow {
  id: string;
  company_id: string;
  name: string;
  policy_json: PolicyJson;
  status: "draft" | "active" | "archived";
  applies_to?: AppliesTo;
  version: number;
}

/** Linha bruta de kernel.action_intents. */
export interface ActionIntentRow {
  id: string;
  category: string;
  description: string;
  risk_class: "A" | "B" | "C";
}
