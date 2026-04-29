import {
  createClient,
  type SupabaseClient,
  type RealtimeChannel,
  type RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import type { TenantContext, Result } from "@aethereos/drivers";
import { ok, err, DatabaseError } from "@aethereos/drivers";

export interface SupabaseBrowserDataConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

/**
 * Browser-side Supabase data driver.
 *
 * Usa @supabase/supabase-js com anon key — seguro para browser.
 * RLS enforçado automaticamente pelo Supabase via JWT do usuário logado.
 * Substitui o SupabaseDatabaseDriver (Node.js-only) para contexto browser.
 *
 * Ref: Driver Model [INV] — toda persistência via interface de driver.
 * Ref: Sprint 6.5 MX2 — gap identificado na auditoria.
 */
export class SupabaseBrowserDataDriver {
  readonly #client: SupabaseClient;
  #tenantCtx: TenantContext | null = null;

  constructor(config: SupabaseBrowserDataConfig) {
    this.#client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
  }

  withTenant(ctx: TenantContext): void {
    this.#tenantCtx = ctx;
  }

  getCompanyId(): string | null {
    return this.#tenantCtx?.company_id ?? null;
  }

  /**
   * Acesso ao query builder do Supabase para tabelas no schema kernel.
   * RLS garante isolamento por company_id — sem necessidade de filtro manual.
   */
  from(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.#client as any).schema("kernel").from(table) as ReturnType<
      SupabaseClient["from"]
    >;
  }

  /**
   * Retorna o cliente Supabase bruto — necessário para Realtime e Storage.
   * Usar apenas dentro de drivers; código de domínio não deve importar Supabase.
   */
  getClient(): SupabaseClient {
    return this.#client;
  }

  /**
   * Assina mudanças Realtime em uma tabela do schema kernel.
   * Retorna handle para cancelar a subscription.
   */
  subscribeToTable(params: {
    table: string;
    event: RealtimeEvent;
    filter?: string;
    onData: (
      payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
    ) => void;
    onError?: (error: Error) => void;
  }): RealtimeSubscription {
    const channelName = `kernel:${params.table}:${params.filter ?? "all"}:${Date.now()}`;
    const channel: RealtimeChannel = this.#client
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: params.event,
          schema: "kernel",
          table: params.table,
          ...(params.filter !== undefined ? { filter: params.filter } : {}),
        },
        params.onData,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" && params.onError !== undefined) {
          params.onError(
            new Error(`Realtime channel error on ${params.table}`),
          );
        }
      });

    return {
      unsubscribe: () => {
        void this.#client.removeChannel(channel);
      },
    };
  }

  async ping(): Promise<Result<void, DatabaseError>> {
    try {
      const { error } = await this.#client
        .schema("kernel")
        .from("companies")
        .select("id")
        .limit(1);
      if (error !== null) {
        return err(new DatabaseError(error.message));
      }
      return ok(undefined);
    } catch (e) {
      return err(new DatabaseError(String(e)));
    }
  }
}
