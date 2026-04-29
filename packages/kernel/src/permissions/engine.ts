import type { Actor } from "@aethereos/drivers";
import type { Capability } from "./capability.js";
import { isInvariantOperation } from "../invariants/operations.js";

export interface AuthorizationResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

/**
 * PermissionEngine — motor de autorização baseado em capabilities.
 *
 * Dois controles invariantes:
 * 1. Agentes nunca têm capabilities além das do humano supervisor
 * 2. Operações invariantes (Fundamentação 12.4) são bloqueadas para agentes com autonomy > 0
 *
 * Ref: Fundamentação 4.9 [INV], 12.4 [INV], ADR-0001 (Interpretação A+)
 */
export class PermissionEngine {
  /**
   * Verifica se um actor pode executar uma operação com a capability requerida.
   * Para agentes: verifica se autonomy_level permite a operação, e se a capability
   * está no token do agente (subconjunto das do supervisor).
   */
  can(
    actor: Actor,
    requiredCapability: Capability,
    operationId?: string,
  ): AuthorizationResult {
    // Operações invariantes nunca executam automaticamente (Fundamentação 12.4 [INV])
    if (
      operationId !== undefined &&
      isInvariantOperation(operationId) &&
      actor.type === "agent"
    ) {
      return {
        allowed: false,
        reason: `Operação invariante '${operationId}' não pode ser executada por agente autonomamente. Requer aprovação humana explícita (Fundamentação 12.4 [INV]).`,
      };
    }

    if (actor.type === "human" || actor.type === "system") {
      // Verificação de capability para humanos/sistema é responsabilidade do caller
      // (via membership roles + capability derivation de tenant/membership)
      return { allowed: true };
    }

    // actor.type === "agent"
    // Agente: verifica capability_token e autonomy constraints
    if (actor.capability_token === undefined) {
      return {
        allowed: false,
        reason:
          "Agente sem capability_token válido não pode executar operações",
      };
    }

    // Verificação de capability específica é feita via AuthDriver.verifyToken()
    // Esta engine apenas aplica as regras estruturais
    return {
      allowed: true,
      reason: `Capability '${requiredCapability}' verificada via token — validação de claims em AuthDriver`,
    };
  }
}
