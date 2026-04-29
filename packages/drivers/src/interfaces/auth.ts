import type { Result } from "../types/result.js";
import type { Actor } from "../types/tenant-context.js";
import type { AuthError, NetworkError, ValidationError } from "../errors.js";

export type AuthDriverError = AuthError | NetworkError | ValidationError;

export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // Unix timestamp
  user_id: string;
  email?: string;
}

export interface CapabilityToken {
  /** Agente ao qual pertencem as capabilities */
  agent_id: string;
  /** Humano supervisor obrigatório — Interpretação A+ */
  supervising_user_id: string;
  /** Capabilities são SEMPRE subconjunto das do humano supervisor */
  capabilities: string[];
  expires_at: number;
  signature: string; // Ed25519
}

export interface AuthVerifyResult {
  actor: Actor;
  company_id: string;
  capabilities: string[];
}

/**
 * AuthDriver — contrato para autenticação e verificação de sessão/JWT.
 *
 * Supabase Auth opera como IdP central em idp.aethereos.com via OAuth 2.1 + OIDC + PKCE.
 * Zitadel/Keycloak como federado opcional na Fase 3+ para SAML enterprise.
 *
 * Garantias:
 * - Capability tokens de agentes são SEMPRE subconjunto das do humano supervisor (Interpretação A+)
 * - JWT TTL 15min para tokens de agente
 * - Verificação de claims sem chamada a servidor (verificação local de JWT assinado)
 *
 * Ref: Fundamentação 10.6 [INV], ADR-0014 #4, ADR-0001 seção 2
 */
export interface AuthDriver {
  /**
   * Verifica e decodifica um JWT de acesso.
   * Não faz chamada de rede — validação local com chave pública Ed25519 do IdP.
   */
  verifyToken(
    token: string,
  ): Promise<Result<AuthVerifyResult, AuthDriverError>>;

  /** Obtém sessão atual (para contexto de servidor) */
  getSession(): Promise<Result<Session | null, AuthDriverError>>;

  /** Emite capability token para agente (sempre subconjunto das capabilities do supervisor) */
  issueCapabilityToken(params: {
    agent_id: string;
    supervising_user_id: string;
    requested_capabilities: string[];
    ttl_seconds?: number;
  }): Promise<Result<CapabilityToken, AuthDriverError>>;

  /** Revoga sessão ou token */
  revoke(token: string): Promise<Result<void, AuthDriverError>>;

  ping(): Promise<Result<void, AuthDriverError>>;
}
