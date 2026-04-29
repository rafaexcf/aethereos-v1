import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../__root";

export const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/about",
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Aethereos</h1>
        <p className="text-sm text-zinc-400">
          Camada 1 — shell-commercial v0.0.0
        </p>
        <p className="text-xs text-zinc-600">
          Licença: UNLICENSED (proprietária)
        </p>
      </div>
    </main>
  );
}
