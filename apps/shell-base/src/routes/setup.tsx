import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "./__root";

function Setup() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-6">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-2 text-xl font-bold text-white">
          Configuração inicial
        </h1>
        <p className="mb-6 text-sm text-zinc-400">
          Vamos preparar seu espaço de trabalho local.
        </p>
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-zinc-700 p-4 text-sm">
            <div className="mb-1 font-medium text-white">Armazenamento</div>
            <div className="text-zinc-400">OPFS + SQLite WASM</div>
          </div>
          <div className="rounded-lg border border-zinc-700 p-4 text-sm">
            <div className="mb-1 font-medium text-white">Identidade</div>
            <div className="text-zinc-400">Ed25519 local — sem servidor</div>
          </div>
        </div>
        <Link
          to="/"
          className="mt-6 block w-full rounded-md bg-violet-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-violet-500"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup",
  component: Setup,
});
