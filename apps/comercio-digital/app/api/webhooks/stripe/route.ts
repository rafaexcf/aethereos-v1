import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getStripeClient,
  getStripeWebhookSecret,
} from "../../../../lib/stripe";
import { SupabaseDatabaseDriver } from "@aethereos/drivers-supabase";
import { markOrderPaid, markOrderFailed } from "../../../../lib/orders";

function getDriver(): SupabaseDatabaseDriver {
  return new SupabaseDatabaseDriver({
    connectionString: process.env["DATABASE_URL"] ?? "",
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let webhookSecret: string;
  try {
    webhookSecret = getStripeWebhookSecret();
  } catch {
    return NextResponse.json(
      { error: "Webhook secret não configurado" },
      { status: 500 },
    );
  }

  const stripe = getStripeClient();
  let event: ReturnType<typeof stripe.webhooks.constructEvent>;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook inválido: ${String(err)}` },
      { status: 400 },
    );
  }

  const driver = getDriver();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const companyId =
      typeof session.metadata?.["company_id"] === "string"
        ? session.metadata["company_id"]
        : null;

    if (!companyId) {
      return NextResponse.json(
        { error: "company_id ausente no metadata" },
        { status: 400 },
      );
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : undefined;

    await markOrderPaid(driver.db, companyId, session.id, paymentIntentId);
  } else if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    // Find the order by matching payment intent ID via session lookup
    // For simplicity, we propagate using the latest_charge metadata if available
    const stripeSessionId =
      typeof intent.metadata?.["session_id"] === "string"
        ? intent.metadata["session_id"]
        : null;
    const companyId =
      typeof intent.metadata?.["company_id"] === "string"
        ? intent.metadata["company_id"]
        : null;

    if (stripeSessionId && companyId) {
      await markOrderFailed(
        driver.db,
        companyId,
        stripeSessionId,
        intent.last_payment_error?.message,
      );
    }
  }

  return NextResponse.json({ received: true });
}
