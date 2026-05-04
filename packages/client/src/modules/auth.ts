import type { Transport } from "../transport.js";
import type { SessionInfo, UserProfile } from "../types.js";

export class AuthModule {
  readonly #t: Transport;
  constructor(t: Transport) {
    this.#t = t;
  }

  getSession(): Promise<SessionInfo> {
    return this.#t.request<SessionInfo>("auth.getSession");
  }

  getUser(): Promise<UserProfile> {
    return this.#t.request<UserProfile>("auth.getUser");
  }
}
