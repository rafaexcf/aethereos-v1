import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "../../lib/auth";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/app/login");
  }

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <aside className="w-60 border-r border-[var(--border)] flex flex-col p-4 gap-1">
        <div className="h-12 flex items-center mb-4">
          <Link href="/app" className="font-semibold text-[var(--primary)]">
            Comércio Digital
          </Link>
        </div>
        <NavLink href="/app">Dashboard</NavLink>
        <NavLink href="/app/produtos">Produtos</NavLink>
        <NavLink href="/app/pedidos">Pedidos</NavLink>
        <div className="mt-auto pt-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted-foreground)] truncate">
            {session.email}
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

function NavLink({ href, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-[var(--radius)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
    >
      {children}
    </Link>
  );
}
