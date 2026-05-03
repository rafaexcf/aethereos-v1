import { create } from "zustand";
import { APP_REGISTRY } from "../apps/registry";

const LEGACY_KEY = "ae-dock-apps";
const CACHE_KEY = "ae-user-pref:anon:dock_order";

function getDefaultDockOrder(): string[] {
  return APP_REGISTRY.filter((a) => a.showInDock).map((a) => a.id);
}

function loadCached(): string[] | null {
  for (const key of [CACHE_KEY, LEGACY_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      return parsed.filter((id): id is string => typeof id === "string");
    } catch {
      continue;
    }
  }
  return null;
}

function reconcileWithRegistry(stored: string[]): string[] {
  const validIds = new Set(APP_REGISTRY.map((a) => a.id));
  const filtered = stored.filter((id) => validIds.has(id));
  const newApps = APP_REGISTRY.filter(
    (a) => a.showInDock && !filtered.includes(a.id),
  ).map((a) => a.id);
  return [...filtered, ...newApps];
}

function initialOrder(): string[] {
  const stored = loadCached();
  if (stored === null) return getDefaultDockOrder();
  return reconcileWithRegistry(stored);
}

type Persister = (order: string[]) => void;

let persister: Persister = () => {
  /* no-op until a remote persister is bound */
};

export function bindDockOrderPersister(fn: Persister): () => void {
  persister = fn;
  return () => {
    persister = () => {
      /* no-op */
    };
  };
}

interface DockState {
  order: string[];
  addApp: (id: string) => void;
  removeApp: (id: string) => void;
  reorder: (oldIndex: number, newIndex: number) => void;
  reset: () => void;
  applyRemote: (order: string[]) => void;
}

export const useDockStore = create<DockState>((set, get) => ({
  order: initialOrder(),

  addApp: (id) => {
    const { order } = get();
    if (order.includes(id)) return;
    const next = [...order, id];
    persister(next);
    set({ order: next });
  },

  removeApp: (id) => {
    const { order } = get();
    const next = order.filter((x) => x !== id);
    persister(next);
    set({ order: next });
  },

  reorder: (oldIndex, newIndex) => {
    const { order } = get();
    if (
      oldIndex < 0 ||
      oldIndex >= order.length ||
      newIndex < 0 ||
      newIndex >= order.length
    )
      return;
    const next = [...order];
    const [item] = next.splice(oldIndex, 1);
    if (item === undefined) return;
    next.splice(newIndex, 0, item);
    persister(next);
    set({ order: next });
  },

  reset: () => {
    const next = getDefaultDockOrder();
    persister(next);
    set({ order: next });
  },

  applyRemote: (order) => {
    set({ order: reconcileWithRegistry(order) });
  },
}));
