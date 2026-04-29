import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { useSessionStore } from "../stores/session";

export const rootRoute = createRootRoute({
  // beforeLoad: verifica sessão antes de renderizar qualquer rota
  beforeLoad: ({ location }) => {
    const { isBooted, userId, activeCompanyId } = useSessionStore.getState();

    // Não redireciona enquanto ainda está bootando
    if (!isBooted) return;

    const isAuthRoute =
      location.pathname === "/login" || location.pathname === "/signup";

    // Sem sessão → /login
    if (userId === null && !isAuthRoute) {
      throw redirect({ to: "/login", replace: true });
    }

    // Sessão mas sem company → /select-company
    if (
      userId !== null &&
      activeCompanyId === null &&
      location.pathname !== "/select-company" &&
      !isAuthRoute
    ) {
      throw redirect({ to: "/select-company", replace: true });
    }

    // Sessão completa tentando acessar rota de auth → /
    if (userId !== null && activeCompanyId !== null && isAuthRoute) {
      throw redirect({ to: "/", replace: true });
    }
  },

  component: () => <Outlet />,

  notFoundComponent: () => (
    <main className="flex h-full items-center justify-center">
      <p className="text-zinc-400">Página não encontrada</p>
    </main>
  ),
});
