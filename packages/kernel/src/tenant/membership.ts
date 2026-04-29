import { z } from "zod";

/**
 * Tipos de membership e roles de tenant.
 * Um user_id pode ter múltiplas memberships com role diferente em cada company.
 * Ref: Fundamentação 10.2, ADR-0014 #19
 */
export const MembershipRoleSchema = z.enum([
  "owner",
  "admin",
  "member",
  "viewer",
  "agent_operator",
]);
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;

export const MembershipStatusSchema = z.enum([
  "active",
  "suspended",
  "pending_invite",
]);
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

export const MembershipSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  company_id: z.string().uuid(),
  role: MembershipRoleSchema,
  status: MembershipStatusSchema,
  invited_by: z.string().uuid().optional(),
  created_at: z.string().datetime({ offset: false }),
  updated_at: z.string().datetime({ offset: false }),
});
export type Membership = z.infer<typeof MembershipSchema>;

/** Capabilities derivadas de role — role é o input, capabilities são o output de autorização */
export const ROLE_CAPABILITIES: Record<MembershipRole, string[]> = {
  owner: [
    "tenant:manage",
    "members:manage",
    "billing:manage",
    "data:read",
    "data:write",
    "data:delete",
    "agents:manage",
  ],
  admin: ["members:manage", "data:read", "data:write", "agents:manage"],
  member: ["data:read", "data:write"],
  viewer: ["data:read"],
  agent_operator: ["agents:manage", "data:read"],
};
