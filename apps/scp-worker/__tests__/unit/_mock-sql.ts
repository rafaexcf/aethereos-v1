import { vi } from "vitest";

/**
 * Cria um mock minimo do sql do `postgres` package compatible com:
 *   - sql\`...\`            (tagged template) -> resolve com queue[i] (default [])
 *   - sql.unsafe(text, p)   -> resolve com queue[i]
 *
 * Cada chamada (tag ou unsafe) consome uma row do `responses` na ordem.
 */
export function mockSql(responses: unknown[] = []): {
  sql: ReturnType<typeof makeSql>;
  calls: Array<{
    kind: "tag" | "unsafe";
    strings?: readonly string[];
    values?: unknown[];
    text?: string;
    params?: unknown[];
  }>;
} {
  const calls: Array<{
    kind: "tag" | "unsafe";
    strings?: readonly string[];
    values?: unknown[];
    text?: string;
    params?: unknown[];
  }> = [];
  let index = 0;
  const next = (): unknown => {
    const r = responses[index];
    index++;
    return r === undefined ? [] : r;
  };

  function makeSql() {
    const fn = vi.fn(
      (strings: TemplateStringsArray, ...values: unknown[]): unknown => {
        calls.push({ kind: "tag", strings, values });
        return Promise.resolve(next());
      },
    ) as unknown as {
      (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
      unsafe: (text: string, params?: unknown[]) => Promise<unknown>;
    };
    fn.unsafe = vi.fn((text: string, params?: unknown[]) => {
      calls.push({ kind: "unsafe", text, params });
      return Promise.resolve(next());
    });
    return fn;
  }

  return { sql: makeSql(), calls };
}
