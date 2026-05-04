import { useEffect } from "react";
import { useDrivers } from "../lib/drivers-context";
import { useSessionStore } from "../stores/session";
import { useInstalledModulesStore } from "../stores/installedModulesStore";

/**
 * Sprint 16 MX78 — bootstrap do installedModulesStore:
 * 1. Quando drivers + activeCompanyId disponiveis: loadModules() inicial
 * 2. subscribeRealtime() em company_modules para sync multi-aba/device
 * 3. reset() ao trocar de company
 *
 * Mounted em OSDesktop ao lado de useNotificationsLifecycle / etc.
 */
export function useInstalledModulesLifecycle(): void {
  const drivers = useDrivers();
  const activeCompanyId = useSessionStore((s) => s.activeCompanyId);
  const loadModules = useInstalledModulesStore((s) => s.loadModules);
  const subscribeRealtime = useInstalledModulesStore(
    (s) => s.subscribeRealtime,
  );
  const reset = useInstalledModulesStore((s) => s.reset);

  useEffect(() => {
    if (drivers === null || activeCompanyId === null) {
      reset();
      return;
    }
    void loadModules(drivers, activeCompanyId);
    subscribeRealtime(drivers, activeCompanyId);
    return () => {
      reset();
    };
  }, [drivers, activeCompanyId, loadModules, subscribeRealtime, reset]);
}
