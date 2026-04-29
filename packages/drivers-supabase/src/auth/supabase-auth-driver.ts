import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AuthDriver,
  Session,
  CapabilityToken,
  AuthVerifyResult,
  Result,
} from "@aethereos/drivers";
import { ok, err, AuthError, NetworkError } from "@aethereos/drivers";

export interface SupabaseAuthConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
}

type AuthDriverError = AuthError | NetworkError;

export class SupabaseAuthDriver implements AuthDriver {
  readonly #client: SupabaseClient;

  constructor(config: SupabaseAuthConfig) {
    this.#client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

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

      const result: AuthVerifyResult = {
        actor: {
          type: "human",
          user_id: user.id,
        },
        company_id: companyId,
        capabilities,
      };
      return ok(result);
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
      if (data.session === null) {
        return ok(null);
      }
      const s = data.session;
      const session: Session = {
        access_token: s.access_token,
        ...(s.refresh_token !== undefined && s.refresh_token !== ""
          ? { refresh_token: s.refresh_token }
          : {}),
        expires_at: s.expires_at ?? 0,
        user_id: s.user.id,
        ...(s.user.email !== undefined ? { email: s.user.email } : {}),
      };
      return ok(session);
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
    const ttl = params.ttl_seconds ?? 900; // 15 min default (Fundamentação A+)
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;

    // In production: sign with Ed25519 key held by the IdP service.
    // Stub: base64-encoded payload used as signature placeholder until Fase 2 auth service.
    const payload = JSON.stringify({
      agent_id: params.agent_id,
      supervising_user_id: params.supervising_user_id,
      capabilities: params.requested_capabilities,
      expires_at: expiresAt,
    });
    const signature = Buffer.from(payload).toString("base64");

    const token: CapabilityToken = {
      agent_id: params.agent_id,
      supervising_user_id: params.supervising_user_id,
      capabilities: params.requested_capabilities,
      expires_at: expiresAt,
      signature,
    };
    return ok(token);
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
      await this.#client.auth.admin.listUsers({ perPage: 1 });
      return ok(undefined);
    } catch (e) {
      return err(new NetworkError(String(e)));
    }
  }
}
