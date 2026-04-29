import { createRoute, Link } from "@tanstack/react-router";
import { rootRoute } from "./__root";

function Desktop() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Aethereos
        </h1>
        <p className="text-sm text-zinc-400">
          Camada 0 — OS B2B local-first no navegador
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          to="/setup"
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Configurar
        </Link>
        <Link
          to="/settings/about"
          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white"
        >
          Sobre
        </Link>
      </div>
    </main>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Desktop,
});
