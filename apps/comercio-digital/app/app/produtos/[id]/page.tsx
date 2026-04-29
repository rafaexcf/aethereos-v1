"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = typeof params["id"] === "string" ? params["id"] : "";

  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, customerEmail: email }),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(data.error ?? "Erro ao iniciar checkout");
        return;
      }

      router.push(data.url);
    } catch {
      setError("Erro de rede ao iniciar checkout");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/app/produtos"
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
        >
          ← Produtos
        </Link>
        <h1 className="text-2xl font-bold">Comprar produto</h1>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 rounded-[var(--radius)] p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleCheckout} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">
            Email do comprador <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="comprador@exemplo.com"
            className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Redirecionando..." : "Comprar via Stripe"}
        </button>
      </form>
    </div>
  );
}
