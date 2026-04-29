import { z } from "zod";

/**
 * Capability tokens — modelo de autorização por capability explícita.
 *
 * Cada app recebe do kernel conjunto explícito de capability tokens.
 * Capability tokens de agentes são SEMPRE subconjunto das do humano supervisor.
 * Ref: Fundamentação v4.3 seção 4.9 [INV], ADR-0001 (Interpretação A+)
 */

export const CapabilitySchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*:[a-z][a-z0-9_:]*$/, {
    message:
      "Capability deve ter formato domain:action (ex: data:read, tenant:manage)",
  });
export type Capability = z.infer<typeof CapabilitySchema>;

/** Capabilities built-in do kernel — não delegáveis a apps third-party */
export const KERNEL_CAPABILITIES = [
  "platform:admin",
  "tenant:manage",
  "members:manage",
  "billing:manage",
  "agents:manage",
  "data:read",
  "data:write",
  "data:delete",
  "access:grant",
  "access:revoke",
] as const satisfies Capability[];

export type KernelCapability = (typeof KERNEL_CAPABILITIES)[number];

/** Verifica se uma capability é uma capability built-in do kernel */
export function isKernelCapability(cap: string): cap is KernelCapability {
  return (KERNEL_CAPABILITIES as readonly string[]).includes(cap);
}
