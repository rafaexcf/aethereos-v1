import { create } from "zustand";
import { APP_REGISTRY } from "../apps/registry";

const STORAGE_KEY = "ae-dock-apps";

function getDefaultDockOrder(): string[] {
  return APP_REGISTRY.filter((a) => a.showInDock).map((a) => a.id);
}

function loadStored(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return null;
  }
}

function persist(order: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    /* ignore quota errors */
  }
}

interface DockState {
  order: string[];
  addApp: (id: string) => void;
  removeApp: (id: string) => void;
  reorder: (oldIndex: number, newIndex: number) => void;
  reset: () => void;
}

export const useDockStore = create<DockState>((set, get) => ({
  order: loadStored() ?? getDefaultDockOrder(),

  addApp: (id) => {
    const { order } = get();
    if (order.includes(id)) return;
    const next = [...order, id];
    persist(next);
    set({ order: next });
  },

  removeApp: (id) => {
    const { order } = get();
    const next = order.filter((x) => x !== id);
    persist(next);
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
    persist(next);
    set({ order: next });
  },

  reset: () => {
    const next = getDefaultDockOrder();
    persist(next);
    set({ order: next });
  },
}));
