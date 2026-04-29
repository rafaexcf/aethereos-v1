import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Conheça o Comércio Digital e o ecossistema Aethereos.",
};

export default function SobrePage() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Sobre o Comércio Digital</h1>

        <div className="prose prose-neutral max-w-none space-y-6 text-[var(--muted-foreground)] leading-relaxed">
          <p>
            O Comércio Digital é o primeiro SaaS standalone da família Aethereos
            — uma plataforma de gestão comercial B2B pensada para pequenas e
            médias empresas que precisam de agilidade sem abrir mão de
            integração.
          </p>

          <p>
            Funciona completamente standalone no domínio próprio, com catálogo
            de produtos, gestão de pedidos e checkout integrado com Stripe.
            Quando o cliente cresce e precisa de mais — logística, financeiro,
            automações, IA — o mesmo produto se integra ao Aethereos OS sem
            migração de dados ou reaprendizado.
          </p>

          <h2 className="text-2xl font-semibold text-[var(--foreground)] mt-8 mb-4">
            Parte do ecossistema Aethereos
          </h2>

          <p>
            O Aethereos é um OS B2B no navegador — local-first, multi-tenant,
            com IA nativa. O Comércio Digital é a porta de entrada: menor
            fricção, domínio próprio, marca própria. Quando o cliente adota o
            ecossistema completo, os dados já estão lá — eventos SCP do passado
            ficam disponíveis para o AI Copilot fazer contexto histórico.
          </p>

          <h2 className="text-2xl font-semibold text-[var(--foreground)] mt-8 mb-4">
            Tecnologia
          </h2>

          <p>
            Construído com Next.js 15 App Router, TypeScript strict, Tailwind
            v4. Backend em Supabase Postgres com RLS multi-tenant. Eventos via
            Software Context Protocol (SCP) com NATS JetStream e padrão Outbox
            para garantia de entrega. Sem vendor lock-in por design.
          </p>
        </div>
      </div>
    </div>
  );
}
