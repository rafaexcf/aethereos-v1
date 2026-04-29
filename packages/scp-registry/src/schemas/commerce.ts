import { z } from "zod";

export const CommerceProductCreatedPayloadSchema = z.object({
  product_id: z.string().uuid(),
  company_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  price_cents: z.number().int().min(0),
  currency: z.enum(["BRL", "USD", "EUR"]),
  status: z.enum(["draft", "active", "archived"]),
});

export type CommerceProductCreatedPayload = z.infer<
  typeof CommerceProductCreatedPayloadSchema
>;

export const CommerceProductUpdatedPayloadSchema = z.object({
  product_id: z.string().uuid(),
  company_id: z.string().uuid(),
  changes: z.record(z.unknown()),
});

export type CommerceProductUpdatedPayload = z.infer<
  typeof CommerceProductUpdatedPayloadSchema
>;

export const CommerceProductArchivedPayloadSchema = z.object({
  product_id: z.string().uuid(),
  company_id: z.string().uuid(),
});

export type CommerceProductArchivedPayload = z.infer<
  typeof CommerceProductArchivedPayloadSchema
>;

export const COMMERCE_EVENT_SCHEMAS = {
  "commerce.product.created": CommerceProductCreatedPayloadSchema,
  "commerce.product.updated": CommerceProductUpdatedPayloadSchema,
  "commerce.product.archived": CommerceProductArchivedPayloadSchema,
} as const satisfies Record<string, z.ZodSchema>;
