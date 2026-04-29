import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { FeatureFlagsProvider } from "@aethereos/ui-shell";
import { rootRoute } from "./routes/__root";
import { loginRoute } from "./routes/login";
import { signupRoute } from "./routes/signup";
import { selectCompanyRoute } from "./routes/select-company";
import { indexRoute } from "./routes/index";
import { aboutRoute } from "./routes/settings/about";
import { opsRoute } from "./routes/settings/ops";
import { staffRoute } from "./routes/staff";
import { boot } from "./lib/boot";
import { DriversProvider } from "./lib/drivers-context";
import "./styles/globals.css";

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  selectCompanyRoute,
  aboutRoute,
  opsRoute,
  staffRoute,
]);

const router = createRouter({ routeTree });

function App() {
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    boot()
      .then(() => {
        setBooted(true);
        // Re-triggers beforeLoad on the current path with updated Zustand state
        void router.navigate({
          to: router.state.location.pathname,
          replace: true,
        });
      })
      .catch((e: unknown) => {
        setBootError(String(e));
        setBooted(true);
      });
  }, []);

  if (!booted) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-400">Iniciando Aethereos…</p>
      </div>
    );
  }

  if (bootError !== null) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-red-400">Erro ao iniciar: {bootError}</p>
      </div>
    );
  }

  return (
    <DriversProvider>
      <FeatureFlagsProvider>
        <RouterProvider router={router} />
      </FeatureFlagsProvider>
    </DriversProvider>
  );
}

const container = document.getElementById("root");
if (container === null) throw new Error("#root not found");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
