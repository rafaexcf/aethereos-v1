import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./__root";
import { ShellLayout } from "../components/shell-layout";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ShellLayout,
});
