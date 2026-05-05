import { z } from "zod";
import { SCOPE_CATALOG } from "./scopes.js";

/**
 * Sprint 23 MX127 — aethereos.app.json manifest schema.
 *
 * Spec documentada em docs/MANIFEST_SPEC.md. Em F1, o manifesto NAO
 * eh consumido em runtime — eh apenas contrato declarativo para
 * developers e ferramentas (Developer Console em sprint futuro).
 *
 * Quando houver Developer Console, o manifesto sera lido durante o
 * upload do app e seus campos populados em kernel.app_registry.
 */

const SCOPE_IDS = Object.keys(SCOPE_CATALOG) as [string, ...string[]];

export const AethereosManifestSchema = z
  .object({
    $schema: z.string().url().optional(),
    id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z][a-z0-9-]*$/, {
        message: "id deve ser kebab-case (a-z, 0-9, -)",
      }),
    name: z.string().min(1).max(120),
    version: z.string().regex(/^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$/, {
      message: "version deve seguir semver (ex: 1.0.0 ou 1.0.0-beta.1)",
    }),
    description: z.string().min(1).max(280),
    long_description: z.string().max(4000).optional(),
    developer: z.object({
      name: z.string().min(1).max(120),
      website: z.string().url().optional(),
      email: z.string().email().optional(),
    }),
    type: z.enum([
      "native",
      "open_source",
      "embedded_external",
      "external_shortcut",
      "template_app",
      "ai_app",
    ]),
    category: z.enum([
      "vertical",
      "optional",
      "ai",
      "productivity",
      "games",
      "utilities",
      "puter",
      "system",
    ]),
    entry: z
      .object({
        mode: z.enum(["internal", "iframe", "weblink"]),
        url: z.string().url().optional(),
        target: z.string().min(1).optional(),
      })
      .refine(
        (e) => e.mode === "internal" || (e.url !== undefined && e.url !== ""),
        { message: "iframe/weblink requerem entry.url" },
      ),
    icons: z
      .object({
        small: z.string().min(1).optional(),
        large: z.string().min(1).optional(),
        lucide: z.string().min(1).optional(),
      })
      .optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "color deve ser hex 6 chars")
      .optional(),
    permissions: z.array(z.enum(SCOPE_IDS)).default([]),
    window: z
      .object({
        defaultWidth: z.number().int().positive().optional(),
        defaultHeight: z.number().int().positive().optional(),
        minWidth: z.number().int().positive().optional(),
        minHeight: z.number().int().positive().optional(),
        resizable: z.boolean().default(true),
        maximizable: z.boolean().default(true),
      })
      .optional(),
    pricing: z
      .object({
        model: z.enum(["free", "one_time", "subscription", "usage_based"]),
        currency: z.string().length(3).optional(),
        amount: z.number().nonnegative().optional(),
      })
      .optional(),
    security: z
      .object({
        sandbox: z.boolean().default(true),
        allowedOrigins: z.array(z.string().url()).default([]),
      })
      .optional(),
    license: z.string().min(1).max(120).optional(),
    tags: z.array(z.string().min(1).max(32)).default([]),
  })
  .strict();

export type AethereosManifest = z.infer<typeof AethereosManifestSchema>;

/**
 * Valida e parseia um manifesto. Retorna manifest valido ou erro tipado
 * com lista de issues do Zod.
 */
export function parseManifest(
  input: unknown,
):
  | { ok: true; value: AethereosManifest }
  | { ok: false; issues: z.ZodIssue[] } {
  const r = AethereosManifestSchema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  return { ok: false, issues: r.error.issues };
}
