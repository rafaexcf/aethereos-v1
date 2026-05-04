import { useEffect } from "react";
import { useDrivers } from "../lib/drivers-context";
import { useAppRegistryStore } from "../stores/appRegistryStore";

/**
 * Sprint 21 MX114 — bootstrap do appRegistryStore.
 *
 * Carrega o catalogo global (kernel.app_registry, sem company_id) ao
 * obter drivers. Roda uma vez por sessao — apps mudam raramente e nao
 * dependem do tenant. Sem realtime: catalogo eh proprio do produto.
 */
export function useAppRegistryLifecycle(): void {
  const drivers = useDrivers();
  const loadApps = useAppRegistryStore((s) => s.loadApps);

  useEffect(() => {
    if (drivers === null) return;
    void loadApps(drivers);
  }, [drivers, loadApps]);
}
