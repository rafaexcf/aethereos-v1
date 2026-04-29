import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "Comércio Digital",
    template: "%s | Comércio Digital",
  },
};

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-semibold text-lg text-[var(--primary)]"
          >
            Comércio Digital
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/precos"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Preços
            </Link>
            <Link
              href="/sobre"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Sobre
            </Link>
            <Link
              href="/app/login"
              className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[var(--muted-foreground)]">
            <p>
              © {new Date().getFullYear()} Comércio Digital. Parte do
              ecossistema Aethereos.
            </p>
            <nav className="flex gap-6">
              <Link
                href="/sobre"
                className="hover:text-[var(--foreground)] transition-colors"
              >
                Sobre
              </Link>
              <Link
                href="/precos"
                className="hover:text-[var(--foreground)] transition-colors"
              >
                Preços
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
