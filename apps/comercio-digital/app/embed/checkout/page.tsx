import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Checkout — Comércio Digital" };

export default function EmbedCheckoutPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Checkout</h1>
      <p className="text-[var(--muted-foreground)] text-sm mb-4">
        Selecione um produto para iniciar o checkout.
      </p>
      <Link
        href="/embed"
        className="text-[var(--primary)] text-sm hover:underline"
      >
        ← Voltar ao painel
      </Link>
    </div>
  );
}
