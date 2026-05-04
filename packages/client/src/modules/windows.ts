import type { Transport, SubscribeUnsub } from "../transport.js";

export class WindowsModule {
  readonly #t: Transport;
  constructor(t: Transport) {
    this.#t = t;
  }

  close(): Promise<void> {
    return this.#t.request<void>("windows.close");
  }

  setTitle(title: string): Promise<void> {
    return this.#t.request<void>("windows.setTitle", { title });
  }

  /**
   * Envia mensagem para outro app aberto no shell. O host roteia para o
   * tab/iframe correspondente se estiver carregado.
   */
  sendMessage(targetAppId: string, message: unknown): Promise<void> {
    return this.#t.request<void>("windows.sendMessage", {
      targetAppId,
      message,
    });
  }

  /** Recebe mensagens enviadas por outros apps via windows.sendMessage. */
  onMessage(
    handler: (msg: { fromAppId: string; data: unknown }) => void,
  ): SubscribeUnsub {
    return this.#t.subscribe("windows.message", (data) =>
      handler(data as { fromAppId: string; data: unknown }),
    );
  }
}
