import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Produtos" };

export default function ProdutosPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Link
          href="/app/produtos/nova"
          className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Novo produto
        </Link>
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius)] p-8 text-center text-[var(--muted-foreground)]">
        <p className="mb-2">Nenhum produto cadastrado.</p>
        <Link
          href="/app/produtos/nova"
          className="text-[var(--primary)] text-sm hover:underline"
        >
          Criar primeiro produto
        </Link>
      </div>
    </div>
  );
}
