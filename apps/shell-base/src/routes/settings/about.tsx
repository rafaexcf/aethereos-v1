import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "../__root";

function About() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8">
        <h2 className="mb-1 text-lg font-bold text-white">Aethereos</h2>
        <p className="mb-4 text-sm text-zinc-400">
          OS B2B no navegador — Camada 0
        </p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Versão</dt>
            <dd className="text-zinc-300">0.0.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Licença</dt>
            <dd className="text-zinc-300">BUSL-1.1</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Change Date</dt>
            <dd className="text-zinc-300">2030-04-29 → Apache 2.0</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Armazenamento</dt>
            <dd className="text-zinc-300">OPFS local-first</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Backend</dt>
            <dd className="text-zinc-300">nenhum obrigatório</dd>
          </div>
        </dl>
        <Link
          to="/"
          className="mt-6 block text-center text-sm text-zinc-400 hover:text-white"
        >
          ← Voltar
        </Link>
      </div>
    </main>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/about",
  component: About,
});
