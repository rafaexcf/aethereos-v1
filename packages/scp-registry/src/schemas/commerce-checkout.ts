import { z } from "zod";

export const CommerceCheckoutStartedPayloadSchema = z.object({
  order_id: z.string().uuid(),
  company_id: z.string().uuid(),
  product_id: z.string().uuid(),
  customer_email: z.string().email(),
  amount_cents: z.number().int().min(0),
  currency: z.enum(["BRL", "USD", "EUR"]),
  stripe_session_id: z.string().min(1),
});

export const CommerceOrderPlacedPayloadSchema = z.object({
  order_id: z.string().uuid(),
  company_id: z.string().uuid(),
  customer_email: z.string().email(),
  amount_cents: z.number().int().min(0),
  currency: z.enum(["BRL", "USD", "EUR"]),
});

export const CommerceOrderPaidPayloadSchema = z.object({
  order_id: z.string().uuid(),
  company_id: z.string().uuid(),
  stripe_session_id: z.string().min(1),
  stripe_payment_intent_id: z.string().optional(),
  amount_cents: z.number().int().min(0),
});

export const CommerceOrderFailedPayloadSchema = z.object({
  order_id: z.string().uuid(),
  company_id: z.string().uuid(),
  stripe_session_id: z.string().min(1),
  reason: z.string().optional(),
});

export const CommerceOrderRefundedPayloadSchema = z.object({
  order_id: z.string().uuid(),
  company_id: z.string().uuid(),
  amount_cents: z.number().int().min(0),
});

export type CommerceCheckoutStartedPayload = z.infer<
  typeof CommerceCheckoutStartedPayloadSchema
>;
export type CommerceOrderPlacedPayload = z.infer<
  typeof CommerceOrderPlacedPayloadSchema
>;
export type CommerceOrderPaidPayload = z.infer<
  typeof CommerceOrderPaidPayloadSchema
>;
export type CommerceOrderFailedPayload = z.infer<
  typeof CommerceOrderFailedPayloadSchema
>;
export type CommerceOrderRefundedPayload = z.infer<
  typeof CommerceOrderRefundedPayloadSchema
>;

export const COMMERCE_CHECKOUT_EVENT_SCHEMAS = {
  "commerce.checkout.started": CommerceCheckoutStartedPayloadSchema,
  "commerce.order.placed": CommerceOrderPlacedPayloadSchema,
  "commerce.order.paid": CommerceOrderPaidPayloadSchema,
  "commerce.order.failed": CommerceOrderFailedPayloadSchema,
  "commerce.order.refunded": CommerceOrderRefundedPayloadSchema,
} as const satisfies Record<string, z.ZodSchema>;
