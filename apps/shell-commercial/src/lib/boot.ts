import { buildDrivers } from "./drivers";
import { useSessionStore } from "../stores/session";

/**
 * Boot sequence cloud-first (Camada 1).
 *
 * 1. Instancia CloudDrivers (Supabase anon + PKCE)
 * 2. Tenta refresh da sessão existente
 * 3. Se válida: lê JWT claims → hydra Zustand com session + companies
 * 4. Marca isBooted = true
 *
 * O __root.tsx lê isBooted e o estado de sessão para decidir o redirect.
 */
export async function boot(): Promise<void> {
  const drivers = buildDrivers();
  const { setBooted, setAuthSession } = useSessionStore.getState();

  setBooted(drivers);

  // Tenta restaurar sessão existente (ou refresh silencioso)
  const sessionResult = await drivers.auth.getSession();
  if (!sessionResult.ok || sessionResult.value === null) {
    // Sem sessão → __root.tsx vai redirecionar para /login
    return;
  }

  const session = sessionResult.value;

  // Lê JWT custom claims (companies + active_company_id injetados pelo hook)
  const claims = await drivers.auth.getCompanyClaims();

  setAuthSession({
    userId: session.user_id,
    email: session.email,
    accessToken: session.access_token,
    companies: claims.companies,
    activeCompanyId: claims.activeCompanyId,
  });

  // Define company context no driver se já tem uma ativa
  if (claims.activeCompanyId !== null) {
    drivers.auth.withCompanyContext(claims.activeCompanyId);
  }
}
