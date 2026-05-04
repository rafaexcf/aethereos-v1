import { create } from "zustand";
import type { CloudDrivers } from "../lib/drivers";
import { getApp } from "../apps/registry";

const PROTECTED_MODULES = new Set<string>([
  "mesa",
  "magic-store",
  "ae-ai",
  "settings",
  "notifications",
]);

interface CompanyModuleRow {
  id: string;
  module: string;
}

interface InstalledModulesState {
  installed: ReadonlySet<string>;
  pending: ReadonlySet<string>;
  ready: boolean;
  error: string | null;
  unsubscribeFn: (() => void) | null;
}

interface InstalledModulesActions {
  loadModules: (drivers: CloudDrivers, companyId: string) => Promise<void>;
  installModule: (
    drivers: CloudDrivers,
    companyId: string,
    moduleId: string,
  ) => Promise<void>;
  uninstallModule: (
    drivers: CloudDrivers,
    companyId: string,
    moduleId: string,
  ) => Promise<void>;
  subscribeRealtime: (drivers: CloudDrivers, companyId: string) => void;
  reset: () => void;
}

const INITIAL: InstalledModulesState = {
  installed: new Set<string>(),
  pending: new Set<string>(),
  ready: false,
  error: null,
  unsubscribeFn: null,
};

export const useInstalledModulesStore = create<
  InstalledModulesState & InstalledModulesActions
>((set, get) => ({
  ...INITIAL,

  loadModules: async (drivers, companyId) => {
    try {
      const res = (await drivers.data
        .from("company_modules")
        .select("id,module")
        .eq("company_id", companyId)) as unknown as {
        data: CompanyModuleRow[] | null;
        error: { message: string } | null;
      };
      if (res.error !== null) {
        set({ error: res.error.message, ready: true });
        return;
      }
      const ids = new Set<string>((res.data ?? []).map((r) => r.module));
      set({ installed: ids, ready: true, error: null });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Erro ao carregar modulos",
        ready: true,
      });
    }
  },

  installModule: async (drivers, companyId, moduleId) => {
    const { installed, pending } = get();
    if (installed.has(moduleId)) return;
    if (pending.has(moduleId)) return;
    const nextPending = new Set(pending);
    nextPending.add(moduleId);
    set({ pending: nextPending });
    try {
      const res = (await drivers.data.from("company_modules").insert({
        company_id: companyId,
        module: moduleId,
        status: "active",
      })) as unknown as { error: { message: string } | null };
      if (res.error !== null) {
        set({ error: res.error.message });
        return;
      }
      const newInstalled = new Set(get().installed);
      newInstalled.add(moduleId);
      set({ installed: newInstalled, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Erro ao instalar" });
    } finally {
      const np = new Set(get().pending);
      np.delete(moduleId);
      set({ pending: np });
    }
  },

  uninstallModule: async (drivers, companyId, moduleId) => {
    if (PROTECTED_MODULES.has(moduleId)) return;
    const app = getApp(moduleId);
    if (app?.alwaysEnabled === true) return;
    const { installed, pending } = get();
    if (!installed.has(moduleId)) return;
    if (pending.has(moduleId)) return;
    const nextPending = new Set(pending);
    nextPending.add(moduleId);
    set({ pending: nextPending });
    try {
      const res = (await drivers.data
        .from("company_modules")
        .delete()
        .eq("company_id", companyId)
        .eq("module", moduleId)) as unknown as {
        error: { message: string } | null;
      };
      if (res.error !== null) {
        set({ error: res.error.message });
        return;
      }
      const newInstalled = new Set(get().installed);
      newInstalled.delete(moduleId);
      set({ installed: newInstalled, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Erro ao desinstalar" });
    } finally {
      const np = new Set(get().pending);
      np.delete(moduleId);
      set({ pending: np });
    }
  },

  subscribeRealtime: (drivers, companyId) => {
    const existing = get().unsubscribeFn;
    if (existing !== null) existing();
    const sub = drivers.data.subscribeToTable({
      table: "company_modules",
      event: "*",
      filter: `company_id=eq.${companyId}`,
      onData: () => {
        void get().loadModules(drivers, companyId);
      },
    });
    set({ unsubscribeFn: () => sub.unsubscribe() });
  },

  reset: () => {
    const { unsubscribeFn } = get();
    if (unsubscribeFn !== null) unsubscribeFn();
    set({ ...INITIAL });
  },
}));

/**
 * Hook reativo: retorna true se o app deve aparecer no Dock/Mesa/Launcher.
 * - alwaysEnabled === true → sempre true
 * - senao → installed.has(appId)
 */
export function useIsAppVisible(appId: string): boolean {
  const installed = useInstalledModulesStore((s) => s.installed);
  const app = getApp(appId);
  if (app === undefined) return false;
  if (app.alwaysEnabled === true) return true;
  return installed.has(appId);
}

export function isProtectedModule(moduleId: string): boolean {
  if (PROTECTED_MODULES.has(moduleId)) return true;
  const app = getApp(moduleId);
  return app?.alwaysEnabled === true;
}
