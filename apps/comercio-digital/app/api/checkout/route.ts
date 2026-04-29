import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getStripeClient } from "../../../lib/stripe";
import { SupabaseDatabaseDriver } from "@aethereos/drivers-supabase";
import { getServerSession } from "../../../lib/auth";
import { getProduct } from "../../../lib/products";
import { createPendingOrder } from "../../../lib/orders";

const CheckoutBodySchema = z.object({
  productId: z.string().uuid(),
  customerEmail: z.string().email(),
});

function getDriver(): SupabaseDatabaseDriver {
  return new SupabaseDatabaseDriver({
    connectionString: process.env["DATABASE_URL"] ?? "",
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = CheckoutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { productId, customerEmail } = parsed.data;

  const driver = getDriver();
  const productResult = await getProduct(
    driver.db,
    session.companyId,
    productId,
  );
  if (!productResult.ok) {
    return NextResponse.json(
      { error: "Produto não encontrado" },
      { status: 404 },
    );
  }

  const product = productResult.value;
  if (product.status !== "active") {
    return NextResponse.json(
      { error: "Produto não disponível" },
      { status: 400 },
    );
  }

  const stripe = getStripeClient();
  const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: product.currency.toLowerCase(),
          unit_amount: product.priceCents,
          product_data: { name: product.name },
        },
      },
    ],
    success_url: `${appUrl}/app/pedidos?checkout=success`,
    cancel_url: `${appUrl}/app/produtos/${productId}`,
    metadata: {
      company_id: session.companyId,
      product_id: productId,
    },
  });

  const orderResult = await createPendingOrder(
    driver.db,
    session.companyId,
    { type: "human", user_id: session.userId },
    {
      productId,
      productName: product.name,
      amountCents: product.priceCents,
      currency: product.currency,
      customerEmail,
      stripeSessionId: stripeSession.id,
    },
  );

  if (!orderResult.ok) {
    return NextResponse.json(
      { error: "Erro ao criar pedido" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: stripeSession.url });
}
