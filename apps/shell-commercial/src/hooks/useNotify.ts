import { useCallback, useEffect } from "react";
import { useDrivers } from "../lib/drivers-context";
import { useSessionStore } from "../stores/session";
import {
  bindNotificationsDrivers,
  notify,
  useNotificationsStore,
  type NotifyInput,
} from "../stores/notificationsStore";

/**
 * Hook que apps usam para emitir notificações.
 * Retorna uma função `notify(input)` que persiste em kernel.notifications.
 * O Realtime subscribe global entrega de volta via NotificationCenter/Bell.
 *
 * Uso:
 *   const notify = useNotify();
 *   await notify({ type: "success", title: "Alarme tocou", source_app: "relogio" });
 */
export function useNotify(): (input: NotifyInput) => Promise<string | null> {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const companyId = useSessionStore((s) => s.activeCompanyId);

  return useCallback(
    async (input: NotifyInput) => {
      if (drivers === null || userId === null || companyId === null)
        return null;
      return notify(drivers, userId, companyId, input);
    },
    [drivers, userId, companyId],
  );
}

/**
 * Hook que carrega notificações iniciais e assina Realtime.
 * Deve ser invocado UMA VEZ na árvore (ex: no shell raiz após boot).
 */
export function useNotificationsLifecycle(): void {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const loadInitial = useNotificationsStore((s) => s.loadInitial);
  const subscribeRealtime = useNotificationsStore((s) => s.subscribeRealtime);
  const reset = useNotificationsStore((s) => s.reset);

  useEffect(() => {
    if (drivers === null || userId === null) {
      reset();
      return;
    }
    bindNotificationsDrivers(drivers);
    void loadInitial(drivers, userId);
    const unsub = subscribeRealtime(drivers, userId);
    return () => {
      unsub();
    };
  }, [drivers, userId, loadInitial, subscribeRealtime, reset]);
}
