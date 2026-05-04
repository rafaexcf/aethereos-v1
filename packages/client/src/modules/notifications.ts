import type { Transport } from "../transport.js";
import type { NotificationItem, NotificationOpts } from "../types.js";

export class NotificationsModule {
  readonly #t: Transport;
  constructor(t: Transport) {
    this.#t = t;
  }

  send(title: string, body: string, opts?: NotificationOpts): Promise<void> {
    return this.#t.request<void>("notifications.send", {
      title,
      body,
      ...(opts ?? {}),
    });
  }

  list(): Promise<NotificationItem[]> {
    return this.#t.request<NotificationItem[]>("notifications.list");
  }
}
