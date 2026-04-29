import type { Metadata } from "next";
import { SupabaseDatabaseDriver } from "@aethereos/drivers-supabase";
import { getServerSession } from "../../../lib/auth";
import { listOrders } from "../../../lib/orders";

export const metadata: Metadata = { title: "Pedidos" };

function getDriver() {
  return new SupabaseDatabaseDriver({
    connectionString: process.env["DATABASE_URL"] ?? "",
  });
}

function formatPrice(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency,
  });
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function PedidosPage() {
  const session = await getServerSession();
  if (!session?.companyId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Pedidos</h1>
        <p className="text-[var(--muted-foreground)] text-sm">
          Sem contexto de empresa.
        </p>
      </div>
    );
  }

  const driver = getDriver();
  const result = await listOrders(driver.db, session.companyId);
  const orderList = result.ok ? result.value : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pedidos</h1>

      {!result.ok && (
        <div className="border border-red-300 bg-red-50 text-red-700 rounded-[var(--radius)] p-4 mb-4 text-sm">
          Erro ao carregar pedidos: {result.error.message}
        </div>
      )}

      {orderList.length === 0 ? (
        <div className="border border-[var(--border)] rounded-[var(--radius)] p-8 text-center text-[var(--muted-foreground)]">
          <p>Nenhum pedido recebido ainda.</p>
        </div>
      ) : (
        <div className="border border-[var(--border)] rounded-[var(--radius)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-[var(--muted-foreground)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 font-medium">Valor</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {orderList.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.customerEmail}</div>
                    {o.customerName && (
                      <div className="text-[var(--muted-foreground)] text-xs">
                        {o.customerName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {formatPrice(o.amountCents, o.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {new Date(o.createdAt).toLocaleDateString("pt-BR")}
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
