import { describe, it, expect } from "vitest";
import { parseManifest, AethereosManifestSchema } from "../src/index.js";

const VALID: Record<string, unknown> = {
  id: "demo-iframe",
  name: "Demo SDK",
  version: "1.0.0",
  description: "App de demonstracao do SDK.",
  developer: { name: "Aethereos" },
  type: "native",
  category: "utilities",
  entry: { mode: "iframe", url: "https://demo.example.com" },
  permissions: ["auth.read", "drive.read", "notifications.send"],
};

describe("AethereosManifestSchema", () => {
  it("aceita manifesto valido completo", () => {
    const r = parseManifest(VALID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id).toBe("demo-iframe");
      expect(r.value.permissions).toEqual([
        "auth.read",
        "drive.read",
        "notifications.send",
      ]);
    }
  });

  it("rejeita id com formato invalido (camelCase)", () => {
    const r = parseManifest({ ...VALID, id: "MeuApp" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.path.includes("id"))).toBe(true);
    }
  });

  it("rejeita version nao-semver", () => {
    const r = parseManifest({ ...VALID, version: "v1" });
    expect(r.ok).toBe(false);
  });

  it("rejeita iframe sem entry.url", () => {
    const r = parseManifest({ ...VALID, entry: { mode: "iframe" } });
    expect(r.ok).toBe(false);
  });

  it("aceita entry.mode=internal sem url", () => {
    const r = parseManifest({
      ...VALID,
      entry: { mode: "internal", target: "demo-iframe" },
    });
    expect(r.ok).toBe(true);
  });

  it("rejeita scope desconhecido em permissions", () => {
    const r = parseManifest({
      ...VALID,
      permissions: ["auth.read", "bogus.scope"],
    });
    expect(r.ok).toBe(false);
  });

  it("rejeita color hex invalida", () => {
    const r = parseManifest({ ...VALID, color: "blue" });
    expect(r.ok).toBe(false);
  });

  it("aceita pricing/window/security opcionais", () => {
    const r = AethereosManifestSchema.safeParse({
      ...VALID,
      pricing: { model: "subscription", currency: "BRL", amount: 49.9 },
      window: {
        defaultWidth: 800,
        defaultHeight: 600,
        resizable: true,
        maximizable: true,
      },
      security: {
        sandbox: true,
        allowedOrigins: ["https://demo.example.com"],
      },
    });
    expect(r.success).toBe(true);
  });

  it("rejeita campos extras (strict)", () => {
    const r = parseManifest({ ...VALID, foo: "bar" });
    expect(r.ok).toBe(false);
  });
});
