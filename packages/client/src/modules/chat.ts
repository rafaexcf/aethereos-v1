import type { Transport } from "../transport.js";
import type { Channel, ChatMessage } from "../types.js";

export class ChatModule {
  readonly #t: Transport;
  constructor(t: Transport) {
    this.#t = t;
  }

  listChannels(): Promise<Channel[]> {
    return this.#t.request<Channel[]>("chat.listChannels");
  }

  sendMessage(channelId: string, text: string): Promise<ChatMessage> {
    return this.#t.request<ChatMessage>("chat.sendMessage", {
      channelId,
      text,
    });
  }
}
