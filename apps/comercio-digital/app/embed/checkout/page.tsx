import type { Metadata } from "next";

export const metadata: Metadata = { title: "Checkout — Embed" };

export default function EmbedCheckoutPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Checkout</h1>
      <p className="text-[var(--muted-foreground)] text-sm">
        Integração de checkout disponível na Milestone M28.
      </p>
    </div>
  );
}
