import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { FeatureFlagsProvider } from "@aethereos/ui-shell";
import { rootRoute } from "./routes/__root";
import { loginRoute } from "./routes/login";
import { signupRoute } from "./routes/signup";
import { registerRoute } from "./routes/register";
import { selectCompanyRoute } from "./routes/select-company";
import { indexRoute } from "./routes/index";
import { desktopRoute } from "./routes/desktop";
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
  registerRoute,
  selectCompanyRoute,
  desktopRoute,
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

  const bootBg = {
    background: [
      "radial-gradient(ellipse 150% 65% at 12% -8%, rgba(94,77,230,0.35) 0%, transparent 55%)",
      "radial-gradient(ellipse 75% 55% at 90% 6%, rgba(14,165,233,0.22) 0%, transparent 50%)",
      "#060912",
    ].join(", "),
  };

  if (!booted) {
    return (
      <div className="flex h-screen items-center justify-center" style={bootBg}>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.38)",
            letterSpacing: "-0.01em",
          }}
        >
          Iniciando Aethereos…
        </p>
      </div>
    );
  }

  if (bootError !== null) {
    return (
      <div className="flex h-screen items-center justify-center" style={bootBg}>
        <p style={{ fontSize: 13, color: "rgba(248,113,113,0.8)" }}>
          Erro ao iniciar: {bootError}
        </p>
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
