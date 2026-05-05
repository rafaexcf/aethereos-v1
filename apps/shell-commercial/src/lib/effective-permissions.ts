// Sprint 28 MX155: resolve permissoes efetivas de um colaborador.
// Função pura — recebe drivers + identificadores + lista de apps instalados,
// retorna { visibleApps, blockedApps: [{ appId, reason }] }.
//
// Regras (Sprint 28 R12-R14):
//  R12. Owner/admin sempre veem todos os apps (invariante).
//  R13. Deny prevalece sobre allow (princípio do menor privilégio).
//  R14. Sem regras pra um app → app é visível pra todos (default aberto).

import type { CloudDrivers } from "./drivers";

export interface MemberContext {
  userId: string;
  companyId: string;
  role: string; // owner / admin / manager / member / viewer
  departmentId: string | null;
  groupIds: ReadonlySet<string>;
  customRoleId: string | null;
}

export interface AccessRule {
  appId: string;
  ruleType: "role" | "department" | "group" | "user";
  ruleTarget: string;
  action: "allow" | "deny";
}

export interface EffectivePermissions {
  visibleApps: string[];
  blockedApps: { appId: string; reason: string }[];
}

const ADMIN_ROLES = new Set(["owner", "admin"]);

/** Carrega contexto do membership ativo do user na company. */
export async function loadMemberContext(
  drivers: CloudDrivers,
  userId: string,
  companyId: string,
): Promise<MemberContext | null> {
  const { data: membership } = await drivers.data
    .from("tenant_memberships")
    .select("role, department_id, custom_role_id, status")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (membership === null || membership === undefined) return null;
  const m = membership as {
    role: string;
    department_id: string | null;
    custom_role_id: string | null;
    status: string;
  };
  if (m.status !== "active") return null;

  const { data: gms } = await drivers.data
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId)
    .eq("company_id", companyId);
  const groupIds = new Set<string>(
    ((gms ?? []) as Array<{ group_id: string }>).map((g) => g.group_id),
  );

  return {
    userId,
    companyId,
    role: m.role,
    departmentId: m.department_id,
    customRoleId: m.custom_role_id,
    groupIds,
  };
}

/** Carrega rules da company. */
export async function loadAccessRules(
  drivers: CloudDrivers,
  companyId: string,
): Promise<AccessRule[]> {
  const { data } = await drivers.data
    .from("app_access_rules")
    .select("app_id, rule_type, rule_target, action")
    .eq("company_id", companyId);
  return (
    (data ?? []) as Array<{
      app_id: string;
      rule_type: string;
      rule_target: string;
      action: string;
    }>
  ).map((r) => ({
    appId: r.app_id,
    ruleType: r.rule_type as AccessRule["ruleType"],
    ruleTarget: r.rule_target,
    action: r.action as AccessRule["action"],
  }));
}

function ruleMatches(rule: AccessRule, ctx: MemberContext): boolean {
  // Sentinel '__all__' usado pra "Bloqueado" (Sprint 28 RegrasApp tab).
  if (rule.ruleTarget === "__all__") return true;
  switch (rule.ruleType) {
    case "role":
      return rule.ruleTarget === ctx.role;
    case "department":
      return rule.ruleTarget === ctx.departmentId;
    case "group":
      return ctx.groupIds.has(rule.ruleTarget);
    case "user":
      return rule.ruleTarget === ctx.userId;
    default:
      return false;
  }
}

/** Resolve visibilidade de um app pra um contexto de membro. */
export function isAppVisibleFor(
  appId: string,
  ctx: MemberContext,
  rules: ReadonlyArray<AccessRule>,
): { visible: true } | { visible: false; reason: string } {
  // R12: owner/admin sempre veem.
  if (ADMIN_ROLES.has(ctx.role)) return { visible: true };

  const appRules = rules.filter((r) => r.appId === appId);
  // R14: sem regras → visível.
  if (appRules.length === 0) return { visible: true };

  // R13: deny prevalece — qualquer rule deny que match → bloqueado.
  for (const rule of appRules) {
    if (rule.action === "deny" && ruleMatches(rule, ctx)) {
      return {
        visible: false,
        reason: `Bloqueado por regra de ${describeType(rule.ruleType)}`,
      };
    }
  }

  // Se há ALLOW rules: usuário precisa match pelo menos uma.
  const allowRules = appRules.filter((r) => r.action === "allow");
  const firstAllow = allowRules[0];
  if (firstAllow !== undefined) {
    const matchedAllow = allowRules.some((r) => ruleMatches(r, ctx));
    if (!matchedAllow) {
      return {
        visible: false,
        reason: `Restrito a ${describeType(firstAllow.ruleType)} específico(s)`,
      };
    }
  }

  return { visible: true };
}

function describeType(t: AccessRule["ruleType"]): string {
  switch (t) {
    case "role":
      return "cargo";
    case "department":
      return "departamento";
    case "group":
      return "grupo";
    case "user":
      return "usuário";
  }
}

/** Calcula permissões efetivas pra todos os apps instalados. */
export async function calculateEffectivePermissions(
  drivers: CloudDrivers,
  userId: string,
  companyId: string,
  installedAppIds: ReadonlyArray<string>,
): Promise<EffectivePermissions> {
  const ctx = await loadMemberContext(drivers, userId, companyId);
  if (ctx === null) {
    return {
      visibleApps: [],
      blockedApps: installedAppIds.map((id) => ({
        appId: id,
        reason: "Membership inativa",
      })),
    };
  }
  const rules = await loadAccessRules(drivers, companyId);

  const visibleApps: string[] = [];
  const blockedApps: { appId: string; reason: string }[] = [];

  for (const appId of installedAppIds) {
    const result = isAppVisibleFor(appId, ctx, rules);
    if (result.visible) {
      visibleApps.push(appId);
    } else {
      blockedApps.push({ appId, reason: result.reason });
    }
  }

  return { visibleApps, blockedApps };
}
