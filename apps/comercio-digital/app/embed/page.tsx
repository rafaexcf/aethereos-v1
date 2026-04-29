import type { Metadata } from "next";

export const metadata: Metadata = { title: "Comércio Digital — Embed" };

export default function EmbedPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Produtos" value="—" />
        <StatCard label="Pedidos" value="—" />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="border border-[var(--border)] rounded-[var(--radius)] p-3">
      <p className="text-xs text-[var(--muted-foreground)] mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
