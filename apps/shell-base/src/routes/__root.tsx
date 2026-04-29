import { createRootRoute, Outlet } from "@tanstack/react-router";

export const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <main className="flex h-full items-center justify-center">
      <p className="text-zinc-400">Página não encontrada</p>
    </main>
  ),
});
