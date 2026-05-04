/**
 * Transport contract — abstrai a comunicacao SDK -> driver/host.
 *
 * Implementacoes:
 *  - DirectTransport: chamada in-process (apps nativos do shell)
 *  - BridgeTransport: postMessage para janela parent (apps iframe)
 *
 * Sprint 22 MX117.
 */

export type SubscribeUnsub = () => void;

export interface Transport {
  /**
   * Faz uma chamada single-shot ao backend (driver/host).
   * O `method` segue convencao "module.action" (ex: "drive.list").
   */
  request<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<T>;

  /**
   * Inscreve em um canal de eventos pushed do host.
   * Retorna funcao de unsubscribe.
   */
  subscribe(event: string, handler: (data: unknown) => void): SubscribeUnsub;
}
