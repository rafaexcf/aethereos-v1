import { BRIDGE_PROTOCOL } from "@aethereos/client";
import type { CloudDrivers } from "./drivers";

/**
 * Sprint 22 MX119 — AppBridgeHandler.
 *
 * Roteador host-side que recebe postMessage de iframes embarcados e
 * executa via drivers do shell. Cada iframe recebe seu proprio handler
 * (escopo por appId) montado em IframeAppFrame.tsx.
 *
 * R10 do Sprint 22: handlers executam com credenciais do USUARIO. RLS
 * do Postgres se aplica naturalmente via drivers.data.
 *
 * R11: sem permissoes granulares neste sprint. Toda chamada do iframe
 * eh permitida se ele esta carregado.
 *
 * R12: postMessage target='*'. Origin validation vira no Sprint 23.
 */

interface RequestMessage {
  type: typeof BRIDGE_PROTOCOL.TYPE_REQUEST;
  requestId: string;
  method: string;
  params: Record<string, unknown>;
}

interface HandshakeMessage {
  type: typeof BRIDGE_PROTOCOL.TYPE_HANDSHAKE;
  version: string;
}

export interface BridgeContextSnapshot {
  appId: string;
  userId: string;
  companyId: string;
  /** Resolver atual de tema (light|dark) — chamado a cada handshake. */
  getTheme(): "light" | "dark";
}

type SourceLike = Pick<MessageEventSource, "postMessage"> | null;

export class AppBridgeHandler {
  readonly #drivers: CloudDrivers;
  readonly #ctx: BridgeContextSnapshot;
  /** Reference ao contentWindow do iframe que esta sendo servido. */
  readonly #iframeWindow: Window | null;
  #boundHandler: ((event: MessageEvent) => void) | null = null;

  constructor(
    drivers: CloudDrivers,
    ctx: BridgeContextSnapshot,
    iframeWindow: Window | null,
  ) {
    this.#drivers = drivers;
    this.#ctx = ctx;
    this.#iframeWindow = iframeWindow;
  }

  /** Comeca a escutar mensagens postMessage. */
  start(): void {
    if (this.#boundHandler !== null) return;
    const handler = (event: MessageEvent): void => {
      // Filtra: so processa mensagens do contentWindow do nosso iframe.
      // Sem isso, multiplos iframes responderiam a mesma mensagem.
      if (this.#iframeWindow !== null && event.source !== this.#iframeWindow) {
        return;
      }
      void this.#dispatch(event);
    };
    this.#boundHandler = handler;
    window.addEventListener("message", handler);
  }

  /** Para de escutar e descarta listeners. */
  stop(): void {
    if (this.#boundHandler !== null) {
      window.removeEventListener("message", this.#boundHandler);
      this.#boundHandler = null;
    }
  }

  /** Envia evento push (theme.changed, etc.) para o iframe. */
  pushEvent(event: string, data: unknown): void {
    const target = this.#iframeWindow;
    if (target === null) return;
    target.postMessage(
      {
        type: BRIDGE_PROTOCOL.TYPE_EVENT,
        event,
        data,
      },
      "*",
    );
  }

  async #dispatch(event: MessageEvent): Promise<void> {
    const data = event.data as
      | Partial<HandshakeMessage>
      | Partial<RequestMessage>
      | null;
    if (data === null || typeof data !== "object") return;

    if (data.type === BRIDGE_PROTOCOL.TYPE_HANDSHAKE) {
      this.#sendHandshakeAck(event.source);
      return;
    }

    if (data.type !== BRIDGE_PROTOCOL.TYPE_REQUEST) return;
    const req = data as RequestMessage;

    try {
      const result = await this.#executeMethod(req.method, req.params);
      this.#sendResponse(event.source, req.requestId, true, result);
    } catch (e) {
      const code =
        (e as { code?: string }).code ??
        (e instanceof Error ? "EXECUTION_ERROR" : "UNKNOWN_ERROR");
      const message = e instanceof Error ? e.message : String(e);
      this.#sendResponse(event.source, req.requestId, false, undefined, {
        code,
        message,
      });
    }
  }

  #sendHandshakeAck(source: MessageEventSource | null): void {
    const target: SourceLike = source ?? this.#iframeWindow;
    if (target === null) return;
    target.postMessage(
      {
        type: BRIDGE_PROTOCOL.TYPE_HANDSHAKE_ACK,
        appId: this.#ctx.appId,
        companyId: this.#ctx.companyId,
        userId: this.#ctx.userId,
        theme: this.#ctx.getTheme(),
      },
      { targetOrigin: "*" },
    );
  }

  #sendResponse(
    source: MessageEventSource | null,
    requestId: string,
    success: boolean,
    data?: unknown,
    error?: { code: string; message: string },
  ): void {
    const target: SourceLike = source ?? this.#iframeWindow;
    if (target === null) return;
    target.postMessage(
      {
        type: BRIDGE_PROTOCOL.TYPE_RESPONSE,
        requestId,
        success,
        ...(success ? { data } : { error }),
      },
      { targetOrigin: "*" },
    );
  }

  // ─── Routing ──────────────────────────────────────────────────────────────

  async #executeMethod(
    method: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const dot = method.indexOf(".");
    if (dot < 0) throw new Error(`Invalid method: ${method}`);
    const moduleName = method.slice(0, dot);
    const action = method.slice(dot + 1);
    switch (moduleName) {
      case "auth":
        return this.#handleAuth(action);
      case "drive":
        return this.#handleDrive(action, params);
      case "people":
        return this.#handlePeople(action, params);
      case "notifications":
        return this.#handleNotifications(action, params);
      case "settings":
        return this.#handleSettings(action, params);
      case "theme":
        return this.#handleTheme(action);
      default:
        throw new Error(`Unknown module: ${moduleName}`);
    }
  }

  // ─── Module handlers ──────────────────────────────────────────────────────

  async #handleAuth(action: string): Promise<unknown> {
    if (action === "getSession") {
      const r = await this.#drivers.auth.getSession();
      if (!r.ok || r.value === null) {
        throw new Error("No active session");
      }
      const sess = r.value;
      return {
        userId: sess.user_id,
        email: sess.email ?? null,
        companyId: this.#ctx.companyId,
      };
    }
    if (action === "getUser") {
      const r = await this.#drivers.auth.getSession();
      if (!r.ok || r.value === null) throw new Error("No active session");
      return {
        id: r.value.user_id,
        email: r.value.email ?? null,
        name: null,
      };
    }
    throw new Error(`Unknown auth action: ${action}`);
  }

  async #handleDrive(
    action: string,
    _params: Record<string, unknown>,
  ): Promise<unknown> {
    if (action === "list") {
      const data = this.#drivers.data;
      const res = (await data
        .from("files")
        .select(
          "id,name,parent_id,is_folder,mime_type,size_bytes,storage_path,created_at",
        )
        .eq("company_id", this.#ctx.companyId)
        .order("created_at", { ascending: false })
        .limit(200)) as unknown as {
        data: Array<{
          id: string;
          name: string;
          parent_id: string | null;
          is_folder: boolean;
          mime_type: string | null;
          size_bytes: number;
          storage_path: string | null;
          created_at: string;
        }> | null;
        error: { message: string } | null;
      };
      if (res.error !== null) throw new Error(res.error.message);
      return (res.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        parentId: r.parent_id,
        isFolder: r.is_folder,
        mimeType: r.mime_type,
        sizeBytes: r.size_bytes,
        storagePath: r.storage_path,
        createdAt: r.created_at,
      }));
    }
    if (action === "read") {
      // Apenas retorna metadata em F1; binarios via Storage requerem refactor.
      throw new Error("drive.read not implemented in F1 — use drive.list");
    }
    throw new Error(`Unknown drive action: ${action}`);
  }

  async #handlePeople(
    action: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const data = this.#drivers.data;
    if (action === "list") {
      const query = typeof params["query"] === "string" ? params["query"] : "";
      const res = (await data
        .from("people")
        .select("id,full_name,email,phone,created_at")
        .eq("company_id", this.#ctx.companyId)
        .order("created_at", { ascending: false })
        .limit(200)) as unknown as {
        data: Array<{
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          created_at: string;
        }> | null;
        error: { message: string } | null;
      };
      if (res.error !== null) throw new Error(res.error.message);
      const rows = res.data ?? [];
      const filtered =
        query === ""
          ? rows
          : rows.filter((r) =>
              r.full_name.toLowerCase().includes(query.toLowerCase()),
            );
      return filtered.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        phone: r.phone,
        createdAt: r.created_at,
      }));
    }
    throw new Error(`people.${action} not implemented in F1`);
  }

  async #handleNotifications(
    action: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const data = this.#drivers.data;
    if (action === "send") {
      const title = String(params["title"] ?? "");
      const body = String(params["body"] ?? "");
      const type = typeof params["type"] === "string" ? params["type"] : "info";
      const sourceApp = this.#ctx.appId;
      const sourceId =
        typeof params["sourceId"] === "string"
          ? params["sourceId"]
          : crypto.randomUUID();
      const res = (await data.from("notifications").insert({
        user_id: this.#ctx.userId,
        company_id: this.#ctx.companyId,
        type,
        title,
        body,
        source_app: sourceApp,
        source_id: sourceId,
      })) as unknown as { error: { message: string } | null };
      if (res.error !== null) throw new Error(res.error.message);
      return undefined;
    }
    if (action === "list") {
      const res = (await data
        .from("notifications")
        .select("id,type,title,body,source_app,source_id,created_at,read_at")
        .eq("user_id", this.#ctx.userId)
        .eq("company_id", this.#ctx.companyId)
        .order("created_at", { ascending: false })
        .limit(50)) as unknown as {
        data: Array<{
          id: string;
          type: string;
          title: string;
          body: string;
          source_app: string | null;
          created_at: string;
          read_at: string | null;
        }> | null;
        error: { message: string } | null;
      };
      if (res.error !== null) throw new Error(res.error.message);
      return (res.data ?? []).map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        body: r.body,
        sourceApp: r.source_app,
        createdAt: r.created_at,
        readAt: r.read_at,
      }));
    }
    throw new Error(`notifications.${action} not implemented`);
  }

  async #handleSettings(
    action: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const data = this.#drivers.data;
    if (action === "get") {
      const key = String(params["key"] ?? "");
      const res = (await data
        .from("user_preferences")
        .select("value")
        .eq("user_id", this.#ctx.userId)
        .eq("key", key)
        .maybeSingle()) as unknown as {
        data: { value: unknown } | null;
        error: { message: string } | null;
      };
      if (res.error !== null) throw new Error(res.error.message);
      return res.data?.value ?? null;
    }
    if (action === "set") {
      const key = String(params["key"] ?? "");
      const value = params["value"];
      const res = (await data.from("user_preferences").upsert(
        {
          user_id: this.#ctx.userId,
          key,
          value,
        },
        { onConflict: "user_id,key" },
      )) as unknown as { error: { message: string } | null };
      if (res.error !== null) throw new Error(res.error.message);
      return undefined;
    }
    throw new Error(`settings.${action} not implemented`);
  }

  #handleTheme(action: string): unknown {
    if (action === "getTheme") {
      return this.#ctx.getTheme();
    }
    throw new Error(`theme.${action} not implemented`);
  }
}
