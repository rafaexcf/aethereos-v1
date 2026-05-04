import { create } from "zustand";
import type { ComponentType, LazyExoticComponent } from "react";
import type { CloudDrivers } from "../lib/drivers";
import { getComponent } from "../apps/registry";

/**
 * Sprint 21 MX114 — appRegistryStore.
 *
 * Source-of-truth runtime para metadata de apps. Carrega de
 * kernel.app_registry (status='published') e merge com o COMPONENT_MAP
 * em codigo para apps nativos. Apps iframe/weblink nao precisam de
 * componente — o shell resolve via entry_mode.
 *
 * Sincronizado uma vez no boot. Realtime nao eh necessario porque o
 * catalogo eh global (sem company_id) e raramente muda.
 */

export type AppType =
  | "native"
  | "open_source"
  | "embedded_external"
  | "external_shortcut"
  | "template_app"
  | "ai_app";

export type EntryMode = "internal" | "iframe" | "weblink";
export type AppStatus = "draft" | "published" | "suspended" | "deprecated";
export type AppCategory =
  | "vertical"
  | "optional"
  | "ai"
  | "productivity"
  | "games"
  | "utilities"
  | "puter"
  | "system";

interface AppRegistryRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  long_description: string;
  icon: string;
  color: string;
  category: AppCategory;
  app_type: AppType;
  entry_mode: EntryMode;
  entry_url: string | null;
  version: string;
  status: AppStatus;
  pricing_model: string;
  permissions: string[];
  tags: string[];
  license: string;
  developer_name: string;
  show_in_dock: boolean;
  closeable: boolean;
  has_internal_nav: boolean;
  always_enabled: boolean;
  opens_as_modal: boolean;
  installable: boolean;
  offline_capable: boolean;
  external_url: string | null;
  install_count: number;
  sort_order: number;
}

export interface AppRegistryEntry extends AppRegistryRow {
  /** Resolvido via COMPONENT_MAP. null para iframe/weblink. */
  component: LazyExoticComponent<ComponentType> | null;
  hasComponent: boolean;
}

interface AppRegistryState {
  apps: ReadonlyMap<string, AppRegistryEntry>;
  isLoading: boolean;
  error: string | null;
}

interface AppRegistryActions {
  loadApps: (drivers: CloudDrivers) => Promise<void>;
  reset: () => void;
}

const INITIAL: AppRegistryState = {
  apps: new Map(),
  isLoading: false,
  error: null,
};

export const useAppRegistryStore = create<
  AppRegistryState & AppRegistryActions
>((set) => ({
  ...INITIAL,

  loadApps: async (drivers) => {
    set({ isLoading: true });
    try {
      const res = (await drivers.data
        .from("app_registry")
        .select("*")
        .eq("status", "published")
        .order("sort_order", { ascending: true })) as unknown as {
        data: AppRegistryRow[] | null;
        error: { message: string } | null;
      };
      if (res.error !== null) {
        set({ error: res.error.message, isLoading: false });
        return;
      }
      const map = new Map<string, AppRegistryEntry>();
      for (const row of res.data ?? []) {
        const component = getComponent(row.id);
        map.set(row.id, {
          ...row,
          component,
          hasComponent: component !== null,
        });
      }
      set({ apps: map, isLoading: false, error: null });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Erro ao carregar app_registry",
        isLoading: false,
      });
    }
  },

  reset: () => set(INITIAL),
}));

// ─── Selectors / derived helpers ─────────────────────────────────────────────

export function getRegistryApp(id: string): AppRegistryEntry | undefined {
  return useAppRegistryStore.getState().apps.get(id);
}

/** Retorna apps que devem aparecer no Dock (show_in_dock=true). */
export function getDockApps(): AppRegistryEntry[] {
  return [...useAppRegistryStore.getState().apps.values()].filter(
    (a) => a.show_in_dock,
  );
}

/** Filtra por (instalado OR always_enabled). Caller passa o set de installed. */
export function filterVisible(
  apps: AppRegistryEntry[],
  installed: ReadonlySet<string>,
): AppRegistryEntry[] {
  return apps.filter((a) => a.always_enabled || installed.has(a.id));
}

/** Busca textual leve em name/description/tags. */
export function searchApps(query: string): AppRegistryEntry[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [];
  const all = [...useAppRegistryStore.getState().apps.values()];
  return all.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q)),
  );
}
