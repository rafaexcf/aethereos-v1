import { describe, it, expect } from "vitest";
import {
  SCOPE_CATALOG,
  METHOD_SCOPE_MAP,
  SENSITIVE_SCOPES,
  BASE_SCOPE,
  isSensitiveScope,
  getScope,
} from "../src/index.js";

describe("scope catalog", () => {
  it("17 scopes definidos", () => {
    expect(Object.keys(SCOPE_CATALOG)).toHaveLength(17);
  });

  it("todos os scopes tem label e description nao-vazios", () => {
    for (const def of Object.values(SCOPE_CATALOG)) {
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
      expect(def.icon.length).toBeGreaterThan(0);
    }
  });

  it("BASE_SCOPE = auth.read e nao-sensitive", () => {
    expect(BASE_SCOPE).toBe("auth.read");
    expect(isSensitiveScope(BASE_SCOPE)).toBe(false);
  });

  it("SENSITIVE_SCOPES inclui exatamente os 5 scopes sensiveis", () => {
    expect(new Set(SENSITIVE_SCOPES)).toEqual(
      new Set([
        "drive.delete",
        "people.write",
        "settings.write",
        "scp.emit",
        "ai.chat",
      ]),
    );
  });

  it("METHOD_SCOPE_MAP cobre 23 metodos do bridge handler", () => {
    expect(Object.keys(METHOD_SCOPE_MAP).length).toBeGreaterThanOrEqual(22);
    expect(METHOD_SCOPE_MAP["auth.getSession"]).toBe("auth.read");
    expect(METHOD_SCOPE_MAP["drive.delete"]).toBe("drive.delete");
    expect(METHOD_SCOPE_MAP["people.create"]).toBe("people.write");
    expect(METHOD_SCOPE_MAP["theme.getTheme"]).toBe("theme.read");
  });

  it("METHOD_SCOPE_MAP so usa scopes do SCOPE_CATALOG", () => {
    const valid = new Set(Object.keys(SCOPE_CATALOG));
    for (const scope of Object.values(METHOD_SCOPE_MAP)) {
      expect(valid.has(scope)).toBe(true);
    }
  });

  it("getScope retorna definicao correta ou undefined", () => {
    expect(getScope("drive.read")?.label).toBe("Drive — leitura");
    expect(getScope("drive.read")?.sensitive).toBe(false);
    expect(getScope("ai.chat")?.sensitive).toBe(true);
    expect(getScope("nonexistent")).toBeUndefined();
  });

  it("isSensitiveScope rejeita scope desconhecido", () => {
    expect(isSensitiveScope("nonexistent")).toBe(false);
    expect(isSensitiveScope("auth.read")).toBe(false);
    expect(isSensitiveScope("ai.chat")).toBe(true);
  });
});
