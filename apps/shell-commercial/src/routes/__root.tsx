import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSessionStore } from "../stores/session";
import { isEmbedMode, postEmbedMessage } from "../lib/embed";

export const rootRoute = createRootRoute({
  // beforeLoad: verifica sessão antes de renderizar qualquer rota
  beforeLoad: ({ location }) => {
    const { isBooted, userId, activeCompanyId } = useSessionStore.getState();

    // Não redireciona enquanto ainda está bootando
    if (!isBooted) return;

    const isAuthRoute =
      location.pathname === "/login" || location.pathname === "/signup";
    const isDesktop = location.pathname === "/desktop";
    const isIndexRedirect = location.pathname === "/";

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

    // Sessão completa tentando acessar rota de auth → /desktop
    if (userId !== null && activeCompanyId !== null && isAuthRoute) {
      throw redirect({ to: "/desktop", replace: true });
    }

    // Raiz / → /desktop se autenticado com company
    if (userId !== null && activeCompanyId !== null && isIndexRedirect) {
      throw redirect({ to: "/desktop", replace: true });
    }

    void isDesktop;
  },

  component: RootComponent,

  notFoundComponent: () => (
    <main className="flex h-full items-center justify-center">
      <p className="text-zinc-400">Página não encontrada</p>
    </main>
  ),
});

function RootComponent() {
  useEffect(() => {
    if (isEmbedMode) {
      // Sinaliza para o host que o shell está pronto (protocolo embed v1)
      postEmbedMessage({ type: "embed.ready", version: "1" });
    }
  }, []);

  if (isEmbedMode) {
    // Em modo embed: sem header/dock, apenas a área de conteúdo
    return (
      <div className="h-full w-full overflow-hidden">
        <Outlet />
      </div>
    );
  }

  return <Outlet />;
}
