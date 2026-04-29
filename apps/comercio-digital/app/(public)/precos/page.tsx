import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Preços",
  description: "Planos simples para empresas de todos os tamanhos.",
};

const PLANS = [
  {
    name: "Free",
    price: "Grátis",
    description: "Para experimentar",
    features: [
      "Até 10 produtos",
      "Até 50 pedidos/mês",
      "Checkout Stripe",
      "Suporte por e-mail",
    ],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "R$ 99/mês",
    description: "Para pequenas empresas",
    features: [
      "Produtos ilimitados",
      "Pedidos ilimitados",
      "Relatórios básicos",
      "Integração Aethereos",
      "Suporte prioritário",
    ],
    cta: "Assinar Starter",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "R$ 299/mês",
    description: "Para empresas em crescimento",
    features: [
      "Tudo do Starter",
      "Multi-empresa",
      "API access",
      "Automações SCP",
      "SLA 99,9%",
      "Suporte dedicado",
    ],
    cta: "Assinar Pro",
    highlighted: false,
  },
] as const;

export default function PrecosPage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Preços simples e transparentes
          </h1>
          <p className="text-[var(--muted-foreground)] text-lg">
            Comece grátis. Escale conforme crescer.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-[var(--radius)] border p-6 flex flex-col ${
                plan.highlighted
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] bg-[var(--background)]"
              }`}
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                <p
                  className={`text-sm mb-3 ${plan.highlighted ? "opacity-80" : "text-[var(--muted-foreground)]"}`}
                >
                  {plan.description}
                </p>
                <p className="text-3xl font-bold">{plan.price}</p>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/app/login"
                className={`block text-center py-2 px-4 rounded-[var(--radius)] font-medium transition-opacity hover:opacity-90 ${
                  plan.highlighted
                    ? "bg-[var(--primary-foreground)] text-[var(--primary)]"
                    : "bg-[var(--primary)] text-[var(--primary-foreground)]"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-[var(--muted-foreground)] mt-8">
          Preços em BRL. Planos pagos disponíveis em breve — cadastre-se agora
          para garantir early access.
        </p>
      </div>
    </div>
  );
}
