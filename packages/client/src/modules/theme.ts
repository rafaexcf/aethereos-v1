import type { Transport, SubscribeUnsub } from "../transport.js";
import type { Theme } from "../types.js";

export class ThemeModule {
  readonly #t: Transport;
  constructor(t: Transport) {
    this.#t = t;
  }

  getTheme(): Promise<Theme> {
    return this.#t.request<Theme>("theme.getTheme");
  }

  /** Recebe push event quando o usuario muda o tema no shell. */
  onThemeChange(handler: (theme: Theme) => void): SubscribeUnsub {
    return this.#t.subscribe("theme.changed", (data) => {
      const next =
        (data as { theme?: Theme } | null | undefined)?.theme ?? "dark";
      handler(next);
    });
  }
}
