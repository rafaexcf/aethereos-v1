import { useEffect } from "react";
import { useUserPreference } from "./useUserPreference";
import { bindDockOrderPersister, useDockStore } from "../stores/dockStore";

const DOCK_DEFAULT: string[] = [];

export function useUserPreferencesLifecycle(): void {
  const applyRemote = useDockStore((s) => s.applyRemote);
  const dockOrder = useUserPreference<string[]>("dock_order", DOCK_DEFAULT);

  useEffect(() => {
    const release = bindDockOrderPersister((order) => {
      dockOrder.set(order);
    });
    return release;
  }, [dockOrder]);

  useEffect(() => {
    if (dockOrder.isLoading) return;
    if (dockOrder.value.length === 0) return;
    applyRemote(dockOrder.value);
  }, [dockOrder.isLoading, dockOrder.value, applyRemote]);
}
