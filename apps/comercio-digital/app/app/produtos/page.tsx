import type { Metadata } from "next";
import Link from "next/link";
import { getProductsAction } from "./actions";

export const metadata: Metadata = { title: "Produtos" };

function formatPrice(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency,
  });
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

export default async function ProdutosPage() {
  const result = await getProductsAction();
  const products = result.ok ? result.value : [];

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

      {!result.ok && (
        <div className="border border-red-300 bg-red-50 text-red-700 rounded-[var(--radius)] p-4 mb-4 text-sm">
          Erro ao carregar produtos: {result.error.message}
        </div>
      )}

      {products.length === 0 ? (
        <div className="border border-[var(--border)] rounded-[var(--radius)] p-8 text-center text-[var(--muted-foreground)]">
          <p className="mb-2">Nenhum produto cadastrado.</p>
          <Link
            href="/app/produtos/nova"
            className="text-[var(--primary)] text-sm hover:underline"
          >
            Criar primeiro produto
          </Link>
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-[var(--radius)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">Preço</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {p.slug}
                  </td>
                  <td className="px-4 py-3">
                    {formatPrice(p.priceCents, p.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === "active"
                          ? "bg-green-100 text-green-700"
                          : p.status === "archived"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/produtos/${p.id}/editar`}
                      className="text-[var(--primary)] hover:underline text-xs"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
