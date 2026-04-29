import {
  createClient,
  type SupabaseClient,
  type AuthChangeEvent,
  type Subscription,
} from "@supabase/supabase-js";
import type {
  AuthDriver,
  Session,
  CapabilityToken,
  AuthVerifyResult,
  Result,
} from "@aethereos/drivers";
import { ok, err, AuthError, NetworkError } from "@aethereos/drivers";

export interface SupabaseBrowserAuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

type AuthDriverError = AuthError | NetworkError;

/**
 * Browser-side Supabase Auth driver.
 *
 * Usa anon key (segura para browser). PKCE é habilitado automaticamente
 * pelo cliente Supabase JS quando rodando no browser. Operações sensíveis
 * (emissão de capability tokens para agentes) ficam no server-side.
 *
 * Ref: Fundamentação 10.6 [INV], ADR-0014 #4, SECURITY_GUIDELINES seção 10
 */
export class SupabaseBrowserAuthDriver implements AuthDriver {
  readonly #client: SupabaseClient;
  #activeCompanyId: string | null = null;

  constructor(config: SupabaseBrowserAuthConfig) {
    this.#client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }

  /** Registra listener para mudanças de estado auth (útil para Zustand store) */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ): { data: { subscription: Subscription } } {
    return this.#client.auth.onAuthStateChange((event, supabaseSession) => {
      const session = this.#mapSession(supabaseSession);
      callback(event, session);
    });
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<Result<Session, AuthDriverError>> {
    try {
      const { data, error } = await this.#client.auth.signInWithPassword({
        email,
        password,
      });
      if (error !== null || data.session === null) {
        return err(new AuthError(error?.message ?? "sign in failed"));
      }
      const session = this.#mapSession(data.session);
      if (session === null) {
        return err(new AuthError("empty session after sign in"));
      }
      return ok(session);
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  async signInWithMagicLink(
    email: string,
  ): Promise<Result<void, AuthDriverError>> {
    try {
      const { error } = await this.#client.auth.signInWithOtp({ email });
      if (error !== null) {
        return err(new AuthError(error.message));
      }
      return ok(undefined);
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  async signUp(
    email: string,
    password: string,
  ): Promise<
    Result<{ userId: string; needsConfirmation: boolean }, AuthDriverError>
  > {
    try {
      const { data, error } = await this.#client.auth.signUp({
        email,
        password,
      });
      if (error !== null) {
        return err(new AuthError(error.message));
      }
      if (data.user === null) {
        return err(new AuthError("sign up returned no user"));
      }
      return ok({
        userId: data.user.id,
        needsConfirmation: data.session === null,
      });
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  async signOut(): Promise<Result<void, AuthDriverError>> {
    try {
      const { error } = await this.#client.auth.signOut();
      if (error !== null) {
        return err(new AuthError(error.message));
      }
      this.#activeCompanyId = null;
      return ok(undefined);
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  async getSession(): Promise<Result<Session | null, AuthDriverError>> {
    try {
      const { data, error } = await this.#client.auth.getSession();
      if (error !== null) {
        return err(new AuthError(error.message));
      }
      return ok(this.#mapSession(data.session));
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  async refreshSession(): Promise<Result<Session, AuthDriverError>> {
    try {
      const { data, error } = await this.#client.auth.refreshSession();
      if (error !== null || data.session === null) {
        return err(new AuthError(error?.message ?? "refresh failed"));
      }
      const session = this.#mapSession(data.session);
      if (session === null) {
        return err(new AuthError("empty session after refresh"));
      }
      return ok(session);
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  /**
   * Define a company ativa para a sessão corrente.
   * Persiste no estado do driver; o shell usa este valor para:
   * - Definir `active_company_id` no Zustand store
   * - Chamar `kernel.set_tenant_context()` antes de queries DB
   */
  withCompanyContext(companyId: string): void {
    this.#activeCompanyId = companyId;
  }

  getActiveCompanyId(): string | null {
    return this.#activeCompanyId;
  }

  /**
   * Extrai companies e active_company_id dos JWT claims (injetados pelo hook).
   * Retorna arrays vazios se token não tem claims customizados ainda.
   */
  async getCompanyClaims(): Promise<{
    companies: string[];
    activeCompanyId: string | null;
  }> {
    const { data } = await this.#client.auth.getSession();
    if (data.session === null) return { companies: [], activeCompanyId: null };

    const claims = data.session.user.app_metadata as Record<string, unknown>;
    const companies = (claims["companies"] as string[] | undefined) ?? [];
    const activeCompanyId =
      (claims["active_company_id"] as string | null | undefined) ?? null;

    return { companies, activeCompanyId };
  }

  // AuthDriver interface methods (server-side operations — delegates to Supabase)

  async verifyToken(
    token: string,
  ): Promise<Result<AuthVerifyResult, AuthDriverError>> {
    try {
      const { data, error } = await this.#client.auth.getUser(token);
      if (error !== null || data.user === null) {
        return err(new AuthError(error?.message ?? "invalid token"));
      }
      const user = data.user;
      const companyId =
        (user.user_metadata?.["company_id"] as string | undefined) ?? "";
      const capabilities =
        (user.user_metadata?.["capabilities"] as string[] | undefined) ?? [];

      return ok({
        actor: { type: "human", user_id: user.id },
        company_id: companyId,
        capabilities,
      });
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  async issueCapabilityToken(params: {
    agent_id: string;
    supervising_user_id: string;
    requested_capabilities: string[];
    ttl_seconds?: number;
  }): Promise<Result<CapabilityToken, AuthDriverError>> {
    // Browser clients não emitem capability tokens diretamente.
    // Esta operação deve ir para uma Edge Function server-side em produção.
    const ttl = params.ttl_seconds ?? 900;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const payload = JSON.stringify({
      agent_id: params.agent_id,
      supervising_user_id: params.supervising_user_id,
      capabilities: params.requested_capabilities,
      expires_at: expiresAt,
    });
    const signature = btoa(payload);

    return ok({
      agent_id: params.agent_id,
      supervising_user_id: params.supervising_user_id,
      capabilities: params.requested_capabilities,
      expires_at: expiresAt,
      signature,
    });
  }

  async revoke(token: string): Promise<Result<void, AuthDriverError>> {
    try {
      const { error } = await this.#client.auth.admin.signOut(token);
      if (error !== null) {
        return err(new AuthError(error.message));
      }
      return ok(undefined);
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  async ping(): Promise<Result<void, AuthDriverError>> {
    try {
      const { error } = await this.#client.auth.getSession();
      if (error !== null) {
        return err(new AuthError(error.message));
      }
      return ok(undefined);
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }

  #mapSession(
    s: {
      access_token: string;
      refresh_token?: string;
      expires_at?: number;
      user: { id: string; email?: string };
    } | null,
  ): Session | null {
    if (s === null) return null;
    return {
      access_token: s.access_token,
      ...(s.refresh_token !== undefined && s.refresh_token !== ""
        ? { refresh_token: s.refresh_token }
        : {}),
      expires_at: s.expires_at ?? 0,
      user_id: s.user.id,
      ...(s.user.email !== undefined ? { email: s.user.email } : {}),
    };
  }
}
