import type { Metadata } from "next";

export const metadata: Metadata = { title: "Comércio Digital" };

export default function EmbedDashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">Comércio Digital</h1>
      <p className="text-[var(--muted-foreground)] text-sm mb-6">
        Painel embedado
      </p>

      <nav className="grid grid-cols-2 gap-3">
        <a
          href="/embed/produtos"
          className="border border-[var(--border)] rounded-[var(--radius)] p-4 hover:bg-[var(--muted)] transition-colors"
        >
          <p className="text-xs text-[var(--muted-foreground)] mb-1">
            Catálogo
          </p>
          <p className="font-medium">Produtos</p>
        </a>

        <a
          href="/embed/pedidos"
          className="border border-[var(--border)] rounded-[var(--radius)] p-4 hover:bg-[var(--muted)] transition-colors"
        >
          <p className="text-xs text-[var(--muted-foreground)] mb-1">Vendas</p>
          <p className="font-medium">Pedidos</p>
        </a>
      </nav>
    </div>
  );
}
