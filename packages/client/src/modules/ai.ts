import type { Transport } from "../transport.js";
import type {
  AiChatMessage,
  AiChatOpts,
  AiChatResult,
  AiEmbedResult,
} from "../types.js";

export class AiModule {
  readonly #t: Transport;
  constructor(t: Transport) {
    this.#t = t;
  }

  chat(messages: AiChatMessage[], opts?: AiChatOpts): Promise<AiChatResult> {
    return this.#t.request<AiChatResult>("ai.chat", {
      messages,
      ...(opts ?? {}),
    });
  }

  embed(text: string): Promise<AiEmbedResult> {
    return this.#t.request<AiEmbedResult>("ai.embed", { text });
  }
}
