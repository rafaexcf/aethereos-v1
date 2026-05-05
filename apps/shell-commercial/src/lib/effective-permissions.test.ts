import { describe, it, expect } from "vitest";
import {
  isAppVisibleFor,
  type AccessRule,
  type MemberContext,
} from "./effective-permissions";

const baseCtx: MemberContext = {
  userId: "user-1",
  companyId: "co-1",
  role: "member",
  departmentId: "dept-vendas",
  groupIds: new Set(["group-projeto-x"]),
  customRoleId: null,
};

describe("isAppVisibleFor", () => {
  it("R14: sem rules → visível pra todos", () => {
    const r = isAppVisibleFor("drive", baseCtx, []);
    expect(r.visible).toBe(true);
  });

  it("R12: owner sempre vê, mesmo com deny", () => {
    const ctx = { ...baseCtx, role: "owner" };
    const rules: AccessRule[] = [
      {
        appId: "drive",
        ruleType: "role",
        ruleTarget: "owner",
        action: "deny",
      },
    ];
    expect(isAppVisibleFor("drive", ctx, rules).visible).toBe(true);
  });

  it("R12: admin sempre vê", () => {
    const ctx = { ...baseCtx, role: "admin" };
    const rules: AccessRule[] = [
      {
        appId: "drive",
        ruleType: "department",
        ruleTarget: "dept-other",
        action: "allow",
      },
    ];
    expect(isAppVisibleFor("drive", ctx, rules).visible).toBe(true);
  });

  it("R13: deny prevalece sobre allow no mesmo app", () => {
    const rules: AccessRule[] = [
      {
        appId: "kanban",
        ruleType: "department",
        ruleTarget: "dept-vendas",
        action: "allow",
      },
      {
        appId: "kanban",
        ruleType: "role",
        ruleTarget: "member",
        action: "deny",
      },
    ];
    const r = isAppVisibleFor("kanban", baseCtx, rules);
    expect(r.visible).toBe(false);
  });

  it("allow por departamento — match", () => {
    const rules: AccessRule[] = [
      {
        appId: "kanban",
        ruleType: "department",
        ruleTarget: "dept-vendas",
        action: "allow",
      },
    ];
    expect(isAppVisibleFor("kanban", baseCtx, rules).visible).toBe(true);
  });

  it("allow por departamento — sem match → bloqueado", () => {
    const rules: AccessRule[] = [
      {
        appId: "kanban",
        ruleType: "department",
        ruleTarget: "dept-financeiro",
        action: "allow",
      },
    ];
    const r = isAppVisibleFor("kanban", baseCtx, rules);
    expect(r.visible).toBe(false);
    if (!r.visible) expect(r.reason).toMatch(/departamento/);
  });

  it("allow por grupo — match", () => {
    const rules: AccessRule[] = [
      {
        appId: "comercio",
        ruleType: "group",
        ruleTarget: "group-projeto-x",
        action: "allow",
      },
    ];
    expect(isAppVisibleFor("comercio", baseCtx, rules).visible).toBe(true);
  });

  it("Bloqueado total via __all__ deny", () => {
    const rules: AccessRule[] = [
      {
        appId: "auditoria",
        ruleType: "role",
        ruleTarget: "__all__",
        action: "deny",
      },
    ];
    const r = isAppVisibleFor("auditoria", baseCtx, rules);
    expect(r.visible).toBe(false);
  });

  it("user-specific allow", () => {
    const rules: AccessRule[] = [
      {
        appId: "rh",
        ruleType: "user",
        ruleTarget: "user-1",
        action: "allow",
      },
    ];
    expect(isAppVisibleFor("rh", baseCtx, rules).visible).toBe(true);
  });
});
