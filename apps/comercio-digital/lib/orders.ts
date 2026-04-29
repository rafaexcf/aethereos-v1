import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { DrizzleDb } from "@aethereos/drivers-supabase";
import { orders, orderItems, scpOutbox } from "@aethereos/drivers-supabase";
import {
  register,
  buildEnvelope,
  COMMERCE_CHECKOUT_EVENT_SCHEMAS,
} from "@aethereos/scp-registry";
import type { Actor } from "@aethereos/scp-registry";
import { ok, err } from "@aethereos/drivers";
import type { Result } from "@aethereos/drivers";

for (const [type, schema] of Object.entries(COMMERCE_CHECKOUT_EVENT_SCHEMAS)) {
  try {
    register(type, schema);
  } catch {
    // Already registered
  }
}

export type OrderRow = typeof orders.$inferSelect;

export async function listOrders(
  db: DrizzleDb,
  companyId: string,
): Promise<Result<OrderRow[], Error>> {
  try {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.companyId, companyId))
      .orderBy(orders.createdAt);
    return ok(rows);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export type CreateCheckoutInput = {
  productId: string;
  productName: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  stripeSessionId: string;
};

export async function createPendingOrder(
  db: DrizzleDb,
  companyId: string,
  actor: Actor,
  input: CreateCheckoutInput,
): Promise<Result<OrderRow, Error>> {
  try {
    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          companyId,
          customerEmail: input.customerEmail,
          amountCents: input.amountCents,
          currency: input.currency,
          status: "pending",
          stripeSessionId: input.stripeSessionId,
          metadata: {},
        })
        .returning();

      if (!order) throw new Error("Insert retornou vazio");

      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: input.productId,
        productName: input.productName,
        quantity: 1,
        priceCentsAtPurchase: input.amountCents,
      });

      const envelope = buildEnvelope({
        type: "commerce.checkout.started",
        tenant_id: companyId,
        actor,
        correlation_id: randomUUID(),
        payload: {
          order_id: order.id,
          company_id: companyId,
          product_id: input.productId,
          customer_email: input.customerEmail,
          amount_cents: input.amountCents,
          currency: input.currency,
          stripe_session_id: input.stripeSessionId,
        },
      });

      if (envelope.ok) {
        await tx.insert(scpOutbox).values({
          companyId,
          eventType: "commerce.checkout.started",
          eventId: envelope.value.id,
          payload: envelope.value.payload,
          envelope: envelope.value as unknown as Record<string, unknown>,
        });
      }

      return order;
    });

    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function markOrderPaid(
  db: DrizzleDb,
  companyId: string,
  stripeSessionId: string,
  stripePaymentIntentId: string | undefined,
): Promise<Result<OrderRow, Error>> {
  try {
    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .update(orders)
        .set({
          status: "paid",
          stripePaymentIntentId: stripePaymentIntentId ?? null,
        })
        .where(
          and(
            eq(orders.companyId, companyId),
            eq(orders.stripeSessionId, stripeSessionId),
          ),
        )
        .returning();

      if (!order) throw new Error("Pedido não encontrado");

      const envelope = buildEnvelope({
        type: "commerce.order.paid",
        tenant_id: companyId,
        actor: { type: "system", service_name: "stripe-webhook", version: "1" },
        correlation_id: randomUUID(),
        payload: {
          order_id: order.id,
          company_id: companyId,
          stripe_session_id: stripeSessionId,
          stripe_payment_intent_id: stripePaymentIntentId,
          amount_cents: order.amountCents,
        },
      });

      if (envelope.ok) {
        await tx.insert(scpOutbox).values({
          companyId,
          eventType: "commerce.order.paid",
          eventId: envelope.value.id,
          payload: envelope.value.payload,
          envelope: envelope.value as unknown as Record<string, unknown>,
        });
      }

      return order;
    });

    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function markOrderFailed(
  db: DrizzleDb,
  companyId: string,
  stripeSessionId: string,
  reason?: string,
): Promise<Result<OrderRow, Error>> {
  try {
    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .update(orders)
        .set({ status: "failed" })
        .where(
          and(
            eq(orders.companyId, companyId),
            eq(orders.stripeSessionId, stripeSessionId),
          ),
        )
        .returning();

      if (!order) throw new Error("Pedido não encontrado");

      const envelope = buildEnvelope({
        type: "commerce.order.failed",
        tenant_id: companyId,
        actor: { type: "system", service_name: "stripe-webhook", version: "1" },
        correlation_id: randomUUID(),
        payload: {
          order_id: order.id,
          company_id: companyId,
          stripe_session_id: stripeSessionId,
          reason,
        },
      });

      if (envelope.ok) {
        await tx.insert(scpOutbox).values({
          companyId,
          eventType: "commerce.order.failed",
          eventId: envelope.value.id,
          payload: envelope.value.payload,
          envelope: envelope.value as unknown as Record<string, unknown>,
        });
      }

      return order;
    });

    return ok(result);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
