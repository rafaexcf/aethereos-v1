import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Comércio Digital — Plataforma B2B Integrada",
  description:
    "Gerencie produtos, pedidos e clientes. Integre com o ecossistema Aethereos quando sua empresa crescer.",
  openGraph: {
    title: "Comércio Digital",
    description: "Plataforma de comércio B2B integrada ao Aethereos.",
  },
};

const FEATURES = [
  {
    title: "Catálogo de Produtos",
    description:
      "Crie e gerencie seu catálogo com preços, descrições e variações.",
    icon: "📦",
  },
  {
    title: "Gestão de Pedidos",
    description: "Acompanhe pedidos do checkout à entrega em tempo real.",
    icon: "📋",
  },
  {
    title: "Pagamentos Seguros",
    description: "Checkout integrado com Stripe. Aceite cartão e PIX.",
    icon: "💳",
  },
  {
    title: "Integração Aethereos",
    description: "Quando sua empresa crescer, integre com o OS B2B completo.",
    icon: "🔗",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Crie sua conta",
    description: "Cadastro gratuito, sem cartão de crédito.",
  },
  {
    step: "2",
    title: "Adicione produtos",
    description: "Monte seu catálogo em minutos.",
  },
  {
    step: "3",
    title: "Receba pedidos",
    description: "Compartilhe o link do catálogo e venda.",
  },
] as const;

export default function LandingPage() {
  return (
    <>
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Comércio B2B sem complicação
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] mb-8 max-w-2xl mx-auto">
            Gerencie produtos, pedidos e pagamentos. Funciona standalone.
            Integra com o Aethereos quando você precisar de mais.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/app/login"
              className="bg-[var(--primary)] text-[var(--primary-foreground)] px-8 py-3 rounded-[var(--radius)] font-medium text-lg hover:opacity-90 transition-opacity"
            >
              Começar grátis
            </Link>
            <Link
              href="/precos"
              className="border border-[var(--border)] px-8 py-3 rounded-[var(--radius)] font-medium text-lg hover:bg-[var(--muted)] transition-colors"
            >
              Ver preços
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-[var(--muted)]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Funcionalidades
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-[var(--background)] p-6 rounded-[var(--radius)] border border-[var(--border)]"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Como funciona
          </h2>
          <div className="flex flex-col gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-6 items-start">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
                  <p className="text-[var(--muted-foreground)]">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
