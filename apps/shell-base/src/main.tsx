import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import "./styles/globals.css";

import { rootRoute } from "./routes/__root";
import { Route as IndexRoute } from "./routes/index";
import { Route as SetupRoute } from "./routes/setup";
import { Route as AboutRoute } from "./routes/settings/about";

const routeTree = rootRoute.addChildren([IndexRoute, SetupRoute, AboutRoute]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found in DOM");

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
