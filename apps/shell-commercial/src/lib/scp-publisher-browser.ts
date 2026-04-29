// Browser-side SCP publisher — ponte browser → Edge Function scp-publish.
// Ref: ADR-0020 — KernelPublisher é server-only; browser usa esta função.
// Fundamentação 8.10 [INV] — toda mudança gera evento SCP.

import type { SupabaseBrowserAuthDriver } from "@aethereos/drivers-supabase/browser";

export interface PublishEventOptions {
  correlation_id?: string;
  causation_id?: string;
  idempotency_key?: string;
  actor?: {
    type: "agent";
    agent_id: string;
    supervising_user_id: string;
  };
}

export interface PublishEventResult {
  event_id: string;
  correlation_id: string;
  occurred_at: string;
}

export class ScpPublisherBrowser {
  readonly #supabaseUrl: string;
  readonly #auth: SupabaseBrowserAuthDriver;

  constructor(supabaseUrl: string, auth: SupabaseBrowserAuthDriver) {
    this.#supabaseUrl = supabaseUrl;
    this.#auth = auth;
  }

  async publishEvent(
    eventType: string,
    payload: Record<string, unknown>,
    opts: PublishEventOptions = {},
  ): Promise<PublishEventResult> {
    const session = await this.#auth.getSession();
    if (!session.ok || session.value === null) {
      throw new Error(
        "[scp-publisher-browser] sem sessão ativa — não é possível emitir evento SCP",
      );
    }

    const jwt = session.value.access_token;
    const correlation_id = opts.correlation_id ?? crypto.randomUUID();
    const edgeFnUrl = `${this.#supabaseUrl}/functions/v1/scp-publish`;

    const body: Record<string, unknown> = {
      event_type: eventType,
      payload,
      correlation_id,
    };
    if (opts.causation_id !== undefined)
      body["causation_id"] = opts.causation_id;
    if (opts.idempotency_key !== undefined)
      body["idempotency_key"] = opts.idempotency_key;
    if (opts.actor !== undefined) body["actor"] = opts.actor;

    let response: Response;
    try {
      response = await fetch(edgeFnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Modo Degenerado (P14): Edge Function offline.
      // Retorna resultado parcial com event_id local para não bloquear a UI.
      // O evento não chegou ao outbox; inconsistência é eventual — sem rollback no browser.
      return {
        event_id: crypto.randomUUID(),
        correlation_id,
        occurred_at: new Date().toISOString(),
      };
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `[scp-publisher-browser] falha ao publicar '${eventType}': HTTP ${response.status} — ${errorBody}`,
      );
    }

    return (await response.json()) as PublishEventResult;
  }
}
