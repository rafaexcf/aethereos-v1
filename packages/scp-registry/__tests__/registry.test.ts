import { describe, it, expect } from "vitest";
import {
  buildEnvelope,
  validate,
  getSchema,
  register,
  PLATFORM_EVENT_SCHEMAS,
  AGENT_EVENT_SCHEMAS,
  CONTEXT_EVENT_SCHEMAS,
  INTEGRATION_EVENT_SCHEMAS,
} from "../src/index.js";
import { z } from "zod";

const COMPANY = "00000000-0000-0000-0000-0000000000aa";
const USER = "00000000-0000-0000-0000-0000000000bb";

describe("scp-registry — smoke", () => {
  it("getSchema retorna schema para platform.* registrado", () => {
    const schema = getSchema("platform.user.created");
    expect(schema).toBeDefined();
  });

  it("getSchema retorna undefined para evento desconhecido", () => {
    expect(getSchema("nonsense.evento.bogus")).toBeUndefined();
  });

  it("validate aceita payload valido para platform.staff.access", () => {
    const result = validate("platform.staff.access", {
      staff_user_id: USER,
      company_id: COMPANY,
      action: "view",
    });
    expect(result.ok).toBe(true);
  });

  it("validate rejeita payload invalido", () => {
    const result = validate("platform.staff.access", {
      staff_user_id: "not-a-uuid",
    });
    expect(result.ok).toBe(false);
  });

  it("validate rejeita evento sem schema", () => {
    const result = validate("zzz.evento.fake", { foo: "bar" });
    expect(result.ok).toBe(false);
  });

  it("buildEnvelope produz envelope completo a partir de partial", () => {
    const result = buildEnvelope({
      type: "platform.staff.access",
      tenant_id: COMPANY,
      actor: { type: "human", user_id: USER },
      correlation_id: crypto.randomUUID(),
      payload: {
        staff_user_id: USER,
        company_id: COMPANY,
        action: "view",
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(typeof result.value.occurred_at).toBe("string");
      expect(result.value.version).toBe("1");
      expect(result.value.schema_version).toBe("1");
    }
  });

  it("register impede sobrescrever evento built-in (platform.*, agent.*, etc.)", () => {
    expect(() => register("platform.user.created", z.object({}))).toThrowError(
      /reservado pelo kernel/,
    );
  });

  it("register aceita evento de app fora dos dominios reservados", () => {
    const fakeSchema = z.object({ foo: z.string() });
    expect(() => register("commerce.order.placed", fakeSchema)).not.toThrow();
    const found = getSchema("commerce.order.placed");
    expect(found).toBeDefined();
  });

  it("4 dominios reservados expostos como SCHEMAS records", () => {
    expect(Object.keys(PLATFORM_EVENT_SCHEMAS).length).toBeGreaterThan(0);
    expect(Object.keys(AGENT_EVENT_SCHEMAS).length).toBeGreaterThan(0);
    expect(Object.keys(CONTEXT_EVENT_SCHEMAS).length).toBeGreaterThan(0);
    expect(Object.keys(INTEGRATION_EVENT_SCHEMAS).length).toBeGreaterThan(0);
  });
});
