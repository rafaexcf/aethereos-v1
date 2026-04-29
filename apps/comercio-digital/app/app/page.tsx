import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "../../lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getServerSession();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Produtos ativos" value="—" />
        <StatCard label="Pedidos este mês" value="—" />
        <StatCard label="Receita este mês" value="—" />
      </div>

      <div className="flex gap-4">
        <Link
          href="/app/produtos"
          className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Ver produtos
        </Link>
        <Link
          href="/app/pedidos"
          className="border border-[var(--border)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:bg-[var(--muted)] transition-colors"
        >
          Ver pedidos
        </Link>
      </div>

      {session?.companyId && (
        <p className="mt-6 text-xs text-[var(--muted-foreground)]">
          Empresa: {session.companyId}
        </p>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="border border-[var(--border)] rounded-[var(--radius)] p-4">
      <p className="text-sm text-[var(--muted-foreground)] mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
