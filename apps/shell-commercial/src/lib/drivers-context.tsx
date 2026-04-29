import { createContext, useContext, type ReactNode } from "react";
import { useSessionStore } from "../stores/session.js";
import type { CloudDrivers } from "./drivers.js";

const DriversContext = createContext<CloudDrivers | null>(null);

/**
 * Provedor de drivers para a árvore de componentes.
 * Lê drivers do Zustand (setados em boot()) e os disponibiliza via Context.
 * Deve envolver a árvore apenas após boot() completar (isBooted=true).
 */
export function DriversProvider({ children }: { children: ReactNode }) {
  const drivers = useSessionStore((s) => s.drivers);

  return (
    <DriversContext.Provider value={drivers}>
      {children}
    </DriversContext.Provider>
  );
}

/**
 * Hook para acessar drivers nos apps.
 * Retorna null se boot() ainda não completou — apps devem tratar este caso
 * como estado de loading e não renderizar operações dependentes de drivers.
 */
export function useDrivers(): CloudDrivers | null {
  return useContext(DriversContext);
}
