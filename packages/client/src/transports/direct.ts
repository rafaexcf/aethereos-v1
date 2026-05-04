import type { Transport, SubscribeUnsub } from "../transport.js";
import { SdkError } from "../types.js";

/**
 * DirectTransport — usado por apps nativos do shell. Recebe um router
 * sincrono que executa o metodo direto via drivers, sem postMessage.
 *
 * O shell registra um router (ex: AppBridgeHandler.executeMethod) que sabe
 * traduzir "drive.list" -> drivers.data.from('files').select(...).
 *
 * Sprint 22 MX117.
 */

export type DirectRouter = (
  method: string,
  params: Record<string, unknown>,
) => Promise<unknown>;

export type DirectEventBus = {
  on(event: string, handler: (data: unknown) => void): SubscribeUnsub;
};

export class DirectTransport implements Transport {
  readonly #router: DirectRouter;
  readonly #bus: DirectEventBus | null;

  constructor(router: DirectRouter, bus?: DirectEventBus) {
    this.#router = router;
    this.#bus = bus ?? null;
  }

  async request<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    try {
      const out = await this.#router(method, params ?? {});
      return out as T;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new SdkError({ code: "EXECUTION_ERROR", message });
    }
  }

  subscribe(event: string, handler: (data: unknown) => void): SubscribeUnsub {
    if (this.#bus === null) {
      // Sem bus configurado: subscribe e no-op silencioso.
      return () => {};
    }
    return this.#bus.on(event, handler);
  }
}
