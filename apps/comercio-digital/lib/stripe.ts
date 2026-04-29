// Server-side only — never import in Client Components
import Stripe from "stripe";

export function getStripeClient(): Stripe {
  const secretKey = process.env["STRIPE_SECRET_KEY"];
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY não configurado");
  return new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
}

export function getStripeWebhookSecret(): string {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET não configurado");
  return secret;
}
