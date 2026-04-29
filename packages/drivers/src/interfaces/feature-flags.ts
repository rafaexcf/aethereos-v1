import type { Result } from "../types/result.js";
import type { TenantContext } from "../types/tenant-context.js";
import type { NetworkError } from "../errors.js";

export type FeatureFlagDriverError = NetworkError;

export interface FlagContext {
  tenantContext: TenantContext;
  properties?: Record<string, unknown>;
}

/**
 * FeatureFlagDriver — contrato para feature flags com rollout gradual.
 *
 * Implementação: Unleash self-hosted (ADR-0014 #8 [DEC]).
 * Unleash entrega: rollout gradual, segmentação por tenant/plano, kill switch,
 * audit e UI de gestão.
 *
 * NUNCA use tabela ad-hoc no banco para feature flags (CLAUDE.md seção 5 bloqueio).
 *
 * Ref: ADR-0014 #8, Fundamentação 4.7 [INV]
 */
export interface FeatureFlagDriver {
  /** Avalia flag para contexto de tenant/actor */
  isEnabled(
    flagName: string,
    context: FlagContext,
  ): Promise<Result<boolean, FeatureFlagDriverError>>;

  /**
   * Avalia flag com variante (A/B testing).
   * Retorna nome da variante ou 'disabled'.
   */
  getVariant(
    flagName: string,
    context: FlagContext,
  ): Promise<Result<string, FeatureFlagDriverError>>;

  ping(): Promise<Result<void, FeatureFlagDriverError>>;
}
