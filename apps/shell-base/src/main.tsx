import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import "./styles/globals.css";

import { rootRoute } from "./routes/__root";
import { Route as IndexRoute } from "./routes/index";
import { Route as SetupRoute } from "./routes/setup";
import { Route as AboutRoute } from "./routes/settings/about";
import { buildDrivers } from "./lib/drivers";
import { boot } from "./lib/boot";
import type { BootResult } from "./lib/boot";
import { BootProvider } from "./lib/boot-context";

const routeTree = rootRoute.addChildren([IndexRoute, SetupRoute, AboutRoute]);
const router = createRouter({ routeTree });
const appDrivers = buildDrivers();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function LoadingScreen() {
  return (
    <div className="flex h-full items-center justify-center bg-[#09090b]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        <p className="text-sm text-zinc-500">Iniciando Aethereos…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-[#09090b]">
      <div className="max-w-sm rounded-xl border border-red-900 bg-red-950/30 p-6 text-center">
        <p className="mb-1 font-medium text-red-400">Erro ao iniciar</p>
        <p className="text-xs text-red-300/70">{message}</p>
      </div>
    </div>
  );
}

function App() {
  const [bootResult, setBootResult] = useState<BootResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    boot(appDrivers)
      .then(setBootResult)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
      });
  }, []);

  if (error) return <ErrorScreen message={error} />;
  if (!bootResult) return <LoadingScreen />;

  return (
    <BootProvider value={bootResult}>
      <RouterProvider router={router} />
    </BootProvider>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found in DOM");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
