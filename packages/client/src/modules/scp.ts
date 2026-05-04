import type { Transport, SubscribeUnsub } from "../transport.js";
import type { ScpEmitResult } from "../types.js";

export class ScpModule {
  readonly #t: Transport;
  constructor(t: Transport) {
    this.#t = t;
  }

  emit(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<ScpEmitResult> {
    return this.#t.request<ScpEmitResult>("scp.emit", { eventType, payload });
  }

  /**
   * Subscribe a um event_type SCP via canal pushed (host -> iframe).
   * Em modo direct sem bus configurado, retorna no-op.
   */
  subscribe(
    eventType: string,
    handler: (payload: Record<string, unknown>) => void,
  ): SubscribeUnsub {
    return this.#t.subscribe(`scp:${eventType}`, (data) =>
      handler((data ?? {}) as Record<string, unknown>),
    );
  }
}
