import type { Transport, SubscribeUnsub } from "../transport.js";
import { SdkError, type BridgeContext } from "../types.js";

/**
 * Sprint 22 MX118 — BridgeTransport.
 *
 * Implementa o protocolo postMessage entre iframe (apps third-party) e
 * janela parent (shell host).
 *
 * Mensagens:
 *  - HANDSHAKE       (iframe -> host) — quando SDK inicia
 *  - HANDSHAKE_ACK   (host -> iframe) — host responde com contexto
 *  - REQUEST         (iframe -> host) — chamada de metodo
 *  - RESPONSE        (host -> iframe) — resultado/erro
 *  - EVENT           (host -> iframe) — push de evento (theme.changed, etc.)
 *
 * R12 do Sprint 22: postMessage target='*' por enquanto. Origin validation
 * vira no Sprint 23 (permissoes granulares).
 */

const TYPE_HANDSHAKE = "AETHEREOS_SDK_HANDSHAKE";
const TYPE_HANDSHAKE_ACK = "AETHEREOS_SDK_HANDSHAKE_ACK";
const TYPE_REQUEST = "AETHEREOS_SDK_REQUEST";
const TYPE_RESPONSE = "AETHEREOS_SDK_RESPONSE";
const TYPE_EVENT = "AETHEREOS_SDK_EVENT";
const SDK_VERSION = "1.0.0";
const DEFAULT_TIMEOUT_MS = 10_000;

interface RequestMessage {
  type: typeof TYPE_REQUEST;
  requestId: string;
  method: string;
  params: Record<string, unknown>;
}

interface ResponseMessage {
  type: typeof TYPE_RESPONSE;
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string; data?: unknown };
}

interface EventMessage {
  type: typeof TYPE_EVENT;
  event: string;
  data: unknown;
}

interface HandshakeAck {
  type: typeof TYPE_HANDSHAKE_ACK;
  appId: string;
  companyId: string;
  userId: string;
  theme: "light" | "dark";
}

export interface BridgeTransportOptions {
  /** Janela parent (default: window.parent). Sobrescritivel para testes. */
  target?: Window;
  /** Source de eventos message (default: window). Sobrescritivel para testes. */
  source?: Window;
  /** Timeout por request em ms (default: 10000). */
  timeoutMs?: number;
}

export class BridgeTransport implements Transport {
  readonly #target: Window;
  readonly #source: Window;
  readonly #timeoutMs: number;
  #context: BridgeContext | null = null;
  #handshakeReady: Promise<BridgeContext> | null = null;

  constructor(opts: BridgeTransportOptions = {}) {
    if (opts.target !== undefined) {
      this.#target = opts.target;
    } else if (typeof window !== "undefined") {
      this.#target = window.parent;
    } else {
      throw new Error(
        "BridgeTransport requires a target window (no global window available)",
      );
    }
    if (opts.source !== undefined) {
      this.#source = opts.source;
    } else if (typeof window !== "undefined") {
      this.#source = window;
    } else {
      throw new Error(
        "BridgeTransport requires a source window (no global window available)",
      );
    }
    this.#timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Inicia o handshake com o host. Chamada uma vez ao instanciar o cliente.
   * Resolve com o contexto recebido. Subsequentes calls retornam mesma promise.
   */
  handshake(): Promise<BridgeContext> {
    if (this.#handshakeReady !== null) return this.#handshakeReady;
    this.#handshakeReady = new Promise<BridgeContext>((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(
            new SdkError({
              code: "HANDSHAKE_TIMEOUT",
              message: "Bridge handshake timeout",
            }),
          ),
        this.#timeoutMs,
      );
      const handler = (event: MessageEvent): void => {
        const data = event.data as Partial<HandshakeAck> | null;
        if (data?.type !== TYPE_HANDSHAKE_ACK) return;
        clearTimeout(timeout);
        this.#source.removeEventListener("message", handler);
        const ctx: BridgeContext = {
          appId: String(data.appId ?? ""),
          companyId: String(data.companyId ?? ""),
          userId: String(data.userId ?? ""),
          theme: data.theme === "light" ? "light" : "dark",
        };
        this.#context = ctx;
        resolve(ctx);
      };
      this.#source.addEventListener("message", handler);
      this.#target.postMessage(
        { type: TYPE_HANDSHAKE, version: SDK_VERSION },
        "*",
      );
    });
    return this.#handshakeReady;
  }

  context(): BridgeContext | null {
    return this.#context;
  }

  request<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const timeout = setTimeout(() => {
        this.#source.removeEventListener("message", handler);
        reject(
          new SdkError({
            code: "BRIDGE_TIMEOUT",
            message: `Bridge timeout for ${method} (${this.#timeoutMs}ms)`,
          }),
        );
      }, this.#timeoutMs);
      const handler = (event: MessageEvent): void => {
        const data = event.data as Partial<ResponseMessage> | null;
        if (data?.type !== TYPE_RESPONSE) return;
        if (data.requestId !== requestId) return;
        clearTimeout(timeout);
        this.#source.removeEventListener("message", handler);
        if (data.success === true) {
          resolve(data.data as T);
        } else {
          const err = data.error ?? {
            code: "UNKNOWN_ERROR",
            message: "Bridge response failed",
          };
          reject(new SdkError(err));
        }
      };
      this.#source.addEventListener("message", handler);
      const msg: RequestMessage = {
        type: TYPE_REQUEST,
        requestId,
        method,
        params: params ?? {},
      };
      this.#target.postMessage(msg, "*");
    });
  }

  subscribe(event: string, handler: (data: unknown) => void): SubscribeUnsub {
    const listener = (e: MessageEvent): void => {
      const data = e.data as Partial<EventMessage> | null;
      if (data?.type !== TYPE_EVENT) return;
      if (data.event !== event) return;
      handler(data.data);
    };
    this.#source.addEventListener("message", listener);
    return () => this.#source.removeEventListener("message", listener);
  }
}

export const BRIDGE_PROTOCOL = {
  TYPE_HANDSHAKE,
  TYPE_HANDSHAKE_ACK,
  TYPE_REQUEST,
  TYPE_RESPONSE,
  TYPE_EVENT,
  SDK_VERSION,
} as const;
