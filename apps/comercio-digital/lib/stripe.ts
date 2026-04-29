// Stripe client — M28 will implement full integration
// This module is server-side only (never import in Client Components)

export function getStripeSecretKey(): string {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY env var is required");
  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET env var is required");
  return secret;
}
