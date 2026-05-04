import type { Transport } from "../transport.js";

export class SettingsModule {
  readonly #t: Transport;
  constructor(t: Transport) {
    this.#t = t;
  }

  get<T = unknown>(key: string): Promise<T | null> {
    return this.#t.request<T | null>("settings.get", { key });
  }

  set(key: string, value: unknown): Promise<void> {
    return this.#t.request<void>("settings.set", { key, value });
  }
}
