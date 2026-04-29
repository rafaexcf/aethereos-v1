import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pedidos" };

export default function PedidosPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pedidos</h1>

      <div className="border border-[var(--border)] rounded-[var(--radius)] p-8 text-center text-[var(--muted-foreground)]">
        <p>Nenhum pedido recebido ainda.</p>
      </div>
    </div>
  );
}
