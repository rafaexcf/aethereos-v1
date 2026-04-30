import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { OSDesktop } from "../components/os/OSDesktop";

export const desktopRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/desktop",
  component: OSDesktop,
});
