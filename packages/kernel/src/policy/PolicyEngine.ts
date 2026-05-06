/**
 * Super Sprint A / MX199 — PolicyEngine runtime.
 *
 * Avalia ação proposta (intent_id + parâmetros) contra policies ativas da
 * company e retorna allow / deny / require_approval. Append-only audit
 * em kernel.policy_evaluations.
 *
 * Invariantes (R8): deny prevalece sobre allow. require_approval prevalece
 * sobre allow quando deny não estiver presente.
 *
 * Default behavior (sem policy match):
 *   actor_type='user'  → allow (compatibilidade — owner/admin bypass)
 *   actor_type='agent' → require_approval (segurança por default)
 *
 * Performance: cache de policies ativas por company por 5 min.
 *
 * O engine NÃO depende de Driver concreto — recebe um objeto `dataSource`
 * mínimo com listActivePolicies() e insertEvaluation(). Implementações
 * podem usar Supabase, Drizzle, postgres puro, ou mock para testes.
 */

import { evaluateConditions, type EvaluationContext } from "./conditions.js";
import type {
  ActionIntentRow,
  ActorType,
  AllowRule,
  AppliesTo,
  DenyRule,
  MatchedPolicy,
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  PolicyResult,
  PolicyRow,
  PolicyRule,
  RequireApprovalRule,
} from "./types.js";

export interface PolicyDataSource {
  /** Retorna policies ativas da company. */
  listActivePolicies(companyId: string): Promise<PolicyRow[]>;
  /** Resolve metadata do intent (risk_class, etc). Retorna null se não existir. */
  getActionIntent(intentId: string): Promise<ActionIntentRow | null>;
  /** Insere row em policy_evaluations. Retorna o id gerado, ou null em dryRun. */
  insertEvaluation(args: {
    companyId: string;
    policyId: string | null;
    intentId: string;
    actorId: string;
    actorType: ActorType;
    parameters: Record<string, unknown>;
    result: PolicyResult;
    matchedRules: object[];
    reason: string;
    proposalId?: string;
  }): Promise<string | null>;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

interface CacheEntry {
  policies: PolicyRow[];
  expiresAt: number;
}

export interface PolicyEngineOptions {
  /** Modo dry-run não escreve em policy_evaluations (usado em simulação). */
  dryRun?: boolean;
  /** Hora corrente injetada (para testes determinísticos). */
  nowHourOfDay?: string;
}

export class PolicyEngine {
  readonly #dataSource: PolicyDataSource;
  readonly #cache = new Map<string, CacheEntry>();

  constructor(dataSource: PolicyDataSource) {
    this.#dataSource = dataSource;
  }

  /** Limpa o cache de policies. Chamar após criar/atualizar/desativar policy. */
  invalidateCache(companyId?: string): void {
    if (companyId === undefined) {
      this.#cache.clear();
    } else {
      this.#cache.delete(companyId);
    }
  }

  async evaluate(
    input: PolicyEvaluationInput,
    options: PolicyEngineOptions = {},
  ): Promise<PolicyEvaluationResult> {
    const policies = await this.#getActivePolicies(input.companyId);
    const intent = await this.#dataSource.getActionIntent(input.intentId);

    const ctx: EvaluationContext = {
      parameters: input.parameters,
      hourOfDay: options.nowHourOfDay ?? formatHourOfDay(new Date()),
      ...(intent?.risk_class !== undefined
        ? { riskClass: intent.risk_class }
        : {}),
    };

    // Filtra policies aplicáveis ao actor + intent.
    const applicable = policies.filter((p) =>
      isPolicyApplicable(p, input.actorType, input.intentId),
    );

    let denyMatch: { policy: PolicyRow; rule: DenyRule } | null = null;
    let requireApprovalMatch: {
      policy: PolicyRow;
      rule: RequireApprovalRule;
    } | null = null;
    let allowMatch: { policy: PolicyRow; rule: AllowRule } | null = null;

    for (const policy of applicable) {
      for (const rule of policy.policy_json.rules ?? []) {
        if (!isRuleApplicable(rule, input.intentId)) continue;
        if (!evaluateConditions(rule.when, ctx)) continue;
        if (rule.type === "deny") {
          denyMatch = { policy, rule };
          break; // R8 — deny short-circuit dentro da policy.
        }
        if (rule.type === "require_approval_if" && !requireApprovalMatch) {
          requireApprovalMatch = { policy, rule };
        } else if (rule.type === "allow" && !allowMatch) {
          allowMatch = { policy, rule };
        }
      }
      if (denyMatch !== null) break; // R8 — deny global short-circuit.
    }

    // Resolve resultado final.
    let result: PolicyResult;
    let matchedPolicies: MatchedPolicy[] = [];
    let reason: string;

    if (denyMatch !== null) {
      result = "deny";
      matchedPolicies = [
        {
          policyId: denyMatch.policy.id,
          policyName: denyMatch.policy.name,
          matchedRule: denyMatch.rule as object,
        },
      ];
      reason =
        denyMatch.rule.reason ??
        `Bloqueado pela política '${denyMatch.policy.name}'.`;
    } else if (requireApprovalMatch !== null) {
      result = "require_approval";
      matchedPolicies = [
        {
          policyId: requireApprovalMatch.policy.id,
          policyName: requireApprovalMatch.policy.name,
          matchedRule: requireApprovalMatch.rule as object,
        },
      ];
      reason =
        requireApprovalMatch.rule.reason ??
        `Requer aprovação humana segundo política '${requireApprovalMatch.policy.name}'.`;
    } else if (allowMatch !== null) {
      result = "allow";
      matchedPolicies = [
        {
          policyId: allowMatch.policy.id,
          policyName: allowMatch.policy.name,
          matchedRule: allowMatch.rule as object,
        },
      ];
      reason = `Permitido pela política '${allowMatch.policy.name}'.`;
    } else {
      // Sem policy match: defaults por actor_type.
      if (input.actorType === "user") {
        result = "allow";
        reason =
          "Sem política aplicável; ações de usuário humano são permitidas por padrão.";
      } else {
        result = "require_approval";
        reason =
          "Sem política aplicável; ações de agente requerem aprovação humana por padrão.";
      }
    }

    // Persiste evaluation (append-only).
    let evaluationId: string | null = null;
    if (!options.dryRun) {
      evaluationId = await this.#dataSource.insertEvaluation({
        companyId: input.companyId,
        policyId: matchedPolicies[0]?.policyId ?? null,
        intentId: input.intentId,
        actorId: input.actorId,
        actorType: input.actorType,
        parameters: input.parameters,
        result,
        matchedRules: matchedPolicies.map((m) => m.matchedRule),
        reason,
        ...(input.proposalId !== undefined
          ? { proposalId: input.proposalId }
          : {}),
      });
    }

    return { result, matchedPolicies, reason, evaluationId };
  }

  async #getActivePolicies(companyId: string): Promise<PolicyRow[]> {
    const cached = this.#cache.get(companyId);
    const now = Date.now();
    if (cached !== undefined && cached.expiresAt > now) {
      return cached.policies;
    }
    const fresh = await this.#dataSource.listActivePolicies(companyId);
    this.#cache.set(companyId, {
      policies: fresh,
      expiresAt: now + CACHE_TTL_MS,
    });
    return fresh;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isPolicyApplicable(
  policy: PolicyRow,
  actorType: ActorType,
  intentId: string,
): boolean {
  const filter = (policy.applies_to ??
    policy.policy_json.applies_to ??
    {}) as AppliesTo;
  // actor_type filter
  if (filter.actor_type !== undefined && filter.actor_type !== "*") {
    if (filter.actor_type !== actorType) return false;
  }
  // intent_ids filter (whitelist se presente)
  if (Array.isArray(filter.intent_ids) && filter.intent_ids.length > 0) {
    if (
      !filter.intent_ids.includes(intentId) &&
      !filter.intent_ids.includes("*")
    ) {
      return false;
    }
  }
  return true;
}

function isRuleApplicable(rule: PolicyRule, intentId: string): boolean {
  if (Array.isArray(rule.intents) && rule.intents.length > 0) {
    return rule.intents.includes(intentId) || rule.intents.includes("*");
  }
  return true;
}

function formatHourOfDay(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
